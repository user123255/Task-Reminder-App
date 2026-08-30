import { supabase } from '@/utils/supabase';

export async function testSupabaseConnection() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Supabase connection error:', error);
    return false;
  }

  console.log('Supabase connection successful:', data);
  return true;
}