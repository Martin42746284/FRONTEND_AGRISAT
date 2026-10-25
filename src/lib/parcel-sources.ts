import type { Parcel } from '../types';

/** Parcelle dessinée à la main par l'utilisateur (POST /api/parcelles). */
export const MANUAL_PARCEL_SOURCE = 'Tracé manuel';

/**
 * Ligne de suppression écrite dans `parcelles` quand l'utilisateur retire un
 * contour tracé automatiquement : le contour n'existe pas en base, il faut donc
 * garder une trace côté serveur pour qu'il ne réapparaisse pas au rechargement.
 */
export const REJECTED_PARCEL_SOURCE = 'Tracé automatique supprimé';

export function isManualParcel(parcel: Pick<Parcel, 'dataSource'>): boolean {
  return parcel.dataSource === MANUAL_PARCEL_SOURCE;
}

/** Contour produit par le traçage automatique (Delineate Anything / JECAM-VHR). */
export function isAutomaticOutline(parcel: Pick<Parcel, 'results'>): boolean {
  return Object.values(parcel.results).some((result) =>
    result.modelVersion.includes('Delineate Anything'));
}
