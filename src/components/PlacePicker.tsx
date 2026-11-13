import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cityLabel, countryLabel, searchPlaces } from '../lib/cities';
import { MAX_WIDTH, colors, space } from '../lib/theme';
import type { Place } from '../lib/types';
import { Label, styles } from './ui';

export function PlacePicker({
  label, value, onChange, placeholder, icon,
}: {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchPlaces(query), [query]);

  const pick = (p: Place | null) => {
    onChange(p);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={[styles.field, styles.flex]}>
      <Label>{label}</Label>
      <Pressable style={[styles.input, styles.row]} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}>
        <Ionicons name={icon ?? 'location-outline'} size={18} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: 16, color: value ? colors.text : colors.muted }} numberOfLines={1}>
          {value ? cityLabel(value.name, value.country, lang) : placeholder ?? t('place.search')}
        </Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.clear')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.outer}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <Ionicons name="close" size={26} color={colors.text} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: space.lg }}>
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={t('place.search')}
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={results}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(p) => `${p.name}|${p.country}|${p.lat}`}
              contentContainerStyle={{ padding: space.lg, maxWidth: MAX_WIDTH }}
              ListEmptyComponent={
                <Text style={[styles.muted, { textAlign: 'center', marginTop: space.xl }]}>
                  {query.trim().length < 2 ? t('place.hint') : t('place.none')}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => pick(item)}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
                    {cityLabel(item.name, item.country, lang)}
                  </Text>
                  <Text style={styles.muted}>{countryLabel(item.country, lang)}</Text>
                </Pressable>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
