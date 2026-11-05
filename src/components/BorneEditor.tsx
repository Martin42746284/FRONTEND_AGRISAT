import { useEffect, useState } from 'react';
import { Check, Crosshair, Loader2, MapPin, X } from 'lucide-react';
import { useApp } from '../store/useApp';

function fmt(value: number): string {
  return value.toFixed(6);
}

/**
 * Carte de saisie affichée après un clic sur la carte en mode placement.
 *
 * Le point est déjà matérialisé sur la carte (marqueur brouillon) ; cette carte
 * ne demande que le nom, puis enregistre la borne en base. Elle est centrée
 * dans la zone de carte, au-dessus de laquelle elle flotte.
 */
export default function BorneEditor() {
  const placement = useApp((s) => s.bornePlacement);
  const draft = useApp((s) => s.borneDraft);
  const cancelPlacement = useApp((s) => s.cancelBornePlacement);
  const cancelDraft = useApp((s) => s.cancelBorneDraft);
  const saveBorne = useApp((s) => s.saveBorne);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    setName('');
    setError(null);
    setSaving(false);
  }, [draft]);

  if (placement) {
    return (
      <section className="bornecard glass" role="status" aria-label="Placement d'une borne GPS">
        <header className="bornecard__head">
          <span className="bornecard__title"><MapPin size={15} /> Placer une borne GPS</span>
          <button className="bornecard__close" type="button" onClick={cancelPlacement} aria-label="Annuler le placement">
            <X size={15} />
          </button>
        </header>
        <p className="hint">Cliquez sur la carte à l'emplacement de la borne, puis donnez-lui un nom.</p>
        <div className="bornecard__actions">
          <button className="btn btn--sm" type="button" onClick={cancelPlacement}>Annuler</button>
        </div>
      </section>
    );
  }

  if (!draft) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Donnez un nom à la borne.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBorne(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <section className="bornecard glass" aria-label="Enregistrer une borne GPS">
      <header className="bornecard__head">
        <span className="bornecard__title"><MapPin size={15} /> Nouvelle borne GPS</span>
        <button className="bornecard__close" type="button" onClick={cancelDraft} aria-label="Fermer" disabled={saving}>
          <X size={15} />
        </button>
      </header>
      <p className="bornecard__coords">
        <Crosshair size={14} aria-hidden />
        <b>Coordonnées</b>
        <span>{fmt(draft[0])}, {fmt(draft[1])}</span>
      </p>
      <form className="bornecard__form" onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span>Nom de la borne</span>
          <input
            autoFocus
            maxLength={120}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Ex. Borne nord du champ"
            aria-invalid={error ? true : undefined}
            disabled={saving}
          />
        </label>
        {error && <p className="note note--danger">{error}</p>}
        <div className="bornecard__actions">
          <button className="btn btn--sm btn--primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? <Loader2 size={13} className="capture-progress__spin" /> : <Check size={13} />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button className="btn btn--sm" type="button" onClick={cancelDraft} disabled={saving}>Annuler</button>
        </div>
      </form>
    </section>
  );
}
