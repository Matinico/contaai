import '../styles/globals.css';
import { AuthProvider } from '../lib/auth-context';
import { inter, syne } from '../lib/fonts';
import { ThemeProvider } from '../lib/theme';

export default function App({ Component, pageProps }) {
  return (
    <div className={`${inter.variable} ${syne.variable}`} style={{ display: 'contents' }}>
      <ThemeProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}
