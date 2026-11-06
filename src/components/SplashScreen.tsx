/**
 * Écran de démarrage affiché pendant le chargement des parcelles.
 *
 * Les deux logos `star.png` et `logo_malto_sans_fond.png` (public/) sont présentés
 * successivement, sans transformation : aucun filtre de couleur, aucun
 * recadrage, leurs fonds transparents sont conservés tels quels.
 *
 * Seule la mise en scène est assurée par le CSS : halo d'ambiance, filet
 * lumineux, indicateur de chargement et alternance STAR ↔ MALTO qui tourne en
 * boucle pendant tout le chargement (cycle de 5 s). L'écran ne s'efface
 * qu'une fois les parcelles chargées, et au plus tôt après SPLASH_INTRO_MS
 * (App.tsx) pour laisser le temps de voir les deux logos.
 */

export default function SplashScreen({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      className={`splash ${leaving ? 'splash--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="splash__aura" aria-hidden>
        <span className="splash__glow splash__glow--green" />
        <span className="splash__glow splash__glow--red" />
        <span className="splash__glow splash__glow--gold" />
        <span className="splash__vignette" />
      </div>

      <div className="splash__content">
        <div className="splash__stage">
          <img
            className="splash__logo splash__logo--star"
            src="/star.png"
            alt="STAR"
            width={303}
            height={119}
            decoding="async"
            fetchPriority="high"
          />
          <img
            className="splash__logo splash__logo--malto"
            src="/logo_malto_sans_fond.png"
            alt="MALTO"
            width={984}
            height={253}
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <span className="splash__rule" aria-hidden />

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
    </div>
  );
}
