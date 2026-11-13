import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { Card, Screen, styles } from '../components/ui';
import { RuleList } from './rules';

export default function Safety() {
  const { t } = useTranslation();
  return (
    <Screen title={t('safety.title')} back>
      <RuleList />
      {(['allowed', 'refuse', 'report'] as const).map((k) => (
        <Card key={k}>
          <Text style={styles.h3}>{t(`safety.${k}Title`)}</Text>
          <Text style={styles.body}>{t(`safety.${k}`)}</Text>
        </Card>
      ))}
      <Text style={styles.muted}>{t('safety.disclaimer')}</Text>
    </Screen>
  );
}
