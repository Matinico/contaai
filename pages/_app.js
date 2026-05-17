import '../styles/globals.css';
import { AuthProvider } from '../lib/auth-context';
import { inter, syne } from '../lib/fonts';

export default function App({ Component, pageProps }) {
  return (
    // display:contents hace que el div sea invisible para el layout
    // pero las CSS variables --font-inter y --font-syne quedan disponibles
    // para todos los componentes hijos vía herencia
    <div className={`${inter.variable} ${syne.variable}`} style={{ display: 'contents' }}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </div>
  );
}
