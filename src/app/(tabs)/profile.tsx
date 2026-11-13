import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { Avatar, Button, Card, Chip, Field, Label, LoginPrompt, Notice, Rating, Row, Screen, confirmAsync, styles } from '../../components/ui';
import { deleteAccount, errorCode, fetchListingsByAuthor, updateProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { LANGS, setLanguage, type Lang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import type { Listing } from '../../lib/types';

export default function ProfileTab() {
  const { t, i18n } = useTranslation();
  const { userId, profile, refresh } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [langs, setLangs] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name);
    setBio(profile.bio);
    setLangs(profile.languages);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let live = true;
      fetchListingsByAuthor(userId, false).then((r) => live && setListings(r)).catch(() => {});
      return () => { live = false; };
    }, [userId]),
  );

  if (!userId) {
    return (
      <Screen title={t('profile.title')}>
        <LoginPrompt />
        <LanguageCard />
        <Button label={t('profile.safety')} variant="secondary" icon="shield-checkmark-outline" onPress={() => router.push('/safety')} />
      </Screen>
    );
  }

  const save = async () => {
    if (!name.trim()) return setStatus({ tone: 'error', text: t('rules.nameRequired') });
    setBusy(true);
    try {
      await updateProfile(userId, { display_name: name.trim(), bio: bio.trim(), languages: langs });
      await refresh();
      setStatus({ tone: 'info', text: t('common.saved') });
    } catch (e) {
      setStatus({ tone: 'error', text: t(`errors.${errorCode(e)}`) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAsync(t('profile.deleteConfirm')))) return;
    try {
      await deleteAccount();
      router.replace('/');
    } catch (e) {
      setStatus({ tone: 'error', text: t(`errors.${errorCode(e)}`) });
    }
  };

  return (
    <Screen title={t('profile.title')}>
      <Card>
        <Row>
          <Avatar name={profile?.display_name} url={profile?.avatar_url} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.h2}>{profile?.display_name || t('profile.anonymous')}</Text>
            <Rating avg={profile?.rating_avg ?? 0} count={profile?.rating_count ?? 0} />
            <Text style={styles.muted}>{t('profile.deals', { count: profile?.deals_completed ?? 0 })}</Text>
          </View>
        </Row>
      </Card>

      {profile && !profile.accepted_rules_at ? (
        <Button label={t('rules.title')} icon="shield-checkmark-outline" onPress={() => router.push('/rules')} />
      ) : null}

      <Card>
        <Text style={styles.h3}>{t('profile.edit')}</Text>
        <Field label={t('profile.name')} value={name} onChangeText={setName} maxLength={60} />
        <Field label={t('profile.bio')} value={bio} onChangeText={setBio} multiline maxLength={500} />
        <View style={styles.field}>
          <Label>{t('profile.languages')}</Label>
          <Row wrap>
            {LANGS.map((l) => (
              <Chip
                key={l.code}
                label={l.label}
                selected={langs.includes(l.code)}
                onPress={() => setLangs((cur) => (cur.includes(l.code) ? cur.filter((x) => x !== l.code) : [...cur, l.code]))}
              />
            ))}
          </Row>
        </View>
        {status ? <Notice tone={status.tone} text={status.text} /> : null}
        <Button label={t('common.save')} onPress={save} loading={busy} />
      </Card>

      <LanguageCard />

      <Text style={styles.h3}>{t('profile.myListings')}</Text>
      {listings.length === 0 ? <Text style={styles.muted}>{t('profile.noListings')}</Text> : null}
      {listings.map((l) => <ListingCard key={l.id} listing={l} showAuthor={false} />)}

      <Button label={t('profile.safety')} variant="secondary" icon="shield-checkmark-outline" onPress={() => router.push('/safety')} />
      <Button label={t('profile.signOut')} variant="secondary" icon="log-out-outline" onPress={() => supabase.auth.signOut()} />
      <Button label={t('profile.delete')} variant="danger" icon="trash-outline" onPress={remove} />
    </Screen>
  );

  function LanguageCard() {
    return (
      <Card>
        <Label>{t('profile.language')}</Label>
        <Row wrap>
          {LANGS.map((l) => (
            <Chip key={l.code} label={l.label} selected={i18n.language === l.code} onPress={() => setLanguage(l.code as Lang)} />
          ))}
        </Row>
      </Card>
    );
  }
}
