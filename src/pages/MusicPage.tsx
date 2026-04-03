import React, { useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { getApiKey } from '../lib/apiSettings';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Music, LogIn, ChevronRight, Download, Play, Check,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
type MusicProvider = 'suno' | 'royalty';

// 패션 모델컷 영상에 최적화된 BGM 무드 프리셋
const FASHION_MOODS = [
  { id: 'runway', emoji: '🖤', label: '런웨이', desc: '세련된 하이패션', prompt: 'sleek minimal electronic runway music, fashion show beat, modern and sophisticated, 120bpm, 30 seconds' },
  { id: 'elegant', emoji: '✨', label: '엘레강스', desc: '고급스러운 무드', prompt: 'elegant orchestral fashion film music, luxury brand commercial, graceful strings and piano, cinematic, 30 seconds' },
  { id: 'street', emoji: '🔥', label: '스트릿', desc: '힙하고 트렌디', prompt: 'trendy street fashion music, hip-hop influenced beat, urban cool vibe, confident swagger, 30 seconds' },
  { id: 'romantic', emoji: '🌸', label: '로맨틱', desc: '부드럽고 여성스러운', prompt: 'soft romantic fashion music, gentle piano and strings, feminine and dreamy, lookbook mood, 30 seconds' },
  { id: 'minimal', emoji: '🤍', label: '미니멀', desc: '깔끔하고 모던', prompt: 'minimal ambient fashion music, clean modern sound, soft electronic textures, quiet confidence, 30 seconds' },
  { id: 'energetic', emoji: '⚡', label: '에너제틱', desc: '활기차고 역동적', prompt: 'upbeat energetic fashion music, dynamic pop beat, youthful and vibrant, summer lookbook vibe, 30 seconds' },
  { id: 'cinematic', emoji: '🎬', label: '시네마틱', desc: '영화 같은 무드', prompt: 'cinematic fashion film score, dramatic and emotional, epic brand campaign music, inspiring, 30 seconds' },
  { id: 'chill', emoji: '☕', label: '칠 바이브', desc: '편안하고 자연스러운', prompt: 'chill lofi fashion music, relaxed acoustic vibes, warm and cozy lookbook mood, laid-back groove, 30 seconds' },
  { id: 'night', emoji: '🌙', label: '나이트', desc: '어둡고 미스테리한', prompt: 'dark moody fashion music, nighttime urban atmosphere, mysterious and seductive, deep bass, 30 seconds' },
  { id: 'resort', emoji: '🌊', label: '리조트', desc: '휴양지 느낌', prompt: 'breezy resort fashion music, tropical chill vibes, summer vacation mood, light and airy, 30 seconds' },
];

const ROYALTY_BGM = [
  { id: 'bgm1', label: '잔잔한 피아노', url: '' },
  { id: 'bgm2', label: '경쾌한 팝', url: '' },
  { id: 'bgm3', label: '시네마틱 오케스트라', url: '' },
  { id: 'bgm4', label: '어쿠스틱 기타', url: '' },
  { id: 'bgm5', label: '로파이 힙합', url: '' },
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// TabBar
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function MusicPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const videoUrl = searchParams.get('videoUrl') || '';
  const voiceUrl = searchParams.get('voiceUrl') || '';

  const [musicProvider, setMusicProvider] = useState<MusicProvider>('suno');
  const [sunoPrompt, setSunoPrompt] = useState('');
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicResult, setMusicResult] = useState<string | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [selectedBgm, setSelectedBgm] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Generate Music
  // ─────────────────────────────────────────────
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
        throw new Error((err as any).message || `Suno API 오류 (${res.status})`);
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
  // Auth guards
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center gap-4">
        <LogIn className="w-10 h-10 text-neutral-300" />
        <p className="text-[15px] font-semibold text-neutral-900">로그인이 필요합니다</p>
        <p className="text-[13px] text-neutral-500">배경음악 기능을 사용하려면 로그인해주세요.</p>
        <Link to="/" className="mt-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors no-underline">
          홈으로 이동
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Build next link params
  // ─────────────────────────────────────────────
  const nextParams = new URLSearchParams();
  if (videoUrl) nextParams.set('videoUrl', videoUrl);
  if (voiceUrl) nextParams.set('voiceUrl', voiceUrl);
  const finalMusicUrl = musicProvider === 'suno' ? musicResult : (selectedBgm ? ROYALTY_BGM.find(b => b.id === selectedBgm)?.url || '' : '');
  if (finalMusicUrl) nextParams.set('musicUrl', finalMusicUrl);

  // ─────────────────────────────────────────────
  // Main layout
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans antialiased flex flex-col">

      {/* Top bar */}
      <div className="bg-white border-b border-neutral-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            to={`/video/dub?${new URLSearchParams(videoUrl ? { videoUrl } : {}).toString()}`}
            className="text-neutral-400 hover:text-neutral-900 transition-colors no-underline"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
          <Music className="w-4 h-4 text-neutral-400" />
          <h1 className="text-[15px] font-bold text-neutral-900">배경음악</h1>
        </div>
        <span className="text-[12px] text-neutral-400">{user.email}</span>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Video preview */}
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
          {videoUrl ? (
            <video src={videoUrl} controls muted className="w-full" />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-300">
              <Play className="w-10 h-10 mb-3" />
              <p className="text-[13px]">영상이 없습니다. 먼저 영상을 생성해주세요.</p>
              <Link to="/video" className="mt-3 text-[13px] text-neutral-600 underline">
                영상 생성으로 이동
              </Link>
            </div>
          )}
        </div>

        {/* Music controls */}
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5 space-y-4">
          <h2 className="text-[15px] font-bold text-neutral-900">배경음악 선택</h2>

          <TabBar
            options={[
              { value: 'suno', label: 'Suno AI (생성)' },
              { value: 'royalty', label: '로열티프리 BGM' },
            ]}
            value={musicProvider}
            onChange={v => setMusicProvider(v as MusicProvider)}
          />

          <div className="space-y-3">
            {musicProvider === 'suno' ? (
              <>
                {/* 무드 카드 선택 */}
                <div>
                  <label className="block text-[12px] font-medium text-neutral-600 mb-2">무드 선택</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {FASHION_MOODS.map(mood => (
                      <button
                        key={mood.id}
                        type="button"
                        onClick={() => setSunoPrompt(mood.prompt)}
                        className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer ${sunoPrompt === mood.prompt ? 'border-neutral-900 bg-neutral-900 text-white shadow-md' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:shadow-sm'}`}
                      >
                        <span className="text-xl mb-1">{mood.emoji}</span>
                        <span className="text-[12px] font-bold">{mood.label}</span>
                        <span className={`text-[10px] mt-0.5 ${sunoPrompt === mood.prompt ? 'text-neutral-300' : 'text-neutral-400'}`}>{mood.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 선택된 무드 표시 + 커스텀 수정 */}
                {sunoPrompt && (
                  <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                    <label className="block text-[10px] text-neutral-400 mb-1 font-medium">선택된 프롬프트 (수정 가능)</label>
                    <input
                      type="text"
                      value={sunoPrompt}
                      onChange={e => setSunoPrompt(e.target.value)}
                      className="w-full px-2 py-1.5 text-[12px] bg-white border border-neutral-200 rounded-md outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                )}

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

                {musicError && (
                  <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{musicError}</p>
                )}

                {musicResult && (
                  <div className="space-y-2 pt-1">
                    <audio src={musicResult} controls className="w-full" />
                    <a
                      href={musicResult}
                      download={`music-${Date.now()}.mp3`}
                      className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline"
                    >
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
                    {bgm.url ? (
                      <audio src={bgm.url} controls className="ml-auto h-7" onClick={e => e.stopPropagation()} />
                    ) : (
                      <span className="ml-auto text-[11px] text-neutral-400">파일 준비 중</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Next step */}
        <div className="flex justify-end">
          <Link
            to={`/video/export?${nextParams.toString()}`}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors no-underline"
          >
            다음: 합성 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
