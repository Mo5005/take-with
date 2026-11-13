// The publishable key is safe to ship in the app: the database is protected by row-level security.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://qzmhuumnwhnrybzrzkvk.supabase.co';
export const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_lR4m4YC5hyB4bx9gxnbDQQ_60rgWGkX';

// Set by Expo from "experiments.baseUrl" in app.json ("/take-with" on GitHub Pages).
export const BASE_URL = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
