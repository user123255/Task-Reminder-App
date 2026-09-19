import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
}

if (!supabaseKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_KEY');
}

/**
 * Supabase client
 *
 * Web:
 * - Uses the browser's built-in storage.
 *
 * Android / iOS:
 * - Uses AsyncStorage so the login session survives
 *   app restarts.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,

      autoRefreshToken: true,
      persistSession: true,

      // On web, Supabase can handle the OAuth URL.
      // On native, this is not needed.
      detectSessionInUrl: Platform.OS === 'web',

      // Prevent unnecessary navigator warnings on native.
      flowType: 'pkce',
    },
  }
);