import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  navy:    '#1a3a5c',
  blue:    '#2563eb',
  light:   '#7eb8f7',
  white:   '#ffffff',
  gray:    '#f8fafc',
  text:    '#1e293b',
  muted:   '#64748b',
  border:  '#e2e8f0',
};

const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";
const SYNE = "'Syne', 'Inter', system-ui, sans-serif";

// ── Logo SVG ──────────────────────────────────────────────────────────────────
function LogoIcon({ size = 32, light = false }) {
  const accent = light ? '#ffffff' : C.light;
  const fg     = light ? C.navy   : C.white;
  const stroke = light ? C.navy   : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <rect x="8" y="4" width="30" height="38" rx="3"
        fill={light ? 'rgba(26,58,92,0.08)' : 'rgba(255,255,255,0.15)'}
        stroke={stroke} strokeWidth="2"/>
      <path d="M15 15h16M15 22h12M15 29h14" stroke={stroke} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="39" cy="40" r="12" fill={accent}/>
      <path d="M33 40l4.5 4.5L46 34" stroke={fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <LogoIcon size={32} light />
          <span style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 22, color: C.navy, letterSpacing: '2px' }}>CIA</span>
        </Link>

        {/* Nav links – desktop */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="nav-desktop">
          {['Solución', 'Funcionalidades', 'Precios'].map(link => (
            <a key={link} href={`#${link.toLowerCase()}`}
              style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = C.navy}
              onMouseLeave={e => e.target.style.color = C.muted}>
              {link}
            </a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="nav-desktop">
          <Link href="/login"
            style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 8, padding: '7px 18px', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.navy; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.navy; }}>
            Ingresar
          </Link>
          <Link href="/login"
            style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: '#fff', background: C.navy, borderRadius: 8, padding: '7px 18px', textDecoration: 'none', border: `1.5px solid ${C.navy}`, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Comenzar gratis →
          </Link>
        </div>

        {/* Hamburger – mobile */}
        <button onClick={() => setMobileOpen(v => !v)} className="nav-mobile"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {mobileOpen
              ? <path d="M4 4l14 14M18 4L4 18" stroke={C.navy} strokeWidth="2" strokeLinecap="round"/>
              : <path d="M3 6h16M3 11h16M3 16h16" stroke={C.navy} strokeWidth="2" strokeLinecap="round"/>}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['Solución', 'Funcionalidades', 'Precios'].map(link => (
            <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setMobileOpen(false)}
              style={{ fontFamily: FONT, fontSize: 15, fontWeight: 500, color: C.text, textDecoration: 'none' }}>
              {link}
            </a>
          ))}
          <div style={{ height: 1, background: C.border, margin: '4px 0' }}/>
          <Link href="/login" style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.navy, textDecoration: 'none' }}>Ingresar</Link>
          <Link href="/login"
            style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: '#fff', background: C.navy, borderRadius: 8, padding: '10px 0', textDecoration: 'none', textAlign: 'center' }}>
            Comenzar gratis →
          </Link>
        </div>
      )}
    </header>
  );
}

