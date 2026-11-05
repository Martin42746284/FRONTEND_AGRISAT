import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Analysis, AnalysisParcel, AuditEntry, BorneGps, Commune, CropResult, CultureId, Filters, LatLng, Parcel, Region, Role,
  SearchedLocation, User,
} from '../types';
import { AREA_MAX, CULTURE_BY_ID, DEFAULT_COLORS, DEFAULT_SEASON, PIPELINE_STEPS, CURRENT_MODEL, ROLES } from '../data/constants';
import {
  api, maltoConfigured, type AnalyzeSimpleFeature, type AutomaticDetectionResult, type AuditEntryCreate,
  type CreateMaltoParcelPayload, type ParcelUpdate,
} from '../api/services';
import { maltoToFrontend, maltoVhrToFrontend, type MaltoParcel, type MaltoVhrFeature } from '../api/maltoAdapter';
import { centroidOf, isDuplicateVhrParcel, isSameParcelFootprint, pointInPolygon, ringAreaHa } from '../lib/geometry';
import {
  analyzedParcelIds, cultureCountsForAnalysis, isAnalyzedParcel, parcelIdsOfAnalysis,
  parcelsForAnalysis, pendingCultureParcelsForAnalysis, toTracedParcelInput,
} from '../lib/analysis-parcels';
import { correctionText, withCorrectedClass } from '../lib/culture-sync';
import { captureThumbnail } from '../lib/capture-image';
import { statusFromConfidence } from '../lib/parcel-status';
import {
  isExplicitParcel, isManualParcel, REJECTED_PARCEL_SOURCE, SPLIT_PARCEL_SOURCE,
} from '../lib/parcel-sources';
import { snapToRing, splitParcelByCut } from '../lib/polygon-split';
import {
  addRejection, isDatabaseParcelId, isRejectedParcel, mergeRejections, type RejectedParcel,
} from '../lib/rejections';

export const DEFAULT_FILTERS: Filters = {
  cultures: [], mode: 'general', othersStyle: 'grise',
  regionId: null, communeId: null, seasonId: DEFAULT_SEASON,
  dateFrom: '', dateTo: '', areaMin: 0, areaMax: AREA_MAX, confMin: 0, statuses: [],
};

export interface FlyTarget { bounds?: [LatLng, LatLng]; center?: LatLng; zoom?: number; nonce: number }
export interface Toast { id: number; msg: string; tone: 'ok' | 'info' | 'warn' | 'danger' }

/**
 * Centre et zoom d'ouverture de la carte : vue rapprochée. La capture Gemini
 * assemble ensuite des tuiles de 20 m sur ~100 m autour du centre.
 */
export const DEFAULT_MAP_CENTER: LatLng = [-19.848219, 47.011882];
export const DEFAULT_MAP_ZOOM = 21;

/** Zone couverte par la dernière capture Gemini (rectangle affiché sur la carte). */
export interface GeminiCaptureArea {
  south: number;
  west: number;
  north: number;
  east: number;
  spanM: number;
  zoom: number;
}

/** Nombre maximal de captures conservées dans l'historique local (page « Analyses »). */
export const MAX_CAPTURE_HISTORY = 40;

/** Données d'une analyse de terrain à consigner dans l'historique. */
export interface CaptureAnalysisInput {
  /** Centre de la zone capturée. */
  center: LatLng;
  /** Bornes de la capture (absentes si la requête a échoué). */
  bounds?: { south: number; west: number; north: number; east: number };
  spanM: number;
  zoom: number;
  /** Image de la capture (data URL) : réduite avant stockage. */
  imageDataUrl?: string | null;
  /** Parcelles détectées, avec libellé et emprise. */
  parcels: AnalysisParcel[];
  /** Parcelles déjà en base, non dupliquées. */
  duplicates?: number;
  warnings?: string[];
  /** Message d'erreur : l'analyse est consignée en échec. */
  error?: string;
}

/** Options d'une analyse unitaire de parcelle. */
export interface AnalyzeParcelOptions {
  /** Relance explicite : remplace les données d'une parcelle déjà analysée. */
  force?: boolean;
  /** Analyse de lot en arrière-plan : ne bloque pas l'interface et ne change pas la sélection. */
  background?: boolean;
  /** Aucun retour unitaire : le lot affiche son propre message à la fin. */
  silent?: boolean;
  /** Saison sous laquelle enregistrer le résultat (par défaut, le filtre courant). */
  seasonId?: string;
  /** Annulation de la requête en cours (lot d'analyses interrompu par l'utilisateur). */
  signal?: AbortSignal;
}

/** Avancement du lot « Analyser les cultures » d'un historique. */
export interface CultureAnalysisJob {
  analysisId: string;
  done: number;
  total: number;
}

/** Résumé du dernier traçage automatique (contours IA — à présenter comme indicatifs). */
export interface TraceInfo {
  count: number;   // contours renvoyés par le backend
  added: number;   // vraiment nouveaux (hors doublons déjà présents)
  attribution?: string;
  warnings: string[];
  at: string;
}

interface State {
  ready: boolean;
  /** Message d'erreur du dernier chargement de la base ; `null` si tout va bien. */
  loadError: string | null;
  parcels: Parcel[]; regions: Region[]; communes: Commune[];
  analyses: Analysis[]; users: User[]; audit: AuditEntry[];

  user: User | null;
  colors: Record<CultureId, string>;
  colorsByUser: Record<string, Record<CultureId, string>>;
  threshold: number;
  basemap: 'plan' | 'satellite';
  /** Renforce contraste et saturation de l'imagerie pour lire les limites peu visibles. */
  readability: boolean;
  showCoverage: boolean;

  filters: Filters;
  selectedId: string | null;
  fly: FlyTarget | null;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;

  /** Centre et zoom courants de la carte (mis à jour à chaque déplacement). */
  mapCenter: LatLng;
  mapZoom: number;
  mapBounds: { south: number; west: number; north: number; east: number } | null;
  mapSize: { width: number; height: number } | null;
  setMapView: (
    center: LatLng,
    zoom: number,
    bounds?: { south: number; west: number; north: number; east: number } | null,
    size?: { width: number; height: number } | null,
  ) => void;
  /** Zone couverte par la dernière capture Gemini, matérialisée sur la carte. */
  geminiCapture: GeminiCaptureArea | null;
  setGeminiCapture: (capture: GeminiCaptureArea | null) => void;

  /** Bornes GPS enregistrées en base, affichées sur la carte. */
  bornes: BorneGps[];
  /** Mode « cliquer sur la carte pour placer une borne ». */
  bornePlacement: boolean;
  /** Point choisi, en attente du nom saisi par l'utilisateur. */
  borneDraft: LatLng | null;
  /** Borne ou coordonnées mises en évidence après une recherche. */
  searchedLocation: SearchedLocation | null;
  startBornePlacement: () => void;
  cancelBornePlacement: () => void;
  placeBorneDraft: (point: LatLng) => void;
  cancelBorneDraft: () => void;
  saveBorne: (name: string) => Promise<BorneGps>;
  setSearchedLocation: (location: SearchedLocation | null) => void;
  /**
   * Ajoute des parcelles détectées par Gemini (déjà enregistrées en base).
   * Les identifiants déjà affichés sont ignorés : pas de doublon visuel.
   */
  addDetectedParcels: (added: Parcel[]) => number;
  /**
   * Historique des analyses de terrain (captures), conservé dans le navigateur :
   * il reste disponible après un rechargement de la page ou un redémarrage.
   */
  captureHistory: Analysis[];
  /** Consigne une capture de terrain dans la page « Analyses ». */
  recordCaptureAnalysis: (input: CaptureAnalysisInput) => Promise<void>;
  /**
   * Retire une analyse de l'historique et supprime les parcelles qu'elle a créées.
   * Les parcelles des autres analyses ne sont jamais touchées ; l'analyse n'est
   * retirée que si toutes ses parcelles ont bien été supprimées de la base.
   * Renvoie `false` (et conserve l'entrée) en cas d'échec serveur.
   */
  deleteAnalysisHistory: (id: string) => Promise<boolean>;
  /**
   * Lance en arrière-plan l'analyse des cultures des parcelles d'un historique.
   * Seules les parcelles encore sans résultat sont traitées ; les autres sont
   * conservées telles quelles. La navigation reste possible pendant le traitement.
   */
  analyzeAnalysisCultures: (id: string) => void;
  /** Lot d'analyse des cultures en cours, tous historiques confondus. */
  cultureAnalysisJob: CultureAnalysisJob | null;

  drawing: boolean; drawMode: 'zone' | 'parcel'; draft: LatLng[]; zone: LatLng[] | null; manualParcelDraft: LatLng[] | null;
  toasts: Toast[];
  traceInfo: TraceInfo | null;
  /** Contours automatiques supprimés, relus en base et conservés localement. */
  rejectedParcels: RejectedParcel[];
  automaticDetection: AutomaticDetectionResult | null;
  automaticSearchCenter: LatLng | null;
  /** Rayon de l'analyse automatique, en mètres : il définit la zone affichée sur la carte. */
  automaticSearchRadius: number | null;
  selectedAutomaticParcelId: string | null;

  /** Édition du contour d'une parcelle (double-clic sur la parcelle dans la carte). */
  editingParcelId: string | null;
  /** Sommets en cours de déplacement — recopiés au save dans `parcels`. */
  editingCoords: LatLng[] | null;

  /**
   * Scission manuelle : parcelle en cours de découpe et ligne de coupe tracée.
   * La coupe part du contour, le suit par ses sommets intermédiaires et se
   * termine sur le contour opposé.
   */
  splitParcelId: string | null;
  splitDraft: LatLng[];
  startSplitParcel: (id: string) => void;
  addSplitPoint: (point: LatLng) => void;
  undoSplitPoint: () => void;
  cancelSplitParcel: () => void;
  /** Enregistre la scission : la parcelle d'origine garde son identité et sa culture. */
  saveSplitParcel: () => Promise<boolean>;

