import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Listing, Place } from '../lib/types';
import { Empty } from './ui';

export interface RouteMapProps {
  listings: Listing[];
  onSelectRoute: (origin: Place, dest: Place) => void;
}

// Native placeholder. The real map is in RouteMap.web.tsx.
export function RouteMap(_props: RouteMapProps) {
  const { t } = useTranslation();
  return <Empty text={t('browse.mapNative')} />;
}
