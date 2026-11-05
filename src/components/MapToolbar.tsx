import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ClipboardList, Crosshair, Eraser, Home, Layers, Loader2, MapPin, PenTool, Search, Undo2, X, ScanSearch, Camera, Sparkles, Waypoints, Radar, Navigation, ThermometerSun } from 'lucide-react';
import { useApp } from '../store/useApp';
import { bboxOf, centroidOf, M_PER_DEG_LAT, mPerDegLng, ringAreaHa } from '../lib/geometry';
import { normalize, shortId, withoutToolName } from '../lib/format';
import { parseCoordinates } from '../lib/coordinates';
import CaptureProgressOverlay, { type CaptureProgressView } from './CaptureProgressOverlay';
import {
  api,
  type AutomaticDetectionParcel,
  type AutomaticDetectionResult,
  type GeminiParcelsPayload,
} from '../api/services';
import { maltoToFrontend, type MaltoParcel } from '../api/maltoAdapter';
import { parcelsForAnalysis, toTracedParcelInput } from '../lib/analysis-parcels';
import { candidateCulture, parcelForCandidate, parcelShowsCandidateCulture } from '../lib/candidate-parcel';
import { runBatchesWithRetry } from '../lib/detect-queue';
import type { AnalysisParcel } from '../types';

const NATIONAL: [[number, number], [number, number]] = [[-25.8, 43.0], [-11.8, 50.7]];

/**
 * Capture satellite envoyée à Gemini : une zone d'environ 400 m assemblée à
 * partir de tuiles de 120 m, puis analysée par fenêtres qui se chevauchent
 * pour tracer toutes les limites de parcelles de la zone.
 */
const GEMINI_CAPTURE_SPAN_M = 400;
const GEMINI_CAPTURE_TILE_SPAN_M = 120;

/**
 * Nombre de parcelles envoyées par requête d'analyse automatique.
 *
 * L'analyse d'une parcelle prend plusieurs dizaines de secondes : un seul appel
 * pour tout le rayon dépassait les budgets du serveur, qui rendait alors des
 * parcelles non analysées. Quatre parcelles par lot correspondent à la concurrence
 * du backend, donc plus de seconde vague où trois créneaux attendent la plus lente.
 */
const DETECT_BATCH_SIZE = 4;

/** Requêtes simultanées : les créneaux du serveur restent occupés d'un lot à l'autre. */
const DETECT_MAX_IN_FLIGHT = 2;

/** Tentatives par lot : un échec réseau ou un délai dépassé ne doit pas arrêter l'analyse. */
const DETECT_BATCH_ATTEMPTS = 2;

/** Culture affichée pour un résultat automatique, selon le code couleur de l'application. */
function automaticCulture(candidate: AutomaticDetectionParcel): {
  id: 'orge' | 'autre' | 'inconnue';
  label: string;
} {
  const id = candidateCulture(candidate);
  if (id === 'orge') return { id, label: 'Orge' };
  if (id === 'autre') return { id, label: 'Autre culture' };
  return {
    id,
    label: candidate.analysis?.culture_detected?.trim()
      || (candidate.analysis_error ? 'Analyse indisponible' : 'Non classée'),
  };
}

