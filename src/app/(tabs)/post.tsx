import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { DeliveryForm } from '../../components/DeliveryForm';
import { PlacePicker } from '../../components/PlacePicker';
import { Button, Card, Chip, DateField, Field, Label, LoginPrompt, Notice, Row, Screen, Segmented, styles } from '../../components/ui';
import { createListing, errorCode, today } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useGate } from '../../lib/gate';
import { CURRENCIES, ITEM_TYPES, type Currency, type ItemType, type Kind, type Place, type PriceType } from '../../lib/types';

export default function Post() {
  const { t } = useTranslation();
  const { userId, profile } = useAuth();
  const gate = useGate();
  const params = useLocalSearchParams<{ kind?: string }>();

  const [kind, setKind] = useState<Kind>('trip');
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [date, setDate] = useState('');
  const [flex, setFlex] = useState(0);
  const [weight, setWeight] = useState('');
  const [types, setTypes] = useState<ItemType[]>([]);
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('free');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.kind === 'trip' || params.kind === 'request' || params.kind === 'delivery') setKind(params.kind);
  }, [params.kind]);

  if (!userId) {
    return <Screen title={t('post.title')}><LoginPrompt /></Screen>;
  }

  const toggleType = (it: ItemType) =>
    setTypes((cur) => (kind === 'request' ? [it] : cur.includes(it) ? cur.filter((x) => x !== it) : [...cur, it]));

  const submit = async () => {
    if (!gate()) return;
    const kg = parseFloat(weight.replace(',', '.'));
    if (!origin || !dest) return setError(t('post.errPlaces'));
    if (origin.name === dest.name && origin.country === dest.country) return setError(t('post.errSame'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today()) return setError(t('post.errDate'));
    if (!(kg >= 0.1 && kg <= 100)) return setError(t('post.errWeight'));
    if (types.length === 0) return setError(t('post.errTypes'));
    if (kind === 'request' && description.trim().length < 10) return setError(t('post.errDesc'));
    const price = parseFloat(amount.replace(',', '.'));
    if (priceType !== 'free' && !(price > 0 && price <= 10000000)) return setError(t('price.errAmount'));
    setError(null);
    setBusy(true);
    try {
      const id = await createListing({
        kind, origin, dest, travel_date: date, flex_days: flex, weight_kg: Math.round(kg * 10) / 10,
        item_types: types, description: description.trim(),
        price_type: priceType,
        price_amount: priceType === 'free' ? null : Math.round(price * 100) / 100,
        currency: priceType === 'free' ? null : currency,
      });
      setOrigin(null); setDest(null); setDate(''); setFlex(0); setWeight(''); setTypes([]); setDescription('');
      setPriceType('free'); setAmount('');
      router.push(`/listing/${id}`);
    } catch (e) {
      setError(t(`errors.${errorCode(e)}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('post.title')}>
      {!profile?.accepted_rules_at ? (
        <Notice tone="warn" text={t('errors.rules_not_accepted')} />
      ) : null}
      <Card>
        <Label>{t('post.what')}</Label>
        <Segmented<Kind>
          value={kind}
          onChange={(k) => { setKind(k); setTypes([]); }}
          options={[
            { value: 'trip', label: t('kind.trip') },
            { value: 'request', label: t('kind.request') },
            { value: 'delivery', label: t('kind.deliveries') },
          ]}
        />
        <Text style={styles.muted}>{t(`kind.${kind}Hint`)}</Text>
      </Card>

      {kind === 'delivery' ? <DeliveryForm userId={userId} gate={gate} /> : (
      <>

      <Card>
        <Text style={styles.h3}>{t('post.route')}</Text>
        <PlacePicker label={t('browse.from')} value={origin} onChange={setOrigin} icon="airplane-outline" />
        <PlacePicker label={t('browse.to')} value={dest} onChange={setDest} />
        <DateField label={t(kind === 'trip' ? 'listing.travelDate' : 'listing.latestDate')} value={date} min={today()} onChange={setDate} />
        {kind === 'trip' ? (
          <View style={styles.field}>
            <Label>{t('post.flex')}</Label>
            <Row wrap>
              {[0, 1, 2, 3, 7].map((d) => <Chip key={d} label={`${d}`} selected={flex === d} onPress={() => setFlex(d)} />)}
            </Row>
          </View>
        ) : null}
      </Card>

      <Card>
        <Field
          label={t(kind === 'trip' ? 'post.weightTrip' : 'post.weightRequest')}
          value={weight}
          onChangeText={(v) => setWeight(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="2"
        />
        <View style={styles.field}>
          <Label>{t(kind === 'trip' ? 'post.typesTrip' : 'post.typesRequest')}</Label>
          <Row wrap>
            {ITEM_TYPES.map((it) => (
              <Chip key={it} label={t(`items.${it}`)} selected={types.includes(it)} onPress={() => toggleType(it)} />
            ))}
          </Row>
        </View>
        <Field
          label={t(kind === 'trip' ? 'post.descTrip' : 'post.descRequest')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
        />
        <Notice text={t('post.privacy')} icon="lock-closed" />
      </Card>

      <Card>
        <Label>{t(kind === 'trip' ? 'price.askTrip' : 'price.askRequest')}</Label>
        <Segmented<PriceType>
          value={priceType}
          onChange={setPriceType}
          options={[
            { value: 'free', label: t('price.free') },
            { value: 'per_kg', label: t('price.perKg') },
            { value: 'fixed', label: t('price.fixed') },
          ]}
        />
        {priceType !== 'free' ? (
          <>
            <Field
              label={t('price.amount')}
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="3"
            />
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
      )}
    </Screen>
  );
}
