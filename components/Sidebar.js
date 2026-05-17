import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useRef, useEffect } from 'react';

const C = {
  navy:   '#1a3a5c',
  blue:   '#2563eb',
  border: '#e2e8f0',
  text:   '#1e293b',
  muted:  '#64748b',
  bg:     '#f8fafc',
  orange: '#f97316',
};

const FONT = "'Inter','Segoe UI',system-ui,sans-serif";
const SYNE = "'Syne','Inter',system-ui,sans-serif";

const NAV_GROUPS = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard',     icon: '🏠', label: 'Dashboard' },
      { href: '/clientes',      icon: '👥', label: 'Clientes',        badgeKey: 'clientCount' },
    ],
  },
  {
    section: 'Módulos',
    items: [
      { href: null,             icon: '📋', label: 'Liquidación IVA' },
      { href: null,             icon: '💼', label: 'Sueldos',         soon: true },
      { href: null,             icon: '📊', label: 'Ing. Brutos',     soon: true },
    ],
  },
  {
    section: 'Estudio',
    items: [
      { href: '/configuracion', icon: '⚙️', label: 'Configuración' },
      { href: null,             icon: '👤', label: 'Usuarios' },
    ],
  },
];

export default function Sidebar({ activePage, clientCount, user, rol, onSignOut }) {
  const router       = useRouter();
  const menuRef      = useRef(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const h = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const name    = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario';
  const initial = name.charAt(0).toUpperCase();
  const active  = (href) => href && (router.pathname === href || activePage === href);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        .sb-item { transition: background 0.12s, color 0.12s; }
        .sb-item:hover { background: #f1f5f9 !important; color: ${C.text} !important; }
        .sb-item.active { background: #eff6ff !important; color: ${C.navy} !important; }
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
            <span style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 21, color: C.navy, letterSpacing: '2px' }}>CIA</span>
          </Link>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.section} style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.muted,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '0 10px', marginBottom: 4,
              }}>
                {group.section}
              </div>

              {group.items.map(item => {
                const isActive = active(item.href);
                const badge = item.badgeKey === 'clientCount' && clientCount != null ? clientCount : null;

                const baseStyle = {
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 7,
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? C.navy : C.muted,
                  background: isActive ? '#eff6ff' : 'transparent',
                  borderLeft: isActive ? `3px solid ${C.navy}` : '3px solid transparent',
                  textDecoration: 'none',
                  cursor: item.href ? 'pointer' : 'default',
                  marginBottom: 1,
                  userSelect: 'none',
                };

                const inner = (
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
                    <Link key={item.label} href={item.href}
                      className={`sb-item${isActive ? ' active' : ''}`}
                      style={baseStyle}>
                      {inner}
                    </Link>
                  );
                }
                return (
                  <div key={item.label} style={baseStyle}>
                    {inner}
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
