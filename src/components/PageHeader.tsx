import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, CalendarDays, CloudSun, Hourglass, Layers, Map as MapIcon } from 'lucide-react';
import { useApp } from '../store/useApp';
import { fmtDate, fmtHa, fmtInt } from '../lib/format';

const PAGES = ['/tableau-de-bord', '/parcelles', '/analyses', '/modeles', '/administration'];

function useOutside(ref: React.RefObject<HTMLElement>, close: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, close]);
}

function Stats() {
  const parcels = useApp((s) => s.parcels);
  const analyses = useApp((s) => s.analyses);
  const stats = useMemo(() => {
    const active = parcels.filter((p) => !p.rejected);
    return {
      count: active.length,
      area: active.reduce((sum, p) => sum + p.areaHa, 0),
      pending: analyses.filter((a) => a.status === 'en_cours' || a.status === 'en_attente').length,
    };
  }, [parcels, analyses]);
  return (
    <div className="hstats">
      <div className="hstat"><MapIcon size={18} /><div><b>{fmtInt(stats.count)}</b><span>Parcelles</span></div></div>
      <div className="hstat"><Layers size={18} /><div><b>{fmtHa(stats.area)}</b><span>Surface totale</span></div></div>
      <div className="hstat"><Hourglass size={18} /><div><b>{fmtInt(stats.pending)}</b><span>Analyses en cours</span></div></div>
      <div className="hstat"><CalendarDays size={18} /><div><b>{fmtDate(new Date().toISOString())}</b><span>Aujourd’hui</span></div></div>
    </div>
  );
}

function Weather() {
  const center = useApp((s) => s.parcels[0]?.centroid);
  const [w, setW] = useState<{ t: number; rain: number; wind: number } | null>(null);
  const lat = center?.[0];
  const lng = center?.[1];
  useEffect(() => {
    if (lat == null || lng == null) return;
    const ctrl = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setW({ t: d.current.temperature_2m, rain: d.current.precipitation, wind: d.current.wind_speed_10m }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [lat, lng]);
  if (!w) return null;
  return (
    <div className="hweather" title="Météo actuelle sur l'exploitation">
      <CloudSun size={18} />
      <b>{Math.round(w.t)}°C</b>
      <span>{w.rain} mm · {Math.round(w.wind)} km/h</span>
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const audit = useApp((s) => s.audit);
  useOutside(ref, () => setOpen(false));
  const recent = audit.slice(0, 5);
  return (
    <div className="menu" ref={ref}>
      <button className="hbell" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Notifications">
        <Bell size={18} />{recent.length > 0 && <em>{recent.length}</em>}
      </button>
      {open && (
        <div className="menu__list glass hnotif" role="menu">
          <div className="menu__label">Activité récente</div>
          {recent.length === 0 && <span className="hsearch__empty">Aucune notification</span>}
          {recent.map((a) => (
            <div key={a.id} className="hnotif__item"><b>{a.action}</b><span>{a.object} · {a.userName}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageHeader() {
  const { pathname } = useLocation();
  if (!PAGES.includes(pathname)) return null;
  return (
    <div className="pageheader">
      <Stats />
      <div className="pageheader__right"><Weather /><Notifications /></div>
    </div>
  );
}
