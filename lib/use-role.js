import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authFetch } from './auth-fetch';

export function useRole({ redirectIfNoMembership = true } = {}) {
  const router = useRouter();
  const [rol,     setRol]     = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.rol) {
          setRol(d.rol);
        } else {
          setRol(null);
          if (redirectIfNoMembership) router.replace('/onboarding');
        }
      })
      .catch(() => setRol(null))
      .finally(() => setLoading(false));
  }, []);

  return { rol, loading };
}
