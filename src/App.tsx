import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './store/useApp';
import { ROLES } from './data/constants';
import AppShell from './components/AppShell';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import MapPage from './pages/MapPage';
import Dashboard from './pages/Dashboard';
import Parcels from './pages/Parcels';
import Analyses from './pages/Analyses';
import Models from './pages/Models';
import Admin from './pages/Admin';

/**
 * Présence minimale de l'écran de démarrage : le temps de voir STAR puis MALTO
 * une première fois (les logos alternent ensuite tant que le chargement dure).
 */
const SPLASH_INTRO_MS = 2800;

function Guard({ children, perm }: { children: JSX.Element; perm?: keyof (typeof ROLES)['admin']['can'] }) {
  const user = useApp((s) => s.user);
  if (!user) return <Navigate to="/connexion" replace />;
  if (perm && !ROLES[user.role].can[perm]) return <Navigate to="/carte" replace />;
  return children;
}

export default function App() {
  const ready = useApp((s) => s.ready);
  const loadError = useApp((s) => s.loadError);
  const init = useApp((s) => s.init);
  const reload = useApp((s) => s.reload);
  const [retrying, setRetrying] = useState(false);
  // L'écran de démarrage reste monté le temps de son fondu de sortie, une fois
  // les parcelles chargées (la carte est déjà rendue dessous).
  const [splashDone, setSplashDone] = useState(false);
  // Les deux logos alternent en boucle tant que les parcelles ne sont pas
  // chargées. Le fondu de sortie n'est déclenché qu'une fois l'introduction
  // jouée, même si la carte est prête avant.
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    const timer = window.setTimeout(() => setIntroDone(true), SPLASH_INTRO_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const splashLeaving = ready && !loadError && introDone;
  useEffect(() => {
    if (!splashLeaving) return;
    const timer = window.setTimeout(() => setSplashDone(true), 560);
    return () => window.clearTimeout(timer);
  }, [splashLeaving]);

  const errorScreen = (
    <div className="boot">
      <p><b>Base de données indisponible.</b></p>
      <p style={{ maxWidth: 520, fontSize: 13 }}>
        Les parcelles n’ont pas pu être chargées. Vos données ne sont pas perdues :
        la connexion au serveur a échoué ou a dépassé le délai d’attente.
      </p>
      <p style={{ maxWidth: 520, fontSize: 12, opacity: 0.7 }}>{loadError}</p>
      <button
        className="btn"
        disabled={retrying}
        onClick={async () => { setRetrying(true); await reload(); setRetrying(false); }}
      >
        {retrying ? 'Nouvelle tentative…' : 'Réessayer'}
      </button>
    </div>
  );

  return (
    <>
      {ready && !loadError && (
        <Routes>
          <Route path="/connexion" element={<Login />} />
          <Route element={<Guard><AppShell /></Guard>}>
            <Route path="/carte" element={<MapPage />} />
            <Route path="/tableau-de-bord" element={<Dashboard />} />
            <Route path="/parcelles" element={<Parcels />} />
            <Route path="/analyses" element={<Guard perm="analyses"><Analyses /></Guard>} />
            <Route path="/modeles" element={<Guard perm="models"><Models /></Guard>} />
            <Route path="/administration" element={<Guard perm="admin"><Admin /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/carte" replace />} />
        </Routes>
      )}
      {ready && loadError && errorScreen}
      {(!ready || (!loadError && !splashDone)) && <SplashScreen leaving={splashLeaving} />}
    </>
  );
}
