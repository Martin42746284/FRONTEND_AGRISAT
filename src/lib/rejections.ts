import type { LatLng, Parcel } from '../types';
import { M_PER_DEG_LAT, mPerDegLng } from './geometry';

/** Deux tracés du même champ après rechargement restent à quelques mètres l'un de l'autre. */
const MAX_CENTROID_DISTANCE_M = 8;
const MIN_AREA_RATIO = 0.5;

/**
 * Empreinte d'un contour supprimé par l'utilisateur.
 *
 * Les contours tracés automatiquement ne sont pas des lignes de la base : leur
 * identifiant peut changer d'une session (ou d'une tuile) à l'autre. On retient
 * donc la géométrie, et la comparaison réutilise la même règle de ressemblance
 * que la déduplication des tracés VHR.
 */
export interface RejectedParcel {
  id: string;
  coords: LatLng[];
  centroid: LatLng;
  areaHa: number;
  at: string;
}

type Footprint = Pick<Parcel, 'id' | 'coords' | 'centroid' | 'areaHa'>;

export function rejectionFromParcel(parcel: Footprint): RejectedParcel {
  return {
    id: parcel.id,
    coords: parcel.coords.map(([lat, lng]) => [lat, lng] as LatLng),
    centroid: [parcel.centroid[0], parcel.centroid[1]],
    areaHa: parcel.areaHa,
    at: new Date().toISOString(),
  };
}

/**
 * Vrai si cette parcelle correspond à un contour déjà supprimé.
 *
 * Comparaison volontairement plus stricte que la déduplication VHR (8 m et
 * surface compatible) : une tolérance de plusieurs dizaines de mètres
 * masquerait la parcelle voisine.
 */
export function isRejectedParcel(parcel: Footprint, rejections: RejectedParcel[]): boolean {
  return rejections.some((rejection) => {
    if (rejection.id === parcel.id) return true;
    const maxArea = Math.max(rejection.areaHa, parcel.areaHa);
    const minArea = Math.min(rejection.areaHa, parcel.areaHa);
    if (maxArea <= 0 || minArea / maxArea < MIN_AREA_RATIO) return false;
    const latitude = (rejection.centroid[0] + parcel.centroid[0]) / 2;
    const east = (rejection.centroid[1] - parcel.centroid[1]) * mPerDegLng(latitude);
    const north = (rejection.centroid[0] - parcel.centroid[0]) * M_PER_DEG_LAT;
    return Math.hypot(east, north) <= MAX_CENTROID_DISTANCE_M;
  });
}

/** Ajoute une suppression sans doublon (même empreinte). */
export function addRejection(rejections: RejectedParcel[], parcel: Footprint): RejectedParcel[] {
  if (isRejectedParcel(parcel, rejections)) return rejections;
  return [...rejections, rejectionFromParcel(parcel)];
}

/** Réunit les suppressions locales et celles relues en base, sans doublon. */
export function mergeRejections(
  local: RejectedParcel[],
  fromServer: RejectedParcel[],
): RejectedParcel[] {
  return fromServer.reduce((acc, rejection) => {
    if (isRejectedParcel(rejection, acc)) return acc;
    return [...acc, rejection];
  }, local);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Les parcelles de la base ont un UUID ; les tracés automatiques ont un id local. */
export function isDatabaseParcelId(id: string): boolean {
  return UUID_RE.test(id);
}
