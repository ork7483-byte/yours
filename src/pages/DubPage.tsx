import React, { useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { getApiKey } from '../lib/apiSettings';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Mic, LogIn, ChevronRight, Download, Play,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
type VoiceProvider = 'elevenlabs' | 'google';

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
export default function DubPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const videoUrl = searchParams.get('videoUrl') || '';

  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('elevenlabs');
  const [voiceText, setVoiceText] = useState('');
  const [elVoiceId, setElVoiceId] = useState(ELEVENLABS_VOICES[0].id);
  const [googleVoice, setGoogleVoice] = useState(GOOGLE_TTS_VOICES[0]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Generate Voice
  // ─────────────────────────────────────────────
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
          throw new Error((err as any).detail?.message || `ElevenLabs 오류 (${res.status})`);
        }
        const blob = await res.blob();
        setVoiceResult(URL.createObjectURL(blob));

      } else {
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
          throw new Error((err as any).error?.message || `Google TTS 오류 (${res.status})`);
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
        <p className="text-[13px] text-neutral-500">AI 더빙 기능을 사용하려면 로그인해주세요.</p>
        <Link to="/" className="mt-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors no-underline">
          홈으로 이동
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Main layout
  // ─────────────────────────────────────────────
  const nextParams = new URLSearchParams();
  if (videoUrl) nextParams.set('videoUrl', videoUrl);
  if (voiceResult) nextParams.set('voiceUrl', voiceResult);

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans antialiased flex flex-col">

      {/* Top bar */}
      <div className="bg-white border-b border-neutral-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link to="/video" className="text-neutral-400 hover:text-neutral-900 transition-colors no-underline">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
          <Mic className="w-4 h-4 text-neutral-400" />
          <h1 className="text-[15px] font-bold text-neutral-900">AI 더빙</h1>
        </div>
        <span className="text-[12px] text-neutral-400">{user.email}</span>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Video preview */}
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
          {videoUrl ? (
            <video src={videoUrl} controls className="w-full" />
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

        {/* Dubbing controls */}
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5 space-y-4">
          <h2 className="text-[15px] font-bold text-neutral-900">더빙 생성</h2>

          <TabBar
            options={[
              { value: 'elevenlabs', label: 'ElevenLabs' },
              { value: 'google', label: 'Google Cloud TTS' },
            ]}
            value={voiceProvider}
            onChange={v => setVoiceProvider(v as VoiceProvider)}
          />

          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium text-neutral-600 mb-1">더빙 스크립트</label>
              <textarea
                rows={4}
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
                  className="w-full px-3 py-2 text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 cursor-pointer"
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
                  className="w-full px-3 py-2 text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 cursor-pointer"
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
                <><Mic className="w-4 h-4" /> 더빙 생성</>
              )}
            </button>

            {voiceError && (
              <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{voiceError}</p>
            )}

            {voiceResult && (
              <div className="space-y-2 pt-1">
                <audio src={voiceResult} controls className="w-full" />
                <a
                  href={voiceResult}
                  download={`voice-${Date.now()}.mp3`}
                  className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline"
                >
                  <Download className="w-3 h-3" /> 음성 저장
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Next step */}
        <div className="flex justify-end">
          <Link
            to={`/video/music?${nextParams.toString()}`}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors no-underline"
          >
            다음: BGM 추가 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
