import { Fragment, useMemo, useState } from 'react';
import {
  X, Pencil, ClipboardCheck, Flag, Trash2, Merge, Split, Check, Move, Wheat,
} from 'lucide-react';
import { useApp } from '../store/useApp';
import { CULTURES, CULTURE_BY_ID, ROLES, SEASONS, SEASON_BY_ID } from '../data/constants';
import { fmtDate, fmtHa, fmtPct } from '../lib/format';
import { isUncertain } from '../lib/filter';
import { ringAreaHa } from '../lib/geometry';
import { isAnalyzedParcel } from '../lib/analysis-parcels';
import { mapCulture } from '../api/maltoAdapter';
import { api } from '../api/services';
import type { CultureDetail, CultureId, Parcel, VegetationPoint } from '../types';
import { Badge, ConfidenceBar, Modal, StatusBadge, Swatch } from './ui';

type ModalKind = 'correct' | 'observe' | 'report' | 'reject' | 'removeCulture' | 'analyze';

const INDEX_ROWS: { key: keyof CultureDetail; label: string }[] = [
  { key: 'ndvi', label: 'NDVI' },
  { key: 'ndre', label: 'NDRE' },
  { key: 'evi', label: 'EVI' },
  { key: 'savi', label: 'SAVI' },
  { key: 'ndwi', label: 'NDWI' },
];

/** Valeur d'indice/score en base (déjà en %) → libellé lisible. */
const fmtScore = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)} %`;

/** Libellé court d'un mois « YYYY-MM » (série Sentinel-2). */
function fmtMonth(iso: string): string {
  const d = new Date(`${iso}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

function Shape({ p, color }: { p: Parcel; color: string }) {
  const lats = p.coords.map((c) => c[0]), lngs = p.coords.map((c) => c[1]);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLo = Math.min(...lngs), maxLo = Math.max(...lngs);
  const k = Math.cos((p.centroid[0] * Math.PI) / 180);
  const w = (maxLo - minLo) * k, h = maxLa - minLa, m = Math.max(w, h) * 0.18;
  const pts = p.coords.map(([la, lo]) => `${(lo - minLo) * k + m},${maxLa - la + m}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w + 2 * m} ${h + 2 * m}`} className="shape" role="img" aria-label="Géométrie de la parcelle">
      <polygon points={pts} fill={color} fillOpacity={0.6} stroke="#12262B" strokeWidth={Math.max(w, h) * 0.012} strokeLinejoin="round" />
    </svg>
  );
}

/** Mini-courbe NDVI de la série mensuelle enregistrée avec la culture. */
function NdviSpark({ points }: { points: VegetationPoint[] }) {
  const usable = points.filter((p): p is { date: string; ndvi: number } => typeof p.ndvi === 'number');
  if (usable.length < 2) return null;
  const width = 320, height = 56, pad = 6;
  const values = usable.map((p) => p.ndvi);
  const min = Math.min(...values), max = Math.max(...values);
  const span = Math.max(0.01, max - min);
  const x = (i: number) => pad + (i * (width - 2 * pad)) / (usable.length - 1);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - 2 * pad);
  const path = usable.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.ndvi).toFixed(1)}`).join(' ');
  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Série NDVI sur ${usable.length} mois`}>
        <path d={path} fill="none" stroke="#0F7F86" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <figcaption className="muted-sm">
        {fmtMonth(usable[0].date)} → {fmtMonth(usable[usable.length - 1].date)} · NDVI de{' '}
        {min.toFixed(2)} à {max.toFixed(2)}
      </figcaption>
    </figure>
  );
}

