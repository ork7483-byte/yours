// Vercel Serverless Function: /api/generate
// 핵심 로직 (프롬프트, API 키)이 서버에만 존재

const { GoogleGenAI } = require('@google/genai');

// 허용 도메인 (여기에 등록된 도메인만 API 사용 가능)
const ALLOWED_ORIGINS = [
  'https://yours-lovat.vercel.app',
  'https://yours-mall.vercel.app',
  'http://localhost:3000',
  'http://localhost:3030',
];

// 스타일 매핑 (서버에만 존재 — 클라이언트에서 볼 수 없음)
const STYLE_MAP = {
  studio: 'in a clean white photography studio with soft, even lighting',
  street: 'on an urban street during golden hour with natural bokeh background',
  editorial: 'in a high-fashion editorial setting with dramatic cinematic lighting',
  minimal: 'in a minimalist setting with soft neutral tones and gentle light',
  outdoor: 'in a beautiful outdoor setting with warm golden sunlight',
};

const LIGHT_MAP = {
  front: 'with soft front lighting at 45 degrees',
  side: 'with dramatic side lighting emphasizing fabric texture',
  back: 'with ethereal backlighting creating a rim light effect',
  natural: 'with natural ambient window light',
};

module.exports = async function handler(req, res) {
  // CORS 체크: 등록된 도메인만 허용
  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

  // CORS 헤더 설정
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 도메인 체크
  if (!isAllowed) {
    console.warn(`[BLOCKED] Unauthorized origin: ${origin}`);
    return res.status(403).json({
      error: '등록되지 않은 도메인입니다.',
      origin: origin,
      timestamp: new Date().toISOString(),
    });
  }

  // 라이선스 키 체크 (선택적)
  const licenseKey = req.headers['x-license-key'];
  // TODO: 라이선스 키 검증 로직 추가 가능

  try {
    const {
      parts,          // 이미지 + 텍스트 라벨 배열
      clothingMode,   // 'separates' | 'onepiece'
      hasTop, hasBottom, hasDress,
      hasModel, hasPose, hasBg,
      shootingStyle,  // 'studio' | 'street' | etc.
      lightingDir,    // 'front' | 'side' | etc.
      imageRatio,     // '2:3' etc.
      imageResolution,// '1K' | '2K' | '4K'
    } = req.body;

    if (!parts || !Array.isArray(parts)) {
      return res.status(400).json({ error: 'Invalid request: parts required' });
    }

    // === 핵심 프롬프트 로직 (서버에만 존재) ===
    const styleDesc = STYLE_MAP[shootingStyle] || STYLE_MAP.studio;
    const lightDesc = LIGHT_MAP[lightingDir] || LIGHT_MAP.front;

    // 시스템 프롬프트 조립
    const systemPrompt = `Generate a photorealistic fashion lookbook photograph ${styleDesc} ${lightDesc}. The image should look like it was shot by a professional fashion photographer for a luxury brand catalog. Each reference image below serves exactly one purpose — clothing for the garment only, face for appearance only, pose for body position only, background for the scene only.\n\n`;

    // 지시문 조립
    let instructions = "\nCombine all elements into one seamless photograph where:";

    if (clothingMode === 'separates') {
      if (hasTop && hasBottom) {
        instructions += "\n- The model wears both garments exactly as shown — same fabric, color, texture, pattern, and all details preserved.";
      } else if (hasTop) {
        instructions += "\n- The model wears this top with a complementary neutral bottom.";
      } else if (hasBottom) {
        instructions += "\n- The model wears this bottom with a complementary neutral top.";
      }
    } else if (clothingMode === 'onepiece' && hasDress) {
      instructions += "\n- The model wears this outfit exactly as shown — same fabric, silhouette, and all details preserved.";
    }

    if (hasModel) {
      instructions += "\n- The model's face and body type match this reference exactly.";
    } else {
      instructions += "\n- A professional fashion model with natural beauty.";
    }

    if (hasPose) {
      instructions += "\n- The model holds this exact pose.";
    } else {
      instructions += "\n- The model stands in a natural, confident three-quarter pose.";
    }

    if (hasBg) {
      instructions += "\n- The background matches this scene.";
    }

    instructions += "\n\nThe clothing must drape naturally on the body with realistic folds and shadows. The final image should be indistinguishable from a real photograph.";

    // 최종 parts 배열 조립: 시스템 프롬프트 + 클라이언트 이미지 + 지시문
    const finalParts = [
      { text: systemPrompt },
      ...parts,
      { text: instructions },
    ];

    // API 호출 (키는 서버 환경변수에만 존재)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const generateConfig = {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        imageSize: imageResolution || '2K',
        aspectRatio: imageRatio || '2:3',
      },
      thinkingConfig: { thinkingLevel: 'HIGH' },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: finalParts },
      config: generateConfig,
    });

    // 결과 파싱
    let imageData = null;
    let imageMimeType = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        imageMimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (imageData) {
      return res.status(200).json({
        success: true,
        image: { data: imageData, mimeType: imageMimeType },
        origin: origin,
      });
    } else {
      return res.status(200).json({
        success: false,
        error: '이미지 생성에 실패했습니다.',
      });
    }

  } catch (error) {
    console.error('[API ERROR]', error.message);

    // 에러 분류 (한글 메시지 — 서버에서 처리)
    let userMessage = '일시적인 오류가 발생했습니다. 다시 시도해주세요.';
    const msg = error.message || '';
    if (msg.includes('UNAVAILABLE') || msg.includes('503') || msg.includes('high demand')) {
      userMessage = '현재 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.';
    } else if (msg.includes('Deadline expired') || msg.includes('timeout')) {
      userMessage = '이미지 생성 시간이 초과되었습니다. 다시 시도해주세요.';
    } else if (msg.includes('INVALID_ARGUMENT')) {
      userMessage = '요청 형식이 올바르지 않습니다. 다시 시도해주세요.';
    }

    return res.status(500).json({
      success: false,
      error: userMessage,
    });
  }
};
