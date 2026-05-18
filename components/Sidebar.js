import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useRef, useEffect } from 'react';
import { FONT } from '../lib/fonts';
import { useTheme } from '../lib/theme';

const IcoHome    = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 6.5L7 2l5.5 4.5V13H9V9H5v4H1.5V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
const IcoPeople  = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 12.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="10" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M13 12.5c0-1.8-1.1-3.2-2.5-3.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoDoc     = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoCal     = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 6.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoBrief   = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M1 9h12" stroke="currentColor" strokeWidth="1.3"/></svg>;
const IcoChart   = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="7.5" width="2.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="5.5" y="4.5" width="2.5" height="7.5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9.5" y="2" width="2.5" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.3"/></svg>;
const IcoGear    = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5M3 3l1 1M10 10l1 1M11 3l-1 1M4 10l-1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoUser    = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;

// activeOn: array of path prefixes that make this item highlighted
const NAV_GROUPS = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard', icon: IcoHome,   label: 'Dashboard',       activeOn: ['/dashboard'] },
      { href: '/dashboard', icon: IcoPeople, label: 'Clientes',        activeOn: ['/clientes'], badgeKey: 'clientCount' },
    ],
  },
  {
    section: 'Módulos',
    items: [
      { href: null,      icon: IcoDoc,   label: 'Liquidación IVA', activeOn: ['/clientes'] },
      { href: '/agenda', icon: IcoCal,   label: 'Agenda',          activeOn: ['/agenda'] },
      { href: null,      icon: IcoBrief, label: 'Sueldos',         soon: true },
      { href: null,      icon: IcoChart, label: 'Ing. Brutos',     soon: true },
    ],
  },
  {
    section: 'Estudio',
    items: [
      { href: '/configuracion', icon: IcoGear, label: 'Configuración', activeOn: ['/configuracion'] },
      { href: null,             icon: IcoUser, label: 'Usuarios' },
    ],
  },
];

export default function Sidebar({ clientCount, user, rol, onSignOut }) {
  const router       = useRouter();
  const menuRef      = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const { C } = useTheme();

  useEffect(() => {
    const h = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const name    = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario';
  const initial = name.charAt(0).toUpperCase();

  function isActive(item) {
    if (!item.activeOn) return false;
    const path = router.pathname;
    return item.activeOn.some(prefix => path === prefix || path.startsWith(prefix + '/'));
  }

  return (
    <>
      <style>{`
.sb-link { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:7px; font-size:13px; font-weight:500; text-decoration:none; margin-bottom:1px; user-select:none; transition:background 0.12s, color 0.12s; border-left:3px solid transparent; color:${C.muted}; cursor:pointer; }
        .sb-link:hover { background:#f1f5f9; color:${C.text}; }
        .sb-link.active { background:#eff6ff; color:${C.navy}; border-left:3px solid ${C.navy}; font-weight:600; }
        .sb-disabled { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:7px; font-size:13px; font-weight:500; margin-bottom:1px; user-select:none; border-left:3px solid transparent; color:${C.muted}; cursor:default; }
        .sb-disabled.active { background:#eff6ff; color:${C.navy}; border-left:3px solid ${C.navy}; font-weight:600; }
      `}</style>

      <aside style={{
        width: 240, minWidth: 240, height: '100vh',
        background: '#fff', borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, zIndex: 40,
        fontFamily: FONT,
      }}>

        {/* ── Logo ── */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="30" height="30" viewBox="0 0 56 56" fill="none">
              <rect x="8" y="4" width="30" height="38" rx="3" fill="rgba(26,58,92,0.07)" stroke={C.navy} strokeWidth="2"/>
              <path d="M15 15h16M15 22h12M15 29h14" stroke={C.navy} strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="39" cy="40" r="12" fill="#7eb8f7"/>
              <path d="M33 40l4.5 4.5L46 34" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 21, color: C.navy, letterSpacing: '2px' }}>CIA</span>
          </Link>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.section} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px', marginBottom: 4 }}>
                {group.section}
              </div>

              {group.items.map(item => {
                const active = isActive(item);
                const badge  = item.badgeKey === 'clientCount' && clientCount != null ? clientCount : null;

                const content = (
                  <>
                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {badge !== null && (
                      <span style={{ background: '#dbeafe', color: C.blue, fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px', lineHeight: '16px' }}>
                        {badge}
                      </span>
                    )}
                    {item.soon && (
                      <span style={{ background: '#fff7ed', color: C.orange, fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px', lineHeight: '16px' }}>
                        Pronto
                      </span>
                    )}
                  </>
                );

                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href} className={`sb-link${active ? ' active' : ''}`}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={item.label} className={`sb-disabled${active ? ' active' : ''}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── User ── */}
        <div ref={menuRef} style={{ padding: 10, borderTop: `1px solid ${C.border}`, position: 'relative' }}>
          {showMenu && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 4px)', left: 10, right: 10,
              background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', overflow: 'hidden',
            }}>
              <button onClick={() => { setShowMenu(false); onSignOut(); }}
                style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626', fontWeight: 600, textAlign: 'left', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 10l3-3-3-3M12 7H5M5 2H2v10h3" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Cerrar sesión
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: C.bg }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                {rol === 'admin' ? 'Administrador' : 'Operador'}
              </div>
            </div>
            <button onClick={() => setShowMenu(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: C.muted, borderRadius: 4, fontSize: 16, lineHeight: 1, letterSpacing: '1px' }}>
              ···
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
