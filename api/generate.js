// Vercel Serverless: 프롬프트 생성 API
// 이미지 데이터는 받지 않음 (413 방지)
// 핵심 프롬프트 로직만 서버에서 생성하여 반환

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

// Supabase 로깅 (도메인 접근 기록)
async function logDomainAccess(origin, status, licenseKey) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    await fetch(`${supabaseUrl}/rest/v1/domain_access_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ origin, status, license_key: licenseKey || null }),
    });
  } catch {}
}

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  const licenseKey = req.headers['x-license-key'] || null;

  if (isAllowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 모든 접근 로깅 (허용/차단 모두)
  await logDomainAccess(origin, isAllowed ? 'allowed' : 'blocked', licenseKey);

  if (!isAllowed) {
    console.warn(`[BLOCKED] ${origin}`);
    return res.status(403).json({ error: '등록되지 않은 도메인입니다.', origin });
  }

  try {
    const {
      clothingMode, hasTop, hasBottom, hasDress,
      hasModel, hasPose, hasBg,
      shootingStyle, lightingDir,
      imageRatio, imageResolution,
    } = req.body;

    const styleDesc = STYLE_MAP[shootingStyle] || STYLE_MAP.studio;
    const lightDesc = LIGHT_MAP[lightingDir] || LIGHT_MAP.front;

    // 시스템 프롬프트 (핵심 로직 — 서버에만 존재)
    const systemPrompt = `Generate a photorealistic fashion lookbook photograph ${styleDesc} ${lightDesc}. The image should look like it was shot by a professional fashion photographer for a luxury brand catalog. Each reference image below serves exactly one purpose — clothing for the garment only, face for appearance only, pose for body position only, background for the scene only.\n\n`;

    // 지시문 조립 (핵심 로직 — 서버에만 존재)
    let instructions = "\nCombine all elements into one seamless photograph where:";
    if (clothingMode === 'separates') {
      if (hasTop && hasBottom) instructions += "\n- The model wears both garments exactly as shown — same fabric, color, texture, pattern, and all details preserved.";
      else if (hasTop) instructions += "\n- The model wears this top with a complementary neutral bottom.";
      else if (hasBottom) instructions += "\n- The model wears this bottom with a complementary neutral top.";
    } else if (hasDress) {
      instructions += "\n- The model wears this outfit exactly as shown — same fabric, silhouette, and all details preserved.";
    }
    instructions += hasModel ? "\n- The model's face and body type match this reference exactly." : "\n- A professional fashion model with natural beauty.";
    instructions += hasPose ? "\n- The model holds this exact pose." : "\n- The model stands in a natural, confident three-quarter pose.";
    if (hasBg) instructions += "\n- The background matches this scene.";
    instructions += "\n\nThe clothing must drape naturally on the body with realistic folds and shadows. The final image should be indistinguishable from a real photograph.";

    // API 키도 서버에서 전달
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'Server configuration error' });

    return res.status(200).json({
      success: true,
      systemPrompt,
      instructions,
      apiKey,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          imageSize: imageResolution || '2K',
          aspectRatio: imageRatio || '2:3',
        },
        thinkingConfig: { thinkingLevel: 'HIGH' },
      },
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
}
