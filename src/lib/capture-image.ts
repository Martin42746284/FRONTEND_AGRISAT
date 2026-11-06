/**
 * Aperçu d'une capture d'écran pour l'historique des analyses.
 *
 * La capture complète pèse plusieurs mégaoctets : stockée telle quelle dans
 * l'historique (localStorage, quelques mégaoctets au total), elle saturerait le
 * quota dès les premières analyses. L'aperçu conserve la preuve visuelle de la
 * zone analysée pour quelques dizaines de kilooctets.
 */
const THUMB_MAX_WIDTH_PX = 420;
const THUMB_QUALITY = 0.62;

/** Réduit une data URL d'image en aperçu JPEG ; `null` si le navigateur échoue. */
export async function captureThumbnail(dataUrl: string): Promise<string | null> {
  const image = await loadImage(dataUrl);
  if (!image) return null;
  const scale = Math.min(1, THUMB_MAX_WIDTH_PX / Math.max(1, image.width));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL('image/jpeg', THUMB_QUALITY);
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
