import type { Parcel } from '../types';

/** Parcelle dessinée à la main par l'utilisateur (POST /api/parcelles). */
export const MANUAL_PARCEL_SOURCE = 'Tracé manuel';

/** Parcelle importée depuis un fichier KML, sans culture (script backend). */
export const IMPORTED_KML_SOURCE = 'Import KML';

/** Parcelle détectée par Gemini à partir d'une capture satellite. */
export const GEMINI_PARCEL_SOURCE = 'Détection Gemini';

/**
 * Partie créée en scindant à la main une parcelle que l'IA avait fusionnée :
 * elle porte le contour voulu par l'utilisateur, sans culture.
 */
export const SPLIT_PARCEL_SOURCE = 'Scission manuelle';

/**
 * Ligne de suppression écrite dans `parcelles` quand l'utilisateur retire un
 * contour tracé automatiquement : le contour n'existe pas en base, il faut donc
 * garder une trace côté serveur pour qu'il ne réapparaisse pas au rechargement.
 */
export const REJECTED_PARCEL_SOURCE = 'Tracé automatique supprimé';

export function isManualParcel(parcel: Pick<Parcel, 'dataSource'>): boolean {
  return parcel.dataSource === MANUAL_PARCEL_SOURCE;
}

/**
 * Une délimitation importée est une donnée explicite (comme un tracé manuel) :
 * elle ne doit pas être masquée par une suppression de contour automatique
 * présente au même endroit.
 */
export function isImportedKmlParcel(parcel: Pick<Parcel, 'dataSource'>): boolean {
  return parcel.dataSource === IMPORTED_KML_SOURCE;
}

export function isGeminiParcel(parcel: Pick<Parcel, 'dataSource'>): boolean {
  return parcel.dataSource === GEMINI_PARCEL_SOURCE;
}

/**
 * Délimitation explicite : tracé manuel, import KML ou détection Gemini. Elle ne
 * doit pas être masquée par une suppression de contour automatique présente au
 * même endroit.
 */
/** Partie issue d'une scission manuelle (contour décidé par l'utilisateur). */
export function isSplitParcel(parcel: Pick<Parcel, 'dataSource'>): boolean {
  return parcel.dataSource === SPLIT_PARCEL_SOURCE;
}

export function isExplicitParcel(parcel: Pick<Parcel, 'dataSource'>): boolean {
  return isManualParcel(parcel) || isImportedKmlParcel(parcel)
    || isGeminiParcel(parcel) || isSplitParcel(parcel);
}

/** Contour produit par le traçage automatique (Delineate Anything / JECAM-VHR). */
export function isAutomaticOutline(parcel: Pick<Parcel, 'results'>): boolean {
  return Object.values(parcel.results).some((result) =>
    result.modelVersion.includes('Delineate Anything'));
}
