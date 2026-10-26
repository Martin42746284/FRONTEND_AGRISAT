/**
 * Écran de démarrage affiché pendant le chargement des parcelles.
 *
 * `logo_MALTO.jpg` est affiché en plein écran, tel quel : aucune modification,
 * aucun filtre, aucune recoloration, aucun recadrage permanent. L'image
 * entière (ratio natif 1253 × 832) reste visible sur les écrans qui ne
 * partagent pas son ratio.
 *
 * Seule la mise en scène est ajoutée : fond d'ambiance flouté, révélation
 * cinématique, badge de chargement et transition de sortie.
 */
export default function SplashScreen({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      className={`splash ${leaving ? 'splash--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="splash__backdrop" aria-hidden />
      <div className="splash__veil" aria-hidden />

      <img
        className="splash__logo"
        src="/logo_MALTO.jpg"
        alt="MALTO"
        width={1253}
        height={832}
        decoding="async"
        fetchPriority="high"
      />

      <div className="splash__loader">
        <div className="splash__badge">
          <span className="splash__spinner" aria-hidden />
          <p className="splash__status">Chargement des parcelles…</p>
        </div>
        <div className="splash__progress" aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}