// ── Section: Hero ─────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ paddingTop: 120, paddingBottom: 96, background: '#fff' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">

        {/* Left col */}
        <div>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 24, padding: '5px 14px', marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0, animation: 'pulse 2s infinite' }}/>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
              NUEVO: Exportación TXT compatible con ARCA
            </span>
          </div>

          <h1 style={{ fontFamily: SYNE, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, color: C.text, lineHeight: 1.12, marginBottom: 22 }}>
            Tu estudio,{' '}
            <span style={{ color: C.blue }}>potenciado</span>{' '}
            por IA.
          </h1>

          <p style={{ fontFamily: FONT, fontSize: 17, color: C.muted, lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
            CIA automatiza la lectura de facturas, el armado del libro IVA y la generación del TXT para ARCA. Menos tiempo de carga, más tiempo para tus clientes.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
            <Link href="/login"
              style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: '#fff', background: C.navy, borderRadius: 10, padding: '13px 28px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(26,58,92,0.3)' }}>
              Empezar gratis →
            </Link>
            <a href="#funcionalidades"
              style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.navy, background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '12px 24px', textDecoration: 'none' }}>
              Ver cómo funciona
            </a>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {['#7eb8f7', '#2563eb', '#1a3a5c', '#4a8fc4'].map((bg, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: bg, border: '2px solid #fff', marginLeft: i > 0 ? -10 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {['MP', 'LG', 'RV', 'CA'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>
              <strong style={{ color: C.text }}>+50 contadores</strong> ya usan CIA
            </span>
          </div>
        </div>

        {/* Right col – dashboard preview */}
        <div style={{ position: 'relative' }} className="hero-right">
          {/* Main card */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(26,58,92,0.12)', position: 'relative', zIndex: 2 }}>
            {/* Mini topbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogoIcon size={22} light/>
                <span style={{ fontFamily: SYNE, fontSize: 14, fontWeight: 800, color: C.navy, letterSpacing: '1.5px' }}>CIA</span>
              </div>
              <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Dashboard</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Facturas cargadas', value: '284', trend: '+12 hoy' },
                { label: 'IVA crédito', value: '$142.8K', trend: '' },
                { label: 'Clientes activos', value: '9', trend: '' },
              ].map(s => (
                <div key={s.label} style={{ background: C.gray, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 700, color: C.navy }}>{s.value}</div>
                  {s.trend && <div style={{ fontFamily: FONT, fontSize: 10, color: '#16a34a', marginTop: 2 }}>{s.trend}</div>}
                </div>
              ))}
            </div>

            {/* Client list */}
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Clientes recientes</div>
            {[
              { name: 'García & Asociados', cuit: '20-12345678-9', tag: 'IVA al día' },
              { name: 'Mueblería Del Sur SRL', cuit: '30-98765432-1', tag: 'Pendiente' },
              { name: 'Fernández Consulting', cuit: '20-55544433-2', tag: 'IVA al día' },
            ].map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>{c.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>{c.cuit}</div>
                </div>
                <span style={{
                  fontFamily: FONT, fontSize: 10, fontWeight: 700, borderRadius: 12, padding: '2px 8px',
                  background: c.tag === 'IVA al día' ? '#dcfce7' : '#fef9c3',
                  color: c.tag === 'IVA al día' ? '#15803d' : '#92400e',
                }}>
                  {c.tag}
                </span>
              </div>
            ))}
          </div>

          {/* Floating card 1 */}
          <div style={{ position: 'absolute', bottom: -20, left: -32, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 3, display: 'flex', alignItems: 'center', gap: 8, animation: 'float1 4s ease-in-out infinite' }} className="float-card">
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>IVA calculado automáticamente</span>
          </div>

          {/* Floating card 2 */}
          <div style={{ position: 'absolute', top: 20, right: -28, background: C.navy, border: 'none', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(26,58,92,0.3)', zIndex: 3, display: 'flex', alignItems: 'center', gap: 8, animation: 'float2 4s ease-in-out infinite' }} className="float-card">
            <span style={{ fontSize: 16 }}>📄</span>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#fff' }}>TXT ARCA generado en 1 clic</span>
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Section: Trust bar ────────────────────────────────────────────────────────
function TrustBar() {
  return (
    <div style={{ background: C.gray, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '20px 24px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FONT, fontSize: 13, color: C.muted, fontWeight: 500 }}>Usado por estudios de</span>
        {['Buenos Aires', 'Santa Fe', 'Córdoba', 'Mendoza', 'Rosario'].map((city, i) => (
          <span key={city} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.navy }}>
            {i > 0 && <span style={{ color: C.border, marginRight: 12 }}>·</span>}
            {city}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Section: Problema vs Solución ─────────────────────────────────────────────
function SolucionSection() {
  return (
    <section id="solución" style={{ background: '#fff', padding: '96px 24px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>El problema</span>
          <h2 style={{ fontFamily: SYNE, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: C.text, marginTop: 10 }}>¿Cuántas horas perdés cada mes?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="compare-grid">
          {/* Sin CIA */}
          <div style={{ background: C.gray, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>😓</div>
              <h3 style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 700, color: '#b91c1c' }}>Sin CIA</h3>
            </div>
            {[
              'Carga manual factura por factura',
              'Errores de tipeo que pasás por alto',
              'Horas armando el libro IVA en Excel',
              'TXT ARCA hecho a mano, propenso a errores',
              'Sin visibilidad del IVA en tiempo real',
              'Imposible escalar sin contratar más gente',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>✗</span>
                <span style={{ fontFamily: FONT, fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Con CIA */}
          <div style={{ background: C.navy, border: 'none', borderRadius: 16, padding: 32, boxShadow: '0 12px 40px rgba(26,58,92,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(126,184,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚀</div>
              <h3 style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 700, color: '#fff' }}>Con CIA</h3>
            </div>
            {[
              'Carga automática desde foto o PDF',
              '99% de precisión con IA de Anthropic',
              'Libro IVA generado en segundos',
              'TXT ARCA en 1 clic, 100% compatible',
              'Posición IVA actualizada en tiempo real',
              'Escalá sin límite con múltiples usuarios',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <span style={{ color: C.light, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>✓</span>
                <span style={{ fontFamily: FONT, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Funcionalidades ──────────────────────────────────────────────────
const FEATURES = [
  { icon: '📸', badge: 'IA incluida', title: 'Lectura automática', desc: 'Subí una foto o PDF de la factura y la IA extrae todos los datos al instante. Sin typing, sin errores.' },
  { icon: '📋', badge: 'Compras y ventas', title: 'Libro IVA digital', desc: 'Generá el libro IVA de compras y ventas de cada cliente con un click. Listo para presentar.' },
  { icon: '📤', badge: '100% ARCA', title: 'Exportación TXT', desc: 'Generá el archivo TXT en el formato exacto que pide ARCA. Descarga en segundos.' },
  { icon: '👥', badge: 'Sin límite', title: 'Multi-cliente', desc: 'Gestioná todos tus clientes desde un panel centralizado. Cada uno con su historial y documentación.' },
  { icon: '📊', badge: 'En tiempo real', title: 'Posición IVA', desc: 'Consultá el saldo de IVA de cada cliente al instante. Crédito, débito y saldo neto calculados automáticamente.' },
  { icon: '👤', badge: 'Colaborativo', title: 'Multi-usuario', desc: 'Invitá a tus empleados al estudio. Cada uno con su propio acceso y rol (admin u operador).' },
];

function FuncionalidadesSection() {
  return (
    <section id="funcionalidades" style={{ background: C.gray, padding: '96px 24px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Funcionalidades</span>
          <h2 style={{ fontFamily: SYNE, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: C.text, marginTop: 10 }}>Todo lo que necesita tu estudio</h2>
          <p style={{ fontFamily: FONT, fontSize: 16, color: C.muted, marginTop: 12, maxWidth: 520, margin: '12px auto 0' }}>
            Una plataforma completa, diseñada específicamente para estudios contables argentinos.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, transition: 'box-shadow 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,58,92,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ display: 'inline-block', fontFamily: FONT, fontSize: 10, fontWeight: 700, color: C.blue, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '2px 10px', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {f.badge}
              </div>
              <h3 style={{ fontFamily: SYNE, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontFamily: FONT, fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Stats band ───────────────────────────────────────────────────────
function StatsBand() {
  const stats = [
    { value: '40hs', label: 'ahorro mensual promedio' },
    { value: '99%', label: 'precisión en lectura de facturas' },
    { value: '10x', label: 'más rápido que la carga manual' },
    { value: '100%', label: 'compatible con ARCA' },
  ];
  return (
    <div style={{ background: C.navy, padding: '56px 24px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }} className="stats-grid">
        {stats.map(s => (
          <div key={s.value} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: SYNE, fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 800, color: C.light, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: FONT, fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Precios ──────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: '$XX.XXX',
    desc: 'Para estudios pequeños que están empezando.',
    popular: false,
    features: ['Hasta 3 clientes', '100 facturas / mes', 'Libro IVA', 'Exportación TXT ARCA', 'Soporte por email'],
    cta: 'Empezar gratis',
  },
  {
    name: 'Pro',
    price: '$XX.XXX',
    desc: 'El plan ideal para estudios en crecimiento.',
    popular: true,
    features: ['Clientes ilimitados', 'Facturas ilimitadas', 'Multi-usuario (5 seats)', 'Libro IVA y TXT ARCA', 'Posición IVA en tiempo real', 'Soporte prioritario'],
    cta: 'Probar 14 días gratis',
  },
  {
    name: 'Enterprise',
    price: '$XX.XXX',
    desc: 'Para estudios grandes con necesidades especiales.',
    popular: false,
    features: ['Todo lo de Pro', 'Usuarios ilimitados', 'API de integración', 'SLA garantizado', 'Onboarding personalizado', 'Cuenta manager dedicado'],
    cta: 'Contactar ventas',
  },
];

function PreciosSection() {
  return (
    <section id="precios" style={{ background: '#fff', padding: '96px 24px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Precios</span>
          <h2 style={{ fontFamily: SYNE, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: C.text, marginTop: 10 }}>Simple y transparente</h2>
          <p style={{ fontFamily: FONT, fontSize: 16, color: C.muted, marginTop: 12 }}>Sin contratos largos. Cancelá cuando quieras.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }} className="plans-grid">
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: plan.popular ? C.navy : '#fff',
              border: plan.popular ? 'none' : `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 32,
              boxShadow: plan.popular ? '0 20px 60px rgba(26,58,92,0.25)' : '0 1px 4px rgba(0,0,0,0.05)',
              position: 'relative',
            }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.light, color: C.navy, fontFamily: FONT, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: 20, padding: '4px 14px' }}>
                  MÁS POPULAR
                </div>
              )}
              <h3 style={{ fontFamily: SYNE, fontSize: 20, fontWeight: 800, color: plan.popular ? '#fff' : C.text, marginBottom: 6 }}>{plan.name}</h3>
              <p style={{ fontFamily: FONT, fontSize: 13, color: plan.popular ? 'rgba(255,255,255,0.7)' : C.muted, marginBottom: 20 }}>{plan.desc}</p>
              <div style={{ marginBottom: 28 }}>
                <span style={{ fontFamily: SYNE, fontSize: 'clamp(28px, 3vw, 36px)', fontWeight: 800, color: plan.popular ? '#fff' : C.navy }}>{plan.price}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: plan.popular ? 'rgba(255,255,255,0.6)' : C.muted }}> ARS/mes</span>
              </div>
              <div style={{ borderTop: `1px solid ${plan.popular ? 'rgba(255,255,255,0.15)' : C.border}`, paddingTop: 22, marginBottom: 28 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ color: plan.popular ? C.light : '#16a34a', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>✓</span>
                    <span style={{ fontFamily: FONT, fontSize: 14, color: plan.popular ? 'rgba(255,255,255,0.85)' : C.text }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login"
                style={{
                  display: 'block', textAlign: 'center', fontFamily: FONT, fontSize: 14, fontWeight: 700,
                  color: plan.popular ? C.navy : '#fff',
                  background: plan.popular ? '#fff' : C.navy,
                  borderRadius: 10, padding: '12px 0', textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Testimonios ──────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    text: '"Antes me pasaba 3 días armando el libro IVA de todos mis clientes. Ahora lo hago en 2 horas. CIA cambió completamente mi forma de trabajar."',
    author: 'Marcela Pereyra',
    role: 'Contadora pública, Buenos Aires',
  },
  {
    text: '"La lectura de facturas es impresionante. Saco la foto y en segundos ya está cargado todo. Errores casi cero. Mis clientes están más contentos que nunca."',
    author: 'Rodrigo Villafuerte',
    role: 'Estudio contable, Córdoba',
  },
  {
    text: '"El TXT para ARCA me generaba pánico. Ahora lo exporto en un clic y sé que está bien. Menos estrés, más tiempo para lo que importa."',
    author: 'Laura Santín',
    role: 'Asesora impositiva, Rosario',
  },
];

function TestimoniosSection() {
  return (
    <section style={{ background: C.gray, padding: '96px 24px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Testimonios</span>
          <h2 style={{ fontFamily: SYNE, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: C.text, marginTop: 10 }}>Lo que dicen los contadores</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="testimonials-grid">
          {TESTIMONIALS.map(t => (
            <div key={t.author} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: '#f59e0b', fontSize: 16 }}>★</span>
                ))}
              </div>
              <p style={{ fontFamily: FONT, fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>{t.text}</p>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.navy }}>{t.author}</div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 2 }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: CTA Final ────────────────────────────────────────────────────────
function CtaFinal() {
  return (
    <section style={{ background: '#0f2540', padding: '96px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontFamily: SYNE, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', marginBottom: 18, lineHeight: 1.15 }}>
          Dejá de perder tiempo en carga manual.
        </h2>
        <p style={{ fontFamily: FONT, fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 1.6 }}>
          Empezá gratis hoy y experimentá la diferencia en tu primer semana.
        </p>
        <Link href="/login"
          style={{ display: 'inline-block', fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.navy, background: '#fff', borderRadius: 12, padding: '15px 40px', textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; }}>
          Crear cuenta gratis →
        </Link>
        <p style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 18 }}>
          Sin tarjeta de crédito · Cancelá cuando quieras
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { title: 'Producto', links: ['Funcionalidades', 'Precios', 'Novedades', 'Roadmap'] },
    { title: 'Recursos', links: ['Documentación', 'Centro de ayuda', 'Blog', 'Estado del servicio'] },
    { title: 'Empresa', links: ['Acerca de CIA', 'Contacto', 'Privacidad', 'Términos de uso'] },
  ];
  return (
    <footer style={{ background: '#0f2540', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '56px 24px 32px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', gap: 48, marginBottom: 48, alignItems: 'start' }} className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <LogoIcon size={28}/>
              <span style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '2px' }}>CIA</span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 220 }}>
              Contabilidad con Inteligencia Artificial. Diseñado para estudios contables argentinos.
            </p>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{col.title}</div>
              {col.links.map(link => (
                <a key={link} href="#"
                  style={{ display: 'block', fontFamily: FONT, fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 10, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}>
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} CIA — Contabilidad con Inteligencia Artificial. Todos los derechos reservados.
          </span>
          <span style={{ fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Hecho en Argentina 🇦🇷
          </span>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Landing() {
  const { user } = useAuth();
  const router   = useRouter();

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  // If logged in, don't flash the landing
  if (user) return null;

  return (
    <>
      <Head>
        <title>CIA — Contabilidad con Inteligencia Artificial</title>
        <meta name="description" content="Automatizá la carga de facturas, el libro IVA y la exportación TXT para ARCA. Diseñado para estudios contables argentinos." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: #fff; color: ${C.text}; -webkit-font-smoothing: antialiased; }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }

        /* Responsive */
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-right { display: none !important; }
          .compare-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: block !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .float-card { display: none !important; }
        }
        @media (min-width: 601px) {
          .nav-mobile { display: none !important; }
        }
      `}</style>

      <Navbar />
      <Hero />
      <TrustBar />
      <SolucionSection />
      <FuncionalidadesSection />
      <StatsBand />
      <PreciosSection />
      <TestimoniosSection />
      <CtaFinal />
      <Footer />
    </>
  );
}
