import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthState {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  /** IDs of users the current user has blocked. */
  blocked: string[];
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  loading: true, session: null, userId: null, profile: null, blocked: [], refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setBlocked([]);
      return;
    }
    const [p, b] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('blocks').select('blocked_id'),
    ]);
    setProfile((p.data as Profile | null) ?? null);
    setBlocked(((b.data as { blocked_id: string }[] | null) ?? []).map((r) => r.blocked_id));
  }, [userId]);

  useEffect(() => {
    refresh().finally(() => {
      if (userId) setLoading(false);
    });
  }, [userId, refresh]);

  const value = useMemo(
    () => ({ loading, session, userId, profile, blocked, refresh }),
    [loading, session, userId, profile, blocked, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  return useContext(Ctx);
}
