import type { Analysis, CultureId, LatLng, Parcel } from '../types';
import { M_PER_DEG_LAT, mPerDegLng, pointInPolygon } from './geometry';
import { isExplicitParcel } from './parcel-sources';
import { isDatabaseParcelId, isRejectedParcel, type RejectedParcel } from './rejections';

/**
 * Parcelles qu'une analyse a réellement créées — et qu'aucune autre ne cite.
 *
 * L'historique liste les parcelles enregistrées par chaque analyse. Une même
 * parcelle ne doit être supprimée qu'une fois : si deux entrées la citent (ancien
 * historique tronqué, capture relancée sur la même zone), elle reste attachée à
 * l'analyse qu'on garde. Les identifiants sont renvoyés dédoublonnés.
 */
export function parcelIdsOfAnalysis(
  analyses: Array<Pick<Analysis, 'id' | 'detected'>>,
  id: string,
): string[] {
  const target = analyses.find((analysis) => analysis.id === id);
  if (!target) return [];
  const claimedElsewhere = new Set(
    analyses
      .filter((analysis) => analysis.id !== id)
      .flatMap((analysis) => (analysis.detected ?? []).map((parcel) => parcel.id)),
  );
  return [...new Set((target.detected ?? []).map((parcel) => parcel.id))]
    .filter((parcelId) => !claimedElsewhere.has(parcelId));
}

/** Plafond du backend pour `traced_parcels` (MAX_TRACED_PARCELS). */
export const MAX_ANALYSIS_PARCELS = 500;

export interface AnalysisScope {
  lat: number;
  lng: number;
  radiusM: number;
  /** Périmètre dessiné : quand il existe, il fait foi plutôt que le rayon. */
  zone?: LatLng[] | null;
  limit?: number;
}

/**
 * Parcelle déjà analysée : elle porte un résultat de culture (enregistré en base
 * ou obtenu lors d'une analyse précédente).
 *
 * Une telle parcelle n'est plus reclassée automatiquement : les analyses de rayon
 * l'ignorent et ses données enregistrées restent inchangées. Seul le bouton
 * « Analyser » de la fiche permet de la relancer, et seulement sur demande
 * explicite de l'utilisateur.
 */
export function isAnalyzedParcel(parcel: Parcel): boolean {
  const detail = parcel.cultureDetail;
  if (detail) {
    if (detail.detected && detail.detected.trim()) return true;
    if (detail.ndvi != null || detail.confidence != null) return true;
  }
  return Object.values(parcel.results).some((result) => result.culture !== 'inconnue');
}

/** Identifiants des parcelles déjà analysées (pour filtrer une analyse de rayon). */
export function analyzedParcelIds(parcels: Parcel[]): Set<string> {
  return new Set(parcels.filter(isAnalyzedParcel).map((parcel) => parcel.id));
}

/**
 * Catégories affichées pour une analyse de cultures.
 *
 * Le classifieur de parcelle rend un verdict binaire : orge ou non-orge. Les
 * cultures/couvertures enregistrées par d'autres chemins (riz, sol nu, eau…)
 * sont regroupées dans « Autres cultures » afin de conserver ce même niveau de
 * lecture dans l'historique.
 */
export type CultureCategory = 'orge' | 'autres';

export interface AnalysisCultureCounts {
  /** Parcelles classées « Orge ». */
  orge: number;
  /** Parcelles classées « Autres cultures » (non-orge). */
  autres: number;
  /** Parcelles de l'analyse qui portent déjà un résultat cultural. */
  analyzed: number;
  /** Parcelles associées à l'analyse, identifiants dédoublonnés. */
  total: number;
  /** Parcelles associées encore sans résultat cultural. */
  pending: number;
}

const UNKNOWN_CULTURE_LABELS = new Set([
  '', 'inconnue', 'inconnu', 'unknown', 'non déterminé', 'non determine', 'n/a',
]);

function categoryFromLabel(raw: string | null | undefined): CultureCategory | null {
  const label = raw?.trim().toLowerCase() ?? '';
  if (UNKNOWN_CULTURE_LABELS.has(label)) return null;
  return label === 'orge' || label === 'barley' ? 'orge' : 'autres';
}

function categoryFromCulture(culture: CultureId | undefined): CultureCategory | null {
  if (!culture || culture === 'inconnue') return null;
  return culture === 'orge' ? 'orge' : 'autres';
}

/**
 * Catégorie de la culture enregistrée pour une parcelle.
 *
 * La fiche de culture relue en base fait foi. À défaut, le résultat de la saison
 * de l'analyse (puis le résultat le plus récent) est utilisé. `null` signifie
 * qu'aucune analyse culturale n'est encore disponible : la parcelle doit être
 * reprise lors d'une relance.
 */
