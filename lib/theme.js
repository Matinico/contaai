import { createContext, useContext, useState, useEffect } from 'react';

export const C_LIGHT = {
  navy:   '#1a3a5c',
  blue:   '#2563eb',
  border: '#e2e8f0',
  text:   '#1e293b',
  muted:  '#64748b',
  bg:     '#f8fafc',
  pageBg: '#f0f2f5',
  orange: '#f97316',
  green:  '#16a34a',
  red:    '#dc2626',
  yellow: '#d97706',
  white:  '#ffffff',
  accent: '#7eb8f7',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
  mono:   "'Courier New',Courier,monospace",
};

export const C_DARK = {
  navy:   '#93c5fd',
  blue:   '#60a5fa',
  border: '#334155',
  text:   '#f1f5f9',
  muted:  '#94a3b8',
  bg:     '#0f172a',
  pageBg: '#0f172a',
  orange: '#fb923c',
  green:  '#34d399',
  red:    '#f87171',
  yellow: '#fbbf24',
  white:  '#1e293b',
  accent: '#60a5fa',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
  mono:   "'Courier New',Courier,monospace",
};

const ThemeCtx = createContext({ isDark: false, toggleTheme: () => {}, C: C_LIGHT });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('cia-theme') === 'dark') {
        setIsDark(true);
        document.body.classList.add('dark');
      }
    } catch {}
  }, []);

  function toggleTheme() {
    setIsDark(v => {
      const next = !v;
      try {
        if (next) { document.body.classList.add('dark');    localStorage.setItem('cia-theme', 'dark');  }
        else       { document.body.classList.remove('dark'); localStorage.setItem('cia-theme', 'light'); }
      } catch {}
      return next;
    });
  }

  return (
    <ThemeCtx.Provider value={{ isDark, toggleTheme, C: isDark ? C_DARK : C_LIGHT }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
