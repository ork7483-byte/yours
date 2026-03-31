import { supabase } from './supabase';

// base64 data URL → Supabase Storage 업로드 → public URL 반환
export async function saveGeneratedImage(
  dataUrl: string,
  userId: string,
  promptSummary?: string
): Promise<{ imageUrl: string; error: string | null }> {
  try {
    // 1. base64 → Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    // 2. 파일명 생성
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const fileName = `${userId}/${Date.now()}.${ext}`;

    // 3. Storage에 업로드
    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(fileName, blob, { contentType: blob.type, upsert: false });

    if (uploadError) return { imageUrl: '', error: uploadError.message };

    // 4. Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // 5. DB에 기록
    const { error: dbError } = await supabase
      .from('generated_images')
      .insert({ user_id: userId, image_url: imageUrl, prompt_summary: promptSummary || '' });

    if (dbError) return { imageUrl, error: dbError.message };

    return { imageUrl, error: null };
  } catch (err: any) {
    return { imageUrl: '', error: err.message || '저장에 실패했습니다.' };
  }
}

// 내 갤러리 이미지 목록 조회
export async function getMyImages(userId: string) {
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { images: data || [], error: error?.message || null };
}

// 이미지 삭제
export async function deleteImage(imageId: string, filePath: string) {
  // Storage에서 삭제
  await supabase.storage.from('generated-images').remove([filePath]);
  // DB에서 삭제
  const { error } = await supabase.from('generated_images').delete().eq('id', imageId);
  return { error: error?.message || null };
}