  init: () => Promise<void>;
  /** Recharge les données de la base (bouton « Réessayer » après un échec). */
  reload: () => Promise<void>;
  login: (role: Role) => void;
  logout: () => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  toggleCulture: (id: CultureId) => void;
  setColor: (id: CultureId, color: string) => void;
  resetColors: () => void;
  setThreshold: (v: number) => void;
  setBasemap: (b: 'plan' | 'satellite') => void;
  setReadability: (v: boolean) => void;
  setShowCoverage: (v: boolean) => void;
  select: (id: string | null) => void;
  flyTo: (t: Omit<FlyTarget, 'nonce'>) => void;
  startEditParcel: (id: string) => void;
  setEditingCoords: (coords: LatLng[]) => void;
  cancelEditParcel: () => void;
  saveEditParcel: () => void;

  startDraw: () => void; startParcelDraw: () => void; addDraftPoint: (p: LatLng) => void; undoDraft: () => void;
  finishDraw: () => void; cancelDraw: () => void; clearManualParcelDraft: () => void; addManualParcel: (p: Parcel) => void; setZone: (z: LatLng[] | null) => void;

  toast: (msg: string, tone?: Toast['tone']) => void;
  logAudit: (action: string, object: string) => void;
  correctParcel: (id: string, to: CultureId, note: string, kind: 'correction' | 'observation') => void;
  /**
   * Supprime une parcelle (masquage immédiat + suppression en base).
   * `silent` évite le retour utilisateur et l'audit unitaires, pour une suppression en lot.
   */
  rejectParcel: (id: string, options?: { silent?: boolean }) => Promise<boolean>;
  /** Supprime plusieurs parcelles en une fois, avec un seul retour utilisateur. */
  deleteParcels: (ids: string[]) => Promise<void>;
  /** Retire la culture d'une parcelle et conserve la parcelle (contour, superficie, id). */
  removeParcelCulture: (id: string) => Promise<void>;
  createAnalysis: (input: { zoneLabel: string; regionId?: string; communeId?: string; seasonId: string; zone?: LatLng[] | null }) => Analysis;
  /** Identifiant de la parcelle en cours d'analyse unitaire (bouton « Analyser »). */
  analyzingParcelId: string | null;
  /**
   * Analyse **une seule** parcelle : ni les parcelles voisines ne sont analysées,
   * ni leurs données modifiées. Le résultat est enregistré en base ; une parcelle
   * déjà analysée conserve ses données tant que l'utilisateur n'a pas confirmé
   * la relance (`force`).
   */
  analyzeParcel: (id: string, options?: AnalyzeParcelOptions) => Promise<boolean>;
  addTracedParcels: (added: Parcel[], info: TraceInfo) => number;  setAutomaticDetection: (result: AutomaticDetectionResult | null) => void;
  setAutomaticSearchCenter: (center: LatLng | null) => void;
  setAutomaticSearchRadius: (radiusM: number | null) => void;
  selectAutomaticParcel: (id: string | null) => void;
  relaunchAnalysis: (id: string) => void;
  setUserRole: (id: string, role: Role) => void;
  toggleUserActive: (id: string) => void;
}

