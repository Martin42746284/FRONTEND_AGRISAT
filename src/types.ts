export type LatLng = [number, number]; // [lat, lng] (ordre Leaflet)

export type CultureId =
  | 'orge' | 'riz' | 'haricot' | 'mais' | 'manioc' | 'pomme_de_terre'
  | 'autre' | 'jachere' | 'sol_nu' | 'vegetation' | 'eau' | 'inconnue';

export type Status = 'non_verifie' | 'verifie_terrain' | 'corrige' | 'incertain' | 'obsolete';
export type DisplayMode = 'general' | 'filtre' | 'comparatif';
export type OthersStyle = 'grise' | 'masque';
export type Role = 'admin' | 'analyste' | 'terrain' | 'lecteur' | 'gestionnaire';
export type Coverage = 'analysee' | 'partielle' | 'non_analysee';
export type AnalysisStatus = 'en_attente' | 'en_cours' | 'terminee' | 'terminee_avertissements' | 'echec';

export interface CultureDef { id: CultureId; label: string; color: string; kind: 'culture' | 'couverture' }

export interface Season {
  id: string; label: string; short: string;
  start: string; end: string; type: 'P' | 'C'; modelVersion: string; note?: string;
}

export interface Region { id: string; name: string; center: LatLng; outline: LatLng[] }

export interface Commune {
  id: string; regionId: string; name: string; code: string;
  center: LatLng; outline: LatLng[];
  coverage: Coverage; imageDate: string | null; cloudCover: number;
}

export interface CropResult {
  seasonId: string;
  culture: CultureId;
  confidence: number;
  probs: Partial<Record<CultureId, number>>;
  status: Status;
  analysisId: string;
  modelVersion: string;
  processedAt: string;
  observedFrom: string;
  observedTo: string;
  correctedBy?: string;
}

/** Point mensuel NDVI de la série Sentinel-2 enregistrée pour une culture. */
export interface VegetationPoint { date: string; ndvi: number | null }

/**
 * Détails de la culture enregistrée en base pour une parcelle (ligne `parcelles`).
 *
 * La parcelle (contour, superficie, identité) est distincte de sa culture : supprimer
 * la culture efface ces champs côté serveur, la parcelle reste sur la carte.
 */
export interface CultureDetail {
  declared: string | null;
  detected: string | null;
  /** Indice de confiance en %, tel que stocké en base (0–100). */
  confidence: number | null;
  verdict: string | null;
  details: string | null;
  ndvi: number | null;
  ndre: number | null;
  evi: number | null;
  savi: number | null;
  ndwi: number | null;
  spectralBands: Record<string, number | null> | null;
  /** `saison` en base : stade ou saison renseigné par le modèle. */
  seasonLabel: string | null;
  growthStage: string | null;
  plantingDate: string | null;
  harvestDate: string | null;
  daysSincePlanting: number | null;
  plantingConfidence: number | null;
  soilType: string | null;
  riskFactors: string[];
  recommendations: string | null;
  ownerName: string | null;
  notes: string | null;
  source: string | null;
  timeSeries: VegetationPoint[];
  agroScore: number | null;
  hybridScore: number | null;
  cnnProbBarley: number | null;
  cnnProbNonBarley: number | null;
  createdAt: string | null;
}

export interface Correction {
  at: string; by: string; seasonId: string;
  from: CultureId; to: CultureId; note: string;
  kind: 'correction' | 'observation';
}

export interface Parcel {
  id: string; communeId: string; regionId: string;
  coords: LatLng[]; centroid: LatLng;
  areaHa: number; detectionConfidence: number; createdAt: string;
  results: Record<string, CropResult>;
  corrections: Correction[];
  /** `data_source` de la ligne Malto : « Tracé manuel », « Tracé automatique supprimé », … */
  dataSource?: string;
  /** Culture lue en base ; absent si la parcelle n'a pas (ou plus) de culture. */
  cultureDetail?: CultureDetail;
  rejected?: boolean;
}

export interface ParcelView { p: Parcel; r: CropResult }

export interface User {
  id: string; name: string; email: string; role: Role; active: boolean; lastLogin: string;
}

export interface AuditEntry {
  id: string; at: string; userName: string; action: string; object: string;
}

export interface LogLine { at: string; level: 'info' | 'warn' | 'error'; msg: string }

export interface Analysis {
  id: string; zoneLabel: string; regionId?: string; communeId?: string; seasonId: string;
  status: AnalysisStatus; progress: number;
  createdBy: string; createdAt: string; startedAt?: string; finishedAt?: string;
  pipelineVersion: string; scenes: number;
  parcelCount?: number; areaHa?: number;
  warnings: string[]; logs: LogLine[]; cached?: boolean; error?: string;
}

export interface Filters {
  cultures: CultureId[];
  mode: DisplayMode;
  othersStyle: OthersStyle;
  regionId: string | null;
  communeId: string | null;
  seasonId: string;
  dateFrom: string;
  dateTo: string;
  areaMin: number;
  areaMax: number;
  confMin: number; // 0..100
  statuses: Status[];
}
