import type { LatLng } from '../types';
import { M_PER_DEG_LAT, mPerDegLng, pointInPolygon } from './geometry';

/**
 * Scission manuelle d'une parcelle fusionnée par l'IA.
 *
 * La coupe est une ligne brisée dont les deux extrémités sont accrochées au
 * contour : les sommets intermédiaires permettent de suivre une limite réelle
 * (talus, chemin, haie) et non une simple droite. Le contour est parcouru dans
 * l'ordre de ses sommets entre les deux points d'accroche, ce qui garantit que
 * les deux parties partagent exactement la ligne de coupe — ni bande vide ni
 * recouvrement entre elles.
 *
 * Les calculs sont faits dans un plan local en mètres (projection
 * équirectangulaire autour du premier sommet) : les distances, les surfaces et
 * les tests d'alignement y sont homogènes, sans effet de la latitude.
 */

/** Distance (m) sous laquelle une extrémité de coupe est posée sur le contour. */
export const SPLIT_SNAP_TOLERANCE_M = 15;

/** Surface minimale (ha) d'une partie : en dessous, la coupe ne sépare rien. */
const MIN_PART_AREA_HA = 5e-4;

/** Écart (m) sous lequel deux sommets consécutifs sont considérés confondus. */
const DUPLICATE_EPSILON_M = 0.05;

type XY = [number, number];

export type SplitResult =
  | { ok: true; parts: [LatLng[], LatLng[]] }
  | { ok: false; error: string };

interface RingSnap { point: XY; edge: number; t: number; distance: number }

function project(origin: LatLng, point: LatLng): XY {
  return [(point[1] - origin[1]) * mPerDegLng(origin[0]), (point[0] - origin[0]) * M_PER_DEG_LAT];
}

function unproject(origin: LatLng, [x, y]: XY): LatLng {
  return [origin[0] + y / M_PER_DEG_LAT, origin[1] + x / mPerDegLng(origin[0])];
}

/** Anneau ouvert : sommets consécutifs dédoublonnés, fermeture éventuelle retirée. */
function openRing(ring: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (const point of ring) {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - point[0]) < 1e-9 && Math.abs(last[1] - point[1]) < 1e-9) continue;
    out.push([point[0], point[1]]);
  }
  if (out.length > 3) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) out.pop();
  }
  return out;
}

/** Point de l'anneau le plus proche : arête touchée et position sur cette arête. */
function nearestOnRing(point: XY, ring: XY[]): RingSnap {
  let best: RingSnap = { point: ring[0], edge: 0, t: 0, distance: Infinity };
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const t = length2 > 0
      ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2))
      : 0;
    const px = a[0] + t * dx;
    const py = a[1] + t * dy;
    const distance = Math.hypot(point[0] - px, point[1] - py);
    if (distance < best.distance) best = { point: [px, py], edge: i, t, distance };
  }
  return best;
}

/**
 * Projette un point sur le contour de la parcelle.
 *
 * `maxDistanceM` écarte un point trop éloigné du contour (`null`) : c'est ce qui
 * permet de refuser un premier clic posé au milieu de la parcelle.
 */
export function snapToRing(
  point: LatLng,
  ring: LatLng[],
  maxDistanceM = Infinity,
): { point: LatLng; distanceM: number } | null {
  const outline = openRing(ring);
  if (outline.length < 3) return null;
  const origin = outline[0];
  const snap = nearestOnRing(project(origin, point), outline.map((p) => project(origin, p)));
  if (snap.distance > maxDistanceM) return null;
  return { point: unproject(origin, snap.point), distanceM: snap.distance };
}

function ringAreaM2(ring: XY[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function dedupeXY(ring: XY[]): XY[] {
  const out: XY[] = [];
  for (const point of ring) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < DUPLICATE_EPSILON_M) continue;
    out.push(point);
  }
  // Le retour au point de départ est implicite dans un anneau.
  if (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < DUPLICATE_EPSILON_M) out.pop();
  }
  return out;
}

const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Deux segments se croisent-ils ailleurs qu'en leurs extrémités ? */
function segmentsCross(a1: XY, a2: XY, b1: XY, b2: XY): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function cutSelfIntersects(cut: XY[]): boolean {
  for (let i = 0; i < cut.length - 1; i++) {
    for (let j = i + 1; j < cut.length - 1; j++) {
      // Segments voisins : ils partagent un sommet, ce n'est pas un croisement.
      if (j === i + 1) continue;
      if (segmentsCross(cut[i], cut[i + 1], cut[j], cut[j + 1])) return true;
    }
  }
  return false;
}

/**
 * Découpe `ring` en deux anneaux le long de `cut`.
 *
 * Contrat : le premier et le dernier point de `cut` doivent tomber sur le
 * contour (accrochage automatique dans la tolérance), les points intermédiaires
 * doivent rester dans la parcelle. La ligne doit traverser la parcelle de bord
 * en bord sans en ressortir ; sinon le refus est explicite (`error`).
 */