let toastSeq = 1;
let flySeq = 1;
/** Un seul lot « Analyser les cultures » à la fois : le backend traite les parcelles en série. */
let cultureAnalysisRunning = false;
/** Une seule scission enregistrée à la fois (évite deux écritures sur un double clic). */
let splitSaveRunning = false;
const rint = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      ready: false,
      loadError: null,
      parcels: [], regions: [], communes: [], analyses: [], users: [], audit: [],
      captureHistory: [],
      user: null,
      colors: { ...DEFAULT_COLORS },
      colorsByUser: {},
      threshold: 0.55,
      basemap: 'satellite',
      readability: false,
      showCoverage: true,
      filters: DEFAULT_FILTERS,
      selectedId: null,
      fly: null,
      filtersOpen: false,
      setFiltersOpen: (v) => set({ filtersOpen: v }),
      mapCenter: DEFAULT_MAP_CENTER,
      mapZoom: DEFAULT_MAP_ZOOM,
      mapBounds: null,
      mapSize: null,
      setMapView: (center, zoom, bounds, size) => set({
        mapCenter: center,
        mapZoom: zoom,
        ...(bounds !== undefined ? { mapBounds: bounds } : {}),
        ...(size !== undefined ? { mapSize: size } : {}),
      }),
      geminiCapture: null,
      setGeminiCapture: (capture) => set({ geminiCapture: capture }),
      bornes: [],
      bornePlacement: false,
      borneDraft: null,
      searchedLocation: null,
      startBornePlacement: () => {
        const s = get();
        if (s.drawing) {
          s.toast('Terminez le tracé en cours avant de placer une borne GPS.', 'warn');
          return;
        }
        set({ bornePlacement: true, borneDraft: null, selectedId: null, searchedLocation: null });
        s.toast('Cliquez sur la carte pour placer la borne GPS.', 'info');
      },
      cancelBornePlacement: () => set({ bornePlacement: false }),
      placeBorneDraft: (point) => set({ bornePlacement: false, borneDraft: point }),
      cancelBorneDraft: () => set({ borneDraft: null }),
      saveBorne: async (name) => {
        const draft = get().borneDraft;
        if (!draft) throw new Error('Aucun emplacement sélectionné pour la borne GPS.');
        const created = await api.createBorneGps({
          name: name.trim(),
          lat: draft[0],
          lng: draft[1],
        });
        set((s) => ({
          bornes: [...s.bornes, created],
          borneDraft: null,
          searchedLocation: {
            kind: 'borne',
            lat: created.lat,
            lng: created.lng,
            label: created.name,
            borneId: created.id,
          },
        }));
        get().toast(`Borne GPS « ${created.name} » enregistrée.`, 'ok');
        return created;
      },
      setSearchedLocation: (location) => set({ searchedLocation: location }),
      drawing: false, drawMode: 'zone', draft: [], zone: null, manualParcelDraft: null,
      analyzingParcelId: null,
      cultureAnalysisJob: null,
      toasts: [],
      traceInfo: null,
      rejectedParcels: [],
      automaticDetection: null,
      automaticSearchCenter: null,
      automaticSearchRadius: null,
      selectedAutomaticParcelId: null,
      editingParcelId: null,
      editingCoords: null,
      splitParcelId: null,
      splitDraft: [],

      init: async () => {
        if (get().ready) return;
        await get().reload();
      },

      reload: async () => {
        set({ loadError: null });
        let db: Awaited<ReturnType<typeof api.bootstrap>>;
        try {
          db = await api.bootstrap();
        } catch (error) {
          // Une panne de la base n'est pas une base vide : on la montre à l'écran
          // plutôt que d'afficher une carte sans parcelle et des compteurs à zéro.
          console.error('[AgriSat] Chargement de la base impossible :', error);
          set({
            ready: true,
            loadError: error instanceof Error ? error.message : String(error),
          });
          return;
        }
        // Charger aussi l'historique d'audit depuis le backend
        let audit: AuditEntry[] = [];
        try {
          const remoteAudit = await api.getAudit();
          audit = remoteAudit.map((a) => ({
            id: a.id,
            at: a.at,
            userName: a.user_name,
            action: a.action,
            object: a.object,
          }));
        } catch (err) {
          console.warn('[AgriSat] Échec du chargement de l\'audit :', err);
        }
        // Bornes GPS : petit volume, chargé en une fois puis filtré côté client
        // dans le champ de recherche. En cas d'échec, on conserve celles déjà
        // affichées plutôt que de vider la carte.
        let bornes = get().bornes;
        try {
          bornes = await api.listBornesGps();
        } catch (err) {
          console.warn('[AgriSat] Échec du chargement des bornes GPS :', err);
        }
        // Les suppressions locales (écrites avant le rechargement) et celles relues
        // en base sont fusionnées : aucune ne doit être perdue si l'appel réseau a échoué.
        const rejectedParcels = mergeRejections(get().rejectedParcels, db.rejectedParcels);
        set({
          // Filet de sécurité si la suppression serveur avait échoué : un contour
          // automatique retiré ne réapparaît pas. Les délimitations explicites
          // (tracé manuel, import KML, détection Gemini) sont conservées telles quelles.
          parcels: db.parcels.filter((p) => isExplicitParcel(p) || !isRejectedParcel(p, rejectedParcels)),
          regions: db.regions, communes: db.communes,
          // L'historique des captures est local : sans cette fusion, le rechargement
          // (qui remplace les analyses par celles de la base) l'effacerait.
          analyses: mergeCaptureHistory(db.analyses, get().captureHistory),
          users: db.users, audit,
          bornes,
          rejectedParcels,
          ready: true,
        });
        // Ouverture directe sur la carte : profil analyste par défaut, modifiable depuis le menu utilisateur.
        if (!get().user) get().login('analyste');
      },

      login: (role) => {
        const s = get();
        // Compte de session local (l'authentification réelle viendra de Malto).
        let u = s.users.find((x) => x.role === role && x.active) ??
          ({ id: `local-${role}`, name: `Session ${role}`, email: '', role, active: true, lastLogin: new Date().toISOString() } as User);
        if (!s.users.some((x) => x.id === u.id)) {
          set((st) => ({ users: [u, ...st.users] }));
        }
        set((s2) => ({ user: u, colors: s2.colorsByUser[u.id] ?? { ...DEFAULT_COLORS } }));
        get().logAudit('Connexion', 'Session');
      },
      logout: () => set({ user: null, selectedId: null }),

      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set((s) => ({ filters: { ...DEFAULT_FILTERS, seasonId: s.filters.seasonId }, zone: null })),
      toggleCulture: (id) =>
        set((s) => {
          const has = s.filters.cultures.includes(id);
          const cultures = has ? s.filters.cultures.filter((c) => c !== id) : [...s.filters.cultures, id];
          let mode = s.filters.mode;
          if (cultures.length === 0) mode = 'general';
          else if (mode === 'general') mode = 'filtre';
          return { filters: { ...s.filters, cultures, mode } };
        }),
      setColor: (id, color) =>
        set((s) => {
          const colors = { ...s.colors, [id]: color };
          return { colors, colorsByUser: s.user ? { ...s.colorsByUser, [s.user.id]: colors } : s.colorsByUser };
        }),
      resetColors: () =>
        set((s) => ({
          colors: { ...DEFAULT_COLORS },
          colorsByUser: s.user ? { ...s.colorsByUser, [s.user.id]: { ...DEFAULT_COLORS } } : s.colorsByUser,
        })),
      setThreshold: (v) => set({ threshold: v }),
      setBasemap: (b) => set({ basemap: b }),
      setReadability: (v) => set({ readability: v }),
      setShowCoverage: (v) => set({ showCoverage: v }),
      // Changer de sélection (ou fermer la fiche) met fin à une édition ou à une
      // scission en cours.
      select: (id) =>
        set((s) => ({
          selectedId: id,
          ...(s.editingParcelId && s.editingParcelId !== id
            ? { editingParcelId: null, editingCoords: null }
            : {}),
          ...(s.splitParcelId && s.splitParcelId !== id
            ? { splitParcelId: null, splitDraft: [] }
            : {}),
        })),
      flyTo: (t) => set({ fly: { ...t, nonce: flySeq++ } }),

      startEditParcel: (id) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) return;
        if (!s.user || !ROLES[s.user.role].can.correct) {
          s.toast('Votre profil ne permet pas de modifier le contour d’une parcelle.', 'warn');
          return;
        }
        set({
          selectedId: id,
          editingParcelId: id,
          editingCoords: parcel.coords.map(([lat, lng]) => [lat, lng] as LatLng),
          splitParcelId: null,
          splitDraft: [],
        });
      },
      setEditingCoords: (coords) => set({ editingCoords: coords }),
      cancelEditParcel: () => {
        set({ editingParcelId: null, editingCoords: null });
        get().toast('Édition annulée — contour inchangé.', 'info');
      },
      saveEditParcel: () => {
        const s = get();
        const id = s.editingParcelId;
        const coords = s.editingCoords;
        if (!id || !coords) return;
        if (coords.length < 3) {
          s.toast('Le contour doit compter au moins 3 sommets.', 'warn');
          return;
        }
        const before = s.parcels.find((p) => p.id === id);
        if (!before) {
          set({ editingParcelId: null, editingCoords: null });
          return;
        }
        const centroid = centroidOf(coords);
        const areaHa = ringAreaHa(coords);
        set({
          parcels: s.parcels.map((p) =>
            p.id === id ? { ...p, coords, centroid, areaHa } : p),
          editingParcelId: null,
          editingCoords: null,
        });
        get().logAudit('Modification du contour', `Parcelle ${id}`);
        get().toast(
          `Contour de ${id} mis à jour : ${before.areaHa.toFixed(2)} → ${areaHa.toFixed(2)} ha.`,
          'ok',
        );
      },

      startSplitParcel: (id) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) return;
        if (!s.user || !ROLES[s.user.role].can.correct) {
          s.toast('Votre profil ne permet pas de scinder une parcelle.', 'warn');
          return;
        }
        set({
          splitParcelId: id,
          splitDraft: [],
          selectedId: id,
          editingParcelId: null,
          editingCoords: null,
          drawing: false,
          draft: [],
          bornePlacement: false,
          borneDraft: null,
        });
        s.toast('Posez un point sur le contour, suivez la limite réelle, puis terminez sur le bord opposé.', 'info');
      },
      addSplitPoint: (point) => {
        const s = get();
        if (!s.splitParcelId) return;
        const parcel = s.parcels.find((p) => p.id === s.splitParcelId);
        if (!parcel) return;
        // Le premier point est une extrémité de coupe : il doit tomber sur le
        // contour. La tolérance suit le zoom (≈ 14 px) pour rester utilisable à
        // toute échelle — un clic au milieu de la parcelle n'est jamais accroché.
        // Les points suivants sont libres : ils suivent la limite réelle.
        if (s.splitDraft.length === 0) {
          const metersPerPx = (156_543.03392 * Math.cos((point[0] * Math.PI) / 180)) / 2 ** s.mapZoom;
          const snapped = snapToRing(point, parcel.coords, Math.max(1.5, Math.min(30, 14 * metersPerPx)));
          if (!snapped) {
            s.toast('Posez le premier point sur le contour de la parcelle.', 'warn');
            return;
          }
          set({ splitDraft: [snapped.point] });
          return;
        }
        set({ splitDraft: [...s.splitDraft, point] });
      },
      undoSplitPoint: () => set((s) => ({ splitDraft: s.splitDraft.slice(0, -1) })),
      cancelSplitParcel: () => {
        set({ splitParcelId: null, splitDraft: [] });
        get().toast('Scission annulée — contour inchangé.', 'info');
      },
      saveSplitParcel: async () => {
        if (splitSaveRunning) return false;
        const s = get();
        const id = s.splitParcelId;
        if (!id) return false;
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) {
          set({ splitParcelId: null, splitDraft: [] });
          return false;
        }
        const split = splitParcelByCut(parcel.coords, s.splitDraft);
        if (!split.ok) {
          s.toast(split.error, 'warn');
          return false;
        }
        splitSaveRunning = true;
        const [first, second] = split.parts;
        const keeperIsFirst = keeperPartIndex(parcel.centroid, first, second) === 0;
        const keeperCoords = keeperIsFirst ? first : second;
        const otherCoords = keeperIsFirst ? second : first;
        const keeperCentroid = centroidOf(keeperCoords);
        const keeperArea = ringAreaHa(keeperCoords);
        const otherCentroid = centroidOf(otherCoords);
        const otherArea = ringAreaHa(otherCoords);
        const seasons = [...new Set([...Object.keys(parcel.results), s.filters.seasonId])];
        const today = new Date().toLocaleDateString('fr-FR');

        // La partie détachée est un contour seul, comme une parcelle tracée à la
        // main : sa culture reste à déterminer par une analyse.
        let newPart: Parcel;
        try {
          const row = await api.createParcel(parcelCreatePayload(parcel, otherCoords, otherCentroid, otherArea, {
            label: `Scission du ${today}`,
            dataSource: SPLIT_PARCEL_SOURCE,
            verdict: 'Contour issu d’une scission manuelle — culture à analyser',
            details: 'Partie détachée manuellement d’une parcelle fusionnée par l’IA.',
            notes: `Partie d’une parcelle scindée manuellement (${parcel.id}).`,
            saison: s.filters.seasonId,
            keepCulture: false,
          }));
          const [mapped] = maltoToFrontend([row as unknown as MaltoParcel], { regions: s.regions, communes: s.communes });
          if (!mapped) throw new Error('géométrie de la nouvelle partie invalide');
          newPart = {
            ...mapped,
            results: Object.fromEntries(seasons.map((seasonId) => [seasonId, clearedCultureResult(seasonId)])),
          };
        } catch (error) {
          console.warn('[AgriSat] Création de la partie scindée impossible :', error);
          splitSaveRunning = false;
          s.toast('Scission impossible : la parcelle est inchangée.', 'danger');
          return false;
        }

        // Persistance de la partie qui garde l'identité de la parcelle d'origine.
        // Un contour qui n'était pas en base (tracé IA) est enregistré, et son
        // ancienne empreinte marquée supprimée : sans cela il serait retracé au
        // rechargement et la scission disparaîtrait.
        let keeperId = parcel.id;
        const createdIds = [newPart.id];
        try {
          if (isDatabaseParcelId(parcel.id)) {
            await api.updateParcelGeometry(parcel.id, {
              coordinates: keeperCoords.map(([lat, lng]) => ({ lat, lng })),
              center_lat: keeperCentroid[0],
              center_lng: keeperCentroid[1],
              surface_ha: keeperArea,
            });
          } else {
            const keeperRow = await api.createParcel(parcelCreatePayload(parcel, keeperCoords, keeperCentroid, keeperArea, {
              label: `Scission du ${today}`,
              dataSource: parcel.dataSource ?? SPLIT_PARCEL_SOURCE,
              verdict: 'Contour issu d’une scission manuelle',
              details: 'Partie conservée d’une parcelle scindée manuellement.',
              notes: `Partie d’une parcelle scindée manuellement (${parcel.id}).`,
              saison: s.filters.seasonId,
              keepCulture: true,
            }));
            keeperId = String((keeperRow as { id?: unknown }).id ?? '');
            if (!keeperId) throw new Error('identifiant de la partie conservée absent');
            createdIds.push(keeperId);
            const markerRow = await api.createParcel(parcelCreatePayload(parcel, parcel.coords, parcel.centroid, parcel.areaHa, {
              label: '',
              dataSource: REJECTED_PARCEL_SOURCE,
              verdict: 'Contour automatique supprimé',
              details: 'Ancien contour fusionné remplacé par une scission manuelle.',
              notes: 'Contour automatique supprimé par l’utilisateur.',
              saison: null,
              keepCulture: false,
            }));
            createdIds.push(String((markerRow as { id?: unknown }).id ?? ''));
          }
        } catch (error) {
          console.warn('[AgriSat] Enregistrement de la scission impossible :', error);
          // Rien ne doit rester à moitié écrit : les parties déjà créées sont retirées.
          for (const createdId of createdIds.filter((value) => isDatabaseParcelId(value))) {
            try {
              await api.deleteParcel(createdId);
            } catch (cleanupError) {
              console.warn('[AgriSat] Nettoyage de la scission impossible :', cleanupError);
            }
          }
          splitSaveRunning = false;
          s.toast('Scission impossible : la parcelle est inchangée.', 'danger');
          return false;
        }

        const keeper: Parcel = {
          ...parcel,
          id: keeperId,
          coords: keeperCoords,
          centroid: keeperCentroid,
          areaHa: keeperArea,
        };
        set((st) => ({
          parcels: [...st.parcels.map((p) => (p.id === parcel.id ? keeper : p)), newPart],
          splitParcelId: null,
          splitDraft: [],
          selectedId: keeper.id,
          ...(isDatabaseParcelId(parcel.id)
            ? {}
            : { rejectedParcels: addRejection(st.rejectedParcels, parcel) }),
        }));
        get().logAudit('Scission de parcelle', `${parcel.id} · ${keeperArea.toFixed(2)} + ${otherArea.toFixed(2)} ha`);
        get().toast(
          `Parcelle scindée : ${keeperArea.toFixed(2)} ha (culture conservée) et `
          + `${otherArea.toFixed(2)} ha (à analyser).`,
          'ok',
        );
        splitSaveRunning = false;
        return true;
      },

      startDraw: () => set({
        drawing: true, drawMode: 'zone', draft: [], manualParcelDraft: null, selectedId: null,
        splitParcelId: null, splitDraft: [],
      }),
      startParcelDraw: () => set({
        drawing: true, drawMode: 'parcel', draft: [], manualParcelDraft: null, selectedId: null,
        splitParcelId: null, splitDraft: [],
      }),
      addDraftPoint: (p) => set((s) => ({ draft: [...s.draft, p] })),
      undoDraft: () => set((s) => ({ draft: s.draft.slice(0, -1) })),
      finishDraw: () => {
        const { draft, drawMode } = get();
        if (draft.length < 3) { get().toast('Placez au moins 3 points pour fermer le contour.', 'warn'); return; }
        if (drawMode === 'parcel') {
          set({ manualParcelDraft: draft, draft: [], drawing: false });
          return;
        }
        set({ zone: draft, draft: [], drawing: false });
        get().toast('Zone d’étude créée. Les filtres et statistiques s’y limitent.', 'ok');
      },
      cancelDraw: () => set((s) => ({ drawing: false, draft: [], manualParcelDraft: s.drawMode === 'parcel' ? null : s.manualParcelDraft })),
      clearManualParcelDraft: () => set({ manualParcelDraft: null }),
      addManualParcel: (parcel) =>
        set((s) => ({
          parcels: [parcel, ...s.parcels.filter((p) => !isDuplicateVhrParcel(p, parcel))],
          selectedId: parcel.id,
          manualParcelDraft: null,
        })),
      setZone: (z) => set({ zone: z }),

      addTracedParcels: (added, info) => {
        const known = [...get().parcels];
        const rejections = get().rejectedParcels;
        const fresh: Parcel[] = [];
        for (const candidate of added) {
          // Un contour supprimé ne doit jamais être réinjecté par le traçage
          // automatique, même si la tuile est retracée après un rechargement.
          if (isRejectedParcel(candidate, rejections)) continue;
          if (known.some((parcel) => isDuplicateVhrParcel(parcel, candidate))) continue;
          fresh.push(candidate);
          known.push(candidate);
        }
        // `info.added` est recalculé ici : nombre réel de contours nouveaux.
        set((s) => ({ parcels: [...s.parcels, ...fresh], traceInfo: { ...info, added: fresh.length } }));
        return fresh.length;
      },
      addDetectedParcels: (added) => {
        // Le backend a déjà écarté les contours présents en base. Ici on ne filtre
        // que les identifiants déjà affichés (double capture de la même zone).
        const known = new Set(get().parcels.map((parcel) => parcel.id));
        const fresh = added.filter((parcel) => !known.has(parcel.id));
        if (fresh.length) set((s) => ({ parcels: [...s.parcels, ...fresh] }));
        return fresh.length;
      },
      setAutomaticDetection: (result) => set({ automaticDetection: result }),
      setAutomaticSearchCenter: (center) => set({ automaticSearchCenter: center }),
      setAutomaticSearchRadius: (radiusM) => set({ automaticSearchRadius: radiusM }),
      selectAutomaticParcel: (id) => set({ selectedAutomaticParcelId: id }),

      toast: (msg, tone = 'info') => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts, { id, msg, tone }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
      },
      logAudit: async (action, object) => {
        const s = get();
        const u = s.user;
        if (!u) return;
        const e: AuditEntry = { id: `au${Date.now()}${Math.random()}`, at: new Date().toISOString(), userName: u.name, action, object };
        set((s) => ({ audit: [e, ...s.audit] }));
        try {
          await api.logAudit({ user_name: u.name, action, object });
        } catch (err) {
          console.warn('[AgriSat] Échec de l\'enregistrement d\'audit :', err);
        }
      },

      correctParcel: async (id, to, note, kind) => {
        const s = get();
        const seasonId = s.filters.seasonId;
        const by = s.user?.name ?? 'Inconnu';
        // Toute la fiche suit la classe retenue : sans ces textes, une parcelle
        // corrigée en « Orge » continuait d'afficher « Autre culture » (verdict,
        // classe détectée et explication enregistrés par le modèle).
        const text = correctionText(to, note, kind);
        set({
          parcels: s.parcels.map((p) => {
            if (p.id !== id) return p;
            const r = p.results[seasonId];
            if (!r) return p;
            return {
              ...p,
              cultureDetail: withCorrectedClass(p.cultureDetail, text),
              results: {
                ...p.results,
                [seasonId]: { ...r, culture: to, status: kind === 'observation' ? 'verifie_terrain' : 'corrige', correctedBy: by },
              },
              corrections: [...p.corrections, { at: new Date().toISOString(), by, seasonId, from: r.culture, to, note, kind }],
            };
          }),
        });
        // Persister vers le backend. La fiche affichée est relue depuis ces mêmes
        // champs : une correction non enregistrée doit être signalée, pas tue.
        if (!isDatabaseParcelId(id)) {
          get().toast('Correction gardée pour cette session : la parcelle n’est pas en base de données.', 'warn');
          get().logAudit(kind === 'observation' ? 'Saisie d’observation terrain' : 'Correction de classe', `Parcelle ${id}`);
          return;
        }
        try {
          const r = s.parcels.find((p) => p.id === id)?.results[seasonId];
          await api.correctParcelle(id, {
            // Libellé et non identifiant de culture : la base stocke « Orge »,
            // « Pomme de terre », etc. (l'identifiant `pomme_de_terre` n'était
            // relu comme aucune culture connue au rechargement).
            culture_detected: text.label,
            confidence: r ? Math.round(r.confidence * 100) : undefined,
            verdict: text.verdict,
            details: text.details,
            saison: seasonId,
          });
        } catch (err) {
          console.warn('[AgriSat] Échec de la correction de parcelle :', err);
          get().toast('Correction affichée mais non enregistrée en base de données : relancez la correction.', 'danger');
        }
        get().logAudit(kind === 'observation' ? 'Saisie d’observation terrain' : 'Correction de classe', `Parcelle ${id}`);
      },
      rejectParcel: async (id, options) => {
        const silent = options?.silent === true;
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) return false;

        // Masquage immédiat + mémorisation de l'empreinte : le contour ne sera
        // pas retracé à l'écran pendant la session en cours.
        set({
          parcels: s.parcels.map((p) => (p.id === id ? { ...p, rejected: true } : p)),
          rejectedParcels: addRejection(s.rejectedParcels, parcel),
          selectedId: null,
        });
        if (!silent) get().logAudit('Rejet de polygone', `Parcelle ${id}`);

        // Parcelle enregistrée en base : suppression réelle de la ligne.
        if (isDatabaseParcelId(id)) {
          try {
            await api.deleteParcel(id);
            if (!silent) get().toast('Parcelle supprimée définitivement.', 'ok');
            return true;
          } catch (err) {
            console.warn('[AgriSat] Suppression de la parcelle en base impossible :', err);
            if (!silent) get().toast('Parcelle masquée, mais la suppression en base a échoué.', 'warn');
            return false;
          }
        }

        // Contour automatique (tracé VHR, absent de la base) : on enregistre une
        // suppression côté serveur pour qu'il ne réapparaisse pas au rechargement,
        // sur ce navigateur comme sur les autres.
        try {
          await api.createParcel({
            label: '',
            coordinates: parcel.coords.map(([lat, lng]) => ({ lat, lng })),
            center_lat: parcel.centroid[0],
            center_lng: parcel.centroid[1],
            surface_ha: parcel.areaHa,
            culture_declared: '',
            culture_detected: null,
            ndvi_percentage: null,
            ndre: null,
            spectral_bands: null,
            confidence: null,
            verdict: 'Contour automatique supprimé',
            details: 'Suppression persistée : ce contour ne doit plus être réaffiché.',
            saison: null,
            soil_type: null,
            risk_factors: [],
            recommendations: null,
            data_source: REJECTED_PARCEL_SOURCE,
            owner_name: '',
            notes: 'Contour automatique supprimé par l’utilisateur.',
            time_series_s2: [],
            time_series_s1: [],
            time_series_rain: [],
            estimated_planting_date: null,
            estimated_harvest_date: null,
            days_since_planting: null,
            growth_stage: null,
            planting_confidence: null,
            evi: null,
            savi: null,
            ndwi: null,
            agro_score: null,
            hybrid_score: null,
            cnn_prob_barley: null,
            cnn_prob_non_barley: null,
          });
          if (!silent) get().toast('Contour supprimé définitivement.', 'ok');
          return true;
        } catch (err) {
          console.warn('[AgriSat] Suppression du contour non enregistrée côté serveur :', err);
          if (!silent) get().toast('Contour masqué sur cet appareil ; la suppression serveur a échoué.', 'warn');
          return false;
        }
      },

      /**
       * Suppression en lot (page « Parcelles »). Chaque parcelle passe par le même
       * chemin qu'une suppression unitaire ; l'utilisateur n'a qu'un seul retour.
       */
      deleteParcels: async (ids) => {
        const s = get();
        const wanted = new Set(ids);
        const targets = s.parcels.filter((p) => wanted.has(p.id) && !p.rejected);
        if (!targets.length) {
          s.toast('Aucune parcelle à supprimer.', 'warn');
          return;
        }
        let failures = 0;
        for (const target of targets) {
          if (!(await get().rejectParcel(target.id, { silent: true }))) failures += 1;
        }
        const removed = targets.length - failures;
        get().logAudit(
          'Suppression de parcelles',
          targets.length === 1 ? `Parcelle ${targets[0].id}` : `${removed} parcelle(s) sur ${targets.length}`,
        );
        if (failures) {
          get().toast(`${removed} parcelle(s) supprimée(s), ${failures} suppression(s) en base en échec.`, 'warn');
          return;
        }
        get().toast(
          targets.length === 1 ? 'Parcelle supprimée.' : `${removed} parcelles supprimées.`,
          'ok',
        );
      },

      removeParcelCulture: async (id) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) return;
        if (!parcelHasCulture(parcel)) {
          s.toast('Aucune culture enregistrée à supprimer sur cette parcelle.', 'warn');
          return;
        }

        // Des lignes doublons peuvent décrire la même parcelle (contour importé +
        // tracé manuel, réanalyses successives…). Supprimer la culture d'une seule
        // ligne laissait l'autre culture visible sur la carte : toutes les lignes
        // qui recouvrent exactement ce champ sont donc vidées ensemble.
        const related = s.parcels.filter((p) =>
          p.id === id || (parcelHasCulture(p) && isSameParcelFootprint(p, parcel)),
        );
        const originals = new Map(related.map((p) => [p.id, p]));
        // La parcelle et son contour sont conservés : seuls les résultats culturaux
        // repassent en « non classé », comme une parcelle sans culture relue en base.
        set({
          parcels: s.parcels.map((p) =>
            originals.has(p.id) ? withoutParcelCulture(p, s.filters.seasonId) : p,
          ),
        });
        get().logAudit('Suppression de la culture', `Parcelle ${id}`);

        const persisted = related.filter((p) => isDatabaseParcelId(p.id));
        if (!persisted.length) {
          get().toast('Culture retirée. La parcelle reste sur la carte.', 'ok');
          return;
        }

        const failures = new Set<string>();
        await Promise.all(persisted.map(async (p) => {
          try {
            await api.deleteParcelCulture(p.id);
          } catch (err) {
            failures.add(p.id);
            console.warn(`[AgriSat] Suppression de la culture impossible pour ${p.id} :`, err);
          }
        }));

        if (failures.size) {
          // Le serveur fait foi : seules les lignes non enregistrées sont restaurées.
          set((st) => ({
            parcels: st.parcels.map((p) => failures.has(p.id) ? originals.get(p.id) ?? p : p),
          }));
          get().toast('Suppression de la culture impossible : la parcelle est inchangée.', 'danger');
          return;
        }
        get().toast('Culture supprimée en base — la parcelle est conservée.', 'ok');
      },

      analyzeParcel: async (id, options) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) {
          if (!options?.silent) s.toast('Parcelle introuvable.', 'warn');
          return false;
        }
        const background = options?.background === true;
        const silent = options?.silent === true || background;
        const seasonId = options?.seasonId ?? s.filters.seasonId;
        // Une analyse de fiche bloque les autres analyses unitaires, mais pas le
        // lot d'arrière-plan : celui-ci doit pouvoir continuer pendant la navigation.
        if (!background && s.analyzingParcelId) {
          s.toast('Une analyse de parcelle est déjà en cours.', 'warn');
          return false;
        }
        if (!background) set({ analyzingParcelId: id });
        try {
          // Seule la parcelle sélectionnée est transmise : les parcelles
          // environnantes ne sont ni analysées ni modifiées.
          const result = await api.analyzeParcel({
            lat: parcel.centroid[0],
            lng: parcel.centroid[1],
            zoom: 17,
            polygon: parcel.coords.map(([lat, lng]) => ({ lat, lng })),
            parcelId: isDatabaseParcelId(parcel.id) ? parcel.id : null,
            force: options?.force ?? false,
          }, options?.signal);

          const [updated] = maltoToFrontend([result.parcelle], { regions: s.regions, communes: s.communes });
          if (!updated) return false;
          // Relire la parcelle avant fusion : une correction ou une autre analyse
          // a pu être enregistrée pendant l'appel réseau.
          const current = get().parcels.find((p) => p.id === parcel.id) ?? parcel;
          // La ligne enregistrée remplace le contour affiché (identifiant de base
          // pour une parcelle déjà en base, nouveau UUID sinon) ; les corrections
          // terrain saisies par l'utilisateur sont conservées.
          const newResult = updated.results[seasonId] ?? Object.values(updated.results)[0];
          const merged: Parcel = {
            ...updated,
            corrections: current.corrections,
            results: {
              ...current.results,
              ...(newResult ? { [seasonId]: { ...newResult, seasonId } } : {}),
            },
          };
          set((st) => ({
            parcels: st.parcels.map((p) => (p.id === parcel.id ? merged : p)),
            ...(!background ? { selectedId: merged.id } : {}),
          }));
          if (!silent) {
            get().logAudit('Analyse de parcelle', `Parcelle ${merged.id}`);
            get().toast(
              result.created
                ? 'Parcelle analysée et enregistrée en base.'
                : 'Analyse terminée — les données de la parcelle sont à jour.',
              'ok',
            );
          }
          return true;
        } catch (err) {
          if (options?.signal?.aborted) {
            console.info('[AgriSat] Analyse de parcelle annulée par l’utilisateur.');
            return false;
          }
          console.warn('[AgriSat] Analyse de parcelle impossible :', err);
          if (!silent) get().toast(err instanceof Error ? err.message : 'Analyse de parcelle impossible.', 'danger');
          return false;
        } finally {
          if (!background) set({ analyzingParcelId: null });
        }
      },

      analyzeAnalysisCultures: (id) => {
        const s = get();
        if (cultureAnalysisRunning) {
          s.toast('Une analyse des cultures est déjà en cours. Elle continue en arrière-plan.', 'info');
          return;
        }
        const entry = s.analyses.find((analysis) => analysis.id === id)
          ?? s.captureHistory.find((analysis) => analysis.id === id);
        if (!entry) {
          s.toast('Analyse introuvable.', 'warn');
          return;
        }
        if (!entry.detected?.length) {
          s.toast('Aucune parcelle à analyser pour cette analyse.', 'warn');
          return;
        }
        // Instantané des seules parcelles sans résultat ; l'état est revérifié
        // avant chaque appel pour ne jamais réanalyser une parcelle terminée.
        const targets = pendingCultureParcelsForAnalysis(entry, s.parcels);
        if (!targets.length) {
          const counts = cultureCountsForAnalysis(entry, s.parcels);
          s.toast(
            counts.total && counts.pending === 0
              ? 'Toutes les parcelles de cette analyse ont déjà un résultat cultural.'
              : counts.total
                ? 'Les parcelles restantes sont introuvables ou supprimées : impossible de reprendre cette analyse.'
                : 'Aucune parcelle à analyser pour cette analyse.',
            counts.total && counts.pending === 0 ? 'info' : 'warn',
          );
          return;
        }

        cultureAnalysisRunning = true;
        set({ cultureAnalysisJob: { analysisId: id, done: 0, total: targets.length } });
        // Volontairement détaché du composant : changer de page n'interrompt pas
        // le traitement et chaque résultat est enregistré au fur et à mesure.
        void (async () => {
          let done = 0;
          let failures = 0;
          let cancelled = false;
          try {
            for (const target of targets) {
              const stillExists = get().analyses.some((analysis) => analysis.id === id)
                || get().captureHistory.some((analysis) => analysis.id === id);
              if (!stillExists) {
                cancelled = true;
                break;
              }
              const current = get().parcels.find((parcel) => parcel.id === target.id);
              if (current && !current.rejected && !isAnalyzedParcel(current)) {
                const analyzed = await get().analyzeParcel(target.id, {
                  background: true,
                  silent: true,
                  seasonId: entry.seasonId,
                });
                const updated = get().parcels.find((parcel) => parcel.id === target.id);
                if (!analyzed || !updated || !isAnalyzedParcel(updated)) failures += 1;
              }
              done += 1;
              set({ cultureAnalysisJob: { analysisId: id, done, total: targets.length } });
            }
          } catch (error) {
            console.warn('[AgriSat] Analyse des cultures interrompue :', error);
            failures = Math.max(1, failures);
          } finally {
            cultureAnalysisRunning = false;
            set({ cultureAnalysisJob: null });
          }

          if (!cancelled) {
            const analyzedCount = Math.max(0, done - failures);
            if (failures) {
              get().toast(
                `${analyzedCount} parcelle(s) analysée(s), ${failures} en échec — relancez l’analyse pour reprendre les parcelles restantes.`,
                'warn',
              );
            } else {
              get().toast('Analyse des cultures terminée', 'ok');
            }
            get().logAudit('Analyse des cultures', `${id} · ${analyzedCount}/${targets.length} parcelle(s)`);
          }
        })();
      },

      createAnalysis: ({ zoneLabel, regionId, communeId, seasonId, zone }) => {
        const s = get();
        const now = new Date().toISOString();
        const id = `AN-2026-${String(s.analyses.length + 40).padStart(3, '0')}`;
        const cached = s.analyses.find(
          (a) => a.seasonId === seasonId && (a.status === 'terminee' || a.status === 'terminee_avertissements') &&
            ((communeId && a.communeId === communeId) || (!communeId && regionId && a.regionId === regionId && !a.communeId)),
        );
        const inScope = s.parcels.filter(
          (p) => p.results[seasonId] && (communeId ? p.communeId === communeId : regionId ? p.regionId === regionId : true) &&
            (!zone || pointInPolygon(p.centroid, zone)),
        );
        const base: Analysis = {
          id, zoneLabel, regionId, communeId, seasonId, status: 'en_attente', progress: 0,
          createdBy: s.user?.name ?? '—', createdAt: now, pipelineVersion: CURRENT_MODEL, scenes: 0, warnings: [], logs: [],
        };
        if (cached) {
          const a: Analysis = {
            ...base, status: 'terminee', progress: 100, cached: true, startedAt: now, finishedAt: now,
            parcelCount: inScope.length, areaHa: inScope.reduce((t, p) => t + p.areaHa, 0), scenes: cached.scenes,
            logs: [{ at: now, level: 'info', msg: `Entrées identiques déjà traitées (${cached.id}) — résultats réutilisés depuis le cache, aucun calcul relancé.` }],
          };
          set({ analyses: [a, ...s.analyses] });
          get().logAudit('Lancement d’analyse (cache)', zoneLabel);
          return a;
        }
        set({ analyses: [base, ...s.analyses] });
        get().logAudit('Lancement d’analyse', `${zoneLabel} · ${seasonId}`);
        if (api && 'analyzeSimple' in api) {
          try {
            if (maltoConfigured()) {
              const center = pickCenter(s, { zoneLabel, regionId, communeId, zone });
              const radiusM = pickRadiusM({ zone, center });
              void runMaltoPipeline(id, center, radiusM, seasonId, zone ?? null).then((res) => {
                const warns = res.warnings;
                const ended = new Date().toISOString();
                set((st) => ({
                  analyses: st.analyses.map((x) =>
                    x.id === id ? {
                      ...x,
                      status: warns.length ? 'terminee_avertissements' : 'terminee',
                      progress: 100,
                      startedAt: x.startedAt ?? now,
                      finishedAt: ended,
                      pipelineVersion: 'Malto · tracé JECAM-VHR + RF orge',
                      scenes: res.scenes,
                      warnings: warns,
                      parcelCount: res.parcelCount,
                      areaHa: res.areaHa,
                      logs: [...x.logs, { at: ended, level: 'info' as const, msg: 'Pipeline Malto terminé — tracé automatique + classification orge (modèles existants).' }],
                    } : x),
                }));
                get().toast(
                  `Analyse ${id} terminée (Malto) : ${res.tracedCount} contour(s) automatique(s), `
                  + `${res.manualCount} parcelle(s) manuelle(s), ${res.barleyCount} orge.`,
                  'ok',
                );
              }).catch((err) => {
                const ended = new Date().toISOString();
                set((st) => ({
                  analyses: st.analyses.map((x) =>
                    x.id === id ? {
                      ...x,
                      status: 'echec',
                      progress: 100,
                      startedAt: x.startedAt ?? now,
                      finishedAt: ended,
                      error: err instanceof Error ? err.message : String(err),
                      logs: [...x.logs, { at: ended, level: 'warn' as const, msg: 'Appel Malto échoué — repli sur simulation.' }],
                    } : x),
                }));
                setTimeout(() => runSimulation(id, inScope.length, inScope.reduce((t, p) => t + p.areaHa, 0), true), 400);
              });
              set((st) => ({
                analyses: st.analyses.map((x) =>
                  x.id === id ? { ...x, status: 'en_cours', startedAt: now, pipelineVersion: 'Malto /api/analyze (modèles IA réels)' } : x),
              }));
              return base;
            }
          } catch (e) {
            // Préparation de l'appel Malto impossible (ex. données de périmètre incomplètes) :
            // on journalise puis on laisse le repli simulation ci-dessous.
            console.warn('[AgriSat] Préparation de l\'analyse Malto impossible, repli simulation :', e);
          }
        }
        setTimeout(() => runSimulation(id, inScope.length, inScope.reduce((t, p) => t + p.areaHa, 0), false), 1200);
        return base;
      },

      recordCaptureAnalysis: async ({
        center, bounds, spanM, zoom, imageDataUrl, parcels, duplicates = 0, warnings = [], error,
      }) => {
        const s = get();
        const now = new Date().toISOString();
        // Aperçu réduit : la capture complète dépasserait le quota de stockage local.
        const thumbnail = imageDataUrl ? await captureThumbnail(imageDataUrl) : null;
        // Numérotation lisible, sans réutilisation d'un identifiant déjà pris
        // (l'historique est troniqué, donc sa longueur ne suffit pas).
        const day = now.slice(0, 10).replace(/-/g, '');
        let index = s.captureHistory.length + 1;
        let id = `CAP-${day}-${String(index).padStart(3, '0')}`;
        while (s.captureHistory.some((a) => a.id === id) || s.analyses.some((a) => a.id === id)) {
          index += 1;
          id = `CAP-${day}-${String(index).padStart(3, '0')}`;
        }
        const entry: Analysis = {
          id,
          zoneLabel: `Capture ${Math.round(spanM)} m · ${center[0].toFixed(5)}, ${center[1].toFixed(5)}`,
          seasonId: s.filters.seasonId,
          status: error ? 'echec' : parcels.length ? 'terminee' : 'terminee_avertissements',
          progress: 100,
          createdBy: s.user?.name ?? '—',
          createdAt: now, startedAt: now, finishedAt: now,
          pipelineVersion: 'Détection automatique · capture satellite',
          scenes: 0,
          parcelCount: parcels.length,
          areaHa: parcels.reduce((total, parcel) => total + parcel.areaHa, 0),
          warnings: error
            ? []
            : [...warnings, ...(parcels.length || duplicates
              ? []
              : ['Aucune parcelle entièrement visible détectée sur cette capture.'])],
          logs: [{
            at: now,
            level: error ? 'error' : parcels.length ? 'info' : 'warn',
            msg: error
              ? `Capture interrompue : ${error}`
              : `Capture de ${Math.round(spanM)} m (zoom ${zoom}) — ${parcels.length} parcelle(s) détectée(s)`
                + (duplicates ? `, ${duplicates} déjà en base.` : '.'),
          }],
          error,
          zone: { center, bounds, spanM, zoom },
          captureDataUrl: thumbnail ?? undefined,
          detected: parcels,
        };
        set((st) => ({
          analyses: [entry, ...st.analyses.filter((a) => a.id !== entry.id)],
          captureHistory: [entry, ...st.captureHistory].slice(0, MAX_CAPTURE_HISTORY),
        }));
        if (!error) get().logAudit('Analyse de zone', entry.zoneLabel);
      },

      deleteAnalysisHistory: async (id) => {
        const s = get();
        const entry = s.analyses.find((a) => a.id === id) ?? s.captureHistory.find((a) => a.id === id);
        if (!entry) return false;

        // Parcelles que cette analyse a créées : ce sont les seules lignes de la
        // base qui peuvent disparaître avec elle.
        const candidateIds = parcelIdsOfAnalysis([...s.analyses, ...s.captureHistory], id)
          .filter((parcelId) => isDatabaseParcelId(parcelId));

        // Suppression par petits lots : une capture peut produire des dizaines de
        // parcelles et le pool de connexions du backend est limité.
        const results: PromiseSettledResult<void>[] = [];
        for (let i = 0; i < candidateIds.length; i += 6) {
          results.push(...await Promise.allSettled(
            candidateIds.slice(i, i + 6).map((parcelId) => api.deleteParcel(parcelId)),
          ));
        }
        // Un 404 ne signale pas une panne : la ligne n'existe déjà plus (parcelle
        // supprimée entre-temps, autre navigateur), la parcelle est donc bien partie.
        const stillStored = (result: PromiseSettledResult<void>) => result.status === 'rejected'
          && !/Malto 404/.test(String((result.reason as Error)?.message ?? result.reason));
        for (const result of results) {
          if (result.status === 'rejected' && stillStored(result)) {
            console.warn('[AgriSat] Suppression d’une parcelle de l’analyse impossible :', result.reason);
          }
        }
        const failed = results.filter(stillStored).length;

        // Les parcelles déjà retirées le sont quand même : un nouvel essai ne
        // tentera que les suppressions en échec, sans toucher aux autres analyses.
        const removedIds = new Set(candidateIds.filter((_, i) => !stillStored(results[i])));
        if (removedIds.size) {
          set((st) => ({
            parcels: st.parcels.filter((p) => !removedIds.has(p.id)),
            selectedId: st.selectedId && removedIds.has(st.selectedId) ? null : st.selectedId,
            ...(st.editingParcelId && removedIds.has(st.editingParcelId)
              ? { editingParcelId: null, editingCoords: null }
              : {}),
          }));
        }

        if (failed) {
          get().toast(
            `Analyse conservée : ${failed} parcelle(s) sur ${candidateIds.length} n’ont pas pu être supprimées de la base.`,
            'danger',
          );
          return false;
        }

        const parcelCount = candidateIds.length;
        set((st) => ({
          analyses: st.analyses.filter((a) => a.id !== id),
          captureHistory: st.captureHistory.filter((a) => a.id !== id),
        }));
        get().toast(
          parcelCount
            ? `Analyse ${id} supprimée · ${parcelCount} parcelle(s) supprimée(s).`
            : `Analyse ${id} supprimée.`,
          'ok',
        );
        get().logAudit('Suppression d’analyse', `${id}${parcelCount ? ` · ${parcelCount} parcelle(s)` : ''}`);
        return true;
      },

      relaunchAnalysis: (id) => {
        const s = get();
        const a = s.analyses.find((x) => x.id === id);
        if (!a) return;
        const now = new Date().toISOString();
        const inScope = s.parcels.filter((p) => p.results[a.seasonId] && (a.communeId ? p.communeId === a.communeId : true));
        set({
          analyses: s.analyses.map((x) =>
            x.id === id ? { ...x, status: 'en_attente', progress: 0, error: undefined, logs: [...x.logs, { at: now, level: 'info', msg: `Relance contrôlée par ${s.user?.name ?? '—'}.` }] } : x),
        });
        get().logAudit('Relance d’analyse', id);
        setTimeout(() => runSimulation(id, inScope.length, inScope.reduce((t, p) => t + p.areaHa, 0), true), 1200);
      },

      setUserRole: (id, role) => {
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) }));
        get().logAudit('Modification de rôle', `Compte ${get().users.find((u) => u.id === id)?.name}`);
      },
      toggleUserActive: (id) => {
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)) }));
        get().logAudit('Changement de statut de compte', `Compte ${get().users.find((u) => u.id === id)?.name}`);
      },
    }),
    {
      name: 'agri-mada-v1',
      version: 4,
      migrate: (persistedState) => ({
        ...(persistedState as Pick<State, 'user' | 'colors' | 'colorsByUser' | 'threshold' | 'readability' | 'showCoverage'>),
        rejectedParcels: (persistedState as Partial<State>).rejectedParcels ?? [],
        captureHistory: (persistedState as Partial<State>).captureHistory ?? [],
        basemap: 'satellite' as const,
      }),
      partialize: (s) => ({
        user: s.user, colors: s.colors, colorsByUser: s.colorsByUser, threshold: s.threshold,
        basemap: s.basemap, readability: s.readability, showCoverage: s.showCoverage,
        rejectedParcels: s.rejectedParcels, captureHistory: s.captureHistory,
      }),
    },
  ),
);

