import raw from '../data/cities.json';
import type { Place } from './types';

type Row = [string, string, number, number, string?];
const rows = raw as unknown as Row[];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ًͯ-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ß/g, 'ss')
    .trim();
}

const index = rows.map((r) => norm(r[0]) + (r[4] ? '|' + norm(r[4]) : ''));

/** Search the bundled world city list. Rows are sorted by population, so bigger cities come first. */
export function searchPlaces(query: string, limit = 20): Place[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const starts: Place[] = [];
  const contains: Place[] = [];
  for (let i = 0; i < rows.length && starts.length < limit; i++) {
    const key = index[i];
    const pos = key.indexOf(q);
    if (pos < 0) continue;
    const r = rows[i];
    const place: Place = { name: r[0], country: r[1], lat: r[2], lng: r[3], ar: r[4] };
    if (pos === 0 || key[pos - 1] === '|' || key[pos - 1] === ' ') starts.push(place);
    else if (contains.length < limit) contains.push(place);
  }
  return starts.concat(contains).slice(0, limit);
}

const arByKey = new Map<string, string>();
for (const r of rows) if (r[4]) arByKey.set(r[0] + '|' + r[1], r[4]);

/** City name for the current language (Arabic names exist for the larger cities only). */
export function cityLabel(name: string, country: string, lang: string): string {
  if (lang === 'ar') return arByKey.get(name + '|' + country) ?? name;
  return name;
}

export function countryLabel(code: string, lang: string): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
