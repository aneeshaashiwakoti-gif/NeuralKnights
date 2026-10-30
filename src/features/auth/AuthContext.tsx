import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DemoUser } from '../../domain/types';
import { readDemoSession, writeDemoSession } from '../../services/auth/session';
import { services } from '../../services';
import { can } from '../../domain/permissions';
import type { Capability } from '../../domain/types';

interface AuthContextValue {
  user: DemoUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  has: (capability: Capability) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => {
    const id = readDemoSession();
    return id ? services.auth.findDemoUser(id) ?? null : null;
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await services.auth.authenticate(email, password);
    writeDemoSession(next);
    setUser(next);
  }, []);

  const signOut = useCallback(() => {
    writeDemoSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn,
      signOut,
      has: (capability) => can(user, capability),
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
