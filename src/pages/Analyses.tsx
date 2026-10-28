import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Check, CircleDot, Circle, MapPin, Trash2, ScanSearch, Loader2 } from 'lucide-react';
import { useApp } from '../store/useApp';
import type { Analysis, AnalysisParcel } from '../types';
import { PIPELINE_STEPS, ROLES, SEASON_BY_ID } from '../data/constants';
import { fmtDate, fmtHa, fmtInt } from '../lib/format';
import { cultureCountsForAnalysis, type AnalysisCultureCounts } from '../lib/analysis-parcels';
import { AnalysisBadge, Empty, Modal } from '../components/ui';
import NewAnalysisModal from '../components/NewAnalysisModal';

/** Nombre de parcelles analysées par catégorie, pour une entrée d'historique. */
function CultureCounts({ counts }: { counts: AnalysisCultureCounts }) {
  const plural = (count: number) => count === 1 ? 'parcelle' : 'parcelles';
  return (
    <div className="an-cultures">
      <span>Orge : <b>{counts.orge}</b> {plural(counts.orge)}</span>
      <span>Autres cultures : <b>{counts.autres}</b> {plural(counts.autres)}</span>
      {counts.pending > 0 && (
        <small>{counts.analyzed}/{counts.total} parcelle(s) analysée(s)</small>
      )}
    </div>
  );
}

