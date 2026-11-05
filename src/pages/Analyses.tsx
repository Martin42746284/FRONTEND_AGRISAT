import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, CalendarDays, Check, ChevronDown, Circle, CircleDot, ClipboardList,
  Clock, Crosshair, Eye, History, Layers, Leaf, Loader2, MapPin, MoreHorizontal, Play, Plus,
  RotateCcw, ScanSearch, Search, Sprout, Thermometer, Trash2, UserRound,
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

/** Une analyse terminée n'a plus d'avancement à afficher. */
const isFinished = (status: Analysis['status']) =>
  status === 'terminee' || status === 'terminee_avertissements';

type Tab = 'gemini' | 'auto';

export default function Analyses() {
  const analyses = useApp((s) => s.analyses);
  const user = useApp((s) => s.user)!;
  const parcels = useApp((s) => s.parcels);
  const colors = useApp((s) => s.colors);
  const relaunch = useApp((s) => s.relaunchAnalysis);
  const deleteAnalysisHistory = useApp((s) => s.deleteAnalysisHistory);
  const analyzeCultures = useApp((s) => s.analyzeAnalysisCultures);
  const cultureJob = useApp((s) => s.cultureAnalysisJob);
  const automaticSearches = useApp((s) => s.automaticSearches);
  const deleteAutomaticSearchCulture = useApp((s) => s.deleteAutomaticSearchCulture);
  const clearAutomaticSearches = useApp((s) => s.clearAutomaticSearches);
  const toast = useApp((s) => s.toast);
  const flyTo = useApp((s) => s.flyTo);
  const select = useApp((s) => s.select);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('gemini');
  const [open, setOpen] = useState<string | null>(null);
  const [openAuto, setOpenAuto] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  /** Analyse dont la suppression attend confirmation. */
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  /** Suppression de tout l'historique automatique, en attente de confirmation. */
  const [clearing, setClearing] = useState(false);
  /** Culture d'une recherche automatique dont le retrait attend confirmation. */
  const [deletingCulture, setDeletingCulture] = useState<{ searchId: string; parcelId: string } | null>(null);
  /** Menu d'actions secondaires d'une ligne d'analyse Gemini. */
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const can = ROLES[user.role].can;

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuFor]);
  const current = analyses.find((a) => a.id === open);
  const deletingEntry = deleting ? analyses.find((a) => a.id === deleting) : undefined;
  const deletingCultureLine = deletingCulture
    ? automaticSearches
      .find((search) => search.id === deletingCulture.searchId)
      ?.cultures.find((line) => line.parcelId === deletingCulture.parcelId)
    : undefined;

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

  /** Retire une culture de l'historique des recherches automatiques, sans toucher aux parcelles. */
  const confirmRemoveCulture = () => {
    if (!deletingCulture) return;
    deleteAutomaticSearchCulture(deletingCulture.searchId, deletingCulture.parcelId);
    setDeletingCulture(null);
  };

  /** Localise sur la carte la parcelle portant une culture de l'historique. */
  const showCultureOnMap = (parcelId: string) => {
    const parcel = parcels.find((p) => p.id === parcelId);
    if (!parcel) {
      toast('Cette parcelle n’est plus disponible sur la carte.', 'warn');
      return;
    }
    select(parcel.id);
    flyTo({ center: parcel.centroid, zoom: 18 });
    navigate('/carte');
  };

  /** Vide l'historique des recherches automatiques, sans toucher aux parcelles. */
  const confirmClearAll = () => {
    clearAutomaticSearches();
    setOpenAuto(null);
    setClearing(false);
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
  const autoCultureTotal = automaticSearches.reduce((sum, entry) => sum + entry.cultures.length, 0);

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
    <div className={`page page--single an-page an-page--${tab}`}>
      <div className={`an-hero an-hero--${tab}`} aria-hidden>
        {tab === 'auto' ? (
          <>
            <span className="an-hero__photo" />
            <span className="an-hero__fade" />
          </>
        ) : (
          <>
            <span className="an-hero__wave an-hero__wave--1" />
            <span className="an-hero__wave an-hero__wave--2" />
            <span className="an-hero__wave an-hero__wave--3" />
          </>
        )}
      </div>

      <div className="content content--wide an-content">
        <header className="an-head">
          <div className="an-head__title">
            <span className={`an-head__icon an-head__icon--${tab}`}>
              {tab === 'gemini' ? <Leaf size={40} /> : (
                <span className="an-head__glass">
                  <Search size={38} />
                  <Leaf size={15} className="an-head__leaf" />
                </span>
              )}
            </span>
            <div>
              <h1>Analyses</h1>
              <p className="an-head__sub">
                Pilotez vos analyses de terrain, suivez leur avancement et consultez les résultats cartographiques.
              </p>
            </div>
          </div>
          {can.launch && tab === 'gemini' && (
            <button className="btn btn--primary an-new" onClick={() => setCreating(true)}>
              <Plus size={17} /> Nouvelle analyse
            </button>
          )}
        </header>

        <div className="an-tabs" role="tablist" aria-label="Historiques">
          <button
            type="button"
            role="tab"
            id="an-tab-gemini"
            aria-selected={tab === 'gemini'}
            aria-controls="an-tabpanel-gemini"
            className={`an-tab ${tab === 'gemini' ? 'is-active' : ''}`}
            onClick={() => setTab('gemini')}
          >
            <ScanSearch size={17} />
            Analyse Gemini
            <span className="an-tab__count">{fmtInt(analyses.length)}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="an-tab-auto"
            aria-selected={tab === 'auto'}
            aria-controls="an-tabpanel-auto"
            className={`an-tab ${tab === 'auto' ? 'is-active' : ''}`}
            onClick={() => setTab('auto')}
          >
            <Search size={17} />
            Recherche automatique
            <span className="an-tab__count">{fmtInt(automaticSearches.length)}</span>
          </button>
        </div>

        {tab === 'gemini' && (
          <div className="an-tabs__panel" role="tabpanel" id="an-tabpanel-gemini" aria-labelledby="an-tab-gemini">
            {analyses.length > 0 && (
              <section className="an-summary" aria-label="Synthèse des analyses Gemini">
                <div className="an-summary__item">
                  <span className="an-summary__icon an-summary__icon--green"><BarChart3 size={24} /></span>
                  <div className="an-summary__body">
                    <span className="an-summary__label">Analyses Gemini</span>
                    <b className="an-summary__value">{fmtInt(analyses.length)}</b>
                    <span className="an-summary__hint">{fmtInt(followedParcels)} parcelles suivies</span>
                  </div>
                </div>
                <div className="an-summary__item">
                  <span className="an-summary__icon an-summary__icon--blue"><Play size={21} fill="currentColor" /></span>
                  <div className="an-summary__body">
                    <span className="an-summary__label">En cours</span>
                    <b className="an-summary__value">{fmtInt(running)}</b>
                    <span className="an-summary__hint">{waiting ? `${fmtInt(waiting)} en attente` : 'Aucune file d’attente'}</span>
                  </div>
                </div>
                <div className="an-summary__item">
                  <span className="an-summary__icon an-summary__icon--purple"><Check size={23} /></span>
                  <div className="an-summary__body">
                    <span className="an-summary__label">Terminées</span>
                    <b className="an-summary__value">{fmtInt(finished)}</b>
                    <span className="an-summary__hint">
                      {warningCount ? `${fmtInt(warningCount)} avec avertissement${warningCount > 1 ? 's' : ''}` : 'Sans avertissement'}
                    </span>
                  </div>
                </div>
                <div className={`an-summary__item ${failures ? 'is-alert' : ''}`}>
                  <span className="an-summary__icon an-summary__icon--amber"><AlertTriangle size={22} /></span>
                  <div className="an-summary__body">
                    <span className="an-summary__label">Échecs</span>
                    <b className="an-summary__value">{fmtInt(failures)}</b>
                    <span className="an-summary__hint">{failures ? 'Traitement en échec' : 'Aucun incident'}</span>
                  </div>
                </div>
              </section>
            )}

            <section className="an-panel" aria-label="Historique des analyses Gemini">
              <div className="an-panel__head">
                <div className="an-panel__title">
                  <span className="an-panel__icon"><History size={22} /></span>
                  <div>
                    <h2>Historique des analyses</h2>
                    <p className="hint">Détections et analyses de parcelles réalisées avec Gemini.</p>
                  </div>
                </div>
                <span className="an-panel__count">
                  {fmtInt(analyses.length)} analyse{analyses.length > 1 ? 's' : ''}
                </span>
              </div>

              {analyses.length === 0 ? (
                <div className="an-empty">
                  <span className="an-empty__icon"><ClipboardList size={22} /></span>
                  <strong>Aucune analyse enregistrée</strong>
                  <p>
                    Lancez une détection de parcelles depuis la carte : la capture, les parcelles détectées
                    et la zone analysée seront consignées ici.
                  </p>
                </div>
              ) : (
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
                        <div className="an-row__thumb">
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
                            <span className="an-meta an-meta--place">
                              <MapPin size={13} /> {withoutToolName(a.zoneLabel || '—')}
                            </span>
                            <span className="an-meta">
                              <CalendarDays size={13} /> {SEASON_BY_ID[a.seasonId]?.short ?? '—'}
                            </span>
                            <span className="an-meta">
                              <UserRound size={13} /> {a.createdBy}
                            </span>
                            <time className="an-meta" dateTime={a.createdAt}>
                              <Clock size={13} /> {fmtDate(a.createdAt, true)}
                            </time>
                          </div>
                          <div className="an-row__lower">
                            {rowCounts && <CultureCounts counts={rowCounts} />}
                            {!isFinished(a.status) && (
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
                            )}
                          </div>
                        </div>

                        <div className="an-row__actions">
                          {can.launch && (
                            <button
                              className="an-action an-action--soft"
                              onClick={(e) => { e.stopPropagation(); analyzeCultures(a.id); }}
                              disabled={!a.detected?.length || (!!cultureJob && !cultureRunning)}
                              title={!a.detected?.length ? 'Aucune parcelle détectée dans cette analyse' : analysisLabel}
                            >
                              {cultureRunning
                                ? <><Loader2 size={15} className="capture-progress__spin" /> Analyse {cultureJob?.done ?? 0}/{cultureJob?.total ?? 0}</>
                                : <><ScanSearch size={15} /> {a.zone ? 'Analyser tout' : 'Analyser les cultures'}</>}
                            </button>
                          )}
                          {a.zone && (
                            <button className="an-action" onClick={(e) => { e.stopPropagation(); showOnMap(a); }}>
                              <MapPin size={15} /> Carte
                            </button>
                          )}
                          <div className="an-row__more">
                            <button
                              className="an-action an-action--icon"
                              onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === a.id ? null : a.id); }}
                              title="Plus d’actions"
                              aria-haspopup="menu"
                              aria-expanded={menuFor === a.id}
                              aria-label={`Plus d'actions pour l'analyse ${a.id}`}
                            >
                              <MoreHorizontal size={18} />
                            </button>
                            {menuFor === a.id && (
                              <div className="an-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                                {a.zone && (
                                  <button role="menuitem" onClick={() => { setMenuFor(null); showOnMap(a); }}>
                                    <MapPin size={15} /> Voir sur la carte
                                  </button>
                                )}
                                {a.status === 'echec' && can.launch && (
                                  <button role="menuitem" onClick={() => { setMenuFor(null); setConfirm(a.id); }}>
                                    <RotateCcw size={15} /> Relancer
                                  </button>
                                )}
                                {can.correct && (
                                  <button
                                    role="menuitem"
                                    className="is-danger"
                                    onClick={() => { setMenuFor(null); setDeleting(a.id); }}
                                  >
                                    <Trash2 size={15} /> Supprimer
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        {tab === 'auto' && (
          <div className="an-tabs__panel" role="tabpanel" id="an-tabpanel-auto" aria-labelledby="an-tab-auto">
            <section className="an-panel" aria-label="Historique des recherches automatiques">
              <div className="an-panel__head">
                <div className="an-panel__title">
                  <span className="an-panel__icon"><History size={22} /></span>
                  <div>
                    <h2>Historique des recherches</h2>
                    <p className="hint">Cultures Orge / Autre culture trouvées par les recherches lancées depuis la carte.</p>
                  </div>
                </div>
                <div className="an-panel__tools">
                  <span className="an-panel__count">
                    {fmtInt(automaticSearches.length)} recherche{automaticSearches.length > 1 ? 's' : ''}
                    {' · '}{fmtInt(autoCultureTotal)} culture{autoCultureTotal > 1 ? 's' : ''}
                  </span>
                  {can.correct && automaticSearches.length > 0 && (
                    <button className="an-clear" onClick={() => setClearing(true)}>
                      <Trash2 size={15} /> Supprimer tout
                    </button>
                  )}
                </div>
              </div>

              {automaticSearches.length === 0 ? (
                <div className="an-empty">
                  <span className="an-empty__icon"><Sprout size={22} /></span>
                  <strong>Aucune recherche automatique enregistrée</strong>
                  <p>
                    Lancez-en une depuis la carte avec l’outil « Recherche automatique » : ses cultures
                    apparaîtront ici, séparées des analyses Gemini.
                  </p>
                </div>
              ) : (
                <ul className="an-list">
                  {automaticSearches.map((entry) => {
                    const isOpen = openAuto === entry.id;
                    const orge = entry.cultures.filter((line) => line.culture === 'orge').length;
                    const autre = entry.cultures.length - orge;
                    return (
                      <li key={entry.id} className="an-auto">
                        <div
                          className="an-auto__head"
                          role="button"
                          tabIndex={0}
                          aria-expanded={isOpen}
                          onClick={() => setOpenAuto(isOpen ? null : entry.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setOpenAuto(isOpen ? null : entry.id);
                            }
                          }}
                        >
                          <div className="an-auto__main">
                            <div className="an-auto__title">
                              <CalendarDays size={18} />
                              <b>{fmtDate(entry.createdAt, true)}</b>
                              <span className="an-auto__sep" aria-hidden />
                              <BarChart3 size={18} />
                              <b>{entry.createdBy}</b>
                            </div>
                            <div className="an-row__meta an-auto__meta">
                              <span className="an-meta">
                                <MapPin size={14} /> {entry.center[0].toFixed(5)}, {entry.center[1].toFixed(5)}
                              </span>
                              <span className="an-meta">
                                <Crosshair size={14} /> Rayon {fmtInt(entry.radiusM)} m
                              </span>
                              <span className="an-meta">
                                <Layers size={14} /> {fmtInt(entry.candidates)} parcelle{entry.candidates > 1 ? 's' : ''}
                              </span>
                              <span className="an-meta">
                                <BarChart3 size={14} /> {fmtInt(entry.analyzed)} analysée{entry.analyzed > 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="an-auto__params">
                              <Thermometer size={15} />
                              Température de base {entry.baseTemperature} °C · seuil {fmtInt(entry.threshold)} °C ·
                              {' '}période {fmtInt(entry.periodDays)} jours
                              {entry.alreadyAnalyzed ? ` · ${fmtInt(entry.alreadyAnalyzed)} déjà classée(s)` : ''}
                            </p>
                          </div>
                          <div className="an-auto__counts">
                            <span><i style={{ background: colors.orge }} /> Orge <b>{fmtInt(orge)}</b></span>
                            <span><i style={{ background: colors.autre }} /> Autre culture <b>{fmtInt(autre)}</b></span>
                            <ChevronDown size={19} className={`an-auto__chevron ${isOpen ? 'is-open' : ''}`} aria-hidden />
                          </div>
                        </div>

                        {isOpen && (
                          <div className="an-auto__body">
                            {entry.cultures.length === 0 ? (
                              <p className="hint an-auto__empty">Aucune culture enregistrée pour cette recherche.</p>
                            ) : (
                              <ul className="an-auto__cultures">
                                {entry.cultures.map((line) => (
                                  <li key={line.parcelId}>
                                    <span className="an-auto__culture-label">
                                      <b>{line.label}</b>
                                      <small>{fmtHa(line.areaHa)} · {line.confidence != null ? `${Math.round(line.confidence)} %` : 'confiance —'}</small>
                                    </span>
                                    <span className="an-auto__culture">
                                      <i style={{ background: line.culture === 'orge' ? colors.orge : colors.autre }} />
                                      {line.cultureLabel}
                                    </span>
                                    <div className="an-auto__actions">
                                      <button
                                        className="an-link-btn"
                                        onClick={() => showCultureOnMap(line.parcelId)}
                                        aria-label={`Localiser sur la carte la parcelle ${line.label}`}
                                      >
                                        <Eye size={16} /> Voir sur la carte
                                      </button>
                                      {can.correct && (
                                        <button
                                          className="an-link-btn an-link-btn--danger"
                                          title="Supprimer cette culture de l’historique (la parcelle est conservée)"
                                          aria-label={`Supprimer la culture de ${line.label} de l’historique`}
                                          onClick={() => setDeletingCulture({ searchId: entry.id, parcelId: line.parcelId })}
                                        >
                                          <Trash2 size={15} /> Supprimer
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {entry.notice && <p className="hint an-auto__notice">{entry.notice}</p>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
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
            <section className="an-detail__hero">
              <h3>{withoutToolName(current.zoneLabel || '—')}</h3>
              <p className="an-detail__sub">
                {SEASON_BY_ID[current.seasonId]?.label ?? '—'} · {fmtDate(current.createdAt, true)}
              </p>
              <div className="an-detail__tags">
                <AnalysisBadge status={current.status} />
                {current.cached && <span className="tag">cache</span>}
                <span className="an-detail__tag"><UserRound size={13} /> {current.createdBy}</span>
              </div>
            </section>

            {current.captureDataUrl && (
              <img
                className="an-detail__capture"
                src={current.captureDataUrl}
                alt="Capture satellite de la zone analysée"
              />
            )}

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
                      <button className="btn btn--sm" onClick={() => showOnMap(current, p)}>
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
      {deletingCulture && (
        <Modal
          title="Retirer cette culture de l’historique ?"
          onClose={() => setDeletingCulture(null)}
          footer={<>
            <button className="btn btn--ghost" onClick={() => setDeletingCulture(null)}>Annuler</button>
            <button className="btn btn--danger" onClick={confirmRemoveCulture}>
              <Trash2 size={14} /> Retirer la culture
            </button>
          </>}
        >
          <p>
            La culture{deletingCultureLine ? ` « ${deletingCultureLine.cultureLabel} » de la parcelle ${deletingCultureLine.label}` : ''}
            {' '}sera retirée de l’historique des recherches automatiques.
          </p>
          <p className="note">
            Seule cette ligne d’historique est supprimée : la parcelle, son contour et sa culture en base
            sont conservés. L’historique des analyses Gemini n’est pas modifié.
          </p>
        </Modal>
      )}
      {clearing && (
        <Modal
          title="Supprimer tout l’historique ?"
          onClose={() => setClearing(false)}
          footer={<>
            <button className="btn btn--ghost" onClick={() => setClearing(false)}>Annuler</button>
            <button className="btn btn--danger" onClick={confirmClearAll}>
              <Trash2 size={14} /> Supprimer tout
            </button>
          </>}
        >
          <p>
            Les <b>{fmtInt(automaticSearches.length)} recherche{automaticSearches.length > 1 ? 's' : ''}</b> de
            l’historique et les <b>{fmtInt(autoCultureTotal)} culture{autoCultureTotal > 1 ? 's' : ''}</b> qu’elles
            contiennent seront définitivement supprimées.
          </p>
          <p className="note">
            Seuls les enregistrements de cet historique sont concernés : les parcelles, leurs contours et
            leurs cultures restent en base, et l’historique des analyses Gemini n’est pas modifié.
          </p>
        </Modal>
      )}
      {creating && <NewAnalysisModal onClose={() => setCreating(false)} />}
    </div>
  );
}
