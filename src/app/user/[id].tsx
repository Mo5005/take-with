import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { Avatar, Button, Card, Chip, Empty, Loading, Notice, Rating, Row, Screen, Stars, confirmAsync, styles } from '../../components/ui';
import { blockUser, errorCode, fetchListingsByAuthor, fetchProfile, fetchReviews, unblockUser } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { LANGS, formatDate } from '../../lib/i18n';
import type { Listing, Profile, Review } from '../../lib/types';

export default function UserProfile() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, blocked, refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchProfile(id), fetchReviews(id), fetchListingsByAuthor(id, true)])
      .then(([p, r, l]) => {
        if (!live) return;
        setProfile(p);
        setReviews(r);
        setListings(l);
      })
      .catch((e) => { if (live) { setProfile(null); setError(errorCode(e)); } });
    return () => { live = false; };
  }, [id]);

  if (profile === undefined) return <Screen title="" back><Loading /></Screen>;
  if (!profile) {
    return (
      <Screen title="" back>
        {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : <Empty text={t('common.notFound')} />}
      </Screen>
    );
  }

  const isBlocked = blocked.includes(id);
  const isMe = userId === id;

  const toggleBlock = async () => {
    if (!userId) return router.push('/login');
    try {
      if (isBlocked) await unblockUser(userId, id);
      else {
        if (!(await confirmAsync(t('common.confirm')))) return;
        await blockUser(id);
      }
      await refresh();
    } catch (e) {
      setError(errorCode(e));
    }
  };

  return (
    <Screen title={profile.display_name || t('profile.anonymous')} back>
      <Card>
        <Row>
          <Avatar name={profile.display_name} url={profile.avatar_url} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.h2}>{profile.display_name || t('profile.anonymous')}</Text>
            <Rating avg={profile.rating_avg} count={profile.rating_count} />
            <Text style={styles.muted}>{t('profile.deals', { count: profile.deals_completed })}</Text>
            <Text style={styles.muted}>{t('profile.memberSince', { date: formatDate(profile.created_at, i18n.language) })}</Text>
          </View>
        </Row>
        {profile.bio ? <Text style={styles.body}>{profile.bio}</Text> : null}
        {profile.languages.length ? (
          <Row wrap>
            {profile.languages.map((c) => <Chip key={c} label={LANGS.find((l) => l.code === c)?.label ?? c} />)}
          </Row>
        ) : null}
      </Card>

      {isBlocked ? <Notice tone="warn" text={t('profile.blockedNote')} /> : null}
      {error ? <Notice tone="error" text={t(`errors.${error}`)} /> : null}

      {listings.length ? <Text style={styles.h3}>{t('profile.activeListings')}</Text> : null}
      {listings.map((l) => <ListingCard key={l.id} listing={l} showAuthor={false} />)}

      <Text style={styles.h3}>{t('profile.reviews')}</Text>
      {reviews.length === 0 ? <Text style={styles.muted}>{t('profile.noRatings')}</Text> : null}
      {reviews.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <Avatar name={r.author?.display_name} url={r.author?.avatar_url} size={28} />
              <Text style={styles.body}>{r.author?.display_name || t('profile.anonymous')}</Text>
            </Row>
            <Stars value={r.rating} />
          </Row>
          {r.comment ? <Text style={styles.body}>{r.comment}</Text> : null}
          <Text style={[styles.muted, { fontSize: 12 }]}>{formatDate(r.created_at, i18n.language)}</Text>
        </Card>
      ))}

      {!isMe ? (
        <>
          <Button
            label={t('listing.report')}
            variant="secondary"
            icon="flag-outline"
            onPress={() => router.push({ pathname: '/report', params: { type: 'user', id } })}
          />
          <Button label={t(isBlocked ? 'profile.unblock' : 'profile.block')} variant="danger" icon="ban-outline" onPress={toggleBlock} />
        </>
      ) : null}
    </Screen>
  );
}
