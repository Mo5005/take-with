import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { RouteLine } from '../../components/ListingCard';
import { Avatar, Button, Card, Chip, Empty, Loading, Notice, Rating, Row, Screen, confirmAsync, goBack, styles } from '../../components/ui';
import { errorCode, fetchListing, setListingStatus, startConversation, today } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { countryLabel } from '../../lib/cities';
import { useGate } from '../../lib/gate';
import { formatDate } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import type { Listing } from '../../lib/types';

export default function ListingDetail() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const gate = useGate();
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let live = true;
    fetchListing(id)
      .then((l) => live && setListing(l))
      .catch((e) => { if (live) { setListing(null); setError(errorCode(e)); } });
    return () => { live = false; };
  }, [id]);
  useFocusEffect(load);

  if (listing === undefined) return <Screen title="" back><Loading /></Screen>;
  if (!listing) {
    return (
      <Screen title="" back>
        {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : <Empty text={t('errors.listing_not_found')} />}
      </Screen>
    );
  }

  const l = listing;
  const mine = l.author_id === userId;
  const expired = l.travel_date < today();
  const active = l.status === 'active' && !expired;

  const message = async () => {
    if (!gate()) return;
    setBusy(true);
    try {
      const conv = await startConversation(l.id);
      router.push(`/chat/${conv}`);
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: Listing['status']) => {
    if (status === 'removed' && !(await confirmAsync(t('common.confirm')))) return;
    try {
      await setListingStatus(l.id, status);
      if (status === 'removed') goBack();
      else setListing({ ...l, status });
    } catch (e) {
      setError(errorCode(e));
    }
  };

  return (
    <Screen
      title={t(`kind.${l.kind}`)}
      back
      right={
        !mine ? (
          <Pressable
            onPress={() => router.push({ pathname: '/report', params: { type: 'listing', id: l.id } })}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('listing.report')}
          >
            <Ionicons name="flag-outline" size={22} color={colors.muted} />
          </Pressable>
        ) : undefined
      }
    >
      {!active ? <Notice tone="warn" text={t(expired ? 'listing.expired' : 'listing.closed')} /> : null}

      <Card>
        <RouteLine l={l} size={22} />
        <Text style={styles.muted}>{countryLabel(l.origin_country, lang)} · {countryLabel(l.dest_country, lang)}</Text>
        <Row wrap style={{ marginTop: 4 }}>
          <Chip label={t(l.kind === 'trip' ? 'listing.freeKg' : 'listing.needKg', { kg: Number(l.weight_kg) })} selected />
        </Row>
        <Info icon="calendar-outline" label={t(l.kind === 'trip' ? 'listing.travelDate' : 'listing.latestDate')}>
          {formatDate(l.travel_date, lang)}{l.flex_days > 0 ? `  ${t('listing.flex', { days: l.flex_days })}` : ''}
        </Info>
        <View style={styles.field}>
          <Text style={styles.label}>{t(l.kind === 'trip' ? 'listing.accepts' : 'listing.item')}</Text>
          <Row wrap>{l.item_types.map((it) => <Chip key={it} label={t(`items.${it}`)} />)}</Row>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('listing.description')}</Text>
          <Text style={styles.body}>{l.description || t('listing.noDescription')}</Text>
        </View>
      </Card>

      {l.author ? (
        <Card onPress={() => router.push(`/user/${l.author_id}`)}>
          <Text style={styles.label}>{t('listing.author')}</Text>
          <Row>
            <Avatar name={l.author.display_name} url={l.author.avatar_url} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.h3}>{l.author.display_name || t('profile.anonymous')}</Text>
              <Rating avg={l.author.rating_avg} count={l.author.rating_count} />
              <Text style={styles.muted}>{t('profile.deals', { count: l.author.deals_completed })}</Text>
            </View>
            <Ionicons name={lang === 'ar' ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.muted} />
          </Row>
        </Card>
      ) : null}

      <Notice text={t('listing.freeNote')} icon="heart" />
      <Notice tone="warn" text={t('chat.safetyTip')} icon="shield-checkmark" />
      {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null}

      {mine ? (
        <>
          <Text style={[styles.muted, { textAlign: 'center' }]}>{t('listing.yours')}</Text>
          {l.status === 'active' ? (
            <Button label={t('listing.closeIt')} variant="secondary" icon="pause-circle-outline" onPress={() => changeStatus('closed')} />
          ) : (
            <Button label={t('listing.reopen')} variant="secondary" icon="play-circle-outline" onPress={() => changeStatus('active')} />
          )}
          <Button label={t('listing.delete')} variant="danger" icon="trash-outline" onPress={() => changeStatus('removed')} />
        </>
      ) : (
        <Button
          label={userId ? t(active ? 'listing.message' : 'listing.openChat') : t('listing.loginToMessage')}
          icon="chatbubble-ellipses"
          onPress={message}
          loading={busy}
        />
      )}
    </Screen>
  );
}

function Info({ icon, label, children }: { icon: keyof typeof Ionicons.glyphMap; label: string; children: React.ReactNode }) {
  return (
    <Row>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.muted}>{label}:</Text>
      <Text style={[styles.body, { fontWeight: '600' }]}>{children}</Text>
    </Row>
  );
}
