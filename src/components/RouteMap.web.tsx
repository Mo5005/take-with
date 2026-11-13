import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useEffect, useMemo, useRef } from 'react';
import { MAP_STYLE_URL } from '../lib/config';
import { colors } from '../lib/theme';
import type { Listing, Place } from '../lib/types';
import type { RouteMapProps } from './RouteMap';

interface RouteGroup {
  key: string;
  origin: Place;
  dest: Place;
  count: number;
}

function groupRoutes(listings: Listing[]): RouteGroup[] {
  const map = new Map<string, RouteGroup>();
  for (const l of listings) {
    const key = `${l.origin_name}|${l.origin_country}>${l.dest_name}|${l.dest_country}`;
    const g = map.get(key);
    if (g) g.count++;
    else {
      map.set(key, {
        key,
        origin: { name: l.origin_name, country: l.origin_country, lat: l.origin_lat, lng: l.origin_lng },
        dest: { name: l.dest_name, country: l.dest_country, lat: l.dest_lat, lng: l.dest_lng },
        count: 1,
      });
    }
  }
  return [...map.values()];
}

/** A curved line between two points, so that routes in both directions do not overlap. */
function arc(a: Place, b: Place): [number, number][] {
  const mx = (a.lng + b.lng) / 2;
  const my = (a.lat + b.lat) / 2;
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const cx = mx - dy * 0.18;
  const cy = my + dx * 0.18;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    pts.push([
      (1 - t) * (1 - t) * a.lng + 2 * (1 - t) * t * cx + t * t * b.lng,
      (1 - t) * (1 - t) * a.lat + 2 * (1 - t) * t * cy + t * t * b.lat,
    ]);
  }
  return pts;
}

let rtlRequested = false;

export function RouteMap({ listings, onSelectRoute }: RouteMapProps) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const groups = useMemo(() => groupRoutes(listings), [listings]);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const selectRef = useRef(onSelectRoute);
  selectRef.current = onSelectRoute;

  const data = useMemo(() => {
    const lines = groups.map((g, i) => ({
      type: 'Feature' as const,
      properties: { idx: i, count: g.count },
      geometry: { type: 'LineString' as const, coordinates: arc(g.origin, g.dest) },
    }));
    const points = groups.flatMap((g, i) => [
      { type: 'Feature' as const, properties: { idx: i, end: 0, label: g.origin.name }, geometry: { type: 'Point' as const, coordinates: [g.origin.lng, g.origin.lat] } },
      { type: 'Feature' as const, properties: { idx: i, end: 1, label: g.dest.name }, geometry: { type: 'Point' as const, coordinates: [g.dest.lng, g.dest.lat] } },
    ]);
    return {
      lines: { type: 'FeatureCollection' as const, features: lines },
      points: { type: 'FeatureCollection' as const, features: points },
    };
  }, [groups]);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!el.current) return;
    if (!rtlRequested) {
      rtlRequested = true;
      try {
        // Needed so that Arabic place names on the map are drawn correctly.
        maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js', true);
      } catch {}
    }
    const map = new maplibregl.Map({ container: el.current, style: MAP_STYLE_URL, center: [22, 42], zoom: 2.4, attributionControl: { compact: true } });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('routes', { type: 'geojson', data: dataRef.current.lines });
      map.addSource('ends', { type: 'geojson', data: dataRef.current.points });
      map.addLayer({
        id: 'routes', type: 'line', source: 'routes',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': colors.primary, 'line-opacity': 0.75, 'line-width': ['min', 8, ['+', 2.5, ['get', 'count']]] },
      });
      // A wide invisible line makes the route easy to tap with a finger.
      map.addLayer({ id: 'routes-hit', type: 'line', source: 'routes', paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 24 } });
      map.addLayer({
        id: 'ends', type: 'circle', source: 'ends',
        paint: {
          'circle-radius': 6,
          'circle-color': ['case', ['==', ['get', 'end'], 0], colors.white, colors.accent],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': ['case', ['==', ['get', 'end'], 0], colors.primary, colors.white],
        },
      });
      const pick = (e: maplibregl.MapLayerMouseEvent) => {
        const idx = e.features?.[0]?.properties?.idx;
        const g = typeof idx === 'number' ? groupsRef.current[idx] : undefined;
        if (g) selectRef.current(g.origin, g.dest);
      };
      map.on('click', 'routes-hit', pick);
      map.on('click', 'ends', pick);
      map.on('mouseenter', 'routes-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'routes-hit', () => { map.getCanvas().style.cursor = ''; });
      fit(map, groupsRef.current);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    (map.getSource('routes') as maplibregl.GeoJSONSource | undefined)?.setData(data.lines);
    (map.getSource('ends') as maplibregl.GeoJSONSource | undefined)?.setData(data.points);
    fit(map, groups);
  }, [data, groups]);

  return <div ref={el} dir="ltr" style={{ width: '100%', height: '100%', minHeight: 360, borderRadius: 18, overflow: 'hidden' }} />;
}

function fit(map: maplibregl.Map, groups: RouteGroup[]) {
  if (!groups.length) return;
  const b = new maplibregl.LngLatBounds();
  for (const g of groups) {
    b.extend([g.origin.lng, g.origin.lat]);
    b.extend([g.dest.lng, g.dest.lat]);
  }
  map.fitBounds(b, { padding: 60, maxZoom: 6, duration: 400 });
}
