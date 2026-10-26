import fs from 'node:fs';
import { maltoToFrontend, maltoVhrToFrontend } from './src/api/maltoAdapter';
import { isDuplicateVhrParcel, centroidOf, ringAreaHa } from './src/lib/geometry';
import { isRejectedParcel, type RejectedParcel } from './src/lib/rejections';
import type { LatLng } from './src/types';

const rows = JSON.parse(fs.readFileSync('../parcelles.json', 'utf8'));
const db = maltoToFrontend(rows);
const rejections: RejectedParcel[] = [];
for (const row of rows) {
  if (row.data_source !== 'Tracé automatique supprimé') continue;
  const coords: LatLng[] = (row.coordinates ?? []).map((c: { lat: number; lng: number }) => [c.lat, c.lng]);
  if (coords.length < 3) continue;
  rejections.push({
    id: row.id,
    coords,
    centroid: row.center_lat != null ? [row.center_lat, row.center_lng] : centroidOf(coords),
    areaHa: row.surface_ha && row.surface_ha > 0 ? row.surface_ha : ringAreaHa(coords),
    at: row.created_at ?? new Date().toISOString(),
  });
}

const zone = JSON.parse(fs.readFileSync('../zone.json', 'utf8'));
const traced = maltoVhrToFrontend(zone.geojson.features, undefined, 'tile-test');
const fresh = traced.filter((candidate) =>
  !isRejectedParcel(candidate, rejections)
  && !db.some((parcel) => isDuplicateVhrParcel(parcel, candidate)),
);

console.log('db', db.length, 'rejections', rejections.length, 'traced', traced.length, 'fresh', fresh.length);
const jecam = db.filter((p) => p.id && rows.find((r: { id: string }) => r.id === p.id)?.label?.startsWith('jecam-vhr'));
console.log('db jecam-vhr rows', jecam.length);
console.log('db by data source', [...new Set(rows.map((r: { data_source: string }) => r.data_source))].map((s) => [String(s).slice(0, 40), rows.filter((r: { data_source: string }) => r.data_source === s).length]));
console.log('traced sample', traced.slice(0, 2).map((p) => ({ area: p.areaHa, centroid: p.centroid })));
console.log('db vhr sample', jecam.slice(0, 2).map((p) => ({ area: p.areaHa, centroid: p.centroid })));