/** Fiche culture : ce qui est enregistré en base pour la parcelle, avant tout détail de contour. */
export function CulturePanel({ detail, colors }: { detail: CultureDetail; colors: Record<CultureId, string> }) {
  const cultureId = mapCulture(detail.detected ?? detail.declared);
  const scores = [
    { label: 'Orge (CNN)', value: detail.cnnProbBarley },
    { label: 'Non-orge (CNN)', value: detail.cnnProbNonBarley },
    { label: 'Score agro', value: detail.agroScore },
    { label: 'Score hybride', value: detail.hybridScore },
  ].filter((score) => score.value != null);

  return (
    <>
      <section aria-label="Culture enregistrée">
        <h3><Wheat size={13} /> Culture enregistrée</h3>
        <div className="culture-line">
          <Swatch color={colors[cultureId]} size={14} />
          <strong>{CULTURE_BY_ID[cultureId].label}</strong>
          {detail.detected && detail.detected !== CULTURE_BY_ID[cultureId].label && (
            <Badge tone="muted">{detail.detected}</Badge>
          )}
        </div>
        <dl className="kv kv--wide">
          {detail.confidence != null && <><dt>Confiance du modèle</dt><dd>{fmtScore(detail.confidence)}</dd></>}
          {detail.declared && <><dt>Culture déclarée</dt><dd>{detail.declared}</dd></>}
          {detail.seasonLabel && <><dt>Saison / stade</dt><dd>{detail.seasonLabel}</dd></>}
          {detail.source && <><dt>Source</dt><dd>{detail.source}</dd></>}
        </dl>
        {detail.verdict && <p className="culture-verdict">{detail.verdict}</p>}
        {detail.details && <p className="hint">{detail.details}</p>}
      </section>

      {(detail.ndvi != null || detail.ndre != null || detail.evi != null || detail.savi != null || detail.ndwi != null) && (
        <section>
          <h3>Indices de végétation</h3>
          <div className="indices">
            {INDEX_ROWS.map(({ key, label }) => (
              <div className="index" key={key}>
                <span>{label}</span>
                <b>{fmtScore(detail[key] as number | null)}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {(detail.growthStage || detail.plantingDate || detail.harvestDate
        || detail.daysSincePlanting != null || detail.plantingConfidence != null) && (
        <section>
          <h3>Cycle cultural</h3>
          <dl className="kv kv--wide">
            {detail.growthStage && <><dt>Stade</dt><dd>{detail.growthStage}</dd></>}
            {detail.plantingDate && <><dt>Semis estimé</dt><dd>{fmtDate(detail.plantingDate)}</dd></>}
            {detail.harvestDate && <><dt>Récolte estimée</dt><dd>{fmtDate(detail.harvestDate)}</dd></>}
            {detail.daysSincePlanting != null && <><dt>Depuis le semis</dt><dd>{detail.daysSincePlanting} jours</dd></>}
            {detail.plantingConfidence != null && <><dt>Confiance du semis</dt><dd>{fmtScore(detail.plantingConfidence)}</dd></>}
          </dl>
        </section>
      )}

      {(detail.soilType || detail.riskFactors.length > 0) && (
        <section>
          <h3>Sol et facteurs de risque</h3>
          <dl className="kv kv--wide">
            {detail.soilType && <><dt>Type de sol</dt><dd>{detail.soilType}</dd></>}
          </dl>
          {detail.riskFactors.length > 0 && (
            <ul className="risk-list">{detail.riskFactors.map((risk) => <li key={risk}>{risk}</li>)}</ul>
          )}
        </section>
      )}

      {detail.recommendations && (
        <section>
          <h3>Recommandations</h3>
          <p>{detail.recommendations}</p>
        </section>
      )}

      {scores.length > 0 && (
        <section>
          <h3>Scores des modèles</h3>
          <dl className="kv kv--wide">
            {scores.map((score) => (
              <Fragment key={score.label}>
                <dt>{score.label}</dt><dd>{fmtScore(score.value)}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}

      {detail.timeSeries.filter((point) => typeof point.ndvi === 'number').length > 1 && (
        <section>
          <h3>Suivi NDVI (Sentinel-2)</h3>
          <NdviSpark points={detail.timeSeries} />
        </section>
      )}

      {(detail.ownerName || detail.notes || detail.createdAt) && (
        <section>
          <h3>Enregistrement</h3>
          <dl className="kv kv--wide">
            {detail.ownerName && <><dt>Propriétaire / exploitant</dt><dd>{detail.ownerName}</dd></>}
            {detail.createdAt && <><dt>Enregistrée le</dt><dd>{fmtDate(detail.createdAt, true)}</dd></>}
            {detail.notes && <><dt>Notes</dt><dd>{detail.notes}</dd></>}
          </dl>
        </section>
      )}
    </>
  );
}

export default function ParcelDrawer() {
  const id = useApp((s) => s.selectedId);
  const parcels = useApp((s) => s.parcels);
  const seasonId = useApp((s) => s.filters.seasonId);
  const colors = useApp((s) => s.colors);
  const threshold = useApp((s) => s.threshold);
  const user = useApp((s) => s.user);
  const communes = useApp((s) => s.communes);
  const regions = useApp((s) => s.regions);
  const select = useApp((s) => s.select);
  const editingParcelId = useApp((s) => s.editingParcelId);
  const editingCoords = useApp((s) => s.editingCoords);
  const analyzingParcelId = useApp((s) => s.analyzingParcelId);
  const { startEditParcel, cancelEditParcel, saveEditParcel } = useApp.getState();
  const [modal, setModal] = useState<ModalKind | null>(null);

  const p = useMemo(() => parcels.find((x) => x.id === id), [parcels, id]);
  if (!p) return null;
  const editing = editingParcelId === p.id && !!editingCoords;
  const r = p.results[seasonId];
  const detail = p.cultureDetail;
  const hasCulture = !!detail || (!!r && r.culture !== 'inconnue');
  // Couleur de la forme : culture en base si elle existe, sinon résultat de la saison.
  const cultureId = detail ? mapCulture(detail.detected ?? detail.declared) : r?.culture;
  const can = user ? ROLES[user.role].can : null;
  const isAnalyzing = analyzingParcelId === p.id;
  const analyzeRunning = analyzingParcelId !== null;
  const commune = communes.find((c) => c.id === p.communeId);
  const region = regions.find((x) => x.id === p.regionId);
  const probs = r ? Object.entries(r.probs).sort((a, b) => b[1]! - a[1]!).slice(0, 4) as [CultureId, number][] : [];
  const history = SEASONS.filter((s) => p.results[s.id] && p.results[s.id].culture !== 'inconnue');

  return (
    <aside className="drawer" aria-label="Fiche de la parcelle">
      <header className="drawer__head">
        <div>
          <h2>{p.id}</h2>
          <p>{commune?.name} · {region?.name}</p>
        </div>
        <button className="icon-btn" onClick={() => select(null)} aria-label="Fermer la fiche"><X size={18} /></button>
      </header>

      {editing && editingCoords && (
        <div className="editbar" role="region" aria-label="Mode édition du contour">
          <div className="editbar__head">
            <b><Move size={14} /> Édition du contour</b>
            <span className="hint">{editingCoords.length} sommets</span>
          </div>
          <p className="hint">Déplacez les points blancs du polygone sur la carte pour ajuster la parcelle, puis validez.</p>
          <dl className="kv">
            <dt>Superficie après modification</dt>
            <dd className="big">{fmtHa(ringAreaHa(editingCoords))}</dd>
          </dl>
          <div className="actions">
            <button className="btn btn--primary" onClick={saveEditParcel}><Check size={14} /> Valider le contour</button>
            <button className="btn" onClick={cancelEditParcel}><X size={14} /> Annuler</button>
          </div>
        </div>
      )}

      <div className="drawer__body">
        {detail ? (
          <CulturePanel detail={detail} colors={colors} />
        ) : !r || r.culture === 'inconnue' ? (
          <p className="drawer__empty">
            Aucune culture enregistrée sur cette parcelle. Le contour reste disponible sur la carte.
          </p>
        ) : (
          <>
            <section aria-label="Culture estimée">
              <h3>Culture estimée</h3>
              <div className="culture-line">
                <Swatch color={colors[r.culture]} size={14} />
                <strong>{CULTURE_BY_ID[r.culture].label}</strong>
                <span className="muted">confiance {fmtPct(r.confidence)}</span>
              </div>
              <ConfidenceBar value={r.confidence} threshold={threshold} />
              {isUncertain(r, threshold) && (
                <p className="note note--warn">Résultat incertain : à interpréter avec prudence et à confirmer sur le terrain.</p>
              )}
              <h4>Probabilités par classe</h4>
              <ul className="probs">
                {probs.map(([c, v]) => (
                  <li key={c}>
                    <span><Swatch color={colors[c]} size={10} /> {CULTURE_BY_ID[c].label}</span>
                    <div className="probs__bar"><i style={{ width: `${v * 100}%`, background: colors[c] }} /></div>
                    <em>{fmtPct(v)}</em>
                  </li>
                ))}
              </ul>
              <p className="hint">Scores du modèle, non calibrés : ce ne sont pas des probabilités garanties.</p>
            </section>
            {r && (
              <section>
                <h3>Source de l'analyse</h3>
                <dl className="kv kv--wide">
                  <dt>Saison</dt><dd>{SEASON_BY_ID[r.seasonId]?.label}</dd>
                  <dt>Images utilisées</dt><dd>{fmtDate(r.observedFrom)} → {fmtDate(r.observedTo)}</dd>
                  <dt>Traitée le</dt><dd>{fmtDate(r.processedAt)}</dd>
                  <dt>Modèle</dt><dd>{r.modelVersion}</dd>
                  <dt>Analyse</dt><dd>{r.analysisId}</dd>
                  <dt>Détection du contour</dt><dd>{fmtPct(p.detectionConfidence)}</dd>
                </dl>
              </section>
            )}
          </>
        )}

        <details className="drawer__more" open={!hasCulture}>
          <summary>Détails de la parcelle</summary>
          <div className="drawer__top">
            <Shape p={p} color={hasCulture && cultureId ? colors[cultureId] : colors.inconnue} />
            <dl className="kv">
              <dt>Superficie estimée</dt><dd className="big">{fmtHa(p.areaHa)}</dd>
              {r && <><dt>Statut</dt><dd><StatusBadge status={r.status} /></dd></>}
            </dl>
          </div>
          <dl className="kv kv--wide">
            {commune && <><dt>Commune</dt><dd>{commune.name}</dd></>}
            {region && <><dt>Région</dt><dd>{region.name}</dd></>}
            <dt>Détection du contour</dt><dd>{fmtPct(p.detectionConfidence)}</dd>
            {p.dataSource && <><dt>Source de la donnée</dt><dd>{p.dataSource}</dd></>}
            <dt>Créée le</dt><dd>{fmtDate(p.createdAt, true)}</dd>
          </dl>

          {history.length > 0 && (
            <section>
              <h3>Historique</h3>
              <table className="mini">
                <tbody>
                  {history.map((s) => {
                    const h = p.results[s.id];
                    return (
                      <tr key={s.id} className={s.id === seasonId ? 'is-current' : ''}>
                        <td>{s.short}</td>
                        <td><Swatch color={colors[h.culture]} size={10} /> {CULTURE_BY_ID[h.culture].label}</td>
                        <td>{fmtPct(h.confidence)}</td>
                        <td><StatusBadge status={h.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {p.corrections.length > 0 && (
            <section>
              <h3>Corrections et observations</h3>
              <ul className="timeline">
                {p.corrections.map((c, i) => (
                  <li key={i}>
                    <b>{c.kind === 'observation' ? 'Observation terrain' : 'Correction'}</b> · {SEASON_BY_ID[c.seasonId]?.short}
                    <span>{CULTURE_BY_ID[c.from].label} → {CULTURE_BY_ID[c.to].label} · {c.by} · {fmtDate(c.at)}</span>
                    <span>{c.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </details>

        <section className="actions">
          {can?.launch && !editing && (
            <button
              className="btn btn--primary"
              onClick={() => setModal('analyze')}
              disabled={analyzeRunning}
              title="Analyse cette parcelle uniquement : les parcelles voisines ne sont pas touchées"
            >
              <Wheat size={14} /> {isAnalyzing ? 'Analyse en cours…' : 'Analyser'}
            </button>
          )}
          {can?.correct && !editing && <button className="btn" onClick={() => startEditParcel(p.id)} title="Ou double-cliquez la parcelle sur la carte"><Move size={14} /> Modifier le contour</button>}
          {can?.correct && hasCulture && (
            <button className="btn btn--danger" onClick={() => setModal('removeCulture')}>
              <Trash2 size={14} /> Supprimer la culture
            </button>
          )}
          {can?.correct && r && r.culture !== 'inconnue' && <button className="btn btn--primary" onClick={() => setModal('correct')}><Pencil size={14} /> Corriger la classe</button>}
          {can?.observe && r && r.culture !== 'inconnue' && <button className="btn" onClick={() => setModal('observe')}><ClipboardCheck size={14} /> Saisir une observation</button>}
          <button className="btn" onClick={() => setModal('report')}><Flag size={14} /> Signaler un problème</button>
          {can?.correct && (
            <>
              <button className="btn" disabled title="Fusion de polygones — sera reliée à PostGIS (ST_Union)"><Merge size={14} /> Fusionner</button>
              <button className="btn" disabled title="Scission de polygone — sera reliée à PostGIS (ST_Split)"><Split size={14} /> Scinder</button>
              <button className="btn btn--danger" onClick={() => setModal('reject')}><Trash2 size={14} /> Supprimer la parcelle</button>
            </>
          )}
        </section>
        <p className="legal">Contour détecté par IA — ce n'est pas une limite foncière officielle. Supprimer la culture ne supprime pas la parcelle.</p>
      </div>

      {modal && (
        <ParcelModal
          kind={modal}
          parcel={p}
          current={r?.culture ?? 'inconnue'}
          onClose={() => setModal(null)}
        />
      )}
    </aside>
  );
}

function ParcelModal({ kind, parcel, current, onClose }: {
  kind: ModalKind; parcel: Parcel; current: CultureId; onClose: () => void;
}) {
  const [culture, setCulture] = useState<CultureId>(current);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { correctParcel, rejectParcel, removeParcelCulture, toast, logAudit, analyzeParcel } = useApp.getState();
  // Parcelle déjà analysée : la relance remplace les données enregistrées, elle
  // doit donc être confirmée explicitement par l'utilisateur.
  const alreadyAnalyzed = isAnalyzedParcel(parcel);

  const save = async () => {
    if (kind === 'correct' || kind === 'observe') {
      if (!note.trim()) { toast('Ajoutez une note pour justifier la modification.', 'warn'); return; }
      correctParcel(parcel.id, culture, note.trim(), kind === 'observe' ? 'observation' : 'correction');
      toast(kind === 'observe' ? 'Observation enregistrée.' : 'Classe corrigée.', 'ok');
    } else if (kind === 'reject') {
      // Suppression persistante (ligne en base ou marqueur de contour) : on attend
      // la fin de l'écriture avant de fermer la fenêtre.
      setBusy(true);
      await rejectParcel(parcel.id);
    } else if (kind === 'removeCulture') {
      // La culture est supprimée en base ; la parcelle et son contour restent.
      setBusy(true);
      await removeParcelCulture(parcel.id);
    } else if (kind === 'analyze') {
      // Analyse unitaire : seule cette parcelle est analysée et modifiée.
      setBusy(true);
      await analyzeParcel(parcel.id, { force: alreadyAnalyzed });
    } else {
      setBusy(true);
      await api.reportParcel(parcel.id, note);
      logAudit('Signalement', `Parcelle ${parcel.id}`);
      toast('Signalement transmis aux analystes.', 'ok');
    }
    onClose();
  };

  const titles: Record<ModalKind, string> = {
    correct: 'Corriger la classe',
    observe: 'Saisir une observation de terrain',
    report: 'Signaler un problème',
    reject: 'Supprimer cette parcelle',
    removeCulture: 'Supprimer la culture',
    analyze: alreadyAnalyzed ? 'Relancer l’analyse de la parcelle' : 'Analyser cette parcelle',
  };
  const confirmLabel = kind === 'reject' || kind === 'removeCulture'
    ? (kind === 'removeCulture' ? 'Supprimer la culture' : 'Supprimer la parcelle')
    : kind === 'report' ? 'Envoyer'
    : kind === 'analyze' ? (alreadyAnalyzed ? 'Relancer l’analyse' : 'Analyser')
    : 'Enregistrer';
  const busyLabel = kind === 'analyze' ? 'Analyse en cours…' : 'Suppression…';

  return (
    <Modal title={titles[kind]} onClose={onClose}
      footer={<><button className="btn btn--ghost" onClick={onClose}>Annuler</button>
        <button className={`btn ${kind === 'reject' || kind === 'removeCulture' ? 'btn--danger' : 'btn--primary'}`} onClick={save} disabled={busy}>
          {busy ? busyLabel : confirmLabel}</button></>}>
      <p className="muted">{parcel.id}</p>
      {kind === 'reject' ? (
        <p>La parcelle et son contour seront supprimés définitivement. Pour ne retirer que la culture, utilisez « Supprimer la culture ». Confirmer ?</p>
      ) : kind === 'removeCulture' ? (
        <>
          <p>La culture enregistrée sur cette parcelle sera supprimée : classification, indices, cycle cultural et données associées.</p>
          <p><b>La parcelle, son contour et sa superficie sont conservés</b> sur la carte et dans la base de données.</p>
        </>
      ) : kind === 'analyze' ? (
        <>
          <p>
            L’analyse porte <b>uniquement sur cette parcelle</b> : les parcelles voisines ne sont ni
            analysées, ni modifiées.
          </p>
          {alreadyAnalyzed ? (
            <>
              <p>
                Cette parcelle a <b>déjà été analysée</b>. Relancer l’analyse <b>remplacera les données
                enregistrées</b> (culture détectée, indices, cycle cultural) par les nouvelles valeurs.
              </p>
              <p className="note note--warn">Confirmez-vous la relance ?</p>
            </>
          ) : (
            <p>
              Le résultat (culture détectée, NDVI/NDRE/EVI, cycle cultural, séries temporelles) sera
              enregistré en base pour cette parcelle.
            </p>
          )}
        </>
      ) : (
        <>
          {(kind === 'correct' || kind === 'observe') && (
            <label className="field">
              <span>{kind === 'observe' ? 'Culture observée' : 'Nouvelle classe'}</span>
              <select value={culture} onChange={(e) => setCulture(e.target.value as CultureId)}>
                {CULTURES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span>{kind === 'report' ? 'Description' : 'Note'}</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'report' ? 'Ex. contour fusionné avec la parcelle voisine' : 'Source et date de la vérification'} />
          </label>
        </>
      )}
    </Modal>
  );
}
