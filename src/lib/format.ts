const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number) => nf0.format(n);
export const fmtHa = (n: number) => (n >= 100 ? nf0.format(n) : n >= 10 ? nf1.format(n) : nf2.format(n)) + ' ha';
export const fmtPct = (n: number) => nf0.format(n * 100) + ' %';

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('fr-FR', opts);
}

export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Texte destiné à l'écran, sans mention du moteur d'analyse employé.
 *
 * Les libellés enregistrés en base (« Détection Gemini », « Parcelle Gemini
 * 012 », verdicts, notes, messages d'erreur) nomment l'outil : l'interface les
 * reformule de façon neutre avant affichage, sans toucher aux données stockées.
 */
export function withoutToolName(text: string): string {
  const SERVICE = 'le service d’analyse d’images';
  return text
    // « modèle image Gemini » et identifiants de modèle (« gemini-2.5-flash »).
    .replace(/\bmodèle image \w*gemini[\w-]*(?:\.[\w-]+)*/gi, 'modèle d’analyse d’images')
    // Étapes d'analyse envoyées par le backend.
    .replace(/\banalyse de l[’']image par gemini\b/gi, 'analyse automatique de l’image')
    .replace(/\banalyse gemini\b/gi, 'analyse de l’image')
    .replace(/\bimage gemini\b/gi, 'image analysée')
    .replace(/\bDétection Gemini\b/gi, 'Détection automatique')
    .replace(/\bpar Gemini\b/gi, 'automatiquement')
    .replace(/\bParcelle Gemini\b/gi, 'Parcelle')
    .replace(/\bLibellé Gemini\b/gi, 'Libellé d’origine')
    .replace(/\bune clé Gemini\b/gi, 'une clé API')
    .replace(/\bclé Gemini\b/gi, 'clé API')
    .replace(/\bgemini[\w-]*(?:\.[\w-]+)*/gi, SERVICE)
    // Le terme neutre prend une majuscule en début de phrase.
    .replace(/(^|[.!?]\s+)le service d’analyse d’images/g, (_match, prefix: string) => `${prefix}Le service d’analyse d’images`)
    .replace(/^([a-zà-ÿ])/, (first: string) => first.toUpperCase());
}
