import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { colors } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  <Ionicons name={name} size={size} color={typeof color === 'string' ? color : undefined} />
);

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 66 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.browse'), tabBarIcon: icon('search') }} />
      <Tabs.Screen name="post" options={{ title: t('tabs.post'), tabBarIcon: icon('add-circle') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats'), tabBarIcon: icon('chatbubbles') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
