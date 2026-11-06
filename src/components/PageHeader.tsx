import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, CalendarDays, Layers, Map as MapIcon } from 'lucide-react';
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
  const stats = useMemo(() => {
    const active = parcels.filter((p) => !p.rejected);
    return {
      count: active.length,
      area: active.reduce((sum, p) => sum + p.areaHa, 0),
    };
  }, [parcels]);
  return (
    <div className="hstats">
      <div className="hstat"><MapIcon size={18} /><div><b>{fmtInt(stats.count)}</b><span>Parcelles</span></div></div>
      <div className="hstat"><Layers size={18} /><div><b>{fmtHa(stats.area)}</b><span>Surface totale</span></div></div>
    </div>
  );
}

function TodayCard() {
  return (
    <div className="hdate" title="Date du jour">
      <CalendarDays size={18} />
      <b>{fmtDate(new Date().toISOString())}</b>
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
      <div className="pageheader__right"><TodayCard /><Notifications /></div>
    </div>
  );
}
