import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { Button, Card, Field, Notice, Screen, styles } from '../components/ui';
import { useAuth } from '../lib/auth';
import { authRedirectUrl, supabase } from '../lib/supabase';

export default function Login() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [note, setNote] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (userId) router.replace('/');
  }, [userId]);

  const google = async () => {
    setBusy('google');
    setNote(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirectUrl() } });
    if (error) {
      setNote({ tone: 'error', text: error.message });
      setBusy(null);
    }
  };

  const emailLink = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setNote({ tone: 'error', text: t('login.emailInvalid') });
    setBusy('email');
    setNote(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: authRedirectUrl() } });
    setNote(error ? { tone: 'error', text: error.message } : { tone: 'info', text: t('login.emailSent') });
    setBusy(null);
  };

  return (
    <Screen title={t('login.title')} back>
      <Text style={styles.body}>{t('login.why')}</Text>
      <Card>
        <Button label={t('login.google')} icon="logo-google" onPress={google} loading={busy === 'google'} disabled={busy !== null} />
        <Text style={[styles.muted, { textAlign: 'center' }]}>{t('login.or')}</Text>
        <Field
          label={t('login.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        <Button label={t('login.emailLink')} variant="secondary" icon="mail-outline" onPress={emailLink} loading={busy === 'email'} disabled={busy !== null} />
        {note ? <Notice tone={note.tone} text={note.text} /> : null}
      </Card>
      <Text style={styles.muted}>{t('login.terms')}</Text>
    </Screen>
  );
}
