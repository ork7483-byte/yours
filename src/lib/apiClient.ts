// 서버에서 프롬프트 + API키 + 설정을 받아오는 클라이언트
import { GoogleGenAI } from '@google/genai';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface PromptRequest {
  clothingMode: string;
  hasTop: boolean;
  hasBottom: boolean;
  hasDress: boolean;
  hasModel: boolean;
  hasPose: boolean;
  hasBg: boolean;
  shootingStyle: string;
  lightingDir: string;
  imageRatio: string;
  imageResolution: string;
}

interface PromptResponse {
  success: boolean;
  systemPrompt?: string;
  instructions?: string;
  apiKey?: string;
  config?: any;
  error?: string;
}

export async function generateImageViaServer(
  request: PromptRequest,
  imageParts: any[]
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    // 1. 서버에서 프롬프트 + API키 + 설정 받기 (이미지 없이 메타만 전송)
    const res = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (res.status === 403) {
      return { success: false, error: '등록되지 않은 도메인입니다. 관리자에게 문의해주세요.' };
    }

    const data: PromptResponse = await res.json();
    if (!data.success || !data.apiKey) {
      return { success: false, error: data.error || '서버 응답 오류' };
    }

    // 2. 서버에서 받은 프롬프트 + 클라이언트의 이미지로 Gemini 호출
    const ai = new GoogleGenAI({ apiKey: data.apiKey });

    const finalParts = [
      { text: data.systemPrompt },
      ...imageParts,
      { text: data.instructions },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: finalParts },
      config: data.config,
    });

    // 3. 결과 파싱
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          success: true,
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        };
      }
    }

    return { success: false, error: '이미지 생성에 실패했습니다.' };

  } catch (error: any) {
    const msg = error.message || '';
    if (msg.includes('UNAVAILABLE') || msg.includes('503') || msg.includes('high demand')) {
      return { success: false, error: '현재 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.' };
    } else if (msg.includes('Deadline expired')) {
      return { success: false, error: '이미지 생성 시간이 초과되었습니다. 다시 시도해주세요.' };
    }
    return { success: false, error: '일시적인 오류가 발생했습니다. 다시 시도해주세요.' };
  }
}
