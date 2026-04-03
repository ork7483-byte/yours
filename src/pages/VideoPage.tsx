import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { getApiKey } from '../lib/apiSettings';
import { Link, useNavigate } from 'react-router-dom';
import {
  Video, Image as ImageIcon, Upload, Play, Download,
  LogIn, Check, ChevronRight, X,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface GalleryImage {
  id: string;
  image_url: string;
  created_at: string;
}

const GALLERY_TAB = 'images';
const VIDEO_TAB = 'videos';

// ─────────────────────────────────────────────
// Toggle Switch sub-component
// ─────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-neutral-900' : 'bg-neutral-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function VideoPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Gallery
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryTab, setGalleryTab] = useState<'images' | 'videos'>(GALLERY_TAB as 'images');
  const [galleryPage, setGalleryPage] = useState(0);
  const GALLERY_PER_PAGE = 6;
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);

  // Image selection
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Video generation (Kie.ai)
  const [videoModel, setVideoModel] = useState('grok-imagine/image-to-video');
  const [videoWithSound, setVideoWithSound] = useState(false);
  const [grokMode, setGrokMode] = useState<'normal' | 'fun'>('normal');
  const [grokDuration, setGrokDuration] = useState('6');
  const [grokResolution, setGrokResolution] = useState<'480p' | '720p'>('720p');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [audioCategory, setAudioCategory] = useState('mute');
  const [audioSub, setAudioSub] = useState(', no audio, completely silent video');
  const [dialogueEnabled, setDialogueEnabled] = useState(false);
  const [dialogueText, setDialogueText] = useState('');
  const [dialogueLang, setDialogueLang] = useState<'ko' | 'zh' | 'en'>('ko');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoPollCount, setVideoPollCount] = useState(0);
  const [videoStatus, setVideoStatus] = useState('');

  // Load gallery on mount
  useEffect(() => {
    if (user) {
      setGalleryLoading(true);
      supabase
        .from('generated_images')
        .select('id, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          setGallery(data || []);
          setGalleryLoading(false);
        });
    }
  }, [user]);

  // ── helpers ──────────────────────────────────
  function toggleImageSelect(url: string) {
    setSelectedImages(prev =>
      prev.includes(url) ? [] : [url]
    );
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const url = ev.target?.result as string;
        setUploadedImages(prev => [...prev, url]);
        setSelectedImages(prev => prev.length < 5 ? [...prev, url] : prev);
      };
      reader.readAsDataURL(file);
    });
  }

  const allImages: GalleryImage[] = [
    ...uploadedImages.map((url, i) => ({ id: `upload-${i}`, image_url: url, created_at: '' })),
    ...gallery,
  ];

  const firstSelectedImage = selectedImages[0];

  // ── Video Generation (Kie.ai) ────────
  async function generateVideo() {
    if (!firstSelectedImage) { setVideoError('이미지를 먼저 선택해주세요.'); return; }
    setVideoError(null);
    setVideoResult(null);
    setVideoLoading(true);
    setVideoPollCount(0);
    setVideoStatus('요청 전송 중...');

    try {
      const key = await getApiKey('kie_api_key');
      if (!key) throw new Error('Kie.ai API 키가 설정되지 않았습니다. 관리자 대시보드에서 키를 입력해주세요.');

      const isGrok = videoModel === 'grok-imagine/image-to-video';
      const requestBody = isGrok
        ? {
            model: 'grok-imagine/image-to-video',
            input: {
              image_urls: [firstSelectedImage],
              prompt: (videoPrompt || 'natural fashion video with gentle movement') + (dialogueEnabled && dialogueText ? (() => {
                if (dialogueLang === 'ko') return `, the model speaks in Korean: "${dialogueText}"`;
                if (dialogueLang === 'zh') return `, the model speaks in Chinese. Translate the following Korean text to Chinese and have the model say it naturally: "${dialogueText}"`;
                return `, the model speaks in English. Translate the following Korean text to English and have the model say it naturally: "${dialogueText}"`;
              })() : ''),
              mode: grokMode,
              duration: grokDuration,
              resolution: grokResolution,
            },
          }
        : {
            model: videoModel,
            input: {
              prompt: videoPrompt || '자연스러운 영상',
              image_url: firstSelectedImage,
              duration: '5',
              ...(videoModel === 'kling-2.6/image-to-video' ? { sound: videoWithSound } : {}),
            },
          };

      console.log('[Kie.ai] request:', JSON.stringify(requestBody));
      const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      console.log('[Kie.ai] createTask response:', JSON.stringify(data));
      if (!res.ok || (data.code && data.code !== 200)) {
        throw new Error(data.message || data.msg || data.error || `Kie.ai API 오류 (${res.status})`);
      }
      const taskId: string = data.data?.taskId;
      if (!taskId) throw new Error('taskId를 받지 못했습니다.');

      setVideoStatus('AI가 영상을 구상하고 있습니다...');
      for (let i = 0; i < 20; i++) {
        setVideoPollCount(i + 1);
        if (i < 3) setVideoStatus('AI가 영상을 구상하고 있습니다...');
        else if (i < 6) setVideoStatus('프레임을 생성하고 있습니다...');
        else if (i < 10) setVideoStatus('영상을 렌더링하고 있습니다...');
        else setVideoStatus('마무리 작업 중...');
        await delay(15000);
        const poll = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!poll.ok) continue;
        const pData = await poll.json();
        console.log(`[Kie.ai] poll #${i+1}:`, JSON.stringify(pData));
        const state: string = pData.data?.state || pData.state || pData.data?.status || pData.status || '';

        if (state === 'success') {
          let videoUrl: string | null = null;
          try {
            const resultJson = pData.data?.resultJson || pData.resultJson;
            if (resultJson) {
              const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
              videoUrl = parsed?.resultUrls?.[0] || parsed?.result_urls?.[0] || null;
            }
            if (!videoUrl) videoUrl = pData.data?.video_url || pData.video_url || null;
          } catch (_) { /* ignore parse errors */ }
          if (!videoUrl) throw new Error('영상이 생성됐지만 URL을 파싱하지 못했습니다. 관리자에게 문의해주세요.');
          setVideoResult(videoUrl);
          setGeneratedVideos(prev => [videoUrl as string, ...prev]);
          // Supabase에 영상 저장
          if (user) {
            supabase.from('generated_images').insert({
              user_id: user.id,
              image_url: videoUrl,
              prompt_summary: `영상: ${videoPrompt || 'Grok Imagine'}`,
            }).then(() => {});
          }
          setVideoLoading(false);
          return;
        }
        if (state === 'fail' || state === 'failed' || state === 'error') {
          throw new Error(pData.data?.errorMessage || '영상 생성에 실패했습니다.');
        }
      }
      throw new Error('영상 생성 시간 초과 (5분). 다시 시도해주세요.');

    } catch (e: any) {
      setVideoError(e.message || '알 수 없는 오류가 발생했습니다.');
      setVideoLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Not logged in
  // ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center gap-4">
        <LogIn className="w-10 h-10 text-neutral-300" />
        <p className="text-[15px] font-semibold text-neutral-900">로그인이 필요합니다</p>
        <p className="text-[13px] text-neutral-500">AI 영상 제작 기능을 사용하려면 로그인해주세요.</p>
        <Link to="/" className="mt-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors no-underline">
          홈으로 이동
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Main layout
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans antialiased flex flex-col">

      {/* 상단바 */}
      <div className="bg-white border-b border-neutral-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-neutral-400 hover:text-neutral-900 transition-colors no-underline">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
          <Video className="w-4 h-4 text-neutral-400" />
          <h1 className="text-[15px] font-bold text-neutral-900">AI 영상 제작</h1>
        </div>
        <span className="text-[12px] text-neutral-400">{user.email}</span>
      </div>

      {/* Body: left + center + right */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel (320px) ── */}
        <div className="w-[420px] shrink-0 bg-white border-r border-neutral-100 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-5">

            {/* Image selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-neutral-900">이미지 선택</h2>
                <span className="text-[11px] text-neutral-400">{selectedImages.length}/5</span>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold text-neutral-600 border border-dashed border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-colors cursor-pointer mb-3"
              >
                <Upload className="w-3 h-3" /> 이미지 업로드
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

              {allImages.length === 0 ? (
                <p className="text-[12px] text-neutral-400 text-center py-6 bg-neutral-50 rounded-lg border border-neutral-100">
                  생성된 이미지가 없습니다
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 max-h-[260px] overflow-y-auto">
                  {allImages.map(img => {
                    const isSelected = selectedImages.includes(img.image_url);
                    return (
                      <div key={img.id} className="relative aspect-[4/5]">
                        <div
                          onClick={() => setPreviewUrl(img.image_url)}
                          className="w-full h-full rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-neutral-300 transition-all"
                        >
                          <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleImageSelect(img.image_url); }}
                          className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-neutral-900 border-neutral-900' : 'bg-white/80 border-neutral-300 hover:border-neutral-600'}`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        {isSelected && (
                          <div className="absolute inset-0 rounded-lg ring-2 ring-neutral-900 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-100" />

            {/* Model selection */}
            <div className="hidden">
              <label className="block text-[12px] font-bold text-neutral-900 mb-2">모델 선택</label>
              <div className="space-y-1.5">
                {[
                  { value: 'kling/v2-5-turbo-image-to-video-pro', label: 'Kling 2.5 Turbo', price: '500원', badge: '' },
                  { value: 'kling-2.6/image-to-video', label: 'Kling 2.6', price: '1,000원', badge: '' },
                  { value: 'grok-imagine/image-to-video', label: 'Grok Imagine', price: '~380원/5초', badge: '영상+오디오 올인원' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVideoModel(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all cursor-pointer ${videoModel === opt.value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}
                  >
                    <span>{opt.label}</span>
                    <div className="flex flex-col items-end">
                      <span className={`text-[11px] font-medium ${videoModel === opt.value ? 'text-amber-300' : 'text-amber-500'}`}>{opt.price}</span>
                      {opt.badge && <span className={`text-[9px] ${videoModel === opt.value ? 'text-emerald-300' : 'text-emerald-500'}`}>{opt.badge}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Grok settings — 숨김 (기본값 사용) */}
            {videoModel === 'grok-imagine/image-to-video' && false && (
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 font-medium w-10">길이</span>
                  <select value={grokDuration} onChange={e => setGrokDuration(e.target.value)} className="flex-1 px-2 py-1 text-[12px] bg-white border border-neutral-200 rounded-md cursor-pointer outline-none">
                    <option value="6">6초</option>
                    <option value="10">10초</option>
                    <option value="15">15초</option>
                    <option value="20">20초</option>
                    <option value="30">30초</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 font-medium w-10">해상도</span>
                  <select value={grokResolution} onChange={e => setGrokResolution(e.target.value as '480p' | '720p')} className="flex-1 px-2 py-1 text-[12px] bg-white border border-neutral-200 rounded-md cursor-pointer outline-none">
                    <option value="480p">480p</option>
                    <option value="720p">720p</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 font-medium w-10">모드</span>
                  <select value={grokMode} onChange={e => setGrokMode(e.target.value as 'normal' | 'fun')} className="flex-1 px-2 py-1 text-[12px] bg-white border border-neutral-200 rounded-md cursor-pointer outline-none">
                    <option value="normal">Normal</option>
                    <option value="fun">Fun</option>
                  </select>
                </div>
              </div>
            )}

            {/* Audio toggle (Kling 2.6 only) */}
            {videoModel === 'kling-2.6/image-to-video' && (
              <div className="flex items-center gap-3">
                <ToggleSwitch checked={videoWithSound} onChange={setVideoWithSound} />
                <span className="text-[12px] text-neutral-600">영상 오디오 포함</span>
                <span className="text-[11px] text-amber-500 font-medium">+300원</span>
              </div>
            )}

            {/* 프롬프트 — 숨김 (내부용, 오디오/대사에서 자동 빌드) */}
            <input type="hidden" value={videoPrompt} />

            {/* 오디오 스타일 — 2단 버튼 구조 */}
            {videoModel === 'grok-imagine/image-to-video' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-bold text-neutral-900 mb-2">오디오 스타일</label>
                  {/* 1차: 카테고리 */}
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {[
                      { id: 'mute', label: '🔇 무음' },
                      { id: 'calm', label: '🎵 차분한' },
                      { id: 'trendy', label: '🎧 트렌디' },
                      { id: 'realistic', label: '👠 현장감' },
                      { id: 'nature', label: '🌿 분위기' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setAudioCategory(cat.id);
                          if (cat.id === 'mute') {
                            setAudioSub(', no audio, completely silent video');
                            setVideoPrompt(', no audio, completely silent video');
                          }
                        }}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${audioCategory === cat.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {/* 2차: 세부 스타일 */}
                  {audioCategory !== 'mute' && (
                    <div className="flex gap-1.5 flex-wrap">
                      {({
                        calm: [
                          { label: '고급 브랜드', value: ', with elegant luxury brand commercial piano music' },
                          { label: '따뜻한 감성', value: ', with warm emotional acoustic background music' },
                          { label: '편안한 일상', value: ', with relaxed cozy everyday mood background music' },
                          { label: '몽환적인', value: ', with dreamy ethereal ambient background music' },
                          { label: '클래식 무드', value: ', with sophisticated classical inspired background music' },
                        ],
                        trendy: [
                          { label: '런웨이 패션', value: ', with trendy fashion runway electronic background music' },
                          { label: '힙한 스트릿', value: ', with cool urban street fashion hip-hop beat background music' },
                          { label: '세련된 모던', value: ', with sleek modern minimal electronic fashion music' },
                          { label: '활기찬 팝', value: ', with upbeat energetic pop fashion background music' },
                          { label: '레트로 감성', value: ', with retro vintage fashion music nostalgic vibe' },
                        ],
                        realistic: [
                          { label: '실내 스튜디오', value: ', with indoor studio ambiance, soft footsteps on floor' },
                          { label: '하이힐 워킹', value: ', with high heels clicking on marble floor sound effects' },
                          { label: '옷감 스치는 소리', value: ', with realistic fabric rustling and clothing movement sounds' },
                          { label: '악세서리 소리', value: ', with fashion accessories sounds, jewelry and bag clinking' },
                          { label: '야외 워킹', value: ', with outdoor walking footsteps on pavement, gentle wind' },
                        ],
                        nature: [
                          { label: '카페 분위기', value: ', with cozy cafe ambient sounds, coffee shop atmosphere' },
                          { label: '도시 거리', value: ', with city street ambient sounds, urban atmosphere' },
                          { label: '바닷가', value: ', with gentle ocean waves and sea breeze ambient sounds' },
                          { label: '비 오는 날', value: ', with soft rain and cozy indoor atmosphere sounds' },
                          { label: '숲속 산책', value: ', with forest walk ambient sounds, birds and gentle wind' },
                        ],
                      } as Record<string, { label: string; value: string }[]>)[audioCategory]?.map(sub => (
                        <button
                          key={sub.label}
                          type="button"
                          onClick={() => { setAudioSub(sub.value); setVideoPrompt(sub.value); }}
                          className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${audioSub === sub.value ? 'bg-neutral-700 text-white' : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:border-neutral-400'}`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 대사 입력 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ToggleSwitch checked={dialogueEnabled} onChange={(v) => { setDialogueEnabled(v); if (!v) setDialogueText(''); }} />
                    <label className="text-[12px] font-bold text-neutral-900">대사 입력</label>
                    <span className="text-[10px] text-amber-500 font-medium">립싱크 자동</span>
                  </div>
                  {dialogueEnabled && (
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-neutral-400 font-medium">대사 입력 (한글로 작성)</label>
                        <div className="flex gap-1">
                          {[
                            { value: 'ko' as const, label: '🇰🇷 한국어' },
                            { value: 'zh' as const, label: '🇨🇳 중국어' },
                            { value: 'en' as const, label: '🇺🇸 영어' },
                          ].map(lang => (
                            <button
                              key={lang.value}
                              type="button"
                              onClick={() => setDialogueLang(lang.value)}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${dialogueLang === lang.value ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-400'}`}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="예: 이번 시즌 신상품을 소개합니다"
                        value={dialogueText}
                        onChange={e => setDialogueText(e.target.value)}
                        className="w-full px-2.5 py-2 text-[12px] bg-white border border-neutral-200 rounded-md outline-none focus:border-neutral-400 transition-colors"
                      />
                      <p className="text-[9px] text-neutral-400">
                        {dialogueLang === 'ko' && '한국어로 대사를 말합니다 · 립싱크 자동'}
                        {dialogueLang === 'zh' && '한글로 입력하면 중국어로 변환하여 더빙합니다 · 립싱크 자동'}
                        {dialogueLang === 'en' && '한글로 입력하면 영어로 변환하여 더빙합니다 · 립싱크 자동'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected image preview */}
            {firstSelectedImage && (
              <div className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <img src={firstSelectedImage} alt="" className="w-10 h-10 object-cover rounded-md shrink-0" />
                <p className="text-[11px] text-neutral-500 leading-snug">이 이미지로 영상을 생성합니다</p>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={generateVideo}
              disabled={videoLoading || !firstSelectedImage}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-40"
            >
              {videoLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 생성 중…</>
              ) : (
                <><Play className="w-4 h-4" /> 영상 생성</>
              )}
            </button>

            {videoError && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{videoError}</p>}

          </div>
        </div>

        {/* ── Center: Video Preview ── */}
        <div className={`flex-1 flex flex-col items-center px-8 pb-8 overflow-y-auto ${videoLoading || videoResult ? 'justify-start pt-4' : 'justify-center'}`}>
          {videoLoading ? (
            /* Inline loading state — 큰 화면 */
            <div className="w-full max-w-lg flex flex-col items-center text-center bg-white rounded-2xl border border-neutral-100 shadow-sm p-10">
              {firstSelectedImage && (
                <div className="w-56 h-72 rounded-xl overflow-hidden shadow-lg mb-8 border border-neutral-100">
                  <img src={firstSelectedImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative mb-6">
                <div className="w-16 h-16 border-[3px] border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-5 h-5 text-neutral-400" />
                </div>
              </div>
              <p className="text-[17px] font-bold text-neutral-900 mb-2">{videoStatus}</p>
              <p className="text-[13px] text-neutral-400 mb-6">
                {videoPollCount > 0 ? `확인 중… (${videoPollCount}/20)` : '요청을 전송하고 있습니다'}
              </p>
              <div className="w-72 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 rounded-full transition-all duration-[15000ms] ease-linear"
                  style={{ width: `${Math.min(95, videoPollCount * 5)}%` }}
                />
              </div>
              <p className="text-[12px] text-neutral-400 mt-4">최대 5분 소요 · 페이지를 닫지 마세요</p>
            </div>
          ) : videoResult ? (
            /* Video result */
            <div className="w-full max-w-xl flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
                <video src={videoResult} controls autoPlay className="w-full" />
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={videoResult}
                  download={`video-${Date.now()}.mp4`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-semibold rounded-lg hover:bg-neutral-50 transition-colors no-underline"
                >
                  <Download className="w-4 h-4" /> 영상 저장
                </a>
                <Link
                  to={`/video/dub?videoUrl=${encodeURIComponent(videoResult)}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-[13px] font-semibold rounded-lg hover:bg-neutral-700 transition-colors no-underline"
                >
                  다음: 더빙 추가 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-neutral-300" />
              </div>
              <p className="text-[15px] font-semibold text-neutral-900 mb-1">영상 미리보기</p>
              <p className="text-[13px] text-neutral-400">왼쪽에서 이미지를 선택하고<br />영상 생성 버튼을 누르세요</p>
            </div>
          )}
        </div>

        {/* ── Right Panel: Gallery (280px, lg+) ── */}
        <div className="hidden lg:flex w-[420px] shrink-0 bg-white border-l border-neutral-100 flex-col">
          {/* Tab header */}
          <div className="px-4 pt-3 pb-0 border-b border-neutral-100">
            <div className="flex gap-1">
              {(['images', 'videos'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setGalleryTab(tab)}
                  className={`px-3 py-2 text-[12px] font-semibold transition-colors cursor-pointer border-b-2 ${galleryTab === tab ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                  {tab === 'images' ? '이미지' : '영상'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {galleryTab === 'images' ? (
              galleryLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
                </div>
              ) : allImages.length === 0 ? (
                <p className="text-[12px] text-neutral-400 text-center py-10">갤러리가 비어있습니다</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-1.5 flex-1">
                    {allImages.slice(galleryPage * GALLERY_PER_PAGE, (galleryPage + 1) * GALLERY_PER_PAGE).map(img => {
                      const isSelected = selectedImages.includes(img.image_url);
                      return (
                        <div key={img.id} className="relative aspect-[4/5]">
                          <button
                            type="button"
                            onClick={() => toggleImageSelect(img.image_url)}
                            className={`w-full h-full rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-neutral-900' : 'border-transparent hover:border-neutral-300'}`}
                          >
                            <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </button>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-neutral-900 rounded-full flex items-center justify-center pointer-events-none">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {Math.ceil(allImages.length / GALLERY_PER_PAGE) > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-2 border-t border-neutral-100 mt-2">
                      {Array.from({ length: Math.ceil(allImages.length / GALLERY_PER_PAGE) }).map((_, i) => (
                        <button key={i} onClick={() => setGalleryPage(i)} className={`w-6 h-6 rounded text-[10px] font-semibold transition-all cursor-pointer ${galleryPage === i ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-100'}`}>{i + 1}</button>
                      ))}
                    </div>
                  )}
                </>
              )
            ) : (
              generatedVideos.length === 0 ? (
                <p className="text-[12px] text-neutral-400 text-center py-10">생성된 영상이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {generatedVideos.map((url, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-neutral-100 aspect-[4/5]">
                      <video src={url} className="w-full" controls />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

      </div>

      {/* ── Image Preview Modal ── */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <motion.div
              key="modal-content"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <img src={previewUrl} alt="" className="w-full max-h-[70vh] object-contain" />
              <div className="flex items-center gap-2 p-4 border-t border-neutral-100">
                <button
                  onClick={() => { toggleImageSelect(previewUrl); setPreviewUrl(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${selectedImages.includes(previewUrl) ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                >
                  {selectedImages.includes(previewUrl) ? <><Check className="w-4 h-4" /> 선택됨</> : '선택하기'}
                </button>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
