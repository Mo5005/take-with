import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { ImageField } from '../components/ImageField';
import { Button, Card, Field, Loading, LoginPrompt, Notice, Screen, styles } from '../components/ui';
import { errorCode, fetchMyApplication, submitCourierApplication, uploadImage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useGate } from '../lib/gate';
import type { CourierApplication } from '../lib/types';

/** Apply to become a verified courier for local delivery jobs. */
export default function Courier() {
  const { t } = useTranslation();
  const { userId, profile, refresh } = useAuth();
  const gate = useGate();
  const [app, setApp] = useState<CourierApplication | null | undefined>(undefined);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchMyApplication(userId)
      .then((a) => {
        setApp(a);
        if (a) { setFullName(a.full_name); setPhone(a.phone); setCity(a.city); }
      })
      .catch(() => setApp(null));
  }, [userId]);

  if (!userId) return <Screen title={t('courier.title')} back><LoginPrompt /></Screen>;
  if (app === undefined) return <Screen title={t('courier.title')} back><Loading /></Screen>;

  const status = profile?.courier_status ?? 'none';
  const canApply = status === 'none' || status === 'rejected';

  const submit = async () => {
    if (!gate()) return;
    if (fullName.trim().length < 2 || phone.trim().length < 5 || !city.trim() || !idPhoto || !selfie) {
      return setError(t('courier.errFields'));
    }
    setBusy(true);
    setError(null);
    try {
      const idPath = await uploadImage('verification', userId, 'id', idPhoto);
      const selfiePath = await uploadImage('verification', userId, 'selfie', selfie);
      await submitCourierApplication({ full_name: fullName.trim(), phone: phone.trim(), city: city.trim(), id_photo: idPath, selfie: selfiePath });
      await refresh();
      setApp(await fetchMyApplication(userId));
    } catch (e) {
      setError(t(`errors.${errorCode(e)}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('courier.title')} back>
      <Text style={styles.body}>{t('courier.intro')}</Text>
      {status !== 'none' ? (
        <Notice
          tone={status === 'rejected' ? 'warn' : 'info'}
          icon={status === 'approved' ? 'checkmark-circle' : undefined}
          text={t(`courier.status_${status}`)}
        />
      ) : null}
      {status === 'rejected' && app?.admin_note ? <Text style={styles.muted}>{t('courier.note', { note: app.admin_note })}</Text> : null}

      {canApply ? (
        <Card>
          <Field label={t('courier.fullName')} value={fullName} onChangeText={setFullName} maxLength={100} autoComplete="name" />
          <Field label={t('courier.phone')} value={phone} onChangeText={setPhone} maxLength={30} keyboardType="phone-pad" inputMode="tel" autoComplete="tel" />
          <Field label={t('courier.city')} value={city} onChangeText={setCity} maxLength={100} />
          <ImageField label={t('courier.idPhoto')} uri={idPhoto} onChange={setIdPhoto} />
          <ImageField label={t('courier.selfie')} uri={selfie} onChange={setSelfie} />
          <Notice text={t('courier.privacy')} icon="lock-closed" />
          {error ? <Notice tone="error" text={error} /> : null}
          <Button label={t(status === 'rejected' ? 'courier.resubmit' : 'courier.submit')} icon="send" onPress={submit} loading={busy} />
        </Card>
      ) : null}
    </Screen>
  );
}
