import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { cityLabel, countryLabel } from '../lib/cities';
import { formatDate } from '../lib/i18n';
import { colors, space } from '../lib/theme';
import type { Listing } from '../lib/types';
import { Avatar, Card, Chip, Rating, Row, styles } from './ui';

const SYMBOL = { USD: '$', EUR: '€', SYP: 'SYP' } as const;

/** "Free", "3 $ per kg" or "10 $". Returns the text for the current language. */
export function usePriceLabel() {
  const { t } = useTranslation();
  return (l: Pick<Listing, 'price_type' | 'price_amount' | 'currency'>): string => {
    if (l.price_type === 'free' || l.price_amount == null || !l.currency) return t('price.free');
    const amount = `${Number(l.price_amount)} ${SYMBOL[l.currency]}`;
    return l.price_type === 'per_kg' ? t('price.perKgValue', { amount }) : amount;
  };
}

export function RouteLine({ l, size = 18 }: { l: Pick<Listing, 'origin_name' | 'origin_country' | 'dest_name' | 'dest_country'>; size?: number }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
      <Text style={{ fontSize: size, fontWeight: '700', color: colors.text }}>{cityLabel(l.origin_name, l.origin_country, lang)}</Text>
      <Ionicons name={lang === 'ar' ? 'arrow-back' : 'arrow-forward'} size={size} color={colors.primary} />
      <Text style={{ fontSize: size, fontWeight: '700', color: colors.text }}>{cityLabel(l.dest_name, l.dest_country, lang)}</Text>
    </View>
  );
}

export function ListingCard({ listing: l, showAuthor = true }: { listing: Listing; showAuthor?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const priceLabel = usePriceLabel();
  return (
    <Card onPress={() => router.push(`/listing/${l.id}`)}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Chip label={t(`kind.${l.kind}`)} tone={l.kind === 'request' ? 'accent' : undefined} />
        <Text style={styles.muted}>
          {formatDate(l.travel_date, lang)}
          {l.flex_days > 0 ? `  ${t('listing.flex', { days: l.flex_days })}` : ''}
        </Text>
      </Row>
      <RouteLine l={l} />
      <Text style={styles.muted}>
        {countryLabel(l.origin_country, lang)} · {countryLabel(l.dest_country, lang)}
      </Text>
      <Row wrap>
        <Chip label={t(l.kind === 'trip' ? 'listing.freeKg' : 'listing.needKg', { kg: Number(l.weight_kg) })} selected />
        <Chip label={priceLabel(l)} tone="accent" />
        {l.item_types.slice(0, 3).map((it) => <Chip key={it} label={t(`items.${it}`)} />)}
        {l.item_types.length > 3 ? <Chip label={`+${l.item_types.length - 3}`} /> : null}
      </Row>
      {showAuthor && l.author ? (
        <Row style={{ marginTop: 2 }}>
          <Avatar name={l.author.display_name} url={l.author.avatar_url} size={28} />
          <Text style={[styles.body, { flexShrink: 1 }]} numberOfLines={1}>{l.author.display_name || t('profile.anonymous')}</Text>
          <Rating avg={l.author.rating_avg} count={l.author.rating_count} />
        </Row>
      ) : null}
    </Card>
  );
}
