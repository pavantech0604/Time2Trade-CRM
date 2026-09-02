/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Check if valid credentials are configured
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseAnonKey.includes('dummy') &&
  !supabaseAnonKey.includes('your-anon-key');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Upload payment screenshot proof or receipt to Supabase Storage
 */
export async function uploadFileToBucket(
  bucketName: 'payment-proofs' | 'expense-receipts' | 'leads-photos' | 'avatars',
  file: File,
  pathPrefix: string
): Promise<{ path: string | null; error: Error | null }> {
  if (!supabase) {
    // Mock upload response for local demo mode
    const fakePath = `${bucketName}/${pathPrefix}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    return { path: fakePath, error: null };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    return { path: `${bucketName}/${filePath}`, error: null };
  } catch (err: any) {
    return { path: null, error: err };
  }
}
