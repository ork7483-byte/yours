// 서버 API를 통한 이미지 생성 (핵심 로직은 서버에만 존재)

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface GenerateRequest {
  parts: any[];
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

interface GenerateResponse {
  success: boolean;
  image?: { data: string; mimeType: string };
  error?: string;
}

export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const res = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-License-Key': import.meta.env.VITE_LICENSE_KEY || '',
      },
      body: JSON.stringify(request),
    });

    const data = await res.json();

    if (res.status === 403) {
      return { success: false, error: '등록되지 않은 도메인입니다. 관리자에게 문의해주세요.' };
    }

    return data;
  } catch (error: any) {
    return { success: false, error: '서버 연결에 실패했습니다. 다시 시도해주세요.' };
  }
}
