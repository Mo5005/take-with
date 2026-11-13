import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, Field, Label, LoginPrompt, Notice, Row, Screen, goBack } from '../components/ui';
import { createReport, errorCode } from '../lib/api';
import { useAuth } from '../lib/auth';

const REASONS = ['prohibited_item', 'scam', 'harassment', 'fake', 'other'] as const;

export default function Report() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) return <Screen title={t('report.title')} back><LoginPrompt /></Screen>;

  const submit = async () => {
    if (!reason || !type || !id) return;
    setBusy(true);
    try {
      await createReport(type, id, reason, details.trim());
      setDone(true);
    } catch (e) {
      setError(t(`errors.${errorCode(e)}`));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen title={t('report.title')} back>
        <Notice text={t('report.thanks')} icon="checkmark-circle" />
        <Button label={t('common.back')} variant="secondary" onPress={goBack} />
      </Screen>
    );
  }

  return (
    <Screen title={t('report.title')} back>
      <Card>
        <Label>{t('report.reason')}</Label>
        <Row wrap>
          {REASONS.map((r) => <Chip key={r} label={t(`report.${r}`)} selected={reason === r} onPress={() => setReason(r)} />)}
        </Row>
        <Field label={t('report.details')} value={details} onChangeText={setDetails} multiline maxLength={1000} />
        {error ? <Notice tone="error" text={error} /> : null}
        <Button label={t('report.submit')} onPress={submit} disabled={!reason} loading={busy} />
      </Card>
    </Screen>
  );
}
