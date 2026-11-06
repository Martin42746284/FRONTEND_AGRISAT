import type { CultureId, Parcel } from '../types';
import { M_PER_DEG_LAT, mPerDegLng } from './geometry';

/** Candidat d'une recherche automatique, réduit à ce qui sert au rapprochement. */
export interface CandidateRef {
  id: string;
  center: { lat: number; lng: number };
  analysis?: { is_barley?: boolean } | null;
}

/**
 * Culture détectée par une recherche automatique, selon le code couleur de
 * l'application : même lecture que les parcelles enregistrées (Orge / Autre
 * culture), « inconnue » quand l'analyse n'a pas abouti.
 */
export function candidateCulture(candidate: CandidateRef): Extract<CultureId, 'orge' | 'autre' | 'inconnue'> {
  if (candidate.analysis?.is_barley === true) return 'orge';
  if (candidate.analysis?.is_barley === false) return 'autre';
  return 'inconnue';
}

/**
 * Retrouve la ligne réellement enregistrée en base correspondant à un résultat
 * de recherche automatique.
 *
 * Une parcelle déjà en base garde son identifiant : le rapprochement est exact.
 * Les nouveaux contours reçoivent un UUID côté serveur ; leur centre reste
 * identique à celui du candidat, ce qui permet de les relier sans dépendre de
 * l'identifiant de session.
 *
 * Ce lien est la source unique de la carte, de la liste des résultats et des
 * fiches : dès qu'il aboutit, c'est la parcelle enregistrée (culture, couleur,
 * détails relus en base) qui fait foi, et non l'aperçu temporaire de l'analyse.
 */
export function parcelForCandidate(candidate: CandidateRef, parcels: Parcel[]): Parcel | undefined {
  const exact = parcels.find((parcel) => parcel.id === candidate.id);
  if (exact) return exact;

  const center = candidate.center;
  let closest: Parcel | undefined;
  let closestM = Number.POSITIVE_INFINITY;
  for (const parcel of parcels) {
    const northM = (parcel.centroid[0] - center.lat) * M_PER_DEG_LAT;
    const eastM = (parcel.centroid[1] - center.lng) * mPerDegLng(center.lat);
    const distanceM = Math.hypot(northM, eastM);
    if (distanceM < closestM) {
      closest = parcel;
      closestM = distanceM;
    }
  }
  return closestM <= 2 ? closest : undefined;
}

/**
 * La parcelle enregistrée affiche-t-elle déjà la culture détectée par le
 * candidat, pour la saison consultée ?
 *
 * Tant que ce n'est pas le cas, sa fiche relue en base est en retard sur le
 * résultat de l'analyse : l'aperçu du candidat reste alors la source à jour.
 */
export function parcelShowsCandidateCulture(
  parcel: Parcel | undefined,
  candidate: CandidateRef,
  seasonId: string,
): boolean {
  const result = parcel?.results[seasonId];
  return !!result && result.culture === candidateCulture(candidate);
}
