import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { createDelivery, errorCode, uploadImage } from '../lib/api';
import { CURRENCIES, DEADLINE_HOURS, ITEM_TYPES, SIZES, type Currency, type ItemType, type Place, type PriceType, type Size } from '../lib/types';
import { ImageField } from './ImageField';
import { PlacePicker } from './PlacePicker';
import { Button, Card, Chip, Field, Label, Notice, Row, Segmented, styles } from './ui';

/** The form for a local delivery job (inside one city, within hours). */
export function DeliveryForm({ userId, gate }: { userId: string; gate: () => boolean }) {
  const { t } = useTranslation();
  const [city, setCity] = useState<Place | null>(null);
  const [pickupArea, setPickupArea] = useState('');
  const [dropoffArea, setDropoffArea] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffPhone, setDropoffPhone] = useState('');
  const [size, setSize] = useState<Size>('small');
  const [hours, setHours] = useState<number>(6);
  const [type, setType] = useState<ItemType | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('SYP');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!gate()) return;
    if (!city) return setError(t('delivery.errCity'));
    if (!pickupArea.trim() || !dropoffArea.trim()) return setError(t('delivery.errAreas'));
    if (pickupAddress.trim().length < 3 || dropoffAddress.trim().length < 3 || pickupPhone.trim().length < 5 || dropoffPhone.trim().length < 5) {
      return setError(t('delivery.errAddresses'));
    }
    if (!type) return setError(t('post.errTypes'));
    if (description.trim().length < 10) return setError(t('post.errDesc'));
    const price = parseFloat(amount.replace(',', '.'));
    if (priceType !== 'free' && !(price > 0 && price <= 10000000)) return setError(t('price.errAmount'));
    setError(null);
    setBusy(true);
    try {
      const photoPath = photo ? await uploadImage('listing-photos', userId, 'item', photo) : null;
      const id = await createDelivery({
        city, pickup_area: pickupArea.trim(), dropoff_area: dropoffArea.trim(), size, hours,
        item_types: [type], description: description.trim(),
        price_type: priceType, price_amount: priceType === 'free' ? null : Math.round(price * 100) / 100,
        currency: priceType === 'free' ? null : currency, photo_path: photoPath,
        pickup_address: pickupAddress.trim(), pickup_phone: pickupPhone.trim(),
        dropoff_address: dropoffAddress.trim(), dropoff_phone: dropoffPhone.trim(),
      });
      router.push(`/listing/${id}`);
    } catch (e) {
      setError(t(`errors.${errorCode(e)}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <PlacePicker label={t('delivery.city')} value={city} onChange={setCity} />
        <Field label={t('delivery.pickupArea')} value={pickupArea} onChangeText={setPickupArea} maxLength={80} />
        <Field label={t('delivery.dropoffArea')} value={dropoffArea} onChangeText={setDropoffArea} maxLength={80} />
        <Text style={styles.muted}>{t('delivery.areaHint')}</Text>
      </Card>

      <Card>
        <Text style={styles.h3}>{t('delivery.private')}</Text>
        <Field label={t('delivery.pickupAddress')} value={pickupAddress} onChangeText={setPickupAddress} maxLength={300} multiline />
        <Field label={t('delivery.pickupPhone')} value={pickupPhone} onChangeText={setPickupPhone} maxLength={30} keyboardType="phone-pad" inputMode="tel" />
        <Field label={t('delivery.dropoffAddress')} value={dropoffAddress} onChangeText={setDropoffAddress} maxLength={300} multiline />
        <Field label={t('delivery.dropoffPhone')} value={dropoffPhone} onChangeText={setDropoffPhone} maxLength={30} keyboardType="phone-pad" inputMode="tel" />
        <Notice text={t('delivery.privateNote')} icon="lock-closed" />
      </Card>

      <Card>
        <View style={styles.field}>
          <Label>{t('delivery.size')}</Label>
          <Segmented<Size> value={size} onChange={setSize} options={SIZES.map((s) => ({ value: s, label: t(`delivery.size_${s}`) }))} />
        </View>
        <View style={styles.field}>
          <Label>{t('delivery.deadline')}</Label>
          <Row wrap>
            {DEADLINE_HOURS.map((h) => <Chip key={h} label={t('delivery.hours', { h })} selected={hours === h} onPress={() => setHours(h)} />)}
          </Row>
          <Text style={styles.muted}>{t('delivery.deadlineNote')}</Text>
        </View>
        <View style={styles.field}>
          <Label>{t('post.typesRequest')}</Label>
          <Row wrap>
            {ITEM_TYPES.map((it) => <Chip key={it} label={t(`items.${it}`)} selected={type === it} onPress={() => setType(it)} />)}
          </Row>
        </View>
        <Field label={t('post.descRequest')} value={description} onChangeText={setDescription} multiline maxLength={1000} />
        <ImageField label={t('delivery.photo')} uri={photo} onChange={setPhoto} />
      </Card>

      <Card>
        <Label>{t('price.askRequest')}</Label>
        <Segmented<PriceType>
          value={priceType}
          onChange={setPriceType}
          options={[{ value: 'fixed', label: t('price.fixed') }, { value: 'free', label: t('price.free') }]}
        />
        {priceType !== 'free' ? (
          <>
            <Field label={t('price.amount')} value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" inputMode="decimal" />
            <Row wrap>
              {CURRENCIES.map((c) => <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}
            </Row>
          </>
        ) : null}
        <Notice text={t('price.cashNote')} icon="cash-outline" />
      </Card>

      <Notice tone="warn" text={`${t('rules.r1Title')}. ${t('rules.r2')}`} />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button label={t('post.submit')} icon="checkmark" onPress={submit} loading={busy} />
    </>
  );
}
