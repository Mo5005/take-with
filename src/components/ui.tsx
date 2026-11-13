import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_WIDTH, colors, radius, space } from '../lib/theme';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Asks the user to confirm. `Alert` does nothing in a browser, so the web uses the browser dialog. */
export function confirmAsync(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    const { Alert } = require('react-native');
    Alert.alert('', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
}

export function Screen({
  title, back, right, scroll = true, children, edges = ['top'],
}: {
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
  scroll?: boolean;
  children: React.ReactNode;
  edges?: ('top' | 'bottom')[];
}) {
  const { i18n, t } = useTranslation();
  const rtl = i18n.language === 'ar';
  return (
    <SafeAreaView style={styles.outer} edges={edges}>
      <View style={styles.inner}>
        {title !== undefined && (
          <View style={styles.header}>
            {back && (
              <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
                <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.text} />
              </Pressable>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            {right}
          </View>
        )}
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.flex}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

export function Button({
  label, onPress, variant = 'primary', icon, disabled, loading, style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: colors.primary, secondary: colors.primarySoft, danger: colors.dangerSoft, ghost: 'transparent' }[variant];
  const fg = { primary: colors.white, secondary: colors.primaryDark, danger: colors.danger, ghost: colors.primary }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'accent' }) {
  const base = [
    styles.chip,
    tone === 'accent' && { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
    selected && { backgroundColor: colors.primary, borderColor: colors.primary },
  ];
  const text = <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>;
  if (!onPress) return <View style={base}>{text}</View>;
  return (
    <Pressable onPress={onPress} style={base} accessibilityRole="button" accessibilityState={{ selected: !!selected }}>
      {text}
    </Pressable>
  );
}

export function Row({ children, style, wrap }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[styles.row, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

/** Date input (YYYY-MM-DD). The browser shows its own date picker. */
export function DateField({ label, value, onChange, min }: { label?: string; value: string; onChange: (v: string) => void; min?: string }) {
  return (
    <View style={[styles.field, styles.flex]}>
      {label ? <Label>{label}</Label> : null}
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'date',
          value,
          min,
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
          style: {
            border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '11px 12px', fontSize: 16,
            fontFamily: 'inherit', color: colors.text, backgroundColor: colors.card, width: '100%', boxSizing: 'border-box',
            minHeight: 46,
          },
        })
      ) : (
        <TextInput value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" style={styles.input} />
      )}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, on && styles.segmentOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.segmentText, on && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name, url, size = 40 }: { name?: string | null; url?: string | null; size?: number }) {
  const s = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={{ uri: url }} style={s} accessibilityIgnoresInvertColors />;
  return (
    <View style={[s, styles.avatar]}>
      <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: size * 0.42 }}>
        {(name || '?').trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const name = value >= n ? 'star' : value >= n - 0.5 ? 'star-half' : 'star-outline';
        const icon = <Ionicons key={n} name={name} size={size} color={colors.accent} />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n}`}>
            {icon}
          </Pressable>
        ) : icon;
      })}
    </View>
  );
}

export function Rating({ avg, count }: { avg: number; count: number }) {
  const { t } = useTranslation();
  if (!count) return <Text style={styles.muted}>{t('profile.noRatings')}</Text>;
  return (
    <View style={[styles.row, { gap: 4 }]}>
      <Stars value={Number(avg)} />
      <Text style={styles.muted}>{t('profile.ratings', { avg: Number(avg).toFixed(1), count })}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'info', icon }: { text: string; tone?: 'info' | 'warn' | 'error'; icon?: keyof typeof Ionicons.glyphMap }) {
  const bg = { info: colors.primarySoft, warn: colors.accentSoft, error: colors.dangerSoft }[tone];
  const fg = { info: colors.primaryDark, warn: '#7A4A12', error: colors.danger }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon ?? (tone === 'info' ? 'information-circle' : 'alert-circle')} size={18} color={fg} />
      <Text style={{ color: fg, flex: 1, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Empty({ title, text, children }: { title?: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      {title ? <Text style={styles.h2}>{title}</Text> : null}
      <Text style={[styles.muted, { textAlign: 'center' }]}>{text}</Text>
      {children}
    </View>
  );
}

/** Shown instead of a screen's content when the user must log in first. */
export function LoginPrompt() {
  const { t } = useTranslation();
  return (
    <Empty title={t('login.needed')} text={t('login.why')}>
      <Button label={t('login.go')} icon="log-in-outline" onPress={() => router.push('/login')} />
    </Empty>
  );
}

export const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 54 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 13, paddingHorizontal: space.lg, borderRadius: radius.md, minHeight: 46 },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipText: { fontSize: 13, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  field: { gap: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: colors.text, backgroundColor: colors.card, minHeight: 46 },
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  segmentOn: { backgroundColor: colors.primary },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.text },
  avatar: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700' },
  h3: { color: colors.text, fontSize: 16, fontWeight: '700' },
  notice: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  empty: { alignItems: 'center', gap: space.md, padding: space.xl },
});
