import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { getApiKey } from '../lib/apiSettings';
import { Link } from 'react-router-dom';
import {
  Video, Music, Mic, Image as ImageIcon, Upload, Play, Download,
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

type VoiceProvider = 'elevenlabs' | 'google';
type MusicProvider = 'suno' | 'royalty';

const ROYALTY_BGM = [
  { id: 'bgm1', label: '잔잔한 피아노', url: '' },
  { id: 'bgm2', label: '경쾌한 팝', url: '' },
  { id: 'bgm3', label: '시네마틱 오케스트라', url: '' },
  { id: 'bgm4', label: '어쿠스틱 기타', url: '' },
  { id: 'bgm5', label: '로파이 힙합', url: '' },
];

const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (여성, 미국)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (남성, 미국)' },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte (여성, 영국)' },
];

const GOOGLE_TTS_VOICES = [
  { code: 'ko-KR', name: 'ko-KR-Neural2-A', label: '한국어 (여성)' },
  { code: 'ko-KR', name: 'ko-KR-Neural2-C', label: '한국어 (남성)' },
  { code: 'en-US', name: 'en-US-Neural2-A', label: '영어 (여성, 미국)' },
  { code: 'en-US', name: 'en-US-Neural2-D', label: '영어 (남성, 미국)' },
];

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

  // Step 1 — image selection
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1 — image preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Step 2 — video generation (Kie.ai)
  const [klingModel, setKlingModel] = useState('kling/v2-5-turbo-image-to-video-pro');
  const [videoWithSound, setVideoWithSound] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Step 3 — voice (optional)
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('elevenlabs');
  const [voiceText, setVoiceText] = useState('');
  const [elVoiceId, setElVoiceId] = useState(ELEVENLABS_VOICES[0].id);
  const [googleVoice, setGoogleVoice] = useState(GOOGLE_TTS_VOICES[0]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Step 4 — music (optional)
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicProvider, setMusicProvider] = useState<MusicProvider>('suno');
  const [sunoPrompt, setSunoPrompt] = useState('');
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicResult, setMusicResult] = useState<string | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [selectedBgm, setSelectedBgm] = useState<string | null>(null);

  // Load gallery on mount
  useEffect(() => {
    if (user) {
      supabase
        .from('generated_images')
        .select('id, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => setGallery(data || []));
    }
  }, [user]);

  // ── helpers ──────────────────────────────────
  function toggleImageSelect(url: string) {
    setSelectedImages(prev =>
      prev.includes(url)
        ? prev.filter(u => u !== url)
        : prev.length < 5
          ? [...prev, url]
          : prev,
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

  // ── Step 2: Video Generation (Kie.ai) ────────
  async function generateVideo() {
    if (!firstSelectedImage) { setVideoError('이미지를 먼저 선택해주세요.'); return; }
    setVideoError(null);
    setVideoResult(null);
    setVideoLoading(true);

    try {
      const key = await getApiKey('kie_api_key');
      if (!key) throw new Error('Kie.ai API 키가 설정되지 않았습니다. 관리자 대시보드에서 키를 입력해주세요.');

      // POST — create task
      const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: klingModel,
          input: {
            prompt: videoPrompt || '자연스러운 영상',
            image_urls: [firstSelectedImage],
            sound: videoWithSound,
            duration: '5',
          },
        }),
      });
      const data = await res.json();
      console.log('[Kie.ai] createTask response:', JSON.stringify(data));
      if (!res.ok || (data.code && data.code !== 200)) {
        throw new Error(data.message || data.msg || data.error || `Kie.ai API 오류 (${res.status})`);
      }
      const taskId: string = data.data?.taskId;
      if (!taskId) throw new Error('taskId를 받지 못했습니다.');

      // Poll every 15 seconds, up to 20 attempts (5 minutes)
      for (let i = 0; i < 20; i++) {
        await delay(15000);
        const poll = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!poll.ok) continue;
        const pData = await poll.json();
        const status: string = pData.data?.status || pData.status || '';

        if (status === 'success') {
          let videoUrl: string | null = null;
          try {
            const resultJson = pData.data?.resultJson;
            if (resultJson) {
              const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
              videoUrl = parsed?.resultUrls?.[0] || null;
            }
          } catch (_) { /* ignore parse errors */ }
          if (!videoUrl) throw new Error('영상 URL을 받지 못했습니다.');
          setVideoResult(videoUrl);
          setVideoLoading(false);
          return;
        }
        if (status === 'fail') {
          throw new Error(pData.data?.errorMessage || '영상 생성에 실패했습니다.');
        }
        // waiting | queuing | generating — keep polling
      }
      throw new Error('영상 생성 시간 초과 (5분). 다시 시도해주세요.');

    } catch (e: any) {
      setVideoError(e.message || '알 수 없는 오류가 발생했습니다.');
      setVideoLoading(false);
    }
  }

  // ── Step 3: Voice ─────────────────────────────
  async function generateVoice() {
    if (!voiceText.trim()) { setVoiceError('텍스트를 입력해주세요.'); return; }
    setVoiceError(null);
    setVoiceResult(null);
    setVoiceLoading(true);

    try {
      if (voiceProvider === 'elevenlabs') {
        const key = await getApiKey('elevenlabs_key');
        if (!key) throw new Error('ElevenLabs API 키가 설정되지 않았습니다. 관리자 대시보드에서 키를 입력해주세요.');

        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
          body: JSON.stringify({
            text: voiceText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail?.message || `ElevenLabs 오류 (${res.status})`);
        }
        const blob = await res.blob();
        setVoiceResult(URL.createObjectURL(blob));

      } else {
        // Google Cloud TTS
        const key = await getApiKey('google_tts_key');
        if (!key) throw new Error('Google Cloud TTS API 키가 설정되지 않았습니다. 관리자 대시보드에서 키를 입력해주세요.');

        const res = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: voiceText },
              voice: { languageCode: googleVoice.code, name: googleVoice.name },
              audioConfig: { audioEncoding: 'MP3' },
            }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Google TTS 오류 (${res.status})`);
        }
        const data = await res.json();
        const audioBytes = atob(data.audioContent);
        const buffer = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) buffer[i] = audioBytes.charCodeAt(i);
        const blob = new Blob([buffer], { type: 'audio/mp3' });
        setVoiceResult(URL.createObjectURL(blob));
      }
    } catch (e: any) {
      setVoiceError(e.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setVoiceLoading(false);
    }
  }

  // ── Step 4: Music ─────────────────────────────
  async function generateMusic() {
    if (!sunoPrompt.trim()) { setMusicError('음악 설명을 입력해주세요.'); return; }
    setMusicError(null);
    setMusicResult(null);
    setMusicLoading(true);

    try {
      const key = await getApiKey('suno_key');
      if (!key) throw new Error('Suno API 키가 설정되지 않았습니다. 관리자 대시보드에서 키를 입력해주세요.');

      const res = await fetch('https://api.sunoapi.org/v1/audios/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ prompt: sunoPrompt, duration: 30 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Suno API 오류 (${res.status})`);
      }
      const data = await res.json();
      const taskId: string = data.id || data.task_id;
      if (!taskId) throw new Error('task_id를 받지 못했습니다.');

      for (let i = 0; i < 24; i++) {
        await delay(10000);
        const poll = await fetch(`https://api.sunoapi.org/v1/audios/generations/${taskId}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!poll.ok) continue;
        const pData = await poll.json();
        const status = pData.status;
        if (status === 'completed' || status === 'success') {
          const audioUrl = pData.audio_url || pData.url;
          if (!audioUrl) throw new Error('음악 URL을 받지 못했습니다.');
          setMusicResult(audioUrl);
          setMusicLoading(false);
          return;
        }
        if (status === 'failed' || status === 'error') throw new Error('음악 생성에 실패했습니다.');
      }
      throw new Error('음악 생성 시간 초과 (4분). 다시 시도해주세요.');
    } catch (e: any) {
      setMusicError(e.message || '알 수 없는 오류가 발생했습니다.');
      setMusicLoading(false);
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
    <div className="min-h-screen bg-[#FAFAF9] font-sans antialiased">
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

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── STEP 1: 이미지 선택 ── */}
        <Section icon={<ImageIcon className="w-4 h-4 text-blue-500" />} title="Step 1 — 이미지 선택" subtitle={`최대 5개 선택 (현재 ${selectedImages.length}개)`}>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" /> 이미지 업로드
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
            {selectedImages.length > 0 && (
              <span className="text-[11px] text-neutral-400">{selectedImages.length}개 선택됨</span>
            )}
          </div>

          {allImages.length === 0 ? (
            <p className="text-[13px] text-neutral-400 text-center py-8">
              생성된 이미지가 없습니다. 먼저 이미지를 생성하거나 업로드해주세요.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {allImages.map(img => {
                const isSelected = selectedImages.includes(img.image_url);
                return (
                  <div key={img.id} className="relative aspect-square">
                    {/* click to open preview modal */}
                    <div
                      onClick={() => setPreviewUrl(img.image_url)}
                      className="w-full h-full rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-neutral-300 transition-all"
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    {/* select overlay (bottom-right checkbox) */}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggleImageSelect(img.image_url); }}
                      className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-neutral-900 border-neutral-900' : 'bg-white/80 border-neutral-300 hover:border-neutral-600'}`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                    {isSelected && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-neutral-900 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── STEP 2: 영상 생성 (Kie.ai) ── */}
        <Section icon={<Video className="w-4 h-4 text-violet-500" />} title="Step 2 — AI 영상 생성">
          <div className="space-y-3">
            {/* Model selector */}
            <div>
              <label className="block text-[12px] font-medium text-neutral-600 mb-2">모델 선택</label>
              <div className="flex gap-2">
                {[
                  { value: 'kling/v2-5-turbo-image-to-video-pro', label: 'Kling 2.5 Turbo', price: '500원' },
                  { value: 'kling-2.6/image-to-video', label: 'Kling 2.6', price: '1,000원' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKlingModel(opt.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[12px] font-semibold transition-all cursor-pointer ${klingModel === opt.value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}
                  >
                    {opt.label}
                    <span className={`text-[11px] font-medium ${klingModel === opt.value ? 'text-amber-300' : 'text-amber-500'}`}>{opt.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-neutral-600 mb-1">영상 프롬프트 (선택)</label>
              <input
                type="text"
                placeholder="예: 옷이 자연스럽게 흔들리는 영상"
                value={videoPrompt}
                onChange={e => setVideoPrompt(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 focus:bg-white transition-colors"
              />
            </div>

            {/* 오디오 토글 */}
            <div className="flex items-center gap-3">
              <ToggleSwitch checked={videoWithSound} onChange={setVideoWithSound} />
              <span className="text-[13px] text-neutral-600">영상 오디오 포함</span>
              <span className="text-[11px] text-amber-500 font-medium">+300원</span>
            </div>

            {firstSelectedImage && (
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                <img src={firstSelectedImage} alt="" className="w-12 h-12 object-cover rounded-md" />
                <p className="text-[12px] text-neutral-500">이 이미지로 영상을 생성합니다</p>
              </div>
            )}

            <button
              onClick={generateVideo}
              disabled={videoLoading || !firstSelectedImage}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-40"
            >
              {videoLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 영상 생성 중… (최대 5분)</>
              ) : (
                <><Play className="w-4 h-4" /> 영상 생성</>
              )}
            </button>

            {videoError && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{videoError}</p>}

            {videoResult && (
              <div className="space-y-2">
                <video src={videoResult} controls className="w-full max-w-md rounded-xl border border-neutral-100" />
                <a href={videoResult} download={`video-${Date.now()}.mp4`} className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline">
                  <Download className="w-3 h-3" /> 영상 저장
                </a>
              </div>
            )}
          </div>
        </Section>

        {/* ── STEP 3: AI 성우 (선택) ── */}
        <Section icon={<Mic className="w-4 h-4 text-emerald-500" />} title="Step 3 — AI 성우 (음성 생성)">
          {/* 활성화 토글 */}
          <div className="flex items-center gap-3 mb-4">
            <ToggleSwitch checked={voiceEnabled} onChange={setVoiceEnabled} />
            <span className="text-[13px] text-neutral-600">AI 성우 사용</span>
            <span className="text-[11px] text-amber-500 font-medium">+500원</span>
          </div>

          {!voiceEnabled ? (
            <div className="opacity-50 pointer-events-none">
              <p className="text-[12px] text-neutral-400 bg-neutral-50 border border-neutral-100 rounded-lg px-4 py-3">
                AI 성우를 켜면 ElevenLabs 또는 Google Cloud TTS로 음성을 생성할 수 있습니다.
              </p>
            </div>
          ) : (
            <>
              <TabBar
                options={[
                  { value: 'elevenlabs', label: 'ElevenLabs' },
                  { value: 'google', label: 'Google Cloud TTS' },
                ]}
                value={voiceProvider}
                onChange={v => setVoiceProvider(v as VoiceProvider)}
              />

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-neutral-600 mb-1">읽을 텍스트</label>
                  <textarea
                    rows={3}
                    placeholder="음성으로 변환할 텍스트를 입력하세요"
                    value={voiceText}
                    onChange={e => setVoiceText(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 focus:bg-white transition-colors resize-none"
                  />
                </div>

                {voiceProvider === 'elevenlabs' ? (
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-600 mb-1">음성 선택</label>
                    <select
                      value={elVoiceId}
                      onChange={e => setElVoiceId(e.target.value)}
                      className="px-3 py-2 text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 cursor-pointer"
                    >
                      {ELEVENLABS_VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-600 mb-1">언어/음성 선택</label>
                    <select
                      value={googleVoice.name}
                      onChange={e => setGoogleVoice(GOOGLE_TTS_VOICES.find(v => v.name === e.target.value) || GOOGLE_TTS_VOICES[0])}
                      className="px-3 py-2 text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 cursor-pointer"
                    >
                      {GOOGLE_TTS_VOICES.map(v => (
                        <option key={v.name} value={v.name}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={generateVoice}
                  disabled={voiceLoading || !voiceText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {voiceLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 생성 중…</>
                  ) : (
                    <><Mic className="w-4 h-4" /> 음성 생성</>
                  )}
                </button>

                {voiceError && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{voiceError}</p>}

                {voiceResult && (
                  <div className="space-y-2">
                    <audio src={voiceResult} controls className="w-full max-w-md" />
                    <a href={voiceResult} download={`voice-${Date.now()}.mp3`} className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline">
                      <Download className="w-3 h-3" /> 음성 저장
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </Section>

        {/* ── STEP 4: 배경음악 (선택) ── */}
        <Section icon={<Music className="w-4 h-4 text-amber-500" />} title="Step 4 — 배경음악 (BGM)">
          {/* 활성화 토글 */}
          <div className="flex items-center gap-3 mb-4">
            <ToggleSwitch checked={musicEnabled} onChange={setMusicEnabled} />
            <span className="text-[13px] text-neutral-600">배경음악 사용</span>
            <span className="text-[11px] text-amber-500 font-medium">+500원</span>
          </div>

          {!musicEnabled ? (
            <div className="opacity-50 pointer-events-none">
              <p className="text-[12px] text-neutral-400 bg-neutral-50 border border-neutral-100 rounded-lg px-4 py-3">
                배경음악을 켜면 Suno AI로 음악을 생성하거나 로열티프리 BGM을 선택할 수 있습니다.
              </p>
            </div>
          ) : (
            <>
              <TabBar
                options={[
                  { value: 'suno', label: 'Suno AI (생성)' },
                  { value: 'royalty', label: '로열티프리 BGM' },
                ]}
                value={musicProvider}
                onChange={v => setMusicProvider(v as MusicProvider)}
              />

              <div className="mt-4 space-y-3">
                {musicProvider === 'suno' ? (
                  <>
                    <div>
                      <label className="block text-[12px] font-medium text-neutral-600 mb-1">음악 설명 / 장르</label>
                      <input
                        type="text"
                        placeholder="예: upbeat fashion music, cinematic, 30 seconds"
                        value={sunoPrompt}
                        onChange={e => setSunoPrompt(e.target.value)}
                        className="w-full px-3 py-2 text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 focus:bg-white transition-colors"
                      />
                    </div>

                    <button
                      onClick={generateMusic}
                      disabled={musicLoading || !sunoPrompt.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {musicLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 생성 중…</>
                      ) : (
                        <><Music className="w-4 h-4" /> 음악 생성</>
                      )}
                    </button>

                    {musicError && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{musicError}</p>}

                    {musicResult && (
                      <div className="space-y-2">
                        <audio src={musicResult} controls className="w-full max-w-md" />
                        <a href={musicResult} download={`music-${Date.now()}.mp3`} className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline">
                          <Download className="w-3 h-3" /> 음악 저장
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    {ROYALTY_BGM.map(bgm => (
                      <div
                        key={bgm.id}
                        onClick={() => setSelectedBgm(bgm.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${selectedBgm === bgm.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-neutral-300 bg-white'}`}
                      >
                        {selectedBgm === bgm.id
                          ? <Check className="w-4 h-4 text-neutral-900" />
                          : <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />}
                        <span className="text-[13px] font-medium text-neutral-700">{bgm.label}</span>
                        {bgm.url && <audio src={bgm.url} controls className="ml-auto h-7" />}
                        {!bgm.url && <span className="ml-auto text-[11px] text-neutral-400">파일 준비 중</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Section>

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

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function Section({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-[15px] font-bold text-neutral-900">{title}</h2>
        {subtitle && <span className="text-[11px] text-neutral-400 ml-1">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function TabBar({
  options, value, onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 bg-neutral-100 p-1 rounded-xl w-fit">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${value === o.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