export function splitParcelByCut(
  ring: LatLng[],
  cut: LatLng[],
  toleranceM = SPLIT_SNAP_TOLERANCE_M,
): SplitResult {
  const outline = openRing(ring);
  if (outline.length < 3) {
    return { ok: false, error: 'Le contour de cette parcelle est trop incomplet pour être scindé.' };
  }

  const draft: LatLng[] = [];
  for (const point of cut) {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
    const last = draft[draft.length - 1];
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 1e-9) continue;
    draft.push([point[0], point[1]]);
  }
  if (draft.length < 2) {
    return { ok: false, error: 'Placez au moins deux points : un sur chaque bord de la parcelle.' };
  }

  const origin = outline[0];
  const ringXY = outline.map((point) => project(origin, point));
  const cutXY = draft.map((point) => project(origin, point));
  const start = nearestOnRing(cutXY[0], ringXY);
  const end = nearestOnRing(cutXY[cutXY.length - 1], ringXY);

  if (start.distance > toleranceM) {
    return { ok: false, error: 'Le premier point doit être posé sur le contour de la parcelle.' };
  }
  if (end.distance > toleranceM) {
    return { ok: false, error: 'Le dernier point doit être posé sur le contour de la parcelle.' };
  }
  if (Math.hypot(start.point[0] - end.point[0], start.point[1] - end.point[1]) < 1) {
    return { ok: false, error: 'Les deux extrémités de la coupe se confondent : traversez la parcelle de bord en bord.' };
  }

  // Les sommets intermédiaires suivent la limite réelle : ils doivent rester
  // dans la parcelle, sinon la « coupe » ressort du champ et la géométrie obtenue
  // serait fausse.
  for (let i = 1; i < draft.length - 1; i++) {
    if (!pointInPolygon(draft[i], outline)) {
      return { ok: false, error: 'La ligne de coupe doit rester à l’intérieur de la parcelle.' };
    }
  }
  if (cutSelfIntersects(cutXY)) {
    return { ok: false, error: 'La ligne de coupe se croise : reprenez le tracé.' };
  }

  // Insertion des deux extrémités dans l'anneau. Les arêtes sont traitées de la
  // dernière à la première pour que les indices précédemment calculés restent
  // valables ; à arête identique, le point le plus en amont est inséré en second.
  const inserts = [
    { ...start, end: 0 as const },
    { ...end, end: 1 as const },
  ].sort((a, b) => b.edge - a.edge || b.t - a.t);
  const nodes: Array<{ point: XY; end?: 0 | 1 }> = ringXY.map((point) => ({ point }));
  for (const insert of inserts) nodes.splice(insert.edge + 1, 0, { point: insert.point, end: insert.end });

  const startIndex = nodes.findIndex((node) => node.end === 0);
  const endIndex = nodes.findIndex((node) => node.end === 1);
  if (startIndex < 0 || endIndex < 0) {
    return { ok: false, error: 'Impossible de placer la coupe sur le contour de la parcelle.' };
  }

  // Parcours de l'anneau d'un point d'accroche à l'autre, sans jamais couper
  // l'ordre des sommets : chaque partie est la moitié de contour longée par la
  // coupe.
  const walk = (from: number, to: number): XY[] => {
    const path: XY[] = [];
    let index = from;
    for (let guard = 0; guard <= nodes.length; guard++) {
      path.push(nodes[index].point);
      if (index === to) break;
      index = (index + 1) % nodes.length;
    }
    return path;
  };

  const middle = cutXY.slice(1, -1);
  const partsXY: [XY[], XY[]] = [
    dedupeXY([...walk(startIndex, endIndex), ...[...middle].reverse()]),
    dedupeXY([...walk(endIndex, startIndex), ...middle]),
  ];

  const outlineArea = ringAreaM2(ringXY);
  const [areaA, areaB] = partsXY.map(ringAreaM2);
  if (partsXY.some((part) => part.length < 3) || areaA < MIN_PART_AREA_HA * 10_000 || areaB < MIN_PART_AREA_HA * 10_000) {
    return { ok: false, error: 'La coupe ne sépare pas deux parcelles : l’une des parties est nulle ou trop petite.' };
  }
  // Filet de sécurité : une coupe qui ressort de la parcelle produit des parties
  // dont la somme ne correspond plus à la surface d'origine.
  if (outlineArea > 0 && Math.abs(areaA + areaB - outlineArea) / outlineArea > 0.02) {
    return {
      ok: false,
      error: 'La ligne de coupe doit traverser la parcelle de bord en bord, sans ressortir de son contour.',
    };
  }

  return {
    ok: true,
    parts: partsXY.map((part) => part.map((point) => unproject(origin, point))) as [LatLng[], LatLng[]],
  };
}
