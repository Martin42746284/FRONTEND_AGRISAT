import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Satellite, Sparkles, X } from 'lucide-react';

export interface CaptureProgressView {
  /** Pourcentage réel transmis par le backend. */
  percent: number;
  /** Étape en cours, elle aussi transmise par le backend. */
  label: string;
  /** Le résultat est arrivé : on laisse 100 % visible un court instant. */
  done: boolean;
  /** Fondu de sortie avant le démontage. */
  leaving?: boolean;
}

/**
 * Fenêtre bloquante affichée pendant la capture et la détection des parcelles.
 *
 * Le portail est monté directement dans `document.body` : l'application devient
 * inerte (souris et clavier) pendant le traitement, tandis que la carte reste
 * visible derrière un voile flouté.
 */
export default function CaptureProgressOverlay({
  progress,
  onCancel,
}: {
  progress: CaptureProgressView;
  onCancel?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent)));

  useEffect(() => {
    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    root?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();
    return () => {
      root?.removeAttribute('inert');
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  // Échap annule aussi l'analyse : le bouton reste le moyen visible, mais le
  // clavier doit permettre de sortir d'une fenêtre bloquante.
  useEffect(() => {
    if (progress.done || !onCancel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [progress.done, onCancel]);

  return createPortal(
    <div
      className={`capture-overlay${progress.leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-overlay-title"
      aria-describedby="capture-overlay-description"
      aria-busy={!progress.done}
    >
      <div className="capture-overlay__veil" aria-hidden />

      <div
        ref={cardRef}
        className={`capture-overlay__card${progress.done ? ' is-done' : ''}`}
        tabIndex={-1}
      >
        <div className="capture-overlay__visual" aria-hidden>
          <span className="capture-overlay__orbit capture-overlay__orbit--outer" />
          <span className="capture-overlay__orbit capture-overlay__orbit--inner" />
          <span className="capture-overlay__halo" />
          <span className="capture-overlay__core">
            {progress.done ? <Check size={30} strokeWidth={2.4} /> : <Satellite size={30} />}
          </span>
        </div>

        <div className="capture-overlay__copy">
          <p className="capture-overlay__eyebrow"><Sparkles size={13} /> Capture et détection des parcelles</p>
          <h2 id="capture-overlay-title">
            {progress.done ? 'Analyse terminée' : 'Analyse satellite en cours'}
          </h2>
          <p id="capture-overlay-description">
            {progress.done
              ? 'Le résultat de la détection est prêt sur la carte.'
              : 'Capture satellite, détection des parcelles et enregistrement en base.'}
          </p>
        </div>

        <div
          className="capture-overlay__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent} % — ${progress.label}`}
        >
          <div className="capture-overlay__meta">
            <span>{progress.label}</span>
            <strong>{percent}<small>%</small></strong>
          </div>
          <div className="capture-overlay__track">
            <span style={{ width: `${percent}%` }}>
              <i aria-hidden />
            </span>
          </div>
        </div>

        <p className="capture-overlay__hint">
          {progress.done
            ? 'Fermeture automatique…'
            : onCancel
              ? 'Vous pouvez annuler à tout moment ; la fenêtre se fermera automatiquement à la fin.'
              : 'Merci de patienter, cette fenêtre se fermera automatiquement.'}
        </p>

        {!progress.done && onCancel && (
          <button type="button" className="btn btn--sm capture-overlay__cancel" onClick={onCancel}>
            <X size={14} /> Annuler l’analyse
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
