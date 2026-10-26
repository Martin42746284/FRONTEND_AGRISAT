import type { LatLng, Parcel } from '../types';
import { M_PER_DEG_LAT, mPerDegLng, pointInPolygon } from './geometry';
import { isAutomaticOutline, isManualParcel } from './parcel-sources';
import { isRejectedParcel, type RejectedParcel } from './rejections';

/** Plafond du backend pour `traced_parcels` (MAX_TRACED_PARCELS). */
export const MAX_ANALYSIS_PARCELS = 500;
/** Une parcelle dont le centre est un peu au-delà du rayon peut encore le recouper. */
const RADIUS_MARGIN_M = 300;

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
 * automatiquement (VHR/JECAM) **et** parcelles tracées à la main, dédupliquées
 * par le store, triées de la plus proche du centre à la plus éloignée.
 *
 * Les contours supprimés par l'utilisateur sont écartés, qu'ils le soient dans
 * cette session (`rejected`) ou via une suppression persistée (empreinte).
 * Les parcelles déjà analysées sont écartées également : leurs données
 * enregistrées ne doivent plus être modifiées automatiquement.
 */
export function parcelsForAnalysis(
  parcels: Parcel[],
  scope: AnalysisScope,
  rejections: RejectedParcel[] = [],
): Parcel[] {
  const maxDistanceM = scope.radiusM + RADIUS_MARGIN_M;

  return parcels
    .flatMap((parcel) => {
      const manual = isManualParcel(parcel);
      if (parcel.rejected) return [];
      // Une parcelle redessinée à la main au même endroit reste analysable :
      // seuls les contours automatiques sont concernés par les suppressions.
      if (!manual && isRejectedParcel(parcel, rejections)) return [];
      if (!manual && !isAutomaticOutline(parcel)) return [];
      // Déjà analysée : on ne recalcule rien, les données en base restent valables.
      if (isAnalyzedParcel(parcel)) return [];
      if (scope.zone && scope.zone.length >= 3) {
        if (!pointInPolygon(parcel.centroid, scope.zone)) return [];
      }
      const east = (parcel.centroid[1] - scope.lng) * mPerDegLng(scope.lat);
      const north = (parcel.centroid[0] - scope.lat) * M_PER_DEG_LAT;
      const distanceM = Math.hypot(east, north);
      if (distanceM > maxDistanceM) return [];
      return [{ parcel, distanceM }];
    })
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, scope.limit ?? MAX_ANALYSIS_PARCELS)
    .map(({ parcel }) => parcel);
}

/** Forme attendue par `tracedParcels` / `traced_parcels` côté backend. */
export function toTracedParcelInput(parcel: Parcel): { coordinates: Array<{ lat: number; lng: number }> } {
  return {
    coordinates: parcel.coords.map(([lat, lng]) => ({ lat, lng })),
  };
}