export default function MapToolbar({ onAnalyze, canLaunch }: { onAnalyze?: () => void; canLaunch?: boolean }) {
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const selectedId = useApp((s) => s.selectedId);
  const filtersOpen = useApp((s) => s.filtersOpen);
  const regions = useApp((s) => s.regions);
  const communes = useApp((s) => s.communes);
  const bornes = useApp((s) => s.bornes);
  const bornePlacement = useApp((s) => s.bornePlacement);
  const startBornePlacement = useApp((s) => s.startBornePlacement);
  const cancelBornePlacement = useApp((s) => s.cancelBornePlacement);
  const setSearchedLocation = useApp((s) => s.setSearchedLocation);
  const onMapPage = useLocation().pathname === '/carte';
  const navigate = useNavigate();
  const flyTo = useApp((s) => s.flyTo);
  const basemap = useApp((s) => s.basemap);
  const setBasemap = useApp((s) => s.setBasemap);
  const showCoverage = useApp((s) => s.showCoverage);
  const setShowCoverage = useApp((s) => s.setShowCoverage);
  const drawing = useApp((s) => s.drawing);
  const draft = useApp((s) => s.draft);
  const zone = useApp((s) => s.zone);
  const manualParcelDraft = useApp((s) => s.manualParcelDraft);
  const drawMode = useApp((s) => s.drawMode);
  const { startDraw, startParcelDraw, undoDraft, finishDraw, cancelDraw, clearManualParcelDraft, addManualParcel, setZone } = useApp.getState();
  const addDetectedParcels = useApp((s) => s.addDetectedParcels);
  const mapCenter = useApp((s) => s.mapCenter);
  const mapZoom = useApp((s) => s.mapZoom);
  const mapBounds = useApp((s) => s.mapBounds);
  const mapSize = useApp((s) => s.mapSize);
  const setGeminiCapture = useApp((s) => s.setGeminiCapture);
  const recordCaptureAnalysis = useApp((s) => s.recordCaptureAnalysis);
  const toast = useApp((s) => s.toast);
  const parcels = useApp((s) => s.parcels);
  const seasonId = useApp((s) => s.filters.seasonId);
  const colors = useApp((s) => s.colors);
  const reload = useApp((s) => s.reload);
  const rejectedParcels = useApp((s) => s.rejectedParcels);
  const automaticDetection = useApp((s) => s.automaticDetection);
  const setAutomaticDetection = useApp((s) => s.setAutomaticDetection);
  const selectedAutomaticParcelId = useApp((s) => s.selectedAutomaticParcelId);
  const selectAutomaticParcel = useApp((s) => s.selectAutomaticParcel);
  const recordAutomaticSearch = useApp((s) => s.recordAutomaticSearch);
  const automaticSearchCenter = useApp((s) => s.automaticSearchCenter);
  const setAutomaticSearchCenter = useApp((s) => s.setAutomaticSearchCenter);
  const setAutomaticSearchRadius = useApp((s) => s.setAutomaticSearchRadius);
  const [pending, setPending] = useState(false);
  /** Avancement du traitement des parcelles du rayon (0 tant qu'aucune n'est visée). */
  const [autoProgress, setAutoProgress] = useState<{ done: number; total: number } | null>(null);
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [geminiPending, setGeminiPending] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  /**
   * Dernière capture terminée : les résultats (image et parcelles détectées) ne
   * s'affichent plus ici mais dans l'historique des captures et détections.
   * Ce drapeau ne sert qu'à proposer le lien vers cet historique.
   */
  const [geminiDone, setGeminiDone] = useState(false);
  const [parcelLabel, setParcelLabel] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [parcelNotes, setParcelNotes] = useState('');
  const [savingParcel, setSavingParcel] = useState(false);
  const [parcelError, setParcelError] = useState<string | null>(null);
  const [autoSearchOpen, setAutoSearchOpen] = useState(false);
  const [autoLat, setAutoLat] = useState('-19.852210');
  const [autoLng, setAutoLng] = useState('47.010822');
  const [autoRadiusM, setAutoRadiusM] = useState('100');
  const [baseTemperature, setBaseTemperature] = useState('5');
  const [gddThreshold, setGddThreshold] = useState('2000');
  const [periodDays, setPeriodDays] = useState('130');
  const [autoSearchError, setAutoSearchError] = useState<string | null>(null);
  /** Palier réel de la capture, `null` quand elle n'est pas en cours. */
  const [captureProgress, setCaptureProgress] = useState<CaptureProgressView | null>(null);
  /** Palier de la recherche automatique, affiché dans la même fenêtre bloquante. */
  const [autoSearchProgress, setAutoSearchProgress] = useState<CaptureProgressView | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoAbortRef = useRef<AbortController | null>(null);
  const coordinateFromInput = useRef<[number, number] | null>(null);
  const progressDoneTimer = useRef<number | null>(null);
  const autoProgressDoneTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!automaticSearchCenter) return;
    if (coordinateFromInput.current?.[0] === automaticSearchCenter[0]
      && coordinateFromInput.current?.[1] === automaticSearchCenter[1]) {
      coordinateFromInput.current = null;
      return;
    }
    setAutoLat(automaticSearchCenter[0].toFixed(6));
    setAutoLng(automaticSearchCenter[1].toFixed(6));
  }, [automaticSearchCenter]);

  useEffect(() => {
    setSearchOpen(false);
    // Seul l'ouverture des filtres referme le panneau automatique : changer de
    // parcelle sélectionnée (résultat de l'analyse, fiche ouverte) doit au
    // contraire laisser les résultats consultables.
    if (!filtersOpen) return;
    setAutoSearchOpen(false);
    setAutomaticSearchCenter(null);
    setAutomaticSearchRadius(null);
    selectAutomaticParcel(null);
  }, [selectedId, filtersOpen, selectAutomaticParcel, setAutomaticSearchCenter, setAutomaticSearchRadius]);

  const clearProgressDoneTimer = () => {
    if (progressDoneTimer.current !== null) {
      window.clearTimeout(progressDoneTimer.current);
      progressDoneTimer.current = null;
    }
  };

  // Annulation au démontage (changement de page) : pas de mise à jour d'état après.
  useEffect(() => () => {
    abortRef.current?.abort();
    autoAbortRef.current?.abort();
    clearProgressDoneTimer();
    if (autoProgressDoneTimer.current !== null) {
      window.clearTimeout(autoProgressDoneTimer.current);
      autoProgressDoneTimer.current = null;
    }
  }, []);

  // Le placement n'a de sens que sur la carte et jamais pendant un tracé.
  useEffect(() => {
    if ((!onMapPage || drawing) && bornePlacement) cancelBornePlacement();
  }, [onMapPage, drawing, bornePlacement, cancelBornePlacement]);

  /**
   * Progression de la capture.
   *
   * Aucun pourcentage n'est inventé côté client : le backend envoie chaque
   * palier dès qu'il est réellement atteint (tuiles téléchargées, fenêtres
   * Gemini terminées, enregistrement en base). Le client se contente de les
   * afficher et ne passe à 100 % qu'après réception du résultat complet.
   */
  const startCaptureProgress = () => {
    clearProgressDoneTimer();
    setCaptureProgress({ percent: 1, label: 'Préparation de la capture…', done: false });
  };
  const updateCaptureProgress = (step: { percent: number; label: string }) => {
    // L'étape vient du backend : on neutralise le nom du moteur d'analyse, comme
    // partout ailleurs dans l'interface.
    setCaptureProgress({ percent: step.percent, label: withoutToolName(step.label), done: false });
  };
  const finishCaptureProgress = () => {
    clearProgressDoneTimer();
    setCaptureProgress({ percent: 100, label: 'Analyse terminée', done: true });
    // Petit temps de lecture avant de rendre la main : la disparition est
    // automatique, mais le pourcentage 100 % est atteint uniquement avec le
    // résultat réel du backend.
    progressDoneTimer.current = window.setTimeout(() => {
      setCaptureProgress((current) => (current ? { ...current, leaving: true } : current));
      progressDoneTimer.current = window.setTimeout(() => {
        setCaptureProgress(null);
        progressDoneTimer.current = null;
      }, 300);
    }, 700);
  };
  const abortCaptureProgress = () => {
    clearProgressDoneTimer();
    setCaptureProgress(null);
  };

  const clearAutoProgressDoneTimer = () => {
    if (autoProgressDoneTimer.current !== null) {
      window.clearTimeout(autoProgressDoneTimer.current);
      autoProgressDoneTimer.current = null;
    }
  };
  /** Palier borné entre 1 et 99 % : 100 % n'est affiché qu'après la synchronisation. */
  const setAutoSearchStep = (percent: number, label: string) => {
    setAutoSearchProgress({
      percent: Math.max(1, Math.min(99, Math.round(percent))),
      label,
      done: false,
    });
  };
  const startAutoSearchProgress = () => {
    clearAutoProgressDoneTimer();
    setAutoSearchProgress({ percent: 2, label: 'Préparation de la recherche automatique…', done: false });
  };
  const finishAutoSearchProgress = () => {
    clearAutoProgressDoneTimer();
    setAutoSearchProgress({ percent: 100, label: 'Analyse terminée', done: true });
    autoProgressDoneTimer.current = window.setTimeout(() => {
      setAutoSearchProgress((current) => (current ? { ...current, leaving: true } : current));
      autoProgressDoneTimer.current = window.setTimeout(() => {
        setAutoSearchProgress(null);
        autoProgressDoneTimer.current = null;
      }, 300);
    }, 700);
  };
  const abortAutoSearchProgress = () => {
    clearAutoProgressDoneTimer();
    setAutoSearchProgress(null);
  };

  /**
   * Annule la capture ou la détection en cours.
   *
   * L'AbortController coupe le flux NDJSON et la requête HTTP ; le serveur peut
   * déjà avoir enregistré des parcelles, mais l'interface cesse immédiatement
   * d'attendre et ne présente aucun résultat partiel.
   */
  const cancelCapture = () => {
    const ctrl = abortRef.current;
    if (!ctrl || ctrl.signal.aborted) return;
    abortRef.current = null;
    ctrl.abort();
    abortCaptureProgress();
    setGeminiPending(false);
    toast('Capture et détection annulées.', 'info');
  };

  /** Annule la recherche automatique en cours (requêtes et mise à jour d'interface). */
  const cancelAutomaticSearch = () => {
    const ctrl = autoAbortRef.current;
    if (!ctrl || ctrl.signal.aborted) return;
    autoAbortRef.current = null;
    ctrl.abort();
    abortAutoSearchProgress();
    setPending(false);
    setAutoProgress(null);
    toast('Recherche automatique annulée.', 'info');
  };

  /**
   * Capture satellite de la zone de terrain visible à l'écran, détection de
   * toutes les parcelles puis enregistrement en base.
   */
  const captureTerrain = async (center?: [number, number]) => {
    if (geminiPending) return;
    abortRef.current?.abort(); // annule une capture précédente éventuelle
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setGeminiPending(true);
    setGeminiError(null);
    setGeminiDone(false);
    startCaptureProgress();
    const targetCenter = center || mapCenter;
    try {
      const isCustomCenter = Array.isArray(center) && (center[0] !== mapCenter[0] || center[1] !== mapCenter[1]);

      const payload: GeminiParcelsPayload = {
        latitude: targetCenter[0],
        longitude: targetCenter[1],
        zoom: mapZoom,
      };

      if (!isCustomCenter && mapBounds && mapSize) {
        payload.viewport_width = Math.round(mapSize.width);
        payload.viewport_height = Math.round(mapSize.height);
        payload.bounds = mapBounds;
      } else {
        payload.span_m = GEMINI_CAPTURE_SPAN_M;
        payload.tile_span_m = GEMINI_CAPTURE_TILE_SPAN_M;
      }

      const result = await api.geminiParcelsStream(payload, updateCaptureProgress, ctrl.signal);
      if (ctrl.signal.aborted) return;

      // Les contours renvoyés sont déjà enregistrés en base (UUID) : ils suivent
      // exactement le même chemin qu'un import KML (affichage, sélection, analyse).
      const detected = maltoToFrontend(result.parcels as MaltoParcel[], { regions, communes });
      const added = addDetectedParcels(detected);
      setGeminiDone(true);

      const { bounds } = result.capture;
      setGeminiCapture({
        south: bounds.south, west: bounds.west, north: bounds.north, east: bounds.east,
        spanM: result.capture.span_m, zoom: result.capture.zoom,
      });
      // Si ce n'était pas l'écran courant (ex: zone prédéfinie), cadrer sur la zone
      if (isCustomCenter) {
        flyTo({ bounds: [[bounds.south, bounds.west], [bounds.north, bounds.east]] });
      }

      const duplicates = result.existing.length;
      // Historique de la page « Analyses » : capture, parcelles détectées et zone.
      const labels = new Map((result.parcels as MaltoParcel[]).map((row) => [row.id, row.label ?? null]));
      const detectedParcels: AnalysisParcel[] = detected.map((parcel) => ({
        id: parcel.id,
        label: labels.get(parcel.id) ?? `Parcelle ${parcel.id.slice(0, 8)}`,
        areaHa: parcel.areaHa,
        center: parcel.centroid,
      }));
      void recordCaptureAnalysis({
        center: targetCenter,
        bounds: { south: bounds.south, west: bounds.west, north: bounds.north, east: bounds.east },
        spanM: result.capture.span_m,
        zoom: result.capture.zoom,
        imageDataUrl: result.capture.image_data_url,
        parcels: detectedParcels,
        duplicates,
        warnings: result.warnings,
      });
      finishCaptureProgress();
      toast(
        result.parcels.length === 0
          ? duplicates
            ? `Détection : ${duplicates} parcelle(s) déjà présente(s) en base, aucune ajoutée.`
            : 'Aucune parcelle détectée sur cette capture.'
          : `${added} nouvelle(s) parcelle(s) enregistrée(s)`
            + (duplicates ? ` — ${duplicates} déjà en base (non dupliquée(s)).` : '.'),
        result.parcels.length ? 'ok' : duplicates ? 'info' : 'warn',
      );
    } catch (error) {
      // Une nouvelle capture a remplacé celle-ci : ses états ne nous appartiennent plus.
      if (abortRef.current !== ctrl) return;
      if (!ctrl.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error);
        setGeminiError(message);
        // Une capture en échec est consignée elle aussi : l'historique reste fidèle.
        void recordCaptureAnalysis({
          center: targetCenter,
          spanM: 0,
          zoom: mapZoom,
          parcels: [],
          error: message,
        });
      }
      abortCaptureProgress();
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setGeminiPending(false);
      }
    }
  };

  const saveManualParcel = async () => {
    if (!manualParcelDraft || savingParcel) return;
    setSavingParcel(true);
    setParcelError(null);
    try {
      const center = centroidOf(manualParcelDraft);
      const saved = await api.createParcel({
        label: parcelLabel.trim() || `Parcelle manuelle ${new Date().toLocaleDateString('fr-FR')}`,
        coordinates: manualParcelDraft.map(([lat, lng]) => ({ lat, lng })),
        center_lat: center[0],
        center_lng: center[1],
        surface_ha: ringAreaHa(manualParcelDraft),
        culture_declared: 'Inconnue',
        culture_detected: null,
        ndvi_percentage: null,
        ndre: null,
        spectral_bands: null,
        confidence: null,
        verdict: 'Contour tracé manuellement — à vérifier sur le terrain',
        details: 'Contour dessiné manuellement sur la carte Google Maps.',
        saison: null,
        soil_type: null,
        risk_factors: [],
        recommendations: null,
        data_source: 'Tracé manuel',
        owner_name: ownerName.trim(),
        notes: parcelNotes.trim(),
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
      const [parcel] = maltoToFrontend([saved as unknown as MaltoParcel], { regions, communes });
      if (!parcel) throw new Error('La parcelle a été enregistrée, mais sa géométrie est invalide.');
      addManualParcel(parcel);
      setParcelLabel('');
      setOwnerName('');
      setParcelNotes('');
      toast('Parcelle manuelle enregistrée.', 'ok');
    } catch (error) {
      setParcelError(error instanceof Error ? error.message : 'Impossible d’enregistrer la parcelle.');
    } finally {
      setSavingParcel(false);
    }
  };

  const searchAutomatic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const lat = Number(autoLat);
    const lng = Number(autoLng);
    const radiusM = Number(autoRadiusM);
    const base = Number(baseTemperature);
    const threshold = Number(gddThreshold);
    const period = Number(periodDays);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setAutoSearchError('Vérifiez la latitude et la longitude.'); return;
    }
    if (!Number.isFinite(radiusM) || radiusM < 50 || radiusM > 20_000) {
      setAutoSearchError('Le rayon doit être compris entre 50 m et 20 km.'); return;
    }
    if (!Number.isFinite(base) || base < -20 || base > 30) {
      setAutoSearchError('La température de base doit être comprise entre -20 et 30 °C.'); return;
    }
    if (!Number.isFinite(threshold) || threshold < 2_000 || threshold > 10_000) {
      setAutoSearchError('Le seuil doit être compris entre 2 000 et 10 000 °C.'); return;
    }
    if (!Number.isInteger(period) || period < 1 || period > 730) {
      setAutoSearchError('La période doit être comprise entre 1 et 730 jours.'); return;
    }

    setAutoSearchError(null);
    setAutomaticSearchCenter([lat, lng]);
    setAutomaticSearchRadius(radiusM);
    setAutomaticDetection(null);
    selectAutomaticParcel(null);
    setPending(true);
    setAutoProgress(null);
    startAutoSearchProgress();
    const ctrl = new AbortController();
    autoAbortRef.current = ctrl;

    try {
      // Contours automatiques ET parcelles tracées manuellement : les deux
      // doivent être classés, pas seulement les tracés VHR.
      const tracedParcels = parcelsForAnalysis(
        parcels,
        { lat, lng, radiusM },
        rejectedParcels,
      ).map(toTracedParcelInput);
      setAutoSearchStep(
        5,
        tracedParcels.length
          ? `${tracedParcels.length} parcelle(s) du rayon à analyser…`
          : 'Recherche des parcelles dans le rayon…',
      );

      // Le rayon choisi est cadré à l'écran : la zone analysée est visible d'emblée.
      const dLat = radiusM / M_PER_DEG_LAT;
      const dLng = radiusM / mPerDegLng(lat);
      flyTo({ bounds: [[lat - dLat, lng - dLng], [lat + dLat, lng + dLng]] });

      // Toutes les parcelles situées dans le rayon doivent être traitées : les lots
      // partent en continu (deux requêtes en vol, chacune servie par les quatre
      // créneaux du backend) et chaque lot échoué est retenté. Un lot définitivement
      // en échec n'interrompt plus les suivants : l'analyse va jusqu'à la dernière
      // parcelle. Le résultat s'affiche au fil de l'eau.
      const batches: Array<ReturnType<typeof toTracedParcelInput>[]> = [];
      for (let start = 0; start < tracedParcels.length; start += DETECT_BATCH_SIZE) {
        batches.push(tracedParcels.slice(start, start + DETECT_BATCH_SIZE));
      }
      // Aucun contour tracé dans la zone : la découverte automatique du serveur prend le relais.
      if (batches.length === 0) batches.push([]);

      let merged: AutomaticDetectionResult | null = null;
      let sent = 0;
      let failedParcels = 0;
      const failure: { error: Error | null } = { error: null };

      await runBatchesWithRetry(batches, {
        maxInFlight: DETECT_MAX_IN_FLIGHT,
        attempts: DETECT_BATCH_ATTEMPTS,
        run: async (batch) => {
          if (ctrl.signal.aborted) throw new Error('Recherche annulée.');
          if (batch.length === 0) {
            setAutoProgress({ done: 0, total: 0 });
            setAutoSearchStep(18, 'Recherche des parcelles dans la zone…');
          } else {
            const done = Math.min(sent, tracedParcels.length);
            setAutoSearchStep(
              10 + Math.round((done / tracedParcels.length) * 75),
              `Analyse des cultures… ${done}/${tracedParcels.length} parcelle(s) traitée(s)`,
            );
          }
          try {
            const result = await api.detectParcels({
              lat, lng, radiusKm: radiusM / 1000,
              baseTemperature: base, threshold, periodDays: period,
              tracedParcels: batch,
            }, ctrl.signal);
            const previous: AutomaticDetectionResult | null = merged;
            const collected: AutomaticDetectionResult['parcels'] = [
              ...(previous?.parcels ?? []),
              ...result.parcels,
            ];
            const notices: string[] = [];
            for (const notice of [previous?.notice, result.notice]) {
              if (notice && !notices.includes(notice)) notices.push(notice);
            }
            const next: AutomaticDetectionResult = {
              ...result,
              candidates_found: collected.length,
              analyzed_count: collected.filter((candidate) => candidate.analysis !== null).length,
              already_analyzed_count: (previous?.already_analyzed_count ?? 0) + (result.already_analyzed_count ?? 0),
              parcels: collected,
              notice: notices.length ? notices.join(' ') : null,
            };
            merged = next;
            setAutomaticDetection(next);
            if (batch.length === 0) {
              setAutoSearchStep(82, 'Parcelles découvertes — cultures enregistrées en base…');
            }
          } catch (error) {
            failure.error = failure.error ?? (error instanceof Error ? error : new Error(String(error)));
            throw error;
          }
        },
        onSettled: (batch, failed) => {
          if (ctrl.signal.aborted) return;
          if (failed) failedParcels += batch.length;
          sent += batch.length;
          if (tracedParcels.length) {
            const done = Math.min(sent, tracedParcels.length);
            setAutoProgress({ done, total: tracedParcels.length });
            setAutoSearchStep(
              10 + Math.round((done / tracedParcels.length) * 75),
              done >= tracedParcels.length
                ? `${done} parcelle(s) analysée(s) — finalisation…`
                : `Analyse des cultures… ${done}/${tracedParcels.length} parcelle(s) traitée(s)`,
            );
          }
        },
      });
      if (ctrl.signal.aborted) return;
      if (!merged) throw failure.error ?? new Error('La recherche automatique n’a renvoyé aucun résultat.');
      const completed: AutomaticDetectionResult = merged;
      if (failedParcels) {
        merged = {
          ...completed,
          notice: [
            `${failedParcels} parcelle(s) n’ont pas pu être analysées (erreur réseau ou délai dépassé) : relancez l’analyse pour les traiter.`,
            completed.notice,
          ].filter(Boolean).join(' '),
        };
        setAutomaticDetection(merged);
      }

      // Les résultats viennent d'être enregistrés en base par le backend : on
      // relit les parcelles, les cultures et les analyses avant de rendre la main,
      // pour que la carte et les fiches soient déjà à jour sans rechargement.
      setAutoSearchStep(90, 'Synchronisation des parcelles et des cultures depuis la base…');
      await reload();
      if (ctrl.signal.aborted) return;
      const loadError = useApp.getState().loadError;
      setAutoSearchStep(97, 'Mise à jour de la carte et des fiches détaillées…');

      // La fiche ouverte est celle de la ligne réellement relue en base : elle
      // porte la culture, la confiance et la couleur officielles de l'application.
      const freshParcels = useApp.getState().parcels;
      const preferred = merged.parcels
        .map((candidate) => ({ candidate, parcel: parcelForCandidate(candidate, freshParcels) }))
        .find((entry) => entry.parcel && entry.candidate.analysis)
        ?? merged.parcels
          .map((candidate) => ({ candidate, parcel: parcelForCandidate(candidate, freshParcels) }))
          .find((entry) => entry.parcel);
      if (preferred?.parcel) {
        selectAutomaticParcel(preferred.candidate.id);
        // Une seule fiche ouverte : celle de la parcelle relue en base quand elle
        // affiche déjà le résultat, sinon les détails du résultat automatique.
        useApp.getState().select(
          parcelShowsCandidateCulture(preferred.parcel, preferred.candidate, seasonId)
            ? preferred.parcel.id
            : null,
        );
        flyTo({
          center: preferred.parcel.centroid,
          zoom: Math.max(useApp.getState().mapZoom, 17),
        });
      } else {
        selectAutomaticParcel(null);
      }

      const barley = merged.parcels.filter((candidate) => candidate.analysis?.is_barley === true).length;
      const failed = merged.parcels.filter((candidate) => candidate.analysis === null).length;
      if (loadError) {
        setAutoSearchError(
          'Analyse terminée, mais la synchronisation avec la base a échoué : les résultats restent affichés, relancez la recherche si nécessaire.',
        );
      }
      toast(
        `${merged.candidates_found} candidat(s) traité(s) — ${barley} avec orge détectée.`
          + (failed ? ` ${failed} parcelle(s) sans résultat (analyse satellite indisponible).` : '')
          + (failedParcels ? ` ${failedParcels} parcelle(s) non traitées (lots en échec).` : '')
          + (loadError ? ' Synchronisation avec la base incomplète.' : ' Parcelles, cultures et fiches actualisées.'),
        loadError ? 'warn' : barley ? 'ok' : 'info',
      );
      // Historique dédié aux recherches automatiques : chaque culture lue est
      // consignée avec sa parcelle, séparément de l'historique des analyses Gemini.
      recordAutomaticSearch({
        center: [lat, lng],
        radiusM,
        baseTemperature: base,
        threshold,
        periodDays: period,
        candidates: merged.candidates_found,
        analyzed: merged.analyzed_count,
        alreadyAnalyzed: merged.already_analyzed_count ?? 0,
        notice: merged.notice,
        cultures: merged.parcels.flatMap((candidate) => {
          const culture = automaticCulture(candidate);
          if (culture.id === 'inconnue') return [];
          const parcel = parcelForCandidate(candidate, freshParcels);
          return [{
            parcelId: parcel?.id ?? candidate.id,
            label: shortId(parcel?.id ?? candidate.id),
            areaHa: parcel?.areaHa ?? 0,
            culture: culture.id,
            cultureLabel: culture.label,
            confidence: typeof candidate.analysis?.confidence === 'number'
              ? candidate.analysis.confidence
              : null,
          }];
        }),
      });
      finishAutoSearchProgress();
    } catch (error) {
      if (autoAbortRef.current !== ctrl) return;
      if (!ctrl.signal.aborted) {
        setAutoSearchError(error instanceof Error ? error.message : 'La recherche automatique a échoué.');
      }
      abortAutoSearchProgress();
    } finally {
      if (autoAbortRef.current === ctrl) {
        autoAbortRef.current = null;
        setPending(false);
        setAutoProgress(null);
      }
    }
  };

  /** Rayon valide saisi dans le formulaire, sinon `null` (le cercle n'est alors pas affiché). */
  const validRadiusM = () => {
    const radius = Number(autoRadiusM);
    return Number.isFinite(radius) && radius >= 50 && radius <= 20_000 ? radius : null;
  };

  /** Met à jour le rayon de la zone affichée pendant la saisie. */
  const updateSearchRadius = (value: string) => {
    setAutoRadiusM(value);
    const radius = Number(value);
    if (Number.isFinite(radius) && radius >= 50 && radius <= 20_000) setAutomaticSearchRadius(radius);
  };

  const toggleAutoSearch = () => {
    if (autoSearchOpen) {
      setAutoSearchOpen(false);
      setAutomaticSearchCenter(null);
      setAutomaticSearchRadius(null);
      selectAutomaticParcel(null);
      return;
    }
    cancelBornePlacement();
    setSearchOpen(false);
    setGeminiOpen(false);
    selectAutomaticParcel(null);
    useApp.getState().select(null);
    useApp.getState().setFiltersOpen(false);
    const lat = Number(autoLat);
    const lng = Number(autoLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) setAutomaticSearchCenter([lat, lng]);
    // La zone de l'analyse est matérialisée dès l'ouverture du formulaire.
    setAutomaticSearchRadius(validRadiusM());
    setAutoSearchOpen(true);
  };

  const togglePlaceSearch = () => {
    const opening = !searchOpen;
    setSearchOpen(opening);
    if (!opening) return;
    cancelBornePlacement();
    setAutoSearchOpen(false);
    setGeminiOpen(false);
    setAutomaticSearchCenter(null);
    setAutomaticSearchRadius(null);
    selectAutomaticParcel(null);
    useApp.getState().select(null);
    useApp.getState().setFiltersOpen(false);
  };

  const toggleBornePlacement = () => {
    if (bornePlacement) {
      cancelBornePlacement();
      return;
    }
    setSearchOpen(false);
    setAutoSearchOpen(false);
    setGeminiOpen(false);
    setAutomaticSearchCenter(null);
    setAutomaticSearchRadius(null);
    selectAutomaticParcel(null);
    useApp.getState().select(null);
    useApp.getState().setFiltersOpen(false);
    startBornePlacement();
  };

  const goToCoordinates = (point: { lat: number; lng: number }) => {
    setSearchedLocation({
      kind: 'coords',
      lat: point.lat,
      lng: point.lng,
      label: 'Emplacement recherché',
    });
    useApp.getState().select(null);
    flyTo({ center: [point.lat, point.lng], zoom: 18 });
    setQ('');
    setSearchOpen(false);
  };

  const goToBorne = (borne: { id: string; name: string; lat: number; lng: number }) => {
    setSearchedLocation({
      kind: 'borne',
      lat: borne.lat,
      lng: borne.lng,
      label: borne.name,
      borneId: borne.id,
    });
    useApp.getState().select(null);
    flyTo({ center: [borne.lat, borne.lng], zoom: 18 });
    setQ('');
    setSearchOpen(false);
  };

  const closeGemini = () => {
    setGeminiOpen(false);
    setGeminiError(null);
    setGeminiDone(false);
    setGeminiCapture(null);
  };

  const toggleGemini = () => {
    if (geminiOpen) {
      closeGemini();
      return;
    }
    cancelBornePlacement();
    setGeminiOpen(true);
    setSearchOpen(false);
    setAutoSearchOpen(false);
    setAutomaticSearchCenter(null);
    setAutomaticSearchRadius(null);
    selectAutomaticParcel(null);
    useApp.getState().select(null);
    useApp.getState().setFiltersOpen(false);
  };

  const updateSearchCoordinate = (axis: 'lat' | 'lng', value: string) => {
    if (axis === 'lat') setAutoLat(value); else setAutoLng(value);
    const lat = Number(axis === 'lat' ? value : autoLat);
    const lng = Number(axis === 'lng' ? value : autoLng);
    if (Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180) {
      coordinateFromInput.current = [lat, lng];
      setAutomaticSearchCenter(coordinateFromInput.current);
    }
  };

  const coordinateResult = useMemo(() => parseCoordinates(q), [q]);
  const coordinates = coordinateResult && 'lat' in coordinateResult ? coordinateResult : null;
  const coordinateError = coordinateResult && 'error' in coordinateResult ? coordinateResult.error : null;

  const placeResults = useMemo(() => {
    const n = normalize(q.trim());
    if (!n) return [];
    return [
      ...regions.map((r) => ({ key: r.id, label: r.name, sub: 'Région', bounds: bboxOf(r.outline) })),
      ...communes.map((c) => ({ key: c.id, label: c.name, sub: `Commune · ${regions.find((r) => r.id === c.regionId)?.name}`, bounds: bboxOf(c.outline) })),
    ].filter((x) => normalize(x.label).includes(n)).slice(0, 6);
  }, [q, regions, communes]);

  const borneResults = useMemo(() => {
    const n = normalize(q.trim());
    if (!n) return [];
    return bornes.filter((borne) => normalize(borne.name).includes(n)).slice(0, 6);
  }, [q, bornes]);

  const hasSearchResult = !!coordinates || !!coordinateError || borneResults.length > 0 || placeResults.length > 0;

  useEffect(() => {
    if (!drawing) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') useApp.getState().finishDraw();
      if (e.key === 'Escape') useApp.getState().cancelDraw();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [drawing]);

  return (
    <>
      <div className={`maptools ${autoSearchOpen ? 'maptools--autosearch' : ''} ${geminiOpen ? 'maptools--gemini' : ''} ${searchOpen ? 'maptools--search' : ''}`}>
        <div className="toolgroup glass" role="group" aria-label="Outils de carte">
          <div className="searchwrap">
            <button className={`tool ${searchOpen ? 'tool--on' : ''}`} data-tip="Rechercher une borne, un lieu ou des coordonnées" aria-label="Rechercher une borne, un lieu ou des coordonnées" onClick={togglePlaceSearch}><Search size={18} /></button>
          </div>
          <button className="tool" data-tip="Vue nationale" aria-label="Retour à l'emprise nationale" onClick={() => flyTo({ bounds: NATIONAL })}><Home size={18} /></button>
          <button className={`tool ${basemap === 'satellite' ? 'tool--on' : ''}`} data-tip={basemap === 'plan' ? 'Fond satellite' : 'Fond plan'} aria-label="Basculer plan / satellite" onClick={() => setBasemap(basemap === 'plan' ? 'satellite' : 'plan')}><Layers size={18} /></button>
          <button className={`tool ${showCoverage ? 'tool--on' : ''}`} data-tip="Couverture des analyses" aria-label="Afficher la couverture des analyses" onClick={() => setShowCoverage(!showCoverage)}><Crosshair size={18} /></button>
          {onMapPage && !drawing && (
            <button
              className={`tool ${bornePlacement ? 'tool--on' : ''}`}
              data-tip={bornePlacement ? 'Annuler le placement de la borne' : 'Placer une borne GPS'}
              aria-label={bornePlacement ? 'Annuler le placement de la borne GPS' : 'Placer une borne GPS sur la carte'}
              aria-pressed={bornePlacement}
              onClick={toggleBornePlacement}
            >
              <MapPin size={18} />
            </button>
          )}
          <button className={`tool ${autoSearchOpen ? 'tool--on' : ''}`} data-tip="Recherche automatique orge / autre culture" aria-label="Ouvrir l’analyse automatique des cultures" aria-expanded={autoSearchOpen} onClick={toggleAutoSearch}><Radar size={18} /></button>
          <button className={`tool ${geminiOpen ? 'tool--on' : ''}`} data-tip="Capturer le terrain et détecter les parcelles" aria-label="Capturer le terrain et détecter les parcelles" aria-expanded={geminiOpen} onClick={toggleGemini}><Sparkles size={18} /></button>
          {!drawing && !zone && <button className="tool" data-tip="Dessiner une zone d’étude" aria-label="Dessiner une zone d’étude" onClick={startDraw}><PenTool size={18} /></button>}
          {!drawing && <button className="tool" data-tip="Tracer une parcelle manuellement" aria-label="Tracer une parcelle manuellement" onClick={startParcelDraw}><Waypoints size={18} /></button>}
        </div>

        {searchOpen && (
          <div className="searchpop glass">
            <Search size={15} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Borne, lieu ou latitude, longitude…"
              aria-label="Rechercher une borne, un lieu ou des coordonnées"
            />
            {q && (
              <ul className="searchpop__results">
                {coordinates && (
                  <li>
                    <button onClick={() => goToCoordinates(coordinates)}>
                      <b><Navigation size={12} /> Aller aux coordonnées</b>
                      <span>{coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</span>
                    </button>
                  </li>
                )}
                {coordinateError && (
                  <li className="searchpop__none searchpop__error" role="alert">
                    <Crosshair size={12} /> {coordinateError}
                  </li>
                )}
                {borneResults.map((borne) => (
                  <li key={`borne-${borne.id}`}>
                    <button onClick={() => goToBorne(borne)}>
                      <b><MapPin size={12} /> {borne.name}</b>
                      <span>Borne GPS · {borne.lat.toFixed(5)}, {borne.lng.toFixed(5)}</span>
                    </button>
                  </li>
                ))}
                {placeResults.map((r) => (
                  <li key={`place-${r.key}`}>
                    <button onClick={() => { setSearchedLocation(null); flyTo({ bounds: r.bounds }); setQ(''); setSearchOpen(false); }}>
                      <b>{r.label}</b><span>{r.sub}</span>
                    </button>
                  </li>
                ))}
                {!hasSearchResult && <li className="searchpop__none">Aucune borne ni lieu trouvé.</li>}
              </ul>
            )}
          </div>
        )}

        {autoSearchOpen && (
          <section className="autosearch glass" aria-label="Recherche automatique de parcelles et d’orge">
            <header className="autosearch__head">
              <b><Radar size={16} /> Recherche automatique</b>
              <button className="icon-btn" onClick={() => { setAutoSearchOpen(false); setAutomaticSearchCenter(null); setAutomaticSearchRadius(null); }} aria-label="Fermer le formulaire"><X size={17} /></button>
            </header>
            <form className="autosearch__form" onSubmit={searchAutomatic}>
              <label className="field"><span>Latitude</span><input type="number" step="any" value={autoLat} onChange={(e) => updateSearchCoordinate('lat', e.target.value)} required /></label>
              <label className="field"><span>Longitude</span><input type="number" step="any" value={autoLng} onChange={(e) => updateSearchCoordinate('lng', e.target.value)} required /></label>
              <label className="field"><span>Rayon terrain réel (m)</span><input type="number" min="50" max="20000" step="10" value={autoRadiusM} onChange={(e) => updateSearchRadius(e.target.value)} required /><small>De 50 m à 20 km, indépendant du zoom. Le cercle affiché sur la carte correspond à ce rayon.</small></label>
              <fieldset className="autosearch__gdd">
                <legend><ThermometerSun size={15} /> Paramètres degrés-jours</legend>
                <div className="autosearch__grid">
                  <label className="field"><span>Tbase (°C)</span><input type="number" min="-20" max="30" step="0.1" value={baseTemperature} onChange={(e) => setBaseTemperature(e.target.value)} required /></label>
                  <label className="field"><span>Seuil (°C)</span><input type="number" min="2000" max="10000" step="1" value={gddThreshold} onChange={(e) => setGddThreshold(e.target.value)} required /></label>
                </div>
                <label className="field"><span>Période de culture (jours)</span><input type="number" min="1" max="730" step="1" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} required /></label>
              </fieldset>
              {autoSearchError && <p className="note note--danger">{autoSearchError}</p>}
              <button className="btn btn--primary" type="submit" disabled={pending}>
                <Navigation size={15} />{' '}
                {pending
                  ? autoProgress && autoProgress.total > 0
                    ? `Analyse en cours… ${autoProgress.done}/${autoProgress.total} parcelles`
                    : 'Analyse en cours…'
                  : 'Lancer l’analyse automatique'}
              </button>
            </form>
            {automaticDetection && (
              <div className="autosearch__results">
                <b>Résultat : {automaticDetection.candidates_found} parcelle(s) · {automaticDetection.analyzed_count} analysée(s)</b>
                <span className="hint autosearch__legend">
                  <span><i style={{ background: colors.orge }} /> Orge : {automaticDetection.parcels.filter((candidate) => candidate.analysis?.is_barley === true).length}</span>
                  <span><i style={{ background: colors.autre }} /> Autre culture : {automaticDetection.parcels.filter((candidate) => candidate.analysis?.is_barley === false).length}</span>
                  <span><i style={{ background: colors.inconnue }} /> À vérifier : {automaticDetection.parcels.filter((candidate) => !candidate.analysis || candidate.analysis.is_barley == null).length}</span>
                </span>
                {automaticDetection.notice && <p className="hint">{automaticDetection.notice}</p>}
                {automaticDetection.parcels.map((candidate) => {
                  const analysis = candidate.analysis;
                  const culture = automaticCulture(candidate);
                  const matchedParcel = parcelForCandidate(candidate, parcels);
                  // Fiche relue en base à jour de ce résultat : elle fait foi.
                  // Sinon (résultat en cours d'enregistrement) l'analyse du
                  // candidat reste l'information la plus récente.
                  const refreshedParcel = matchedParcel
                    && parcelShowsCandidateCulture(matchedParcel, candidate, seasonId)
                    ? matchedParcel
                    : null;
                  const isSelected = selectedAutomaticParcelId === candidate.id
                    || (!!matchedParcel && selectedId === matchedParcel.id);
                  return (
                    <button className={`autosearch__result ${isSelected ? 'is-selected' : ''}`} key={candidate.id} onClick={() => {
                      if (!automaticDetection.parcels.some((p) => p.id === candidate.id)) {
                        selectAutomaticParcel(null);
                        return;
                      }
                      selectAutomaticParcel(candidate.id);
                      if (refreshedParcel) {
                        // Fiche réelle relue en base : culture et couleur officielles.
                        useApp.getState().select(refreshedParcel.id);
                        flyTo({
                          center: refreshedParcel.centroid,
                          zoom: Math.max(useApp.getState().mapZoom, 17),
                        });
                      } else {
                        // Détails de l'analyse (plus récents que la fiche en base).
                        useApp.getState().select(null);
                        flyTo({
                          center: matchedParcel
                            ? matchedParcel.centroid
                            : [candidate.center.lat, candidate.center.lng],
                          zoom: Math.max(useApp.getState().mapZoom, 17),
                        });
                      }
                    }}>
                      <span className="autosearch__dot" style={{ background: colors[culture.id] }} />
                      <span><strong>{culture.label}</strong><small>{withoutToolName(analysis?.verdict ?? candidate.analysis_error ?? candidate.tags.source ?? candidate.id)}</small></span>
                      {analysis?.confidence != null && <em>{Math.round(analysis.confidence)}%</em>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {geminiOpen && (
          <section className="autosearch gemini" aria-label="Détection de parcelles sur capture satellite">
            <header className="autosearch__head">
              <b><Sparkles size={16} /> Détection de parcelles</b>
              <button className="icon-btn" onClick={closeGemini} aria-label="Fermer la détection de parcelles"><X size={17} /></button>
            </header>
            <p className="hint">
              Capture satellite de toute la zone de terrain visible à l’écran, analysée automatiquement.
              Toutes les parcelles visibles sont délimitées et tracées sur la carte ; celles déjà en base ne sont pas dupliquées.
            </p>
            <dl className="gemini__view">
              <div><dt>Centre</dt><dd>{mapCenter[0].toFixed(5)}, {mapCenter[1].toFixed(5)}</dd></div>
              <div><dt>Zoom carte</dt><dd>{mapZoom}</dd></div>
              {mapSize && (
                <div><dt>Écran</dt><dd>{Math.round(mapSize.width)} × {Math.round(mapSize.height)} px</dd></div>
              )}
            </dl>
            {geminiError && <p className="note note--danger">{withoutToolName(geminiError)}</p>}
            <button className="btn btn--primary gemini__capture" onClick={() => void captureTerrain()} disabled={geminiPending}>
              <Camera size={15} /> {geminiPending ? 'Capture et détection…' : 'Capturer le terrain'}
            </button>
            {captureProgress && (
              <div
                className="capture-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={captureProgress.percent}
                aria-label="Avancement de l’analyse de la capture"
              >
                <div className="capture-progress__head">
                  <Loader2 size={14} className="capture-progress__spin" aria-hidden />
                  <span>{captureProgress.label}</span>
                  <b>{captureProgress.percent} %</b>
                </div>
                <div className="capture-progress__track"><i style={{ width: `${captureProgress.percent}%` }} /></div>
              </div>
            )}
            {geminiPending && (
              <span className="hint">Capture de l’image satellite puis analyse — quelques secondes à une minute…</span>
            )}
            {geminiDone && !geminiPending && (
              <div className="gemini__history">
                <b>Capture et détection terminées.</b>
                <span className="hint">
                  L’image du terrain capturé, la liste des parcelles détectées et l’analyse des cultures
                  sont disponibles dans l’historique des captures et des détections.
                </span>
                <button
                  className="btn btn--primary gemini__capture"
                  onClick={() => { closeGemini(); navigate('/analyses'); }}
                >
                  <ClipboardList size={15} /> Voir l’historique des captures et détections
                </button>
              </div>
            )}
          </section>
        )}

        {selectedAutomaticParcelId && automaticDetection && (() => {
          const candidate = automaticDetection.parcels.find((parcel) => parcel.id === selectedAutomaticParcelId);
          if (!candidate) return null;
          // Une ligne correspondante a été relue en base et affiche déjà ce
          // résultat : c'est la fiche réelle de la parcelle qui s'affiche, avec
          // sa culture et sa couleur.
          if (parcelShowsCandidateCulture(parcelForCandidate(candidate, parcels), candidate, seasonId)) {
            return null;
          }
          const result = candidate.analysis;
          const culture = automaticCulture(candidate);
          const areaHa = ringAreaHa(candidate.coordinates.map(({ lat, lng }) => [lat, lng] as [number, number]));
          const presence = result?.barley_presence;
          const confidence = result?.confidence;
          const gdd = result?.gdd_cumulative;
          const gddThresholdValue = result?.gdd_threshold;
          const score = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)} %`;
          const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('fr-FR') : '—';
          return (
            <aside className="automatic-parcel-drawer glass" aria-label="Détails de l’analyse de la parcelle">
              <header className="automatic-parcel-drawer__head">
                <div><h2>{culture.label}</h2><p title={candidate.id}>{shortId(candidate.id)} · {withoutToolName(candidate.tags.source ?? 'détection automatique')}</p></div>
                <button className="icon-btn" onClick={() => selectAutomaticParcel(null)} aria-label="Fermer les détails"><X size={18} /></button>
              </header>
              <div className="automatic-parcel-drawer__body">
                {!result ? (
                  <p className="note note--warn">{withoutToolName(candidate.analysis_error ?? 'Aucun résultat d’analyse disponible.')}</p>
                ) : <>
                  <section className="automatic-parcel-summary">
                    <div className="automatic-parcel-shape" aria-hidden><span style={{ background: colors[culture.id] }} /></div>
                    <dl><dt>Superficie estimée</dt><dd>{areaHa.toFixed(2)} ha</dd><dt>Présence d’orge</dt><dd className={`presence presence--${presence ?? 'none'}`}>{presence === 'confirmed' ? 'Confirmée' : presence === 'probable' ? 'Probable' : 'Non détectée'}</dd></dl>
                  </section>
                  <section>
                    <h3>Résultat de classification</h3>
                    <div className="automatic-parcel-confidence"><strong>{culture.label}</strong><b>{score(confidence)}</b></div>
                    <div className="automatic-parcel-meter"><i style={{ width: `${Math.min(100, Math.max(0, confidence ?? 0))}%` }} /></div>
                    <p>{result.verdict ?? 'Verdict indisponible.'}</p>
                    {result.details && <p className="hint">{result.details}</p>}
                  </section>
                  <section>
                    <h3>Scores des modèles</h3>
                    <dl className="automatic-parcel-kv">
                      <dt>Modèle Sentinel-2</dt><dd>{score(result.s2_prob_barley)}</dd>
                      <dt>Modèle RF</dt><dd>{score(result.rf_prob_barley)}</dd>
                      <dt>Modèle CNN</dt><dd>{result.cnn_available ? `${score(result.cnn_prob_barley)} orge · ${score(result.cnn_prob_non_barley)} autre culture` : 'Indisponible'}</dd>
                      <dt>Score agro</dt><dd>{score(result.agro_score)}</dd>
                      <dt>Score hybride</dt><dd>{score(result.hybrid_score)}</dd>
                    </dl>
                    {result.data_source && <p className="hint">Source : {result.data_source}</p>}
                  </section>
                  <section>
                    <h3>Degrés-jours de croissance</h3>
                    <dl className="automatic-parcel-kv">
                      <dt>Accumulation</dt><dd>{gdd == null ? 'Indisponible' : `${Math.round(gdd)} / ${gddThresholdValue ?? gddThreshold} °C`}</dd>
                      <dt>Température de base</dt><dd>{result.gdd_base_temperature ?? baseTemperature} °C</dd>
                      <dt>Période analysée</dt><dd>{date(result.gdd_start_date)} → {date(result.gdd_end_date)}</dd>
                      <dt>Seuil atteint</dt><dd>{result.gdd_detected == null ? 'Indisponible' : result.gdd_detected ? 'Oui' : 'Non'}</dd>
                      {result.growth_stage && <><dt>Stade cultural</dt><dd>{result.growth_stage}</dd></>}
                      {result.days_since_planting != null && <><dt>Depuis plantation</dt><dd>{result.days_since_planting} jours</dd></>}
                    </dl>
                    {result.gdd_error && <p className="note note--warn">Données degrés-jours : {result.gdd_error}</p>}
                  </section>
                  <section>
                    <h3>Indices satellitaires</h3>
                    <dl className="automatic-parcel-kv"><dt>NDVI</dt><dd>{score(result.percentage)}</dd><dt>EVI</dt><dd>{score(result.evi)}</dd><dt>SAVI</dt><dd>{score(result.savi)}</dd><dt>NDWI</dt><dd>{score(result.ndwi)}</dd><dt>Sol</dt><dd>{result.soil_type ?? '—'}</dd></dl>
                    {result.spectral_analysis && <p className="hint">{result.spectral_analysis}</p>}
                    {result.radar_analysis && <p className="hint">{result.radar_analysis}</p>}
                  </section>
                  {result.risk_factors?.length ? <section><h3>Facteurs de risque</h3><ul className="automatic-parcel-list">{result.risk_factors.map((risk) => <li key={risk}>{risk}</li>)}</ul></section> : null}
                  {(result.recommendations || result.agro_details) && <section><h3>Recommandations</h3><p>{result.recommendations ?? result.agro_details}</p></section>}
                  {result.warnings?.length ? <section><h3>Avertissements</h3>{result.warnings.map((warning) => <p className="note note--warn" key={warning}>{warning}</p>)}</section> : null}
                </>}
              </div>
            </aside>
          );
        })()}

        {zone && !drawing && (
          <div className="zonecard glass">
            <b>Zone d'étude</b>
            <button className="btn btn--sm" onClick={startDraw}><PenTool size={13} /> Redessiner</button>
            {canLaunch && <button className="btn btn--sm btn--primary" onClick={() => onAnalyze && onAnalyze()}><ScanSearch size={13} /> Analyser</button>}
            <button className="btn btn--sm" onClick={() => { setGeminiOpen(true); void captureTerrain(centroidOf(zone)); }} disabled={geminiPending}
              title="Capturer la zone et détecter les parcelles (~100 m autour du centre de la zone, tuiles de 20 m)">
              <Camera size={13} /> {geminiPending ? 'Capture en cours…' : 'Capturer le terrain'}
            </button>
            <button className="btn btn--sm" onClick={() => setZone(null)}><Eraser size={13} /> Supprimer</button>
            {geminiPending && captureProgress && (
              <span className="hint">Capture satellite et détection des parcelles en cours — {captureProgress.percent} %</span>
            )}
          </div>
        )}
        {manualParcelDraft && (
          <div className="zonecard glass" aria-label="Enregistrer la parcelle dessinée">
            <b>Nouvelle parcelle — {manualParcelDraft.length} sommets · {ringAreaHa(manualParcelDraft).toFixed(2)} ha</b>
            <label className="field"><span>Nom de la parcelle</span><input value={parcelLabel} onChange={(event) => setParcelLabel(event.target.value)} placeholder="Ex. Parcelle nord" /></label>
            <label className="field"><span>Propriétaire / exploitant</span><input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Facultatif" /></label>
            <label className="field"><span>Notes</span><input value={parcelNotes} onChange={(event) => setParcelNotes(event.target.value)} placeholder="Facultatif" /></label>
            {parcelError && <p className="note note--danger">{parcelError}</p>}
            <button className="btn btn--sm btn--primary" onClick={saveManualParcel} disabled={savingParcel}>
              <Check size={13} /> {savingParcel ? 'Enregistrement…' : 'Enregistrer la parcelle'}
            </button>
            <button className="btn btn--sm" onClick={clearManualParcelDraft} disabled={savingParcel}>Annuler</button>
          </div>
        )}
      </div>

      {drawing && (
        <div className="drawbar glass" role="status">
          <span>{drawMode === 'parcel' ? 'Cliquez sur la carte pour tracer la parcelle' : 'Cliquez sur la carte pour placer les sommets'} ({draft.length} placé{draft.length > 1 ? 's' : ''}).</span>
          <button className="btn btn--sm" onClick={undoDraft} disabled={!draft.length}><Undo2 size={13} /> Retirer</button>
          <button className="btn btn--sm btn--primary" onClick={finishDraw}><Check size={13} /> {drawMode === 'parcel' ? 'Terminer le contour' : 'Terminer'}</button>
          <button className="btn btn--sm" onClick={cancelDraw}><X size={13} /> Annuler</button>
        </div>
      )}

      {captureProgress && <CaptureProgressOverlay progress={captureProgress} onCancel={cancelCapture} />}
      {autoSearchProgress && (
        <CaptureProgressOverlay
          variant="automatic"
          progress={autoSearchProgress}
          onCancel={cancelAutomaticSearch}
        />
      )}
    </>
  );
}