export function cultureCategoryOfParcel(parcel: Parcel, seasonId?: string): CultureCategory | null {
  const detail = parcel.cultureDetail;
  if (detail?.detected?.trim()) return categoryFromLabel(detail.detected) ?? 'autres';

  const preferred = seasonId ? parcel.results[seasonId] : undefined;
  const preferredCategory = categoryFromCulture(preferred?.culture);
  if (preferredCategory) return preferredCategory;

  const latest = Object.values(parcel.results)
    .filter((result) => result.culture !== 'inconnue')
    .sort((a, b) => b.processedAt.localeCompare(a.processedAt))[0];
  const latestCategory = categoryFromCulture(latest?.culture);
  if (latestCategory) return latestCategory;

  // Une ligne qui porte des indices de culture mais aucun libellé exploitable
  // (ancien import) reste une analyse terminée : elle est classée « autres ».
  if (detail && (detail.ndvi != null || detail.confidence != null)) {
    return categoryFromLabel(detail.declared) ?? 'autres';
  }
  return null;
}

/** Compte les parcelles de l'historique par catégorie culturale enregistrée. */
export function cultureCountsForAnalysis(
  analysis: Pick<Analysis, 'detected' | 'seasonId'>,
  parcels: Parcel[],
): AnalysisCultureCounts {
  const ids = [...new Set((analysis.detected ?? []).map((parcel) => parcel.id))];
  const byId = new Map(parcels.map((parcel) => [parcel.id, parcel]));
  let orge = 0;
  let autres = 0;
  for (const id of ids) {
    const parcel = byId.get(id);
    if (!parcel || parcel.rejected) continue;
    const category = cultureCategoryOfParcel(parcel, analysis.seasonId);
    if (category === 'orge') orge += 1;
    else if (category === 'autres') autres += 1;
  }
  const analyzed = orge + autres;
  return {
    orge,
    autres,
    analyzed,
    total: ids.length,
    pending: Math.max(0, ids.length - analyzed),
  };
}

/**
 * Parcelles d'une analyse dont la culture reste à traiter.
 *
 * Les résultats déjà enregistrés ne sont jamais renvoyés : une relance reprend
 * uniquement les parcelles interrompues, sans modifier ni dupliquer les autres.
 */
export function pendingCultureParcelsForAnalysis(
  analysis: Pick<Analysis, 'detected'>,
  parcels: Parcel[],
): Parcel[] {
  const ids = new Set((analysis.detected ?? []).map((parcel) => parcel.id));
  return parcels.filter(
    (parcel) => ids.has(parcel.id) && !parcel.rejected && !isAnalyzedParcel(parcel),
  );
}

/**
 * Parcelles à envoyer au backend pour classification : contours tracés
 * automatiquement (VHR/JECAM), parcelles tracées à la main **et** parcelles
 * enregistrées dans la base (imports KML notamment), dédupliquées par le store,
 * triées de la plus proche du centre à la plus éloignée.
 *
 * Les contours supprimés par l'utilisateur sont écartés, qu'ils le soient dans
 * cette session (`rejected`) ou via une suppression persistée (empreinte) — sauf
 * les délimitations explicites (tracé manuel, import KML), qui font foi.
 * Les parcelles déjà analysées sont écartées également : leurs données
 * enregistrées ne doivent plus être modifiées automatiquement.
 *
 * Seules les parcelles **situées dans le rayon** sont retenues : c'est leur
 * centre qui doit tomber dans le disque (ou dans le périmètre dessiné s'il y en
 * a un). Une parcelle qui ne fait que déborder sur le rayon n'est pas analysée ;
 * aucune marge n'est appliquée au-delà de `radiusM`.
 */
export function parcelsForAnalysis(
  parcels: Parcel[],
  scope: AnalysisScope,
  rejections: RejectedParcel[] = [],
): Parcel[] {
  return parcels
    .flatMap((parcel) => {
      if (parcel.rejected) return [];
      // Une parcelle redessinée à la main, importée par KML ou détectée par Gemini
      // reste analysable : seuls les contours automatiques sont concernés par les
      // suppressions.
      if (!isExplicitParcel(parcel) && isRejectedParcel(parcel, rejections)) return [];
      // Déjà analysée : on ne recalcule rien, les données en base restent valables.
      // Les lignes de la base encore sans résultat (contours importés) passent, elles.
      if (isAnalyzedParcel(parcel)) return [];
      if (scope.zone && scope.zone.length >= 3) {
        if (!pointInPolygon(parcel.centroid, scope.zone)) return [];
      }
      const east = (parcel.centroid[1] - scope.lng) * mPerDegLng(scope.lat);
      const north = (parcel.centroid[0] - scope.lat) * M_PER_DEG_LAT;
      const distanceM = Math.hypot(east, north);
      if (distanceM > scope.radiusM) return [];
      return [{ parcel, distanceM }];
    })
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, scope.limit ?? MAX_ANALYSIS_PARCELS)
    .map(({ parcel }) => parcel);
}

/** Forme attendue par `tracedParcels` / `traced_parcels` côté backend. */
export function toTracedParcelInput(parcel: Parcel): { id?: string; coordinates: Array<{ lat: number; lng: number }> } {
  return {
    // Identifiant de la ligne `parcelles` quand la parcelle y est déjà enregistrée
    // (import KML, tracé manuel) : le résultat d'analyse complète cette ligne au
    // lieu d'en créer une seconde au même endroit.
    ...(isDatabaseParcelId(parcel.id) ? { id: parcel.id } : {}),
    coordinates: parcel.coords.map(([lat, lng]) => ({ lat, lng })),
  };
}
