import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';
import { radius } from '../lib/theme';
import { Button, Label, styles } from './ui';

/** Lets the user choose a photo (on a phone the browser also offers the camera). Holds a local URI until upload. */
export function ImageField({ label, uri, onChange }: { label: string; uri: string | null; onChange: (uri: string | null) => void }) {
  const { t } = useTranslation();
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: false });
    if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
  };
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: 180, borderRadius: radius.md }} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : null}
      <View style={styles.row}>
        <Button label={t(uri ? 'delivery.changePhoto' : 'delivery.addPhoto')} variant="secondary" icon="camera-outline" onPress={pick} style={styles.flex} />
        {uri ? <Button label={t('common.clear')} variant="ghost" onPress={() => onChange(null)} /> : null}
      </View>
    </View>
  );
}

/** Shows a stored photo from a URL (or nothing while it loads). */
export function Photo({ url, height = 200 }: { url: string | null; height?: number }) {
  if (!url) return null;
  return <Image source={{ uri: url }} style={{ width: '100%', height, borderRadius: radius.md }} resizeMode="cover" accessibilityIgnoresInvertColors />;
}
