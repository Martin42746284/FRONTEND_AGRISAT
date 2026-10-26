import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Search, Trash2 } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useAggregate, useFinal } from '../store/selectors';
import { CULTURE_BY_ID, ROLES } from '../data/constants';
import { fmtDate, fmtHa, fmtInt, fmtPct } from '../lib/format';
import { bboxOf } from '../lib/geometry';
import FiltersPanel from '../components/FiltersPanel';
import ExportMenu from '../components/ExportMenu';
import { ConfidenceBar, Empty, Modal, StatusBadge, Swatch } from '../components/ui';

type SortKey = 'id' | 'commune' | 'area' | 'culture' | 'conf' | 'status' | 'date';
const PAGE = 25;

export default function Parcels() {
  const final = useFinal();
  const agg = useAggregate(final);
  const colors = useApp((s) => s.colors);
  const threshold = useApp((s) => s.threshold);
  const communes = useApp((s) => s.communes);
  const select = useApp((s) => s.select);
  const selectedId = useApp((s) => s.selectedId);
  const flyTo = useApp((s) => s.flyTo);
  const deleteParcels = useApp((s) => s.deleteParcels);
  const user = useApp((s) => s.user);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'area', dir: -1 });
  const [page, setPage] = useState(0);
  // Parcelles cochées, puis confirmation avant toute suppression (unitaire ou en lot).
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string[] | null>(null);

  const cname = useMemo(() => Object.fromEntries(communes.map((c) => [c.id, c.name])), [communes]);
  const canDelete = !!user && ROLES[user.role].can.correct;

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = n ? final.filter((v) => v.p.id.toLowerCase().includes(n)) : final.slice();
    const get = (v: (typeof final)[number]) => {
      switch (sort.k) {
        case 'id': return v.p.id;
        case 'commune': return cname[v.p.communeId];
        case 'area': return v.p.areaHa;
        case 'culture': return CULTURE_BY_ID[v.r.culture].label;
        case 'conf': return v.r.confidence;
        case 'status': return v.r.status;
        case 'date': return v.r.processedAt;
      }
    };
    list.sort((a, b) => { const x = get(a), y = get(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
    return list;
  }, [final, q, sort, cname]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  // Sélection restreinte aux lignes visibles (filtres, recherche) : une parcelle
  // sortie du tableau n'est jamais supprimée par surprise.
  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const pickedIds = useMemo(() => rows.filter((v) => pickedSet.has(v.p.id)).map((v) => v.p.id), [rows, pickedSet]);
  const allPicked = rows.length > 0 && pickedIds.length === rows.length;

  const togglePick = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setPicked(allPicked ? [] : rows.map((v) => v.p.id));
  const askDelete = (ids: string[]) => { if (ids.length) setConfirming(ids); };

  /**
   * Carte : la parcelle est cadrée sur son contour, sélectionnée, et sa fiche
   * (culture et détails) s'ouvre à côté de la carte.
   */
  const showOnMap = (id: string, coords: [number, number][]) => {
    select(id);
    flyTo({ bounds: bboxOf(coords), center: coords[0], zoom: 16 });
    navigate('/carte');
  };

  const confirmDelete = async () => {
    const ids = confirming ?? [];
    setConfirming(null);
    setPicked((prev) => prev.filter((id) => !ids.includes(id)));
    await deleteParcels(ids);
  };

  const th = (k: SortKey, label: string, num = false) => (
    <th className={num ? 'num' : ''} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="th-btn" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{sort.k === k && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="page page--cols">
      <FiltersPanel withCultures />
      <div className="content">
        <div className="content__head">
          <div><h1>Parcelles</h1><p className="muted">{fmtInt(agg.count)} parcelles · {fmtHa(agg.area)} avec les filtres actifs.</p></div>
          <div className="row">
            <label className="search"><Search size={14} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Identifiant (ex. PC-ATB)" aria-label="Rechercher un identifiant" /></label>
            {canDelete && (
              <>
                <button className="btn btn--sm" onClick={toggleAll} disabled={rows.length === 0} title="Cocher toutes les parcelles affichées">
                  {allPicked ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
                <button className="btn btn--sm btn--danger" onClick={() => askDelete(pickedIds)} disabled={pickedIds.length === 0}
                  title="Supprimer toutes les parcelles cochées en une seule fois">
                  <Trash2 size={14} /> Supprimer la sélection ({pickedIds.length})
                </button>
              </>
            )}
            <ExportMenu />
          </div>
        </div>
        {rows.length === 0 ? <Empty title="Aucune parcelle ne correspond." hint="Modifiez les filtres ou l'identifiant recherché." /> : (
          <>
            <div className="tablewrap tablewrap--page">
              <table className="table table--rows">
                <thead><tr>
                  {canDelete && (
                    <th className="pick">
                      <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label="Sélectionner toutes les parcelles" />
                    </th>
                  )}
                  {th('id', 'Identifiant')}{th('commune', 'Commune')}{th('area', 'Superficie', true)}{th('culture', 'Culture')}{th('conf', 'Confiance')}{th('status', 'Statut')}{th('date', 'Traitée le')}<th />
                </tr></thead>
                <tbody>
                  {slice.map(({ p, r }) => (
                    <tr key={p.id} className={p.id === selectedId ? 'is-current' : ''} onClick={() => select(p.id)} tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && select(p.id)}>
                      {canDelete && (
                        <td className="pick">
                          <input type="checkbox" checked={pickedSet.has(p.id)} onChange={() => togglePick(p.id)}
                            onClick={(e) => e.stopPropagation()} aria-label={`Sélectionner la parcelle ${p.id}`} />
                        </td>
                      )}
                      <td><b>{p.id}</b></td>
                      <td>{cname[p.communeId]}</td>
                      <td className="num">{fmtHa(p.areaHa)}</td>
                      <td><Swatch color={colors[r.culture]} /> {CULTURE_BY_ID[r.culture].label}</td>
                      <td className="conf-cell"><ConfidenceBar value={r.confidence} threshold={threshold} /><span>{fmtPct(r.confidence)}</span></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{fmtDate(r.processedAt)}</td>
                      <td className="cell-actions">
                        <button className="link-btn" onClick={(e) => { e.stopPropagation(); showOnMap(p.id, p.coords); }}>Voir sur la carte</button>
                        {canDelete && (
                          <button className="icon-btn" title="Supprimer cette parcelle" aria-label={`Supprimer la parcelle ${p.id}`}
                            onClick={(e) => { e.stopPropagation(); askDelete([p.id]); }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>{cur * PAGE + 1}–{Math.min(rows.length, (cur + 1) * PAGE)} sur {fmtInt(rows.length)}</span>
              <button className="btn btn--sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Précédent</button>
              <span>Page {cur + 1} / {pages}</span>
              <button className="btn btn--sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Suivant</button>
            </div>
          </>
        )}
      </div>

      {confirming && (
        <Modal
          title={confirming.length === 1 ? 'Supprimer la parcelle' : `Supprimer ${confirming.length} parcelles`}
          onClose={() => setConfirming(null)}
          footer={(
            <>
              <button className="btn" onClick={() => setConfirming(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={() => void confirmDelete()}>
                <Trash2 size={14} /> Supprimer
              </button>
            </>
          )}
        >
          {confirming.length === 1 ? (
            <p>La parcelle <b>{confirming[0]}</b> sera retirée de la carte et sa ligne supprimée de la base de données. Cette action est définitive.</p>
          ) : (
            <p>Les <b>{confirming.length}</b> parcelles sélectionnées seront retirées de la carte et leurs lignes supprimées de la base de données. Cette action est définitive.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
