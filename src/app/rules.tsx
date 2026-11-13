import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Field, LoginPrompt, Notice, Screen, goBack, styles } from '../components/ui';
import { errorCode, updateProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, space } from '../lib/theme';

export function RuleList() {
  const { t } = useTranslation();
  return (
    <>
      {[1, 2, 3, 4, 5].map((n) => (
        <Card key={n}>
          <Text style={styles.h3}>{t(`rules.r${n}Title`)}</Text>
          <Text style={styles.body}>{t(`rules.r${n}`)}</Text>
        </Card>
      ))}
    </>
  );
}

export default function Rules() {
  const { t } = useTranslation();
  const { userId, profile, refresh } = useAuth();
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  if (!userId) return <Screen title={t('rules.title')} back><LoginPrompt /></Screen>;

  const accept = async () => {
    if (!name.trim()) return setError(t('rules.nameRequired'));
    setBusy(true);
    try {
      await updateProfile(userId, { display_name: name.trim(), accepted_rules_at: new Date().toISOString() });
      await refresh();
      goBack();
    } catch (e) {
      setError(t(`errors.${errorCode(e)}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('rules.title')} back>
      <Text style={styles.body}>{t('rules.intro')}</Text>
      <RuleList />
      <Card>
        <Field label={t('rules.name')} value={name} onChangeText={setName} maxLength={60} autoComplete="name" />
        <Pressable
          onPress={() => setAgreed((a) => !a)}
          style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingVertical: space.sm }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={styles.body}>{t('rules.age')}</Text></View>
        </Pressable>
        {error ? <Notice tone="error" text={error} /> : null}
        <Button label={t('rules.accept')} onPress={accept} disabled={!agreed} loading={busy} />
      </Card>
    </Screen>
  );
}
