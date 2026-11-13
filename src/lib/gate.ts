import { router } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from './auth';

/**
 * Posting and messaging need a login and accepted safety rules.
 * Returns a function that sends the user to the missing step and reports whether they may continue.
 */
export function useGate(): () => boolean {
  const { userId, profile } = useAuth();
  return useCallback(() => {
    if (!userId) {
      router.push('/login');
      return false;
    }
    if (!profile?.accepted_rules_at) {
      router.push('/rules');
      return false;
    }
    return true;
  }, [userId, profile]);
}
