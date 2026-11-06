import type { Parcel } from '../types';

/** Couleur des contours de référence (détections Gemini, cultures KML forcées). */
export const GEMINI_OUTLINE_COLOR = '#B60319';

/**
 * Épaississement des traits selon le zoom.
 *
 * À la vue nationale, une parcelle fait quelques pixels : un trait de 1 px se
 * confond avec l'imagerie. On grossit donc les traits quand on s'éloigne, par
 * paliers (le rendu n'est recalculé qu'au franchissement d'un palier), et on
 * conserve les rapports entre types de contours : un trait épais reste
 * « vérifié / corrigé », un trait fin reste « non validé ».
 */
export function strokeBoostForZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 0.6;
  if (zoom >= 17) return 0;
  if (zoom >= 15) return 0.5;
  if (zoom >= 13) return 1;
  if (zoom >= 11) return 1.6;
  return 2.2;
}

/**
 * Style cartographique des contours VHR (tracé automatique par le modèle).
 *
 * Deux contraintes :
 *
 * 1. Ne pas réutiliser le langage des cultures. Dans `style.ts`, un contour
 *    épais signifie « vérifié sur le terrain ou corrigé » (légende de la
 *    carte). Les contours VHR sont tous *non classés* : leur donner un trait
 *    épais ferait croire à une validation terrain qui n'a pas eu lieu.
 *    On distingue donc la taille (fine pour les petites parcelles, un peu
 *    plus marquée pour les grandes) par l'épaisseur et l'opacité, mais on
 *    reste dans une gamme fine, sous le seuil du trait « validé ».
 *
 * 2. Rester lisible sur l'imagerie. Un contour blanc opaque sur une photo
 *    de culture disparaît ; on utilise un jaune chaud translucide, et un
 *    liseré sombre discret qui se détache aussi bien sur un champ clair que
 *    sur un champ sombre.
 *
 * L'incertitude est marquée par le pointillé (comme pour les cultures), et
 * la sélection par un trait épais rouge MALTO.
 */
export function parcelOutlineStyle(parcel: Parcel, selected = false, zoom = 15) {
  const boost = strokeBoostForZoom(zoom);
  const aire = parcel.areaHa;
  // Fiabilite mesuree par taille : le README du service VHR indique ~78 % de
  // contours corrects au-dessus de 0,5 ha, ~5 % sous 0,1 ha.
  const fiable = aire >= 0.5;
  const visible = aire >= 0.1;

  if (selected) {
    return {
      strokeColor: '#B60319',
      strokeOpacity: 1,
      strokeWeight: 3 + boost * 0.6,
      fillColor: '#B60319',
      fillOpacity: 0.16,
    };
  }

  const base = {
    strokeColor: '#FFC83D',
    strokeOpacity: fiable ? 0.92 : visible ? 0.78 : 0.5,
    strokeWeight: (fiable ? 1.7 : visible ? 1.35 : 1.1) + boost * (fiable ? 1 : 0.85),
    fillColor: '#FFC83D',
    fillOpacity: fiable ? 0.06 : visible ? 0.04 : 0.02,
  };

  return {
    ...base,
    // Sous 0,1 ha, la fiabilite est tres faible : on le dit par le pointille,
    // comme pour une parcelle non classee.
    dashArray: visible ? undefined : '5 4',
  };
}
