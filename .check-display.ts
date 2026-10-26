import fs from 'node:fs';
import { maltoToFrontend } from './src/api/maltoAdapter';
import { baseFilter } from './src/lib/filter';
import { DEFAULT_FILTERS } from './src/store/useApp';

const rows = JSON.parse(fs.readFileSync('../parcelles.json', 'utf8'));
const parcels = maltoToFrontend(rows);
const views = baseFilter(parcels, DEFAULT_FILTERS, null);

const isVhr = (p: typeof parcels[number]) =>
  Object.values(p.results).some((r) => r.modelVersion.includes('Delineate Anything'))
  || p.dataSource?.includes('Tracé')
  || p.id.startsWith('jecam');

console.log('rows', rows.length, 'mapped', parcels.length, 'visible', views.length);
console.log('visible jecam/vhr', views.filter((v) => isVhr(v.p)).length);
console.log('hidden', parcels.length - views.length);
const hidden = parcels.filter((p) => !views.some((v) => v.p.id === p.id));
const reasons = hidden.map((p) => {
  const r = p.results[DEFAULT_FILTERS.seasonId];
  return { label: p.id.slice(0, 12), dataSource: p.dataSource?.slice(0, 30), hasResult: !!r, culture: r?.culture, conf: r?.confidence };
});
console.log('hidden sample', reasons.slice(0, 10));
const seasons = new Map<string, number>();
for (const p of parcels) for (const s of Object.keys(p.results)) seasons.set(s, (seasons.get(s) ?? 0) + 1);
console.log('result seasons', [...seasons.entries()]);
