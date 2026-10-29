import { CULTURE_BY_ID } from '../data/constants';
import type { CultureDetail, CultureId } from '../types';

/** Nature de la modification saisie sur la classe d'une parcelle. */
export type CultureChangeKind = 'correction' | 'observation';

export interface CorrectionText {
  /** Libellé de la classe retenue (« Orge », « Autre culture », …). */
  label: string;
  /** Verdict affiché dans la fiche ; il remplace celui du modèle. */
  verdict: string;
  /** Explication affichée sous le verdict. */
  details: string;
}

/**
 * Textes associés à une classe corrigée à la main.
 *
 * Le verdict et les détails d'une parcelle sont ceux du modèle (« Autre culture —
 * RF Orge … ») : après une correction ils décrivaient encore l'ancienne classe
 * et contredisaient la fiche. Ils sont réécrits à partir de la classe retenue,
 * en conservant le motif saisi par l'utilisateur.
 */
export function correctionText(to: CultureId, note: string, kind: CultureChangeKind): CorrectionText {
  const label = CULTURE_BY_ID[to].label;
  const reason = note.trim();
  if (kind === 'observation') {
    return {
      label,
      verdict: `Observation terrain : ${label}`,
      details: `Relevé de terrain${reason ? ` — ${reason}` : ''}`,
    };
  }
  return {
    label,
    verdict: `Classe corrigée : ${label} — correction humaine`,
    details: `Motif de la correction${reason ? ` — ${reason}` : ''}`,
  };
}

/**
 * Détails de culture remis en phase avec la classe corrigée : la classe
 * détectée, le verdict et les détails suivent la correction.
 *
 * Les mesures du traitement satellite (indices spectraux, série NDVI, dates de
 * semis et de récolte) et les scores du modèle restent inchangés : ils ne
 * dépendent pas de la classe retenue et documentent l'analyse d'origine.
 */
export function withCorrectedClass(
  detail: CultureDetail | undefined,
  text: CorrectionText,
): CultureDetail | undefined {
  if (!detail) return undefined;
  return { ...detail, detected: text.label, verdict: text.verdict, details: text.details };
}
