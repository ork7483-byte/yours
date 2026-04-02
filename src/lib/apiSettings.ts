// API 키 설정 관리 (Supabase api_settings 테이블)
import { supabase } from './supabase';

export const API_KEYS = {
  KIE_API_KEY: { id: 'kie_api_key', label: 'Kie.ai (Kling 영상)', placeholder: 'Bearer 키 입력' },
  ELEVENLABS_KEY: { id: 'elevenlabs_key', label: 'ElevenLabs (AI 성우)', placeholder: 'xi-api-key 입력' },
  GOOGLE_TTS_KEY: { id: 'google_tts_key', label: 'Google Cloud TTS (AI 성우 대안)', placeholder: 'API 키 입력' },
  SUNO_KEY: { id: 'suno_key', label: 'Suno API (AI 작곡)', placeholder: 'Bearer 키 입력' },
};

export async function getApiKey(keyId: string): Promise<string | null> {
  const { data } = await supabase
    .from('api_settings')
    .select('value')
    .eq('id', keyId)
    .single();
  return data?.value || null;
}

export async function setApiKey(keyId: string, value: string, label?: string): Promise<boolean> {
  const { error } = await supabase
    .from('api_settings')
    .upsert({ id: keyId, value, label, updated_at: new Date().toISOString() });
  return !error;
}

export async function getAllApiKeys(): Promise<Record<string, { value: string; label: string; updated_at: string }>> {
  const { data } = await supabase
    .from('api_settings')
    .select('*');
  const result: Record<string, any> = {};
  (data || []).forEach((item: any) => {
    result[item.id] = { value: item.value, label: item.label, updated_at: item.updated_at };
  });
  return result;
}
