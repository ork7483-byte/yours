import React from 'react';
import { useAuth } from '../lib/useAuth';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Download, LogIn, ChevronRight, Video, Mic, Music, Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ExportPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const videoUrl = searchParams.get('videoUrl') || '';
  const voiceUrl = searchParams.get('voiceUrl') || '';
  const musicUrl = searchParams.get('musicUrl') || '';

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
        <p className="text-[13px] text-neutral-500">최종 합성 기능을 사용하려면 로그인해주세요.</p>
        <Link to="/" className="mt-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl hover:bg-neutral-700 transition-colors no-underline">
          홈으로 이동
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Build back link
  // ─────────────────────────────────────────────
  const backParams = new URLSearchParams();
  if (videoUrl) backParams.set('videoUrl', videoUrl);
  if (voiceUrl) backParams.set('voiceUrl', voiceUrl);

  // ─────────────────────────────────────────────
  // Main layout
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans antialiased flex flex-col">

      {/* Top bar */}
      <div className="bg-white border-b border-neutral-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            to={`/video/music?${backParams.toString()}`}
            className="text-neutral-400 hover:text-neutral-900 transition-colors no-underline"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
          <Sparkles className="w-4 h-4 text-neutral-400" />
          <h1 className="text-[15px] font-bold text-neutral-900">최종 합성</h1>
        </div>
        <span className="text-[12px] text-neutral-400">{user.email}</span>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Preview section */}
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5 space-y-4">
          <h2 className="text-[15px] font-bold text-neutral-900">소스 파일 미리보기</h2>

          {/* Video */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-violet-500" />
              <span className="text-[13px] font-semibold text-neutral-700">영상</span>
            </div>
            {videoUrl ? (
              <div className="rounded-xl overflow-hidden border border-neutral-100">
                <video src={videoUrl} controls className="w-full" />
              </div>
            ) : (
              <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3">
                <p className="text-[12px] text-neutral-400">영상이 없습니다.</p>
              </div>
            )}
            {videoUrl && (
              <a
                href={videoUrl}
                download={`video-${Date.now()}.mp4`}
                className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline"
              >
                <Download className="w-3 h-3" /> 영상 다운로드
              </a>
            )}
          </div>

          {/* Voice */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-500" />
              <span className="text-[13px] font-semibold text-neutral-700">더빙 음성</span>
            </div>
            {voiceUrl ? (
              <audio src={voiceUrl} controls className="w-full" />
            ) : (
              <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3">
                <p className="text-[12px] text-neutral-400">더빙 음성이 없습니다.</p>
              </div>
            )}
            {voiceUrl && (
              <a
                href={voiceUrl}
                download={`voice-${Date.now()}.mp3`}
                className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline"
              >
                <Download className="w-3 h-3" /> 음성 다운로드
              </a>
            )}
          </div>

          {/* Music */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-500" />
              <span className="text-[13px] font-semibold text-neutral-700">배경음악</span>
            </div>
            {musicUrl ? (
              <audio src={musicUrl} controls className="w-full" />
            ) : (
              <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3">
                <p className="text-[12px] text-neutral-400">배경음악이 없습니다.</p>
              </div>
            )}
            {musicUrl && (
              <a
                href={musicUrl}
                download={`music-${Date.now()}.mp3`}
                className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 no-underline"
              >
                <Download className="w-3 h-3" /> BGM 다운로드
              </a>
            )}
          </div>
        </div>

        {/* Export section */}
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5 space-y-4">
          <h2 className="text-[15px] font-bold text-neutral-900">합성하기</h2>

          {/* Coming soon notice */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-amber-800 mb-1">준비 중입니다</p>
              <p className="text-[12px] text-amber-700 leading-relaxed">
                영상 + 더빙 + BGM을 하나로 합성하는 기능은 현재 개발 중입니다.
                fal.ai 연동이 완료되면 사용할 수 있습니다.
              </p>
            </div>
          </div>

          <button
            disabled
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl opacity-40 cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" /> 합성하기 (준비 중)
          </button>
        </div>

      </div>
    </div>
  );
}
