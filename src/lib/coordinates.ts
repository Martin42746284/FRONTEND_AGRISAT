/** Analyse d'une saisie « latitude, longitude » dans le champ de recherche. */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Une saisie est considérée comme une tentative de coordonnées quand un premier
 * nombre est suivi d'un séparateur et d'un second nombre (ex. `91, 47`), afin de
 * pouvoir signaler une latitude hors bornes sans gêner les noms de bornes.
 */
export function looksLikeCoordinates(value: string): boolean {
  const text = value.trim();
  return /^[+-]?\d+(?:[.,]\d+)?\s*[,;]/.test(text)
    || /^[+-]?\d+(?:[.,]\d+)?\s+[+-]?\d/.test(text);
}

/**
 * Accepte les séparateurs virgule, point-virgule ou espace, et la virgule
 * décimale française (`-18,908 ; 47,531`). Renvoie `null` quand la saisie ne
 * ressemble pas à des coordonnées, pour laisser la recherche par nom continuer.
 */
export function parseCoordinates(value: string): Coordinates | { error: string } | null {
  const text = value.trim();
  if (!text) return null;

  const match = text.match(
    /^([+-]?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*([+-]?\d{1,3}(?:[.,]\d+)?)$/,
  );
  if (!match) {
    return looksLikeCoordinates(text)
      ? { error: 'Saisissez la latitude et la longitude séparées par une virgule.' }
      : null;
  }

  const lat = Number(match[1].replace(',', '.'));
  const lng = Number(match[2].replace(',', '.'));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: 'La latitude doit être comprise entre -90 et 90.' };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: 'La longitude doit être comprise entre -180 et 180.' };
  }
  return { lat, lng };
}
