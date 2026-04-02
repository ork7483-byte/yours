import { GoogleGenAI } from '@google/genai';

const ALLOWED_ORIGINS = [
  'https://yours-lovat.vercel.app',
  'https://yours-mall.vercel.app',
  'http://localhost:3000',
  'http://localhost:3030',
];

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

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

  if (isAllowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAllowed) {
    console.warn(`[BLOCKED] ${origin}`);
    return res.status(403).json({ error: '등록되지 않은 도메인입니다.', origin });
  }

  try {
    const {
      parts, clothingMode,
      hasTop, hasBottom, hasDress,
      hasModel, hasPose, hasBg,
      shootingStyle, lightingDir,
      imageRatio, imageResolution,
    } = req.body;

    if (!parts || !Array.isArray(parts)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const styleDesc = STYLE_MAP[shootingStyle] || STYLE_MAP.studio;
    const lightDesc = LIGHT_MAP[lightingDir] || LIGHT_MAP.front;

    const systemPrompt = `Generate a photorealistic fashion lookbook photograph ${styleDesc} ${lightDesc}. The image should look like it was shot by a professional fashion photographer for a luxury brand catalog. Each reference image below serves exactly one purpose — clothing for the garment only, face for appearance only, pose for body position only, background for the scene only.\n\n`;

    let instructions = "\nCombine all elements into one seamless photograph where:";
    if (clothingMode === 'separates') {
      if (hasTop && hasBottom) instructions += "\n- The model wears both garments exactly as shown.";
      else if (hasTop) instructions += "\n- The model wears this top with a complementary neutral bottom.";
      else if (hasBottom) instructions += "\n- The model wears this bottom with a complementary neutral top.";
    } else if (hasDress) {
      instructions += "\n- The model wears this outfit exactly as shown.";
    }
    instructions += hasModel ? "\n- The model's face and body type match this reference exactly." : "\n- A professional fashion model with natural beauty.";
    instructions += hasPose ? "\n- The model holds this exact pose." : "\n- The model stands in a natural, confident three-quarter pose.";
    if (hasBg) instructions += "\n- The background matches this scene.";
    instructions += "\n\nThe clothing must drape naturally on the body with realistic folds and shadows. The final image should be indistinguishable from a real photograph.";

    const finalParts = [{ text: systemPrompt }, ...parts, { text: instructions }];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'Server configuration error' });

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: finalParts },
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          imageSize: imageResolution || '2K',
          aspectRatio: imageRatio || '2:3',
        },
        thinkingConfig: { thinkingLevel: 'HIGH' },
      },
    });

    let imageData = null, imageMimeType = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        imageMimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (imageData) {
      return res.status(200).json({ success: true, image: { data: imageData, mimeType: imageMimeType } });
    }
    return res.status(200).json({ success: false, error: '이미지 생성에 실패했습니다.' });

  } catch (error) {
    const msg = error.message || '';
    let userMessage = '일시적인 오류가 발생했습니다. 다시 시도해주세요.';
    if (msg.includes('UNAVAILABLE') || msg.includes('503')) userMessage = '현재 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.';
    else if (msg.includes('Deadline expired')) userMessage = '이미지 생성 시간이 초과되었습니다. 다시 시도해주세요.';
    return res.status(500).json({ success: false, error: userMessage });
  }
}