export default function Analyses() {
  const analyses = useApp((s) => s.analyses);
  const user = useApp((s) => s.user)!;
  const parcels = useApp((s) => s.parcels);
  const relaunch = useApp((s) => s.relaunchAnalysis);
  const deleteAnalysisHistory = useApp((s) => s.deleteAnalysisHistory);
  const analyzeCultures = useApp((s) => s.analyzeAnalysisCultures);
  const cultureJob = useApp((s) => s.cultureAnalysisJob);
  const flyTo = useApp((s) => s.flyTo);
  const select = useApp((s) => s.select);
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  /** Analyse dont la suppression attend confirmation. */
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const can = ROLES[user.role].can;
  const current = analyses.find((a) => a.id === open);
  const deletingEntry = deleting ? analyses.find((a) => a.id === deleting) : undefined;

  /** Supprime l'analyse de l'historique et les parcelles qu'elle a créées. */
  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    const removed = await deleteAnalysisHistory(deleting);
    setDeleteBusy(false);
    if (!removed) return;
    if (open === deleting) setOpen(null);
    setDeleting(null);
  };

  const counts = analyses.reduce<Record<string, number>>((m, a) => ((m[a.status] = (m[a.status] ?? 0) + 1), m), {});
  const cultureCounts = useMemo(
    () => new Map(analyses.map((analysis) => [analysis.id, cultureCountsForAnalysis(analysis, parcels)])),
    [analyses, parcels],
  );
  const currentCounts = current ? cultureCounts.get(current.id) : undefined;
  const currentCultureRunning = current ? cultureJob?.analysisId === current.id : false;

  /** Ouvre la carte sur la zone analysée (ou sur une parcelle détectée). */
  const showOnMap = (analysis: Analysis, parcel?: AnalysisParcel) => {
    const zone = analysis.zone;
    if (parcel) {
      select(parcel.id);
      flyTo({ center: parcel.center, zoom: 18 });
    } else if (zone?.bounds) {
      flyTo({ bounds: [[zone.bounds.south, zone.bounds.west], [zone.bounds.north, zone.bounds.east]] });
    } else if (zone) {
      flyTo({ center: zone.center, zoom: 17 });
    }
    setOpen(null);
    navigate('/carte');
  };

  return (
    <div className="page page--single">
      <div className="content content--wide">
        <div className="content__head">
          <div>
            <h1>Analyses</h1>
            <p className="muted">{counts.en_cours ?? 0} en cours · {counts.en_attente ?? 0} en attente · {counts.echec ?? 0} en échec</p>
          </div>
          {can.launch && <button className="btn btn--primary" onClick={() => setCreating(true)}><Plus size={14} /> Nouvelle analyse</button>}
        </div>

        {analyses.length === 0 ? (
          <Empty
            title="Aucune analyse enregistrée"
            hint="Lancez une détection de parcelles depuis la carte : la capture, les parcelles détectées et la zone analysée seront consignées ici."
          />
        ) : (
          <div className="tablewrap tablewrap--page">
            <table className="table table--rows">
              <thead><tr><th>Analyse</th><th>Périmètre</th><th>Saison</th><th>Statut</th><th>Cultures</th><th>Avancement</th><th>Créée par</th><th>Date</th><th /></tr></thead>
              <tbody>
                {analyses.map((a) => {
                  const rowCounts = cultureCounts.get(a.id);
                  const cultureRunning = cultureJob?.analysisId === a.id;
                  return (
                    <tr key={a.id} onClick={() => setOpen(a.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(a.id)}>
                      <td>
                        <div className="an-id">
                          {a.captureDataUrl && <img className="an-thumb" src={a.captureDataUrl} alt="" loading="lazy" />}
                          <span><b>{a.id}</b>{a.cached && <span className="tag">cache</span>}</span>
                        </div>
                      </td>
                      <td>{a.zoneLabel}</td>
                      <td>{SEASON_BY_ID[a.seasonId]?.short}</td>
                      <td><AnalysisBadge status={a.status} /></td>
                      <td>{rowCounts && <CultureCounts counts={rowCounts} />}</td>
                      <td className="conf-cell"><div className="conf"><div className="conf__fill" style={{ width: `${a.progress}%` }} /></div><span>{a.progress} %</span></td>
                      <td>{a.createdBy}</td>
                      <td>{fmtDate(a.createdAt, true)}</td>
                      <td>
                        <div className="an-actions">
                          {can.launch && (
                            <button
                              className="btn btn--sm"
                              onClick={(e) => { e.stopPropagation(); analyzeCultures(a.id); }}
                              disabled={!a.detected?.length || (!!cultureJob && !cultureRunning)}
                              title={!a.detected?.length ? 'Aucune parcelle détectée dans cette analyse' : undefined}
                            >
                              {cultureRunning
                                ? <><Loader2 size={13} className="capture-progress__spin" /> Analyse {cultureJob?.done ?? 0}/{cultureJob?.total ?? 0}</>
                                : <><ScanSearch size={13} /> Analyser les cultures</>}
                            </button>
                          )}
                          {a.zone && (
                            <button className="btn btn--sm" onClick={(e) => { e.stopPropagation(); showOnMap(a); }}><MapPin size={13} /> Voir la carte</button>
                          )}
                          {a.status === 'echec' && can.launch && (
                            <button className="btn btn--sm" onClick={(e) => { e.stopPropagation(); setConfirm(a.id); }}><RotateCcw size={13} /> Relancer</button>
                          )}
                          {can.correct && (
                            <button
                              className="btn btn--sm btn--danger"
                              onClick={(e) => { e.stopPropagation(); setDeleting(a.id); }}
                              aria-label={`Supprimer l'analyse ${a.id}`}
                            ><Trash2 size={13} /> Supprimer</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {current && (
        <Modal
          title={`Analyse ${current.id}`}
          onClose={() => setOpen(null)}
          width={640}
          footer={current.zone ? (
            <>
              <button className="btn btn--ghost" onClick={() => setOpen(null)}>Fermer</button>
              {can.correct && (
                <button className="btn btn--danger" onClick={() => setDeleting(current.id)}><Trash2 size={14} /> Supprimer</button>
              )}
              {can.launch && (
                <button
                  className="btn"
                  onClick={() => analyzeCultures(current.id)}
                  disabled={!current.detected?.length || (!!cultureJob && !currentCultureRunning)}
                >
                  {currentCultureRunning
                    ? <><Loader2 size={14} className="capture-progress__spin" /> Analyse {cultureJob?.done ?? 0}/{cultureJob?.total ?? 0}</>
                    : <><ScanSearch size={14} /> Analyser les cultures</>}
                </button>
              )}
              <button className="btn btn--primary" onClick={() => showOnMap(current)}><MapPin size={14} /> Voir la carte</button>
            </>
          ) : undefined}
        >
          <div className="an-head">
            <AnalysisBadge status={current.status} />
            <span>{current.zoneLabel} · {SEASON_BY_ID[current.seasonId]?.label}</span>
          </div>
          {currentCounts && <CultureCounts counts={currentCounts} />}
          {current.error && <p className="note note--danger">{current.error}</p>}
          {current.warnings.map((w, i) => <p key={i} className="note note--warn">{w}</p>)}
          {current.captureDataUrl && (
            <img className="an-capture" src={current.captureDataUrl} alt="Capture satellite de la zone analysée" />
          )}
          <dl className="kv kv--wide">
            {current.zone && (
              <>
                <dt>Zone analysée</dt>
                <dd>{current.zone.center[0].toFixed(5)}, {current.zone.center[1].toFixed(5)}</dd>
                <dt>Étendue</dt>
                <dd>{current.zone.spanM ? `${Math.round(current.zone.spanM)} m · zoom ${current.zone.zoom}` : '—'}</dd>
              </>
            )}
            <dt>Version du pipeline</dt><dd>{current.pipelineVersion}</dd>
            <dt>Scènes utilisées</dt><dd>{current.scenes || '—'}</dd>
            <dt>Résultat</dt><dd>{current.parcelCount !== undefined ? `${fmtInt(current.parcelCount)} parcelles · ${fmtHa(current.areaHa ?? 0)}` : '—'}</dd>
            <dt>Début → fin</dt><dd>{fmtDate(current.startedAt, true)} → {fmtDate(current.finishedAt, true)}</dd>
          </dl>
          {current.detected?.length ? (
            <>
              <h3>Parcelles détectées</h3>
              <ul className="an-parcels">
                {current.detected.map((p) => (
                  <li key={p.id}>
                    <span><b>{p.label}</b><small>{fmtHa(p.areaHa)}</small></span>
                    <button className="btn btn--sm" onClick={() => showOnMap(current, p)}><MapPin size={13} /> Voir sur la carte</button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {!current.zone && (
            <>
              <h3>Étapes du pipeline</h3>
              <ol className="steps">
                {PIPELINE_STEPS.map((s, i) => {
                  const done = current.progress >= ((i + 1) / PIPELINE_STEPS.length) * 100 - 0.01;
                  const active = !done && current.status === 'en_cours' && current.progress >= (i / PIPELINE_STEPS.length) * 100;
                  const failed = current.status === 'echec' && !done && current.progress >= (i / PIPELINE_STEPS.length) * 100;
                  return (
                    <li key={s} className={done ? 'is-done' : active ? 'is-active' : failed ? 'is-failed' : ''}>
                      {done ? <Check size={14} /> : active || failed ? <CircleDot size={14} /> : <Circle size={14} />}{s}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
          <h3>Journal</h3>
          <div className="logs">
            {current.logs.length === 0 && <span className="muted">Aucun message pour l'instant.</span>}
            {current.logs.map((l, i) => (
              <div key={i} className={`log log--${l.level}`}><time>{new Date(l.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>{l.msg}</div>
            ))}
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal title="Relancer l'analyse ?" onClose={() => setConfirm(null)} footer={<>
          <button className="btn btn--ghost" onClick={() => setConfirm(null)}>Annuler</button>
          <button className="btn btn--primary" onClick={() => { relaunch(confirm); setConfirm(null); }}>Relancer</button></>}>
          <p>L'analyse {confirm} sera remise en file d'attente. Les scènes déjà téléchargées seront réutilisées.</p>
        </Modal>
      )}
      {deletingEntry && (
        <Modal
          title="Supprimer cette analyse ?"
          onClose={() => (deleteBusy ? undefined : setDeleting(null))}
          footer={<>
            <button className="btn btn--ghost" onClick={() => setDeleting(null)} disabled={deleteBusy}>Annuler</button>
            <button className="btn btn--danger" onClick={() => void confirmDelete()} disabled={deleteBusy}>
              <Trash2 size={14} /> {deleteBusy ? 'Suppression…' : 'Supprimer'}
            </button>
          </>}
        >
          <p>
            L'analyse <b>{deletingEntry.id}</b> sera retirée de l'historique
            {deletingEntry.detected?.length
              ? `, et les ${deletingEntry.detected.length} parcelle(s) qu'elle a enregistrées seront supprimées de la base`
              : ''}
            . Cette action est définitive.
          </p>
          <p className="note">
            Seules les parcelles créées par cette analyse sont concernées : celles des autres analyses restent
            sur la carte.
          </p>
        </Modal>
      )}
      {creating && <NewAnalysisModal onClose={() => setCreating(false)} />}
    </div>
  );
}
