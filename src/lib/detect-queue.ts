/**
 * Ordonnanceur des lots d'analyse automatique.
 *
 * L'analyse d'une parcelle coûte plusieurs dizaines de secondes : les lots ne
 * peuvent pas partir tous à la fois, mais un lot ne doit pas non plus bloquer
 * les suivants. Ce module maintient `maxInFlight` lots en cours et retente
 * chaque lot en échec `attempts` fois.
 *
 * Règle : un lot définitivement en échec n'interrompt pas la file — il est
 * renvoyé dans la liste des échecs et les lots restants partent quand même.
 */
export interface BatchRunnerOptions<T> {
  /** Nombre de lots traités simultanément. */
  maxInFlight: number;
  /** Tentatives par lot (1 = pas de nouvelle tentative). */
  attempts: number;
  /** Traite un lot ; lève en cas d'échec. */
  run: (batch: T) => Promise<void>;
  /** Appelé après le succès ou l'échec définitif d'un lot (avancement, compteur). */
  onSettled?: (batch: T, failed: boolean) => void;
}

/**
 * Traite tous les lots et renvoie ceux qui ont échoué après toutes leurs tentatives.
 */
export async function runBatchesWithRetry<T>(
  batches: readonly T[],
  { maxInFlight, attempts, run, onSettled }: BatchRunnerOptions<T>,
): Promise<T[]> {
  const failed: T[] = [];
  const maxAttempts = Math.max(1, attempts);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.max(1, Math.min(Math.max(1, maxInFlight), batches.length)) },
    async () => {
      while (cursor < batches.length) {
        const batch = batches[cursor];
        cursor += 1;
        let settled = false;
        for (let attempt = 1; attempt <= maxAttempts && !settled; attempt += 1) {
          try {
            await run(batch);
            settled = true;
          } catch {
            settled = false;
          }
        }
        if (!settled) failed.push(batch);
        onSettled?.(batch, !settled);
      }
    },
  );

  await Promise.all(workers);
  return failed;
}
