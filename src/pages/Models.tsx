import { useEffect, useState } from 'react';
import { Badge, Swatch } from '../components/ui';
import { useApp } from '../store/useApp';
import { api, type DeployedModels } from '../api/services';

/** Affiche un bloc de métriques réelles (valeurs 0-1 → %). */
function Metric({ label, value }: { label: string; value: number | undefined }) {
  return <tr><td>{label}</td><td className="num">{value === undefined ? '—' : value.toString().padEnd(5) + ' %'}</td></tr>;
}

/** Section « modèles réellement déployés » — données vives de GET /api/modeles (Malto). */
function DeployedModelsSection() {
  const [models, setModels] = useState<DeployedModels | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.getDeployedModels()
      .then((m) => { if (alive) setModels(m); })
      .catch((err: Error) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, []);

  if (error) {
    return <p className="note note--warn">Modèles déployés injoignables ({error}). Vérifiez que le backend tourne sur port 3001.</p>;
  }
  if (!models) return <p className="hint">Interrogation du backend Malto (GET /api/modeles)…</p>;

  const rf = models.classification_orge;
  const vhr = models.delimitation_vhr;
  return (
    <section className="card">
      <h2>Modèles déployés (Malto — données réelles)</h2>
      <p className="hint">Inventaire lu directement sur le backend : fichiers chargés, état des services et métriques d'entraînement réelles.</p>
      <div className="grid2">
        <div>
          <h3>{rf.nom}</h3>
          <p className="muted">{rf.type}</p>
          <p><Badge tone={rf.statut === 'pret' ? 'ok' : 'danger'}>{rf.statut === 'pret' ? 'Déployé' : rf.statut}</Badge>{' '}
            <code>{rf.fichier}</code>{rf.modifie_le ? <> · entraîné le {rf.modifie_le ? new Date(rf.modifie_le).toLocaleDateString('fr-FR') : '—'}</> : null}</p>
          {rf.metriques && (
            <div className="tablewrap"><table className="table">
              <thead><tr><th>Métrique (jeu de test indépendant)</th><th className="num">Valeur</th></tr></thead>
              <tbody>
                <Metric label="F1 orge" value={rf.metriques.f1_orge} />
                <Metric label="Précision orge" value={rf.metriques.precision_orge} />
                <Metric label="Rappel orge" value={rf.metriques.rappel_orge} />
                <Metric label="Accuracy" value={rf.metriques.accuracy} />
                <Metric label="ROC AUC" value={rf.metriques.roc_auc} />
                <Metric label="PR AUC" value={rf.metriques.pr_auc} />
                <tr><td>Seuil de décision</td><td className="num">{rf.metriques.seuil.toFixed(2)}</td></tr>
                <tr><td>Matrice de confusion (TN / FP / FN / TP)</td><td className="num">{rf.metriques.tn} / {rf.metriques.fp} / {rf.metriques.fn} / {rf.metriques.tp}</td></tr>
              </tbody>
            </table></div>
          )}
          {rf.entrainement && (
            <p className="hint">{rf.entrainement.n_features} caractéristiques · {rf.entrainement.n_lignes} échantillons · {rf.entrainement.n_splits} plis (split spatial anti-fuite : {rf.entrainement.anti_leakage_ok ? 'OK' : 'non vérifié'}).</p>
          )}
        </div>
        <div>
          <h3>{vhr.nom}</h3>
          <p className="muted">{vhr.type}</p>
          <p><Badge tone={vhr.statut === 'pret' ? 'ok' : vhr.statut === 'injoignable' ? 'danger' : 'warn'}>{vhr.statut === 'pret' ? 'Service en ligne' : vhr.statut}</Badge>{' '}
            <code>{vhr.service}</code></p>
          {vhr.statut === 'pret' && (
            <ul className="hint">
              <li>Modèle chargé : <code>{vhr.modele_charge ?? '—'}</code>{vhr.modele_present === false ? ' (fichier absent)' : ''}</li>
              <li>Modes : {(vhr.modes ?? []).join(', ') || '—'}</li>
              <li>Sert les contours affichés sur la carte (route <code>/api/zone-parcels</code>).</li>
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Models() {
  return (
    <div className="page page--single">
      <div className="content content--wide">
        <div className="content__head">
          <div><h1>Modèles IA</h1><p className="métriques">Versions déployées et métriques d'évaluation sur le jeu de test géographique indépendant.</p></div>
        </div>
        <DeployedModelsSection />
      </div>
    </div>
  );
}
