import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Text } from 'react-native';
import { colors } from '../lib/theme';
import type { DeliveryDetails } from '../lib/types';
import { Card, Row, styles } from './ui';

/** Exact addresses of a delivery job. Only shown to the author, the courier and admins. */
export function AddressCard({ d }: { d: DeliveryDetails }) {
  const { t } = useTranslation();
  return (
    <Card style={{ borderColor: colors.accent }}>
      <Row>
        <Ionicons name="lock-closed" size={16} color={colors.accent} />
        <Text style={styles.h3}>{t('delivery.addresses')}</Text>
      </Row>
      <Text style={styles.label}>{t('delivery.pickup')}</Text>
      <Text style={styles.body}>{d.pickup_address}</Text>
      <Phone n={d.pickup_phone} />
      <Text style={[styles.label, { marginTop: 6 }]}>{t('delivery.dropoff')}</Text>
      <Text style={styles.body}>{d.dropoff_address}</Text>
      <Phone n={d.dropoff_phone} />
    </Card>
  );
}

/** Tap to call. */
function Phone({ n }: { n: string }) {
  return (
    <Text
      style={[styles.body, { color: colors.primary, fontWeight: '600' }]}
      onPress={() => Linking.openURL(`tel:${n.replace(/[^0-9+]/g, '')}`)}
      accessibilityRole="link"
      selectable
    >
      ☎ {n}
    </Text>
  );
}
