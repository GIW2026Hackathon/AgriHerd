import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DB, Profile, Role } from './types';
import { dataClient, refreshClient, type DataClient } from './store';
import { buildSeed } from './seed';

/** Default persona per role — the login persona picker maps 1:1 onto these */
export const PERSONA_BY_ROLE: Record<Role, string> = {
  farmer: 'p-f1',
  vet: 'p-v1',
  sponsor: 'p-s1',
  county: 'p-c1',
  admin: 'p-a1',
};

const SESSION_KEY = 'glhvis.session.v1';

interface Session {
  role: Role;
  userId: string;
}

interface AppContextValue {
  client: DataClient;
  db: DB;
  user: Profile;
  role: Role;
  isAuthenticated: boolean;
  signIn: (role: Role, userId?: string) => void;
  signOut: () => void;
  switchRole: (role: Role) => void;
  switchUser: (userId: string) => void;
  tick: () => void; // force re-read from store
}

const Ctx = createContext<AppContextValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [version, setVersion] = useState(0);

  // The client is rebuilt when the underlying store refreshes
  const client = useMemo(() => dataClient(), [version]);
  const db = client.snapshot();

  useEffect(() => {
    const onReset = () => { refreshClient(); setVersion((v) => v + 1); };
    window.addEventListener('glhvis:db-reset', onReset);
    return () => window.removeEventListener('glhvis:db-reset', onReset);
  }, []);

  useEffect(() => {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }, [session]);

  const user: Profile = useMemo(() => {
    if (session) {
      const found = db.profiles.find((p) => p.id === session.userId);
      if (found) return found;
    }
    // fall back to persona default for the stored role, else farmer
    const role = session?.role ?? 'farmer';
    return db.profiles.find((p) => p.id === PERSONA_BY_ROLE[role]) ?? db.profiles[0];
  }, [session, db]);

  const signIn = useCallback((role: Role, userId?: string) => {
    setSession({ role, userId: userId ?? PERSONA_BY_ROLE[role] });
  }, []);
  const signOut = useCallback(() => setSession(null), []);
  const switchRole = useCallback((role: Role) => setSession({ role, userId: PERSONA_BY_ROLE[role] }), []);
  const switchUser = useCallback((userId: string) => {
    const u = db.profiles.find((p) => p.id === userId);
    setSession(u ? { role: u.role, userId } : null);
  }, [db]);
  const tick = useCallback(() => setVersion((v) => v + 1), []);

  const value: AppContextValue = {
    client, db, user, role: user.role, isAuthenticated: !!session,
    signIn, signOut, switchRole, switchUser, tick,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export { buildSeed };