/**
 * Analyses de la base + historique local des captures, sans doublon.
 *
 * `reload` remplace les analyses par celles du serveur ; comme l'historique des
 * captures n'existe que dans le navigateur, il est réinjecté ici pour rester
 * visible après un rechargement de la page.
 */
function mergeCaptureHistory(fromDb: Analysis[], history: Analysis[]): Analysis[] {
  const known = new Set(fromDb.map((a) => a.id));
  return [...history.filter((a) => !known.has(a.id)), ...fromDb]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Vrai si la parcelle porte encore une culture (en base ou pour une saison). */
function parcelHasCulture(parcel: Parcel): boolean {
  return !!parcel.cultureDetail
    || Object.values(parcel.results).some((result) => result.culture !== 'inconnue');
}

/**
 * Copie d'une parcelle dont toute la culture est effacée (fiche et résultats),
 * le contour, l'identité et la superficie restant intacts.
 */
function withoutParcelCulture(parcel: Parcel, fallbackSeasonId: string): Parcel {
  const seasonIds = Object.keys(parcel.results);
  return {
    ...parcel,
    cultureDetail: undefined,
    results: Object.fromEntries(
      (seasonIds.length ? seasonIds : [fallbackSeasonId])
        .map((seasonId) => [seasonId, clearedCultureResult(seasonId)]),
    ),
  };
}

/**
 * Résultat « non classé » d'une parcelle dont la culture vient d'être supprimée.
 * Il garde la parcelle visible sur la carte (un contour sans résultat pour la saison
 * courante serait masqué) sans réintroduire de culture.
 */
function clearedCultureResult(seasonId: string): CropResult {
  const at = new Date().toISOString();
  return {
    seasonId,
    culture: 'inconnue',
    confidence: 0,
    probs: {},
    status: 'incertain',
    analysisId: '—',
    modelVersion: 'Aucune culture enregistrée',
    processedAt: at,
    observedFrom: at.slice(0, 10),
    observedTo: at.slice(0, 10),
  };
}

/**
 * Partie qui reprend l'identité (et la culture) de la parcelle d'origine :
 * celle qui contient son centre. Pour un contour concave dont le centre tombe
 * hors des deux parties, la plus grande part fait foi.
 */
function keeperPartIndex(centroid: LatLng, first: LatLng[], second: LatLng[]): 0 | 1 {
  const inFirst = pointInPolygon(centroid, first);
  const inSecond = pointInPolygon(centroid, second);
  if (inFirst !== inSecond) return inFirst ? 0 : 1;
  return ringAreaHa(first) >= ringAreaHa(second) ? 0 : 1;
}

/**
 * Payload POST /api/parcelles d'un contour issu d'une scission.
 *
 * La nouvelle partie est un contour seul (culture à déterminer par une analyse).
 * Quand la parcelle scindée n'existait qu'à l'écran (tracé IA non enregistré),
 * la partie conservée reprend en plus la culture de la parcelle d'origine pour
 * que son enregistrement ne perde pas les données déjà analysées.
 */
function parcelCreatePayload(
  parcel: Parcel,
  coords: LatLng[],
  centroid: LatLng,
  areaHa: number,
  options: {
    label: string;
    dataSource: string;
    verdict: string;
    details: string;
    notes: string;
    /** Saison dans laquelle la partie est enregistrée (affichage après rechargement). */
    saison: string | null;
    keepCulture: boolean;
  },
): CreateMaltoParcelPayload {
  const detail = options.keepCulture ? parcel.cultureDetail : undefined;
  const result = options.keepCulture
    ? parcel.results[DEFAULT_SEASON] ?? Object.values(parcel.results)[0]
    : undefined;
  // Culture de repli quand seule la fiche locale existe (tracé IA analysé à
  // l'écran, pas encore relu depuis une ligne en base).
  const fallbackCulture = result && result.culture !== 'inconnue' ? CULTURE_BY_ID[result.culture].label : null;
  return {
    label: options.label,
    coordinates: coords.map(([lat, lng]) => ({ lat, lng })),
    center_lat: centroid[0],
    center_lng: centroid[1],
    surface_ha: areaHa,
    culture_declared: detail?.declared ?? fallbackCulture ?? 'Inconnue',
    culture_detected: detail?.detected ?? fallbackCulture,
    ndvi_percentage: detail?.ndvi ?? null,
    ndre: detail?.ndre ?? null,
    spectral_bands: detail?.spectralBands ?? null,
    confidence: detail?.confidence ?? (result ? Math.round(result.confidence * 100) : null),
    verdict: detail?.verdict ?? options.verdict,
    details: detail?.details ?? options.details,
    saison: detail?.seasonLabel ?? result?.seasonId ?? options.saison,
    soil_type: detail?.soilType ?? null,
    risk_factors: detail?.riskFactors ?? [],
    recommendations: detail?.recommendations ?? null,
    data_source: options.dataSource,
    owner_name: detail?.ownerName ?? '',
    notes: detail?.notes ?? options.notes,
    time_series_s2: detail?.timeSeries ?? [],
    time_series_s1: [],
    time_series_rain: [],
    estimated_planting_date: detail?.plantingDate ?? null,
    estimated_harvest_date: detail?.harvestDate ?? null,
    days_since_planting: detail?.daysSincePlanting ?? null,
    growth_stage: detail?.growthStage ?? null,
    planting_confidence: detail?.plantingConfidence ?? null,
    evi: detail?.evi ?? null,
    savi: detail?.savi ?? null,
    ndwi: detail?.ndwi ?? null,
    agro_score: detail?.agroScore ?? null,
    hybrid_score: detail?.hybridScore ?? null,
    cnn_prob_barley: detail?.cnnProbBarley ?? null,
    cnn_prob_non_barley: detail?.cnnProbNonBarley ?? null,
  };
}

/** Centroïde arithmétique d'un anneau de sommets. */
function avgPoint(coords: LatLng[]): LatLng {
  if (!coords.length) return [0, 0];
  let x = 0, y = 0;
  for (const [a, b] of coords) { x += a; y += b; }
  return [x / coords.length, y / coords.length];
}

function bboxRadiusM(coords: LatLng[], center: LatLng): number {
  if (!coords.length) return 800;
  let max = 0;
  const [cx, cy] = center;
  for (const [a, b] of coords) {
    const dLat = (a - cx) * 111_000;
    const dLon = (b - cy) * 111_000 * Math.cos((cx * Math.PI) / 180);
    const d = Math.sqrt(dLat * dLat + dLon * dLon);
    if (d > max) max = d;
  }
  return Math.max(200, Math.min(5000, Math.round(max * 1.2)));
}

function pickCenter(s: any, ctx: { zoneLabel: string; regionId?: string; communeId?: string; zone?: LatLng[] | null }): LatLng {
  if (ctx.zone && ctx.zone.length >= 3) return avgPoint(ctx.zone);
  if (ctx.communeId) {
    const c = s.communes.find((x: any) => x.id === ctx.communeId);
    if (c && c.outline?.length) return avgPoint(c.outline as LatLng[]);
  }
  if (ctx.regionId) {
    const r = s.regions.find((x: any) => x.id === ctx.regionId);
    if (r && r.outline?.length) return avgPoint(r.outline as LatLng[]);
  }
  return [-19.87, 47.03]; // Antsirabe approx
}

function pickRadiusM(ctx: { zone?: LatLng[] | null; center: LatLng }): number {
  if (ctx.zone && ctx.zone.length >= 3) return bboxRadiusM(ctx.zone, ctx.center);
  return 1000;
}

/** Résultat du pipeline Malto (tracé + classification orge). */
interface MaltoPipelineResult {
  warnings: string[];
  scenes: number;
  tracedCount: number;
  /** Parcelles dessinées à la main incluses dans la classification. */
  manualCount: number;
  barleyCount: number;
  parcelCount: number;
  areaHa: number;
}

/**
 * Pipeline complet reprenant la méthode du frontend Malto :
 *  1) tracé automatique des parcelles — POST /api/zone-parcels (modèle VHR
 *     Delineate Anything JECAM) ;
 *  2) classification orge / autre culture — POST /api/analyze avec `traced_parcels`
 *     (classifieur RF Sentinel-2 appliqué aux contours tracés).
 * Les parcelles tracées sont ajoutées au store (déduplication par id) puis
 * classées (culture orge + confiance) lorsque le backend les confirme.
 */
async function runMaltoPipeline(
  id: string,
  center: LatLng,
  radiusM: number,
  seasonId: string,
  zone: LatLng[] | null,
): Promise<MaltoPipelineResult> {
  const { getState, setState } = useApp;
  const stamp = () => new Date().toISOString();
  const patchLog = (msg: string, level: 'info' | 'warn' = 'info') =>
    setState((s) => ({
      analyses: s.analyses.map((a) =>
        a.id === id ? { ...a, logs: [...a.logs, { at: stamp(), level, msg }] } : a),
    }));

  // 1) Tracé automatique des parcelles (JECAM-VHR) autour du centre du périmètre.
  patchLog('Tracé automatique des parcelles (modèle VHR JECAM)…');
  let traced: Parcel[] = [];
  try {
    const traceRadius = Math.min(1000, Math.max(200, radiusM)); // plafond du service de tracage
    const zp = await api.zoneParcels({ latitude: center[0], longitude: center[1], radius_m: traceRadius });
    const features = (zp.geojson?.features ?? []) as MaltoVhrFeature[];
    const st = getState();
    traced = maltoVhrToFrontend(features, { regions: st.regions, communes: st.communes })
      .map((p) => ({
        ...p,
        results: { ...p.results, [seasonId]: { ...p.results[DEFAULT_SEASON], seasonId } },
      }))
      // Un contour supprimé par l'utilisateur ne revient ni sur la carte ni dans l'analyse.
      .filter((p) => !isRejectedParcel(p, st.rejectedParcels));
    if (traced.length) {
      const existing = new Set(st.parcels.map((p) => p.id));
      const added = traced.filter((p) => !existing.has(p.id));
      setState((s2) => ({ parcels: [...s2.parcels, ...added] }));
      patchLog(
        added.length === 0
          ? `${traced.length} contours tracés (${traceRadius} m) — tous déjà présents. ` +
            'Le service de tracage sert actuellement sa base précalculée quel que soit le lieu ; ' +
            'une remesure côté service VHR est nécessaire pour obtenir de nouveaux contours.'
          : `${traced.length} contours tracés (${traceRadius} m), dont ${added.length} nouvelles parcelles.`,
      );
    } else {
      patchLog('Aucune parcelle tracée dans ce rayon (image ou service de tracage indisponible).', 'warn');
    }
  } catch (err) {
    patchLog(`Tracé automatique indisponible : ${err instanceof Error ? err.message : String(err)}`, 'warn');
  }

  // 2) Classification orge / autre culture (RF Sentinel-2) des contours tracés
  // automatiquement ET des parcelles tracées à la main dans le périmètre.
  const current = getState();
  const manualParcels = parcelsForAnalysis(
    current.parcels,
    { lat: center[0], lng: center[1], radiusM, zone },
    current.rejectedParcels,
  ).filter(isManualParcel);
  // Parcelles déjà analysées : elles ne sont pas reclassées, leurs données
  // enregistrées restent inchangées.
  const alreadyAnalyzed = analyzedParcelIds(current.parcels);
  const analysisParcels = [...manualParcels, ...traced].filter((p) => !alreadyAnalyzed.has(p.id));
  const skippedCount = manualParcels.length + traced.length - analysisParcels.length;
  patchLog(
    `Classification orge / autre culture (RF Sentinel-2) sur ${traced.length} contour(s) automatique(s) `
    + `et ${manualParcels.length} parcelle(s) tracée(s) manuellement…`,
  );
  if (skippedCount > 0) {
    patchLog(
      `${skippedCount} parcelle(s) déjà analysée(s) ignorée(s) : leurs données enregistrées restent inchangées.`,
      'warn',
    );
  }
  if (analysisParcels.length === 0) {
    return {
      warnings: ['Toutes les parcelles du périmètre ont déjà été analysées : aucune nouvelle analyse nécessaire.'],
      scenes: 0,
      tracedCount: traced.length,
      manualCount: manualParcels.length,
      barleyCount: 0,
      parcelCount: current.parcels.filter((p) => p.results[seasonId] && (!zone || pointInPolygon(p.centroid, zone))).length,
      areaHa: current.parcels
        .filter((p) => p.results[seasonId] && (!zone || pointInPolygon(p.centroid, zone)))
        .reduce((t, p) => t + p.areaHa, 0),
    };
  }
  const traced_parcels = analysisParcels.slice(0, 500).map(toTracedParcelInput);
  const res = await api.analyzeSimple({
    latitude: center[0],
    longitude: center[1],
    radius: radiusM,
    traced_parcels,
  });

  // Application des verdicts orge : chaque feature est rattachée à la parcelle
  // tracée dont le centroïde est le plus proche (< 100 m).
  const feats = (res.features ?? []) as AnalyzeSimpleFeature[];
  const classified = new Map<string, { conf: number; ndvi: number | null }>();
  for (const f of feats) {
    const ring = f.geometry?.type === 'Polygon' ? (f.geometry?.coordinates ?? [])[0] : undefined;
    if (!ring || ring.length < 3) continue;
    let fx = 0, fy = 0;
    for (const [lng, lat] of ring) { fx += lng; fy += lat; }
    const flat: LatLng = [fy / ring.length, fx / ring.length];
    let best: Parcel | null = null;
    let bestD = Infinity;
    for (const p of analysisParcels) {
      const dLat = (p.centroid[0] - flat[0]) * 111_000;
      const dLon = (p.centroid[1] - flat[1]) * 111_000 * Math.cos((flat[0] * Math.PI) / 180);
      const d = Math.hypot(dLat, dLon);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && bestD < 100) {
      const raw = f.properties?.confidence ?? 50;
      classified.set(best.id, {
        conf: Math.min(0.99, Math.max(0.05, raw > 1 ? raw / 100 : raw)),
        ndvi: typeof f.properties?.meanNDVI === 'number' ? f.properties.meanNDVI : null,
      });
    }
  }
  let barleyCount = 0;
  if (classified.size) {
    setState((s2) => ({
      parcels: s2.parcels.map((p) => {
        const c = classified.get(p.id);
        if (!c) return p;
        barleyCount++;
        return {
          ...p,
          results: {
            ...p.results,
            [seasonId]: {
              seasonId,
              culture: 'orge' as CultureId,
              confidence: c.conf,
              probs: { orge: c.conf } as Partial<Record<CultureId, number>>,
              status: statusFromConfidence('orge', c.conf),
              analysisId: id,
              modelVersion: `Malto RF orge${c.ndvi != null ? ` · NDVI ${Math.round(c.ndvi)} %` : ''}`,
              processedAt: stamp(),
              observedFrom: stamp().slice(0, 10),
              observedTo: stamp().slice(0, 10),
            },
          },
        };
      }),
    }));
  }
  patchLog(`${barleyCount} parcelle(s) classée(s) ORGE (confiance du modèle, seuil backend).`);

  // Stats finales recalculées sur le store à jour, limitées au périmètre de l'analyse.
  const st = getState();
  const scoped = st.parcels.filter(
    (p) => p.results[seasonId] && (!zone || pointInPolygon(p.centroid, zone)),
  );
  return {
    warnings: res.warnings ?? [],
    scenes: typeof res.candidatesClassified === 'number' ? res.candidatesClassified : analysisParcels.length,
    tracedCount: traced.length,
    manualCount: manualParcels.length,
    barleyCount,
    parcelCount: scoped.length,
    areaHa: scoped.reduce((t, p) => t + p.areaHa, 0),
  };
}

/** Simule l'exécution asynchrone d'un pipeline — repli hors connexion Malto. */
function runSimulation(id: string, count: number, area: number, partialOutcome: boolean) {
  const { getState, setState } = useApp;
  const patch = (fn: (a: Analysis) => Analysis) =>
    setState((s) => ({ analyses: s.analyses.map((a) => (a.id === id ? fn(a) : a)) }));

  patch((a) => ({ ...a, status: 'en_cours', startedAt: new Date().toISOString(), scenes: rint(20, 80) }));
  const tick = () => {
    const a = getState().analyses.find((x) => x.id === id);
    if (!a || a.status !== 'en_cours') return;
    const next = Math.min(100, a.progress + rint(6, 14));
    const before = Math.floor((a.progress / 100) * PIPELINE_STEPS.length);
    const after = Math.floor((next / 100) * PIPELINE_STEPS.length);
    const newLogs = PIPELINE_STEPS.slice(before, after).map((m) => ({ at: new Date().toISOString(), level: 'info' as const, msg: `${m} — terminé` }));
    if (next >= 100) {
      patch((x) => ({
        ...x, progress: 100, logs: [...x.logs, ...newLogs], finishedAt: new Date().toISOString(),
        status: partialOutcome ? 'terminee_avertissements' : 'terminee',
        warnings: partialOutcome ? ['Résultat partiel : 2 scènes seulement exploitables, confiance moyenne réduite.'] : [],
        parcelCount: count, areaHa: area,
      }));
      getState().toast(`Analyse ${id} terminée.`, 'ok');
    } else {
      patch((x) => ({ ...x, progress: next, logs: [...x.logs, ...newLogs] }));
      setTimeout(tick, 900);
    }
  };
  setTimeout(tick, 900);
}
