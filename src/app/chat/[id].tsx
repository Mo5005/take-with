import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { RouteLine } from '../../components/ListingCard';
import { Button, Card, Chip, Empty, Field, Loading, LoginPrompt, Notice, Row, Screen, Stars, styles } from '../../components/ui';
import {
  createReview, dealAction, errorCode, fetchConversation, fetchDeal, fetchMessages, fetchMyReview, proposeDeal, sendMessage,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatTime } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { colors, radius, space } from '../../lib/theme';
import type { Conversation, Deal, Message } from '../../lib/types';

export default function Chat() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, blocked } = useAuth();
  const [conv, setConv] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const addMessages = useCallback((incoming: Message[]) => {
    setMessages((cur) => {
      const seen = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...cur, ...fresh].sort((a, b) => a.id - b.id) : cur;
    });
  }, []);

  const reloadDeal = useCallback(() => {
    fetchDeal(id).then(setDeal).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    Promise.all([fetchConversation(id), fetchMessages(id), fetchDeal(id)])
      .then(([c, m, d]) => {
        if (!live) return;
        setConv(c);
        setMessages(m);
        setDeal(d);
      })
      .catch((e) => { if (live) { setConv(null); setError(errorCode(e)); } });

    // Live updates: new messages and deal changes from the other person.
    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => addMessages([payload.new as Message]))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `conversation_id=eq.${id}` },
        () => reloadDeal())
      .subscribe();
    return () => {
      live = false;
      supabase.removeChannel(channel);
    };
  }, [id, userId, addMessages, reloadDeal]);

  if (!userId) return <Screen title={t('chats.title')} back><LoginPrompt /></Screen>;
  if (conv === undefined) return <Screen title="" back><Loading /></Screen>;
  if (!conv) {
    return (
      <Screen title="" back>
        {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : <Empty text={t('common.notFound')} />}
      </Screen>
    );
  }

  const otherId = conv.starter_id === userId ? conv.owner_id : conv.starter_id;
  const other = conv.starter_id === userId ? conv.owner : conv.starter;
  const otherName = other?.display_name || t('profile.anonymous');
  const isBlocked = blocked.includes(otherId);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const m = await sendMessage(id, body);
      addMessages([m]);
      setText('');
    } catch (e) {
      setError(errorCode(e) === 'not_allowed' ? 'blocked' : errorCode(e));
    } finally {
      setSending(false);
    }
  };

  const refreshAfterDeal = async () => {
    reloadDeal();
    fetchMessages(id).then(addMessages).catch(() => {});
  };

  return (
    <Screen
      title={otherName}
      back
      scroll={false}
      edges={['top', 'bottom']}
      right={
        <Row>
          <Pressable onPress={() => router.push(`/user/${otherId}`)} hitSlop={8} accessibilityRole="button" accessibilityLabel={otherName}>
            <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/report', params: { type: 'conversation', id } })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('listing.report')}
          >
            <Ionicons name="flag-outline" size={22} color={colors.muted} />
          </Pressable>
        </Row>
      }
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroller}
          style={styles.flex}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {conv.listing ? (
            <Card onPress={() => router.push(`/listing/${conv.listing_id}`)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Chip label={t(`kind.${conv.listing.kind}`)} tone={conv.listing.kind === 'request' ? 'accent' : undefined} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('chat.listing')}</Text>
              </Row>
              <RouteLine l={conv.listing} size={15} />
            </Card>
          ) : null}

          <DealPanel
            conv={conv}
            deal={deal}
            userId={userId}
            otherId={otherId}
            otherName={otherName}
            onChanged={refreshAfterDeal}
          />

          <Notice tone="warn" text={t('chat.safetyTip')} icon="shield-checkmark" />

          {messages.map((m) =>
            m.kind === 'system' ? (
              <View key={m.id} style={{ alignItems: 'center', marginVertical: 2 }}>
                <Text style={{ fontSize: 12, color: colors.muted, backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' }}>
                  {t(`deal.sys_${m.body}`, { defaultValue: m.body })} · {formatTime(m.created_at, i18n.language)}
                </Text>
              </View>
            ) : (
              <Bubble key={m.id} mine={m.sender_id === userId} body={m.body} time={formatTime(m.created_at, i18n.language)} />
            ),
          )}
        </ScrollView>

        {error ? <View style={{ paddingHorizontal: space.lg }}><Notice tone="error" text={t(`errors.${error}`)} /></View> : null}
        {isBlocked ? (
          <View style={{ padding: space.lg }}><Notice tone="warn" text={t('chat.blocked')} /></View>
        ) : (
          <View style={{ flexDirection: 'row', gap: space.sm, padding: space.md, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              style={[styles.input, { flex: 1, maxHeight: 120 }]}
            />
            <Pressable
              onPress={send}
              disabled={!text.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel={t('common.send')}
              style={{ backgroundColor: colors.primary, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || sending ? 0.5 : 1 }}
            >
              <Ionicons name="send" size={20} color={colors.white} style={i18n.language === 'ar' ? { transform: [{ scaleX: -1 }] } : undefined} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ mine, body, time }: { mine: boolean; body: string; time: string }) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.lg,
          backgroundColor: mine ? colors.primary : colors.card,
          borderWidth: mine ? 0 : 1, borderColor: colors.border,
        }}
      >
        <Text style={{ color: mine ? colors.white : colors.text, fontSize: 15, lineHeight: 21 }}>{body}</Text>
        <Text style={{ color: mine ? '#CFE7E2' : colors.muted, fontSize: 11, marginTop: 2 }}>{time}</Text>
      </View>
    </View>
  );
}

/** The deal steps: propose → accept → hand over (with inspection) → delivered → rating. */
function DealPanel({
  conv, deal, userId, otherId, otherName, onChanged,
}: {
  conv: Conversation;
  deal: Deal | null;
  userId: string;
  otherId: string;
  otherName: string;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(conv.listing ? String(Number(conv.listing.weight_kg)) : '1');
  const [inspected, setInspected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewed, setReviewed] = useState<boolean | null>(null);

  const dealId = deal?.id;
  const delivered = deal?.status === 'delivered';
  useEffect(() => {
    if (!dealId || !delivered) return;
    fetchMyReview(dealId, userId).then((r) => setReviewed(!!r)).catch(() => setReviewed(false));
  }, [dealId, delivered, userId]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const err = error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null;

  if (!deal || deal.status === 'cancelled') {
    const canPropose = conv.listing?.status === 'active';
    return (
      <Card>
        {deal ? <Chip label={t('deal.status_cancelled')} /> : null}
        {!open ? (
          <>
            <Text style={styles.muted}>{t('deal.proposeHint')}</Text>
            {canPropose ? <Button label={t('deal.propose')} variant="secondary" icon="hand-left-outline" onPress={() => setOpen(true)} /> : null}
          </>
        ) : (
          <>
            <Field label={t('deal.weight')} value={weight} onChangeText={(v) => setWeight(v.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" inputMode="decimal" />
            <Row>
              <Button label={t('common.cancel')} variant="ghost" onPress={() => setOpen(false)} style={styles.flex} />
              <Button
                label={t('deal.sendProposal')}
                loading={busy}
                style={styles.flex}
                onPress={() => {
                  const kg = parseFloat(weight.replace(',', '.'));
                  if (!(kg > 0 && kg <= 100)) return setError('generic');
                  run(async () => {
                    await proposeDeal(conv.id, Math.round(kg * 10) / 10);
                    setOpen(false);
                  });
                }}
              />
            </Row>
          </>
        )}
        {err}
      </Card>
    );
  }

  const amTraveller = deal.traveller_id === userId;
  const cancel = (reason?: string) => run(() => dealAction(deal.id, 'cancel', false, reason));

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }} wrap>
        <Text style={styles.h3}>{t('deal.title')} · {Number(deal.weight_kg)} {t('common.kg')}</Text>
        <Chip label={t(`deal.status_${deal.status}`)} selected={deal.status === 'delivered'} tone="accent" />
      </Row>
      <Text style={styles.muted}>{t(amTraveller ? 'deal.youTraveller' : 'deal.youSender')}</Text>

      {deal.status === 'proposed' && deal.proposed_by === userId ? (
        <>
          <Text style={styles.body}>{t('deal.waitingAccept')}</Text>
          <Button label={t('deal.cancel')} variant="danger" loading={busy} onPress={() => cancel()} />
        </>
      ) : null}

      {deal.status === 'proposed' && deal.proposed_by !== userId ? (
        <Row>
          <Button label={t('deal.decline')} variant="danger" disabled={busy} onPress={() => cancel()} style={styles.flex} />
          <Button label={t('deal.accept')} loading={busy} onPress={() => run(() => dealAction(deal.id, 'accept'))} style={styles.flex} />
        </Row>
      ) : null}

      {deal.status === 'accepted' && amTraveller ? (
        <>
          <Pressable
            onPress={() => setInspected((v) => !v)}
            style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingVertical: space.sm }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: inspected }}
          >
            <Ionicons name={inspected ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={styles.body}>{t('deal.inspect')}</Text></View>
          </Pressable>
          <Button
            label={t('deal.received')}
            icon="cube-outline"
            disabled={!inspected}
            loading={busy}
            onPress={() => run(() => dealAction(deal.id, 'hand_over', inspected))}
          />
          <Button label={t('deal.notAsDescribed')} variant="danger" disabled={busy} onPress={() => cancel('item not as described')} />
        </>
      ) : null}

      {deal.status === 'accepted' && !amTraveller ? (
        <>
          <Text style={styles.body}>{t('deal.senderAccepted')}</Text>
          <Button label={t('deal.cancel')} variant="danger" loading={busy} onPress={() => cancel()} />
        </>
      ) : null}

      {deal.status === 'handed_over' && amTraveller ? <Text style={styles.body}>{t('deal.waitingDelivery')}</Text> : null}

      {deal.status === 'handed_over' && !amTraveller ? (
        <>
          <Text style={styles.body}>{t('deal.senderHandedOver')}</Text>
          <Button label={t('deal.confirmDelivered')} icon="checkmark-done" loading={busy} onPress={() => run(() => dealAction(deal.id, 'deliver'))} />
        </>
      ) : null}

      {deal.status === 'delivered' ? (
        <>
          <Text style={styles.body}>{t('deal.done')}</Text>
          {reviewed === true ? <Text style={styles.muted}>{t('deal.reviewed')}</Text> : null}
          {reviewed === false ? (
            <>
              <Text style={styles.label}>{t('deal.rate', { name: otherName })}</Text>
              <Stars value={rating} size={30} onChange={setRating} />
              <Field value={comment} onChangeText={setComment} placeholder={t('deal.comment')} maxLength={500} />
              <Button
                label={t('deal.submitReview')}
                disabled={rating === 0}
                loading={busy}
                onPress={() => run(async () => {
                  await createReview(deal.id, otherId, rating, comment.trim());
                  setReviewed(true);
                })}
              />
            </>
          ) : null}
        </>
      ) : null}
      {err}
    </Card>
  );
}
