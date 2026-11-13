import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { RouteLine } from '../../components/ListingCard';
import { Avatar, Card, Empty, Loading, LoginPrompt, Notice, Row, Screen, styles } from '../../components/ui';
import { errorCode, fetchConversations } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatTime } from '../../lib/i18n';
import type { Conversation } from '../../lib/types';

export default function Chats() {
  const { t, i18n } = useTranslation();
  const { userId, blocked } = useAuth();
  const [rows, setRows] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let live = true;
      fetchConversations()
        .then((r) => { if (live) { setRows(r); setError(null); } })
        .catch((e) => { if (live) { setRows([]); setError(errorCode(e)); } });
      return () => { live = false; };
    }, [userId]),
  );

  if (!userId) return <Screen title={t('chats.title')}><LoginPrompt /></Screen>;

  const visible = (rows ?? []).filter((c) => !blocked.includes(c.starter_id === userId ? c.owner_id : c.starter_id));

  return (
    <Screen title={t('chats.title')}>
      {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null}
      {rows === null ? <Loading /> : visible.length === 0 && !error ? <Empty text={t('chats.empty')} /> : null}
      {visible.map((c) => {
        const other = c.starter_id === userId ? c.owner : c.starter;
        return (
          <Card key={c.id} onPress={() => router.push(`/chat/${c.id}`)}>
            <Row>
              <Avatar name={other?.display_name} url={other?.avatar_url} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[styles.h3, { flexShrink: 1 }]} numberOfLines={1}>{other?.display_name || t('profile.anonymous')}</Text>
                  <Text style={[styles.muted, { fontSize: 12 }]}>{formatTime(c.last_message_at, i18n.language)}</Text>
                </Row>
                {c.listing ? <RouteLine l={c.listing} size={13} /> : null}
                <Text style={styles.muted} numberOfLines={1}>{c.last_message ?? t('chats.noMessages')}</Text>
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
