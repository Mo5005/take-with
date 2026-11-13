import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { PlacePicker } from '../../components/PlacePicker';
import { RouteMap } from '../../components/RouteMap';
import { Button, Card, Chip, DateField, Empty, Field, Label, Loading, Notice, Row, Screen, Segmented, styles } from '../../components/ui';
import { errorCode, fetchListings, today } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { LANGS, setLanguage, type Lang } from '../../lib/i18n';
import { colors, space } from '../../lib/theme';
import { ITEM_TYPES, type Filters, type Kind, type Listing } from '../../lib/types';

const EMPTY: Filters = { kind: 'trip', origin: null, dest: null, radiusKm: 150, dateFrom: '', dateTo: '', kg: '', itemType: null };
const RADII = [30, 150, 400];

export default function Browse() {
  const { t, i18n } = useTranslation();
  const { blocked } = useAuth();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const load = useCallback(() => {
    let live = true;
    setError(null);
    fetchListings(filters)
      .then((r) => live && setRows(r))
      .catch((e) => {
        if (!live) return;
        setRows([]);
        setError(errorCode(e));
      });
    return () => {
      live = false;
    };
  }, [filters]);
  useFocusEffect(load);

  const visible = useMemo(() => (rows ?? []).filter((l) => !blocked.includes(l.author_id)), [rows, blocked]);
  const extraCount = [filters.dateFrom, filters.dateTo, filters.kg, filters.itemType].filter(Boolean).length;
  const nextLang = LANGS[(LANGS.findIndex((l) => l.code === i18n.language) + 1) % LANGS.length];

  return (
    <Screen
      title={t('app.name')}
      right={
        <Pressable onPress={() => setLanguage(nextLang.code as Lang)} hitSlop={10} accessibilityRole="button" accessibilityLabel={nextLang.label}>
          <Row style={{ gap: 4 }}>
            <Ionicons name="globe-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{nextLang.label}</Text>
          </Row>
        </Pressable>
      }
    >
      <Segmented<Kind>
        value={filters.kind}
        onChange={(v) => set('kind', v)}
        options={[{ value: 'trip', label: t('kind.trips') }, { value: 'request', label: t('kind.requests') }]}
      />

      <Card>
        <Row style={{ alignItems: 'flex-end' }}>
          <PlacePicker label={t('browse.from')} value={filters.origin} onChange={(p) => set('origin', p)} placeholder={t('browse.anywhere')} icon="airplane-outline" />
          <PlacePicker label={t('browse.to')} value={filters.dest} onChange={(p) => set('dest', p)} placeholder={t('browse.anywhere')} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => setShowFilters((s) => !s)} accessibilityRole="button" accessibilityState={{ expanded: showFilters }}>
            <Row style={{ gap: 6, paddingVertical: 6 }}>
              <Ionicons name="options-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {t('browse.filters')}{extraCount ? ` (${extraCount})` : ''}
              </Text>
              <Ionicons name={showFilters ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            </Row>
          </Pressable>
          <View style={{ width: 150 }}>
            <Segmented<'list' | 'map'>
              value={view}
              onChange={setView}
              options={[{ value: 'list', label: t('browse.list') }, { value: 'map', label: t('browse.map') }]}
            />
          </View>
        </Row>

        {showFilters && (
          <View style={{ gap: space.md }}>
            <Row>
              <DateField label={t('browse.dateFrom')} value={filters.dateFrom} min={today()} onChange={(v) => set('dateFrom', v)} />
              <DateField label={t('browse.dateTo')} value={filters.dateTo} min={filters.dateFrom || today()} onChange={(v) => set('dateTo', v)} />
            </Row>
            <Field
              label={t(filters.kind === 'trip' ? 'browse.minKg' : 'browse.maxKg')}
              value={filters.kg}
              onChangeText={(v) => set('kg', v.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
            <View style={styles.field}>
              <Label>{t('browse.itemType')}</Label>
              <Row wrap>
                <Chip label={t('common.any')} selected={!filters.itemType} onPress={() => set('itemType', null)} />
                {ITEM_TYPES.map((it) => (
                  <Chip key={it} label={t(`items.${it}`)} selected={filters.itemType === it} onPress={() => set('itemType', it)} />
                ))}
              </Row>
            </View>
            <View style={styles.field}>
              <Label>{t('browse.radius')}</Label>
              <Row wrap>
                {RADII.map((km) => (
                  <Chip
                    key={km}
                    label={km === 30 ? t('browse.radiusCity') : t('browse.radiusKm', { km })}
                    selected={filters.radiusKm === km}
                    onPress={() => set('radiusKm', km)}
                  />
                ))}
              </Row>
            </View>
            <Button label={t('browse.reset')} variant="ghost" onPress={() => setFilters({ ...EMPTY, kind: filters.kind })} />
          </View>
        )}
      </Card>

      {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null}

      {rows === null ? (
        <Loading />
      ) : view === 'map' ? (
        <View style={{ gap: space.sm }}>
          <Text style={styles.muted}>{visible.length ? t('browse.mapHint') : t('browse.mapEmpty')}</Text>
          <View style={{ height: 440 }}>
            <RouteMap
              listings={visible}
              onSelectRoute={(origin, dest) => {
                setFilters((f) => ({ ...f, origin, dest }));
                setView('list');
              }}
            />
          </View>
        </View>
      ) : visible.length === 0 ? (
        !error && (
          <Empty title={t('browse.emptyTitle')} text={t(filters.kind === 'trip' ? 'browse.emptyTrip' : 'browse.emptyRequest')}>
            <Button
              label={t(filters.kind === 'trip' ? 'browse.postRequest' : 'browse.postTrip')}
              icon="add"
              onPress={() => router.push({ pathname: '/post', params: { kind: filters.kind === 'trip' ? 'request' : 'trip' } })}
            />
          </Empty>
        )
      ) : (
        <>
          <Text style={styles.muted}>{t('browse.results', { count: visible.length })}</Text>
          {visible.map((l) => <ListingCard key={l.id} listing={l} />)}
        </>
      )}
    </Screen>
  );
}
