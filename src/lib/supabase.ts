import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { BASE_URL, SUPABASE_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web' },
});

/** Where Supabase sends the user back to after login. Must be allowed in Supabase → Auth → URL configuration. */
export function authRedirectUrl(): string | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  return `${window.location.origin}${BASE_URL}/`;
}
