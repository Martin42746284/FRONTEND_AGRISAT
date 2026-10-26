/** Helper fetch partagé : timeout, gestion d'erreurs JSON et en-têtes convenus. */
// API_BASE vient de Vite (import.meta.env dans le navigateur). Sous Node (tsx, tests),
// le script doit définir globalThis.__AGRI_ENV__ AVANT d'importer ce module.
const envLike: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  ?? (globalThis as unknown as { __AGRI_ENV__?: Record<string, string | undefined> }).__AGRI_ENV__
  ?? {};
export const API_BASE = envLike.VITE_MALTO_API_URL?.replace(/\/+$/, '') ?? '';

/**
 * Delai par defaut des appels API (ms).
 *
 * Le defaut de 20 s etait trop court pour `GET /api/parcelles` : la route
 * charge les 37 colonnes de la table `parcelles` (JSONB volumineux) et, sur
 * une base distante a faible debit, la premiere requete depasse 30 s. Le
 * client abandonnait alors que le backend repondait 200 quelques secondes
 * plus tard, et l'application s'affichait vide.
 *
 * 120 s couvre la lecture complete ; les appels d'inference longues
 * (analyse, detection, tracage VHR) ont leurs propres delais plus longs
 * (voir services.ts).
 */
export const DEFAULT_TIMEOUT_MS = 120_000;

export async function request<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  // Annulation externe possible (démontage de composant, changement de zone) : `init.signal`.
  const external = init.signal ?? null;
  const onAbort = () => ctrl.abort();
  if (external?.aborted) ctrl.abort();
  else external?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : null),
        ...init.headers,
      },
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      // Le backend renvoie `{error: "…"}` ou `{detail: "…"}` en français : on relaie tel quel.
      const reason = detail?.detail ?? detail?.error;
      throw new Error(`Malto ${res.status} ${res.statusText}${reason ? ` — ${reason}` : ''}`);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  } catch (err) {
    if (external?.aborted) throw new Error(`Requête annulée : ${path}`);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Malto — délai dépassé sur ${path} (${timeoutMs / 1000}s).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', onAbort);
  }
}
