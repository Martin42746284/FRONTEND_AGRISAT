import type { Analysis, LatLng, Parcel } from '../types';
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
