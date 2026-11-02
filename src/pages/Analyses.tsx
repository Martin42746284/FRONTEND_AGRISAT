import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, CalendarDays, Check, CheckCircle2, Circle, CircleDot,
  ClipboardList, Clock3, Loader2, MapPin, Plus, RotateCcw, ScanSearch, Trash2, UserRound,
} from 'lucide-react';
import { useApp } from '../store/useApp';
import type { Analysis, AnalysisParcel } from '../types';
import { PIPELINE_STEPS, ROLES, SEASON_BY_ID } from '../data/constants';
import { fmtDate, fmtHa, fmtInt, shortId, withoutToolName } from '../lib/format';
import { cultureCountsForAnalysis, type AnalysisCultureCounts } from '../lib/analysis-parcels';
import { AnalysisBadge, Modal } from '../components/ui';
import NewAnalysisModal from '../components/NewAnalysisModal';

/** Nombre de parcelles analysées par catégorie, pour une entrée d'historique. */
function CultureCounts({ counts, variant = 'inline' }: {
  counts: AnalysisCultureCounts;
  variant?: 'inline' | 'detail';
}) {
  const colors = useApp((s) => s.colors);
  const plural = (count: number) => count === 1 ? 'parcelle' : 'parcelles';
  return (
    <div className={`an-cultures ${variant === 'detail' ? 'an-cultures--detail' : ''}`}>
      <span className="an-culture">
        <i className="an-culture__dot" style={{ background: colors.orge }} />
        <span className="an-culture__label">Orge</span>
        <b className="an-culture__count">{fmtInt(counts.orge)}</b>
        <span className="an-culture__unit">{plural(counts.orge)}</span>
      </span>
      <span className="an-culture">
        <i className="an-culture__dot" style={{ background: colors.autre }} />
        <span className="an-culture__label">Autres cultures</span>
        <b className="an-culture__count">{fmtInt(counts.autres)}</b>
        <span className="an-culture__unit">{plural(counts.autres)}</span>
      </span>
      {counts.pending > 0 && (
        <span className="an-culture an-culture--pending">
          <i className="an-culture__dot" />
          <span className="an-culture__label">À traiter</span>
          <b className="an-culture__count">{fmtInt(counts.pending)}</b>
          <span className="an-culture__unit">sur {fmtInt(counts.total)}</span>
        </span>
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

  const running = counts.en_cours ?? 0;
  const waiting = counts.en_attente ?? 0;
  const finished = (counts.terminee ?? 0) + (counts.terminee_avertissements ?? 0);
  const warningCount = counts.terminee_avertissements ?? 0;
  const failures = counts.echec ?? 0;
  const followedParcels = analyses.reduce((sum, a) => sum + (a.parcelCount ?? a.detected?.length ?? 0), 0);

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
        <header className="an-hero">
          <div>
            <span className="an-hero__eyebrow"><ClipboardList size={14} /> Suivi des traitements</span>
            <h1>Analyses</h1>
            <p className="an-hero__sub">
              Pilotez vos analyses de terrain, suivez leur avancement et consultez les résultats culturaux.
            </p>
          </div>
          {can.launch && (
            <button className="btn an-hero__cta" onClick={() => setCreating(true)}>
              <Plus size={15} /> Nouvelle analyse
            </button>
          )}
        </header>

        {analyses.length === 0 ? (
          <div className="an-empty">
            <span className="an-empty__icon"><ClipboardList size={26} /></span>
            <strong>Aucune analyse enregistrée</strong>
            <p>
              Lancez une détection de parcelles depuis la carte : la capture, les parcelles détectées
              et la zone analysée seront consignées ici.
            </p>
          </div>
        ) : (
          <>
            <section className="an-kpis" aria-label="Synthèse des analyses">
              <article className="an-kpi an-kpi--total">
                <span className="an-kpi__icon"><ClipboardList size={19} /></span>
                <div className="an-kpi__body">
                  <span className="an-kpi__label">Analyses</span>
                  <b className="an-kpi__value">{fmtInt(analyses.length)}</b>
                  <span className="an-kpi__hint">{fmtInt(followedParcels)} parcelles suivies</span>
                </div>
              </article>
              <article className="an-kpi an-kpi--info">
                <span className="an-kpi__icon"><Activity size={19} /></span>
                <div className="an-kpi__body">
                  <span className="an-kpi__label">En cours</span>
                  <b className="an-kpi__value">{fmtInt(running)}</b>
                  <span className="an-kpi__hint">{waiting ? `${fmtInt(waiting)} en attente` : 'Aucune file d’attente'}</span>
                </div>
              </article>
              <article className="an-kpi an-kpi--ok">
                <span className="an-kpi__icon"><CheckCircle2 size={19} /></span>
                <div className="an-kpi__body">
                  <span className="an-kpi__label">Terminées</span>
                  <b className="an-kpi__value">{fmtInt(finished)}</b>
                  <span className="an-kpi__hint">
                    {warningCount ? `${fmtInt(warningCount)} avec avertissement${warningCount > 1 ? 's' : ''}` : 'Sans avertissement'}
                  </span>
                </div>
              </article>
              <article className="an-kpi an-kpi--danger">
                <span className="an-kpi__icon"><AlertTriangle size={19} /></span>
                <div className="an-kpi__body">
                  <span className="an-kpi__label">Échecs</span>
                  <b className="an-kpi__value">{fmtInt(failures)}</b>
                  <span className="an-kpi__hint">{failures ? 'Traitement en échec' : 'Aucun incident'}</span>
                </div>
              </article>
            </section>

            <section className="an-panel">
              <div className="an-panel__head">
                <div>
                  <h2>Historique des analyses</h2>
                  <p className="hint">Cliquez sur une analyse pour ouvrir sa fiche détaillée.</p>
                </div>
                <span className="an-panel__count">
                  {fmtInt(analyses.length)} analyse{analyses.length > 1 ? 's' : ''}
                </span>
              </div>

              <ul className="an-list">
                {analyses.map((a) => {
                  const rowCounts = cultureCounts.get(a.id);
                  const cultureRunning = cultureJob?.analysisId === a.id;
                  // Entrée de l'historique des captures : l'analyse porte sur toutes
                  // les parcelles détectées sur l'image du terrain.
                  const analysisLabel = a.zone ? 'Analyser toutes les parcelles détectées' : 'Analyser les cultures';
                  return (
                    <li
                      key={a.id}
                      className="an-row"
                      onClick={() => setOpen(a.id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setOpen(a.id)}
                      aria-label={`Ouvrir l'analyse ${a.id}`}
                    >
                      <div className={`an-row__thumb ${a.captureDataUrl ? '' : 'an-row__thumb--empty'}`}>
                        {a.captureDataUrl
                          ? <img src={a.captureDataUrl} alt="" loading="lazy" />
                          : <ScanSearch size={22} />}
                      </div>

                      <div className="an-row__main">
                        <div className="an-row__title">
                          <span className="an-row__id" title={a.id}>{shortId(a.id)}</span>
                          {a.cached && <span className="tag">cache</span>}
                          <AnalysisBadge status={a.status} />
                        </div>
                        <div className="an-row__meta">
                          <span className="an-row__zone"><MapPin size={13} /> {withoutToolName(a.zoneLabel || '—')}</span>
                          <span><CalendarDays size={13} /> {SEASON_BY_ID[a.seasonId]?.short ?? '—'}</span>
                          <span><UserRound size={13} /> {a.createdBy}</span>
                          <span><Clock3 size={13} /> {fmtDate(a.createdAt, true)}</span>
                        </div>
                        <div className="an-row__lower">
                          {rowCounts && <CultureCounts counts={rowCounts} />}
                          <div className="an-row__progress">
                            <div
                              className="an-progress"
                              data-status={a.status}
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={a.progress}
                            >
                              <span style={{ width: `${Math.max(0, Math.min(100, a.progress))}%` }} />
                            </div>
                            <span className="an-row__progress-value">{a.progress} %</span>
                          </div>
                        </div>
                      </div>

                      <div className="an-row__actions">
                        {can.launch && (
                          <button
                            className="btn btn--sm btn--soft"
                            onClick={(e) => { e.stopPropagation(); analyzeCultures(a.id); }}
                            disabled={!a.detected?.length || (!!cultureJob && !cultureRunning)}
                            title={!a.detected?.length ? 'Aucune parcelle détectée dans cette analyse' : analysisLabel}
                          >
                            {cultureRunning
                              ? <><Loader2 size={13} className="capture-progress__spin" /> Analyse {cultureJob?.done ?? 0}/{cultureJob?.total ?? 0}</>
                              : <><ScanSearch size={13} /> {a.zone ? 'Analyser tout' : 'Analyser les cultures'}</>}
                          </button>
                        )}
                        {a.zone && (
                          <button className="btn btn--sm" onClick={(e) => { e.stopPropagation(); showOnMap(a); }}>
                            <MapPin size={13} /> Carte
                          </button>
                        )}
                        {a.status === 'echec' && can.launch && (
                          <button className="btn btn--sm" onClick={(e) => { e.stopPropagation(); setConfirm(a.id); }}>
                            <RotateCcw size={13} /> Relancer
                          </button>
                        )}
                        {can.correct && (
                          <button
                            className="btn btn--sm btn--danger btn--icon"
                            onClick={(e) => { e.stopPropagation(); setDeleting(a.id); }}
                            title="Supprimer l’analyse"
                            aria-label={`Supprimer l'analyse ${a.id}`}
                          ><Trash2 size={13} /></button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>

      {current && (
        <Modal
          title={`Analyse ${shortId(current.id)}`}
          onClose={() => setOpen(null)}
          width={760}
          footer={current.zone ? (
            <div className="an-modal-actions">
              {can.correct && (
                <button className="btn btn--danger an-modal-actions__delete" onClick={() => setDeleting(current.id)}>
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
              <button className="btn btn--ghost" onClick={() => setOpen(null)}>Fermer</button>
              {can.launch && (
                <button
                  className="btn btn--soft"
                  onClick={() => analyzeCultures(current.id)}
                  disabled={!current.detected?.length || (!!cultureJob && !currentCultureRunning)}
                >
                  {currentCultureRunning
                    ? <><Loader2 size={14} className="capture-progress__spin" /> Analyse {cultureJob?.done ?? 0}/{cultureJob?.total ?? 0}</>
                    : <><ScanSearch size={14} /> {current.zone ? 'Analyser toutes les parcelles détectées' : 'Analyser les cultures'}</>}
                </button>
              )}
              <button className="btn btn--primary" onClick={() => showOnMap(current)}><MapPin size={14} /> Voir la carte</button>
            </div>
          ) : undefined}
        >
          <div className="an-detail">
            <section className={`an-detail__hero ${current.captureDataUrl ? '' : 'an-detail__hero--plain'}`}>
              <div className="an-detail__hero-copy">
                <span className="an-detail__eyebrow"><ScanSearch size={14} /> Analyse de terrain</span>
                <h3>{withoutToolName(current.zoneLabel || '—')}</h3>
                <p className="an-detail__sub">
                  {SEASON_BY_ID[current.seasonId]?.label ?? '—'} · {fmtDate(current.createdAt, true)}
                </p>
                <div className="an-detail__tags">
                  <AnalysisBadge status={current.status} />
                  {current.cached && <span className="tag">cache</span>}
                  <span className="an-detail__tag"><UserRound size={13} /> {current.createdBy}</span>
                </div>
              </div>
              {current.captureDataUrl && (
                <img
                  className="an-detail__capture"
                  src={current.captureDataUrl}
                  alt="Capture satellite de la zone analysée"
                />
              )}
            </section>

            <div className="an-detail__stats">
              <div className="an-stat">
                <span>Parcelles détectées</span>
                <b>{current.parcelCount !== undefined ? fmtInt(current.parcelCount) : (current.detected?.length ? fmtInt(current.detected.length) : '—')}</b>
              </div>
              <div className="an-stat">
                <span>Superficie analysée</span>
                <b>{current.areaHa !== undefined ? fmtHa(current.areaHa) : '—'}</b>
              </div>
              <div className="an-stat">
                <span>Avancement</span>
                <b>{current.progress} %</b>
                <div className="an-progress" data-status={current.status}>
                  <span style={{ width: `${Math.max(0, Math.min(100, current.progress))}%` }} />
                </div>
              </div>
              <div className="an-stat">
                <span>Saison</span>
                <b className="an-stat__text">{SEASON_BY_ID[current.seasonId]?.short ?? '—'}</b>
              </div>
            </div>

            {current.error && (
              <div className="an-alert">
                <AlertTriangle size={16} />
                <p>{withoutToolName(current.error)}</p>
              </div>
            )}
            {current.warnings.map((w, i) => (
              <div key={i} className="an-alert an-alert--warn">
                <AlertTriangle size={16} />
                <p>{withoutToolName(w)}</p>
              </div>
            ))}

            {currentCounts && (
              <section className="an-section">
                <div className="an-section__head">
                  <div>
                    <h3>Résultats culturaux</h3>
                    <p className="hint">
                      {currentCounts.total
                        ? `${fmtInt(currentCounts.analyzed)} sur ${fmtInt(currentCounts.total)} parcelles analysées.`
                        : 'Aucune parcelle associée à cette analyse.'}
                    </p>
                  </div>
                  <span className={`an-section__pill ${currentCounts.pending ? 'is-warn' : currentCounts.total ? 'is-ok' : ''}`}>
                    {currentCounts.total === 0
                      ? 'Aucune parcelle'
                      : currentCounts.pending
                        ? `${fmtInt(currentCounts.pending)} à traiter`
                        : 'Complet'}
                  </span>
                </div>
                <CultureCounts counts={currentCounts} variant="detail" />
                {currentCounts.total > 0 && (
                  <div className="an-result__progress">
                    <div className="an-progress" data-status={currentCounts.pending ? 'en_cours' : 'terminee'}>
                      <span style={{ width: `${(currentCounts.analyzed / currentCounts.total) * 100}%` }} />
                    </div>
                    <span>{fmtInt(currentCounts.analyzed)}/{fmtInt(currentCounts.total)} analysées</span>
                  </div>
                )}
              </section>
            )}

            <section className="an-section">
              <div className="an-section__head">
                <h3>Informations de l’analyse</h3>
              </div>
              <dl className="an-info__grid">
                {current.zone && (
                  <>
                    <div>
                      <dt>Zone analysée</dt>
                      <dd>{current.zone.center[0].toFixed(5)}, {current.zone.center[1].toFixed(5)}</dd>
                    </div>
                    <div>
                      <dt>Étendue</dt>
                      <dd>{current.zone.spanM ? `${Math.round(current.zone.spanM)} m · zoom ${current.zone.zoom}` : '—'}</dd>
                    </div>
                  </>
                )}
                <div>
                  <dt>Version du pipeline</dt>
                  <dd>{withoutToolName(current.pipelineVersion)}</dd>
                </div>
                <div>
                  <dt>Scènes utilisées</dt>
                  <dd>{current.scenes || '—'}</dd>
                </div>
                <div>
                  <dt>Résultat</dt>
                  <dd>{current.parcelCount !== undefined ? `${fmtInt(current.parcelCount)} parcelles · ${fmtHa(current.areaHa ?? 0)}` : '—'}</dd>
                </div>
                <div>
                  <dt>Début → fin</dt>
                  <dd>{fmtDate(current.startedAt, true)} → {fmtDate(current.finishedAt, true)}</dd>
                </div>
              </dl>
            </section>

            {current.detected?.length ? (
              <section className="an-section">
                <div className="an-section__head">
                  <div>
                    <h3>Parcelles détectées</h3>
                    <p className="hint">Ouvrez une parcelle directement sur la carte.</p>
                  </div>
                  <span className="an-section__pill">{fmtInt(current.detected.length)}</span>
                </div>
                <ul className="an-parcels">
                  {current.detected.map((p) => (
                    <li key={p.id}>
                      <span><b>{withoutToolName(p.label)}</b><small>{fmtHa(p.areaHa)}</small></span>
                      <button className="btn btn--sm btn--soft" onClick={() => showOnMap(current, p)}>
                        <MapPin size={13} /> Voir sur la carte
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {!current.zone && (
              <section className="an-section">
                <div className="an-section__head">
                  <h3>Étapes du pipeline</h3>
                </div>
                <ol className="an-steps">
                  {PIPELINE_STEPS.map((s, i) => {
                    const done = current.progress >= ((i + 1) / PIPELINE_STEPS.length) * 100 - 0.01;
                    const active = !done && current.status === 'en_cours' && current.progress >= (i / PIPELINE_STEPS.length) * 100;
                    const failed = current.status === 'echec' && !done && current.progress >= (i / PIPELINE_STEPS.length) * 100;
                    return (
                      <li key={s} className={done ? 'is-done' : active ? 'is-active' : failed ? 'is-failed' : ''}>
                        <span className="an-step__marker">
                          {done ? <Check size={14} /> : active || failed ? <CircleDot size={14} /> : <Circle size={14} />}
                        </span>
                        <span className="an-step__label">{s}</span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            <section className="an-section">
              <div className="an-section__head">
                <div>
                  <h3>Journal</h3>
                  <p className="hint">Messages et événements du traitement.</p>
                </div>
                <span className="an-section__pill">{fmtInt(current.logs.length)}</span>
              </div>
              <div className="logs an-logs">
                {current.logs.length === 0 && <span className="muted">Aucun message pour l’instant.</span>}
                {current.logs.map((l, i) => (
                  <div key={i} className={`log log--${l.level}`}>
                    <time>{new Date(l.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>
                    {withoutToolName(l.msg)}
                  </div>
                ))}
              </div>
            </section>
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
            L'analyse <b>{shortId(deletingEntry.id)}</b> sera retirée de l'historique
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
