import type { LatLng, Parcel } from '../types';
import { pointInPolygon } from './geometry';

/**
 * Une parcelle « a une culture » quand sa ligne en base la décrit : détails de
 * culture (`cultureDetail`) ou classification dans au moins une saison.
 * Un simple tracé (manuel ou VHR non classé) n'en a aucune.
 */
export function hasCultureInfo(parcel: Parcel): boolean {
  if (parcel.cultureDetail) return true;
  return Object.values(parcel.results).some((result) => result.culture !== 'inconnue');
}

/**
 * Parcelle à ouvrir pour un clic sur `clicked`.
 *
 * Un tracé manuel (ou un contour VHR non classé) ne porte aucune culture :
 * quand il recouvre une parcelle classée et affichée, le clic ouvre cette
 * parcelle-là pour montrer sa culture, au lieu d'une fiche sans culture.
 * `isVisible` limite le repli aux contours réellement affichés (filtres).
 */
export function pickParcelAt(
  point: LatLng,
  clicked: Parcel,
  parcels: Parcel[],
  isVisible: (id: string) => boolean,
): Parcel {
  if (hasCultureInfo(clicked)) return clicked;

  const candidates = parcels.filter(
    (p) => p.id !== clicked.id
      && !p.rejected
      && hasCultureInfo(p)
      && isVisible(p.id)
      && pointInPolygon(point, p.coords),
  );
  if (candidates.length === 0) return clicked;

  // La parcelle classée la plus petite (la plus spécifique) sous le clic.
  candidates.sort((a, b) => a.areaHa - b.areaHa || b.detectionConfidence - a.detectionConfidence);
  return candidates[0]!;
}
