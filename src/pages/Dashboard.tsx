import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowUpRight, BarChart3, CheckCircle2,
  Layers, Map as MapIcon, MapPin, Ruler, TrendingUp, Wheat,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../store/useApp';
import { useAggregate, useBase, useFinal } from '../store/selectors';
import { CULTURES, CULTURE_BY_ID, SEASONS, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '../data/constants';
import { fmtHa, fmtInt } from '../lib/format';
import { aggregate, baseFilter, isUncertain } from '../lib/filter';
import type { Status } from '../types';
import FiltersPanel from '../components/FiltersPanel';
import ExportMenu from '../components/ExportMenu';
import { Badge, Empty, Swatch } from '../components/ui';

/** Gris de grille et vert d'accent : les mêmes que sur la carte. */
const GRID = '#E7ECE7';
const ACCENT = '#03793C';
const nf = (n: number) => fmtInt(Math.round(n));
const pct = (v: number, total: number) => (total > 0 ? `${(v / total * 100).toFixed(1).replace('.', ',')} %` : '—');
type StatusMetric = 'count' | 'area';
interface StatusRow { id: Status; count: number; area: number }

export default function Dashboard() {
  const f = useApp((s) => s.filters);
  const parcels = useApp((s) => s.parcels);
  const regions = useApp((s) => s.regions);
  const communes = useApp((s) => s.communes);
  const colors = useApp((s) => s.colors);
  const threshold = useApp((s) => s.threshold);
  const zone = useApp((s) => s.zone);
  const base = useBase();
  const final = useFinal();
  const aggBase = useAggregate(base);
  const aggFinal = useAggregate(final);
  const [seasonB, setSeasonB] = useState(SEASONS[1].id);
  const [statusMetric, setStatusMetric] = useState<StatusMetric>('count');

  // Parcelles d'orge : la répartition des statuts doit rester lisible même
  // lorsqu'un filtre de statut est actif, sinon elle ne montrerait qu'une seule classe.
  const orge = useMemo(() => {
    const views = baseFilter(parcels, { ...f, statuses: [] }, zone);
    const acc = new Map<Status, { count: number; area: number }>();
    let count = 0;
    let area = 0;
    for (const { p, r } of views) {
      if (r.culture !== 'orge') continue;
      count += 1;
      area += p.areaHa;
      const a = acc.get(r.status) ?? { count: 0, area: 0 };
      a.count += 1;
      a.area += p.areaHa;
      acc.set(r.status, a);
    }
    const rows: StatusRow[] = STATUS_ORDER.filter((s) => acc.has(s)).map((s) => ({ id: s, ...acc.get(s)! }));
    return { count, area, rows, scopeCount: views.length, scopeArea: views.reduce((s, v) => s + v.p.areaHa, 0) };
  }, [parcels, f, zone]);

  const statusRows = useMemo(
    () => [...orge.rows].sort((a, b) => (statusMetric === 'count' ? b.count - a.count : b.area - a.area)),
    [orge.rows, statusMetric],
  );
  const pieData = statusRows.map((r) => ({
    label: STATUS_LABEL[r.id],
    value: statusMetric === 'count' ? r.count : +r.area.toFixed(2),
    color: STATUS_COLOR[r.id],
  }));

  const byCulture = useMemo(
    () => CULTURES.filter((c) => aggBase.byCulture[c.id]).map((c) => ({ id: c.id, name: c.label, ha: +aggBase.byCulture[c.id].area.toFixed(1), n: aggBase.byCulture[c.id].count }))
      .sort((a, b) => b.ha - a.ha),
    [aggBase],
  );

  const topIds = byCulture.slice(0, 6).map((c) => c.id);
  const byRegion = useMemo(() => regions.map((r) => {
    const row: Record<string, number | string> = { region: r.name };
    for (const v of base) if (v.p.regionId === r.id) row[v.r.culture] = ((row[v.r.culture] as number) ?? 0) + v.p.areaHa;
    return row;
  }), [base, regions]);

  const bySeason = useMemo(() => SEASONS.slice().reverse().map((s) => {
    const views = baseFilter(parcels, { ...f, seasonId: s.id, dateFrom: '', dateTo: '' }, zone);
    const a = aggregate(views, threshold);
    const row: Record<string, number | string> = { saison: s.short };
    for (const id of (f.cultures.length ? f.cultures : topIds.slice(0, 4))) row[id] = +(a.byCulture[id]?.area ?? 0).toFixed(1);
    return row;
  }), [parcels, f, zone, threshold, topIds]);
  const seasonSeries = f.cultures.length ? f.cultures : topIds.slice(0, 4);

  const hist = useMemo(() => {
    const b = Array.from({ length: 8 }, (_, i) => ({ label: `${20 + i * 10}–${30 + i * 10}`, n: 0 }));
    for (const v of base) { const i = Math.min(7, Math.max(0, Math.floor((v.r.confidence * 100 - 20) / 10))); b[i].n += 1; }
    return b;
  }, [base]);

  const communeRows = useMemo(() => communes.map((c) => {
    const vs = base.filter((v) => v.p.communeId === c.id);
    const unc = vs.filter((v) => isUncertain(v.r, threshold) || v.r.culture === 'inconnue').length;
    return { c, n: vs.length, ha: vs.reduce((s, v) => s + v.p.areaHa, 0), unc };
  }).filter((r) => !f.regionId || r.c.regionId === f.regionId), [communes, base, threshold, f.regionId]);

  // Comparaison de deux saisons : uniquement les parcelles présentes dans les deux (données comparables).
  const compare = useMemo(() => {
    const A = f.seasonId, B = seasonB;
    const rows: Record<string, { a: number; b: number }> = {};
    let n = 0;
    const filt = { ...f, dateFrom: '', dateTo: '' };
    const va = new Map(baseFilter(parcels, { ...filt, seasonId: A }, zone).map((v) => [v.p.id, v]));
    for (const vb of baseFilter(parcels, { ...filt, seasonId: B }, zone)) {
      const x = va.get(vb.p.id); if (!x) continue;
      n += 1;
      (rows[x.r.culture] ??= { a: 0, b: 0 }).a += x.p.areaHa;
      (rows[vb.r.culture] ??= { a: 0, b: 0 }).b += vb.p.areaHa;
    }
    return { n, rows: CULTURES.filter((c) => rows[c.id]).map((c) => ({ id: c.id, ...rows[c.id] })).sort((p, q) => q.a + q.b - (p.a + p.b)) };
  }, [parcels, f, seasonB, zone]);

  const seasonA = SEASONS.find((s) => s.id === f.seasonId)!;
  const validatedPct = aggBase.count > 0 ? (aggBase.validated / aggBase.count) * 100 : 0;

  return (
    <div className="page page--cols">
      <FiltersPanel withCultures />
      <div className="content">
        <header className="dash-hero">
          <div className="dash-hero__text">
            <p className="dash-eyebrow">Vue d'ensemble</p>
            <h1>Tableau de bord</h1>
            <p className="dash-hero__sub">
              {seasonA.label} — parcelles, superficies et qualité des données selon les filtres actifs.
            </p>
          </div>
          <div className="dash-hero__meta">
            <div className="dash-season">
              <span>Saison</span>
              <b>{seasonA.short}</b>
            </div>
            <ExportMenu />
          </div>
        </header>

        {base.length === 0 ? <Empty title="Aucune parcelle ne correspond aux filtres." hint="Réinitialisez les filtres ou changez de saison." /> : (
          <>
            <div className="dash-kpis">
              <div className="dash-kpi dash-kpi--accent">
                <div className="dash-kpi__top">
                  <span className="dash-kpi__icon"><Layers size={15} strokeWidth={1.9} /></span>
                  <span className="dash-kpi__label">Parcelles détectées</span>
                </div>
                <b className="dash-kpi__value">{nf(aggBase.count)}</b>
                <em className="dash-kpi__foot">
                  {f.cultures.length > 0 && f.mode !== 'general' ? `${nf(aggFinal.count)} dans la sélection` : 'Périmètre filtré'}
                </em>
              </div>

              <div className="dash-kpi">
                <div className="dash-kpi__top">
                  <span className="dash-kpi__icon"><CheckCircle2 size={15} strokeWidth={1.9} /></span>
                  <span className="dash-kpi__label">Parcelles validées</span>
                </div>
                <b className="dash-kpi__value">{nf(aggBase.validated)}</b>
                <em className="dash-kpi__foot">
                  <span className="dash-meter"><i style={{ width: `${Math.min(100, validatedPct)}%` }} /></span>
                  {validatedPct.toFixed(1).replace('.', ',')} % du total
                </em>
              </div>

              <div className="dash-kpi">
                <div className="dash-kpi__top">
                  <span className="dash-kpi__icon"><Ruler size={15} strokeWidth={1.9} /></span>
                  <span className="dash-kpi__label">Superficie analysée</span>
                </div>
                <b className="dash-kpi__value">{fmtHa(aggBase.area)}</b>
                <em className="dash-kpi__foot">Sur l'ensemble du périmètre</em>
              </div>

              <div className="dash-kpi dash-kpi--warn">
                <div className="dash-kpi__top">
                  <span className="dash-kpi__icon"><AlertTriangle size={15} strokeWidth={1.9} /></span>
                  <span className="dash-kpi__label">Incertaines ou non classées</span>
                </div>
                <b className="dash-kpi__value">{nf(aggBase.uncertain)}</b>
                <em className="dash-kpi__foot">{fmtHa(aggBase.uncertainArea)} à contrôler</em>
              </div>

              <div className="dash-kpi dash-kpi--orge">
                <div className="dash-kpi__top">
                  <span className="dash-kpi__icon"><Wheat size={15} strokeWidth={1.9} /></span>
                  <span className="dash-kpi__label">Parcelles d'orge</span>
                </div>
                <b className="dash-kpi__value">{nf(orge.count)}</b>
                <em className="dash-kpi__foot">{fmtHa(orge.area)} · {pct(orge.count, orge.scopeCount)} des parcelles</em>
              </div>
            </div>

            <section className="dash-card status-card">
              <div className="card__head">
                <div className="dash-card__headtext">
                  <p className="dash-eyebrow">Qualité des données</p>
                  <h2>Répartition des parcelles d'orge par statut</h2>
                  <p className="hint">
                    Toutes les parcelles classées « orge » pour la saison {seasonA.short} et les filtres actifs. Le filtre de statut n'est pas appliqué ici, afin de garder la vue d'ensemble.
                  </p>
                </div>
                <div className="seg seg--sm" role="group" aria-label="Grandeur affichée dans le graphique">
                  <button type="button" className={statusMetric === 'count' ? 'is-on' : ''} aria-pressed={statusMetric === 'count'} onClick={() => setStatusMetric('count')}>Nombre de parcelles</button>
                  <button type="button" className={statusMetric === 'area' ? 'is-on' : ''} aria-pressed={statusMetric === 'area'} onClick={() => setStatusMetric('area')}>Superficie</button>
                </div>
              </div>

              {orge.rows.length === 0 ? (
                <Empty title="Aucune parcelle d'orge pour ces filtres." hint="Changez de saison ou élargissez les filtres." />
              ) : (
                <>
                  <div className="status-card__body">
                    <div className="status-card__chart">
                      <ResponsiveContainer width="100%" height={210}>
                        <RechartsPieChart>
                          <Pie data={pieData} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="97%"
                            paddingAngle={1.5} startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                            {pieData.map((d) => <Cell key={d.label} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => (statusMetric === 'count' ? `${nf(v)} parcelles` : fmtHa(v))} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="donut-center">
                        <b>{statusMetric === 'count' ? nf(orge.count) : nf(orge.area)}</b>
                        <span>{statusMetric === 'count' ? 'parcelles d’orge' : 'hectares d’orge'}</span>
                      </div>
                    </div>

                    <div className="tablewrap">
                      <table className="status-table">
                        <thead>
                          <tr>
                            <th>Statut</th>
                            <th className="num">Parcelles</th>
                            <th className="status-part">Part</th>
                            <th className="num">Superficie</th>
                            <th className="status-part">Part</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statusRows.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <span className="status-name"><i className="status-dot" style={{ background: STATUS_COLOR[r.id] }} />{STATUS_LABEL[r.id]}</span>
                              </td>
                              <td className="num"><b>{nf(r.count)}</b></td>
                              <td className="status-part">
                                <span className="status-part__bar"><i style={{ width: `${orge.count ? (r.count / orge.count) * 100 : 0}%`, background: STATUS_COLOR[r.id] }} /></span>
                                <span className="pct">{pct(r.count, orge.count)}</span>
                              </td>
                              <td className="num"><b>{fmtHa(r.area)}</b></td>
                              <td className="status-part">
                                <span className="status-part__bar"><i style={{ width: `${orge.area ? (r.area / orge.area) * 100 : 0}%`, background: STATUS_COLOR[r.id] }} /></span>
                                <span className="pct">{pct(r.area, orge.area)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="status-card__foot">
                    L'orge représente <b>{nf(orge.count)}</b> parcelles sur {nf(orge.scopeCount)} ({pct(orge.count, orge.scopeCount)}) et <b>{fmtHa(orge.area)}</b> sur {fmtHa(orge.scopeArea)} ({pct(orge.area, orge.scopeArea)}) de la superficie analysée.
                  </p>
                </>
              )}
            </section>

            <div className="dash-grid">
              <section className="dash-card">
                <div className="dash-card__head">
                  <div className="dash-card__title"><span className="dash-card__icon"><BarChart3 size={16} strokeWidth={1.9} /></span><h2>Superficie par culture</h2></div>
                  <p className="dash-card__sub">Répartition de la superficie analysée par classe culturale.</p>
                </div>
                <div className="chart" style={{ height: Math.max(220, byCulture.length * 30) }}>
                  <ResponsiveContainer>
                    <BarChart data={byCulture} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid horizontal={false} stroke={GRID} />
                      <XAxis type="number" tickFormatter={nf} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={118} fontSize={12} />
                      <Tooltip formatter={(v: number) => [`${nf(v)} ha`, 'Superficie']} />
                      <Bar dataKey="ha" radius={[0, 4, 4, 0]}>
                        {byCulture.map((c) => <Cell key={c.id} fill={colors[c.id]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="dash-card">
                <div className="dash-card__head">
                  <div className="dash-card__title"><span className="dash-card__icon"><MapIcon size={16} strokeWidth={1.9} /></span><h2>Répartition par région</h2></div>
                  <p className="dash-card__sub">Superficie par région, empilée par culture.</p>
                </div>
                <div className="chart" style={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={byRegion} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="region" fontSize={11} interval={0} />
                      <YAxis tickFormatter={nf} fontSize={12} />
                      <Tooltip formatter={(v: number, k: string) => [`${nf(v)} ha`, CULTURE_BY_ID[k as keyof typeof CULTURE_BY_ID]?.label ?? k]} />
                      {CULTURES.filter((c) => aggBase.byCulture[c.id]).map((c) => <Bar key={c.id} dataKey={c.id} stackId="a" fill={colors[c.id]} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="dash-card">
                <div className="dash-card__head">
                  <div className="dash-card__title"><span className="dash-card__icon"><TrendingUp size={16} strokeWidth={1.9} /></span><h2>Évolution par saison</h2></div>
                  <p className="dash-card__sub">{f.cultures.length ? 'Cultures sélectionnées' : 'Quatre principales cultures du périmètre'} · superficie en hectares.</p>
                </div>
                <div className="chart" style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={bySeason} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="saison" fontSize={11} interval={0} />
                      <YAxis tickFormatter={nf} fontSize={12} />
                      <Tooltip formatter={(v: number, k: string) => [`${nf(v)} ha`, CULTURE_BY_ID[k as keyof typeof CULTURE_BY_ID]?.label ?? k]} />
                      <Legend formatter={(k: string) => CULTURE_BY_ID[k as keyof typeof CULTURE_BY_ID]?.label ?? k} />
                      {seasonSeries.map((id) => <Bar key={id} dataKey={id} fill={colors[id]} radius={[3, 3, 0, 0]} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="dash-card">
                <div className="dash-card__head">
                  <div className="dash-card__title"><span className="dash-card__icon"><Activity size={16} strokeWidth={1.9} /></span><h2>Distribution de la confiance</h2></div>
                  <p className="dash-card__sub">Nombre de parcelles par tranche de confiance. Seuil d'incertitude : {Math.round(threshold * 100)} %.</p>
                </div>
                <div className="chart" style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={hist} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis tickFormatter={nf} fontSize={12} />
                      <Tooltip formatter={(v: number) => [nf(v), 'Parcelles']} />
                      <Bar dataKey="n" fill={ACCENT} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <section className="dash-card">
              <div className="card__head">
                <div className="dash-card__headtext">
                  <p className="dash-eyebrow">Comparaison</p>
                  <h2><span className="dash-card__inline-icon"><ArrowLeftRight size={15} strokeWidth={1.9} /></span>Comparer deux saisons</h2>
                </div>
                <label className="field field--inline"><span>{seasonA.short} contre</span>
                  <select value={seasonB} onChange={(e) => setSeasonB(e.target.value)}>
                    {SEASONS.filter((s) => s.id !== f.seasonId).map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}
                  </select>
                </label>
              </div>
              <p className="hint">Comparaison limitée aux {nf(compare.n)} parcelles présentes dans les deux saisons, pour éviter de comparer des couvertures différentes. Les modèles diffèrent selon les saisons : à lire avec prudence.</p>
              <div className="tablewrap">
                <table className="table dash-table">
                  <thead><tr><th>Classe</th><th className="num">{seasonA.short}</th><th className="num">{SEASONS.find((s) => s.id === seasonB)?.short}</th><th className="num">Écart</th></tr></thead>
                  <tbody>
                    {compare.rows.map((r) => {
                      const d = r.b - r.a;
                      return (
                        <tr key={r.id}>
                          <td><Swatch color={colors[r.id as keyof typeof colors]} /> {CULTURE_BY_ID[r.id as keyof typeof CULTURE_BY_ID].label}</td>
                          <td className="num">{fmtHa(r.a)}</td><td className="num">{fmtHa(r.b)}</td>
                          <td className="num">
                            <span className={`dash-delta ${d > 0 ? 'dash-delta--up' : d < 0 ? 'dash-delta--down' : 'dash-delta--flat'}`}>
                              {d > 0 ? <ArrowUpRight size={14} /> : d < 0 ? <ArrowDownRight size={14} /> : null}
                              {d === 0 ? '—' : fmtHa(Math.abs(d))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="dash-card">
              <div className="dash-card__head">
                <div>
                  <p className="dash-eyebrow">Couverture</p>
                  <h2><span className="dash-card__inline-icon"><MapPin size={15} strokeWidth={1.9} /></span>Couverture et qualité par commune</h2>
                </div>
                <p className="dash-card__sub">{nf(communeRows.length)} commune{communeRows.length > 1 ? 's' : ''} affichée{communeRows.length > 1 ? 's' : ''}</p>
              </div>
              <div className="tablewrap">
                <table className="table dash-table">
                  <thead><tr><th>Commune</th><th>Couverture</th><th className="num">Parcelles</th><th className="num">Superficie</th><th className="num">Incertaines</th></tr></thead>
                  <tbody>
                    {communeRows.map(({ c, n, ha, unc }) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>
                          {c.coverage === 'analysee' ? <Badge tone="ok">Analysée</Badge>
                            : c.coverage === 'partielle' ? <Badge tone="warn">Partielle (nuages)</Badge>
                              : <Badge tone="muted">Aucune donnée</Badge>}
                        </td>
                        <td className="num">{n ? nf(n) : '—'}</td><td className="num">{n ? fmtHa(ha) : '—'}</td>
                        <td className="num">{n ? `${nf(unc)} (${((unc / n) * 100).toFixed(0)} %)` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint">Une commune sans donnée n'est pas une commune sans parcelle : elle n'a simplement pas été analysée.</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
