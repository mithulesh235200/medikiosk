import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser-side Supabase client. Accepts VITE_ names (Vercel/Vite standard)
// or NEXT_PUBLIC_ names (works if pasted as-is from another template).
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Optional: upload a document scan to Supabase Storage instead of
 * embedding huge base64 strings in the patient row.
 * Returns a public URL, or null if storage is unavailable (caller should
 * fall back to inline base64).
 */
export async function uploadDocumentToStorage(
  patientId: string,
  dataUrl: string,
  fileName: string,
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
    if (!match) return null;
    const mimeType = match[1];
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const path = `${patientId}/${Date.now()}-${fileName}.${ext}`;
    const { error } = await supabase.storage
      .from('medical-documents')
      .upload(path, bytes, { contentType: mimeType, upsert: false });
    if (error) {
      console.warn('Storage upload failed, using inline image:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('medical-documents').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('Storage upload exception, using inline image:', err);
    return null;
  }
}
