import type { LatLng } from '../types';

/** Résolution interne de l’aperçu (rendu 2× de la vignette de 160 px). */
export const PREVIEW_SIZE = 320;
/** Marge autour du contour, pour que les bords ne touchent pas le cadre. */
export const PREVIEW_PADDING = 22;

/**
 * Points SVG de l’aperçu d’une parcelle, dans un carré `size × size`.
 *
 * - coordonnées converties en pixels (plus de fractions de degré minuscules) ;
 * - longitude corrigée par la latitude pour ne pas étirer la parcelle ;
 * - contour centré et agrandi au maximum, sans déformation ;
 * - `null` si le contour n’a pas trois sommets exploitables.
 */
export function previewPolygonPoints(
  coords: LatLng[],
  centroid: LatLng,
  size: number = PREVIEW_SIZE,
  padding: number = PREVIEW_PADDING,
): string | null {
  const points = coords.filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  if (points.length < 3) return null;

  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // À la latitude de la parcelle, un degré de longitude est plus court qu’un
  // degré de latitude : sans ce facteur, la parcelle apparaîtrait étirée.
  const k = Math.cos((centroid[0] * Math.PI) / 180);
  const width = Math.max((maxLng - minLng) * k, 1e-9);
  const height = Math.max(maxLat - minLat, 1e-9);
  const scale = (size - 2 * padding) / Math.max(width, height);
  const offsetX = (size - width * scale) / 2;
  const offsetY = (size - height * scale) / 2;

  return points
    .map(([lat, lng]) => {
      const x = offsetX + (lng - minLng) * k * scale;
      const y = offsetY + (maxLat - lat) * scale;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}
