import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Photo } from '../components/ImageField';
import { ListingCard } from '../components/ListingCard';
import { Button, Card, Empty, Field, Loading, Notice, Row, Screen, Segmented, confirmAsync, styles } from '../components/ui';
import {
  adminRemoveListing, checkIsAdmin, errorCode, fetchActiveDeliveries, fetchOpenReports, fetchPendingApplications,
  resolveReport, reviewCourier, signedImageUrl,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatTime } from '../lib/i18n';
import type { CourierApplication, Listing, Report } from '../lib/types';

type Tab = 'couriers' | 'reports' | 'deliveries';

/** Admin dashboard: check couriers, handle reports, watch local deliveries. Only for users in the "admins" table. */
export default function Admin() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('couriers');
  const [apps, setApps] = useState<CourierApplication[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [deliveries, setDeliveries] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return setAllowed(false);
    checkIsAdmin().then(setAllowed).catch(() => setAllowed(false));
  }, [userId]);

  const load = useCallback(() => {
    if (!allowed) return;
    setError(null);
    const fail = (e: unknown) => setError(errorCode(e));
    if (tab === 'couriers') fetchPendingApplications().then(setApps).catch(fail);
    if (tab === 'reports') fetchOpenReports().then(setReports).catch(fail);
    if (tab === 'deliveries') fetchActiveDeliveries().then(setDeliveries).catch(fail);
  }, [allowed, tab]);
  useFocusEffect(load);

  if (allowed === null) return <Screen title={t('admin.title')} back><Loading /></Screen>;
  if (!allowed) return <Screen title={t('admin.title')} back><Notice tone="error" text={t('errors.not_allowed')} /></Screen>;

  const list = tab === 'couriers' ? apps : tab === 'reports' ? reports : deliveries;

  return (
    <Screen title={t('admin.title')} back>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'couriers', label: t('admin.couriers') },
          { value: 'reports', label: t('admin.reports') },
          { value: 'deliveries', label: t('admin.deliveries') },
        ]}
      />
      {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null}
      {list === null ? <Loading /> : list.length === 0 ? <Empty text={t('admin.none')} /> : null}
      {tab === 'couriers' && apps?.map((a) => <ApplicationCard key={a.user_id} app={a} onDone={load} />)}
      {tab === 'reports' && reports?.map((r) => <ReportCard key={r.id} report={r} onDone={load} />)}
      {tab === 'deliveries' && deliveries?.map((l) => (
        <View key={l.id} style={{ gap: 4 }}>
          <ListingCard listing={l} />
          <Text style={styles.muted}>{t('admin.status', { status: l.status })}</Text>
        </View>
      ))}
    </Screen>
  );
}

function ApplicationCard({ app, onDone }: { app: CourierApplication; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const [idUrl, setIdUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (app.id_photo_path) signedImageUrl('verification', app.id_photo_path).then(setIdUrl);
    if (app.selfie_path) signedImageUrl('verification', app.selfie_path).then(setSelfieUrl);
  }, [app.id_photo_path, app.selfie_path]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      await reviewCourier(app, approve, note.trim());
      onDone();
    } catch (e) {
      setError(errorCode(e));
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={styles.h3}>{app.full_name}</Text>
      <Text style={styles.body} selectable>{t('admin.phone', { phone: app.phone })}</Text>
      <Text style={styles.body}>{t('admin.city', { city: app.city })}</Text>
      <Text style={styles.muted}>{formatTime(app.created_at, i18n.language)}</Text>
      <Button label={t('admin.profile')} variant="ghost" onPress={() => router.push(`/user/${app.user_id}`)} />
      <Text style={styles.label}>{t('courier.idPhoto')}</Text>
      <Photo url={idUrl} height={200} />
      <Text style={styles.label}>{t('courier.selfie')}</Text>
      <Photo url={selfieUrl} height={200} />
      <Field label={t('admin.note')} value={note} onChangeText={setNote} maxLength={300} />
      {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null}
      <Row>
        <Button label={t('admin.reject')} variant="danger" disabled={busy} onPress={() => decide(false)} style={styles.flex} />
        <Button label={t('admin.approve')} loading={busy} onPress={() => decide(true)} style={styles.flex} />
      </Row>
      <Text style={styles.muted}>{t('admin.photosDeleted')}</Text>
    </Card>
  );
}

function ReportCard({ report: r, onDone }: { report: Report; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(errorCode(e));
      setBusy(false);
    }
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.h3}>{t(`report.${r.reason}`)}</Text>
        <Text style={styles.muted}>{formatTime(r.created_at, i18n.language)}</Text>
      </Row>
      <Text style={styles.muted}>{t(`admin.target_${r.target_type}`)}</Text>
      {r.details ? <Text style={styles.body}>{r.details}</Text> : null}
      {r.target_type === 'listing' ? <Button label={t('admin.open')} variant="ghost" onPress={() => router.push(`/listing/${r.target_id}`)} /> : null}
      {r.target_type === 'user' ? <Button label={t('admin.open')} variant="ghost" onPress={() => router.push(`/user/${r.target_id}`)} /> : null}
      <Button label={t('admin.reporter')} variant="ghost" onPress={() => router.push(`/user/${r.reporter_id}`)} />
      <Field label={t('admin.note')} value={note} onChangeText={setNote} maxLength={500} />
      {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null}
      {r.target_type === 'listing' ? (
        <Button
          label={t('admin.remove')}
          variant="danger"
          disabled={busy}
          onPress={async () => {
            if (!(await confirmAsync(t('common.confirm')))) return;
            act(async () => {
              await adminRemoveListing(r.target_id);
              await resolveReport(r.id, 'resolved', note.trim() || 'listing removed');
            });
          }}
        />
      ) : null}
      <Row>
        <Button label={t('admin.dismiss')} variant="secondary" disabled={busy} onPress={() => act(() => resolveReport(r.id, 'rejected', note.trim()))} style={styles.flex} />
        <Button label={t('admin.resolve')} loading={busy} onPress={() => act(() => resolveReport(r.id, 'resolved', note.trim()))} style={styles.flex} />
      </Row>
    </Card>
  );
}
