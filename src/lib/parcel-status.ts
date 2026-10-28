import type { CultureId, Status } from '../types';

/** Score de confiance (0–1) à partir duquel une parcelle d'orge est confirmée. */
export const BARLEY_CONFIRMATION_THRESHOLD = 0.65;

/**
 * Statut d'affichage déduit du score de confiance.
 *
 * Pour l'orge, la règle métier est : « Confirmé » à partir de 65 %, « À
 * vérifier » en dessous. Les autres cultures conservent le comportement
 * historique du frontend (incertain sous 50 %, puis non vérifié).
 */
export function statusFromConfidence(culture: CultureId, confidence: number): Status {
  if (culture === 'orge') {
    return confidence >= BARLEY_CONFIRMATION_THRESHOLD ? 'confirme' : 'a_verifier';
  }
  return confidence < 0.5 ? 'incertain' : 'non_verifie';
}
