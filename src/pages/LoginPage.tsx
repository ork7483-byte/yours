import React from 'react';
import { useAuth } from '../lib/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';

// 우측 미디어: 이미지 또는 영상 URL (나중에 영상으로 교체 가능)
const MEDIA_URL = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1920&auto=format&fit=crop';
const IS_VIDEO = false; // true로 바꾸면 영상 재생

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/fitting';

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="min-h-screen flex">

      {/* ── 좌측: 로그인 ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 bg-white">
        <div className="w-full max-w-md">

          {/* 로고 */}
          <div className="mb-16">
            <h1 className="text-[20px] font-bold text-neutral-900 tracking-tight">U:US <span className="font-normal text-neutral-400">x</span> Junto AI</h1>
          </div>

          {/* 타이틀 */}
          <div className="mb-10">
            <h2 className="text-[32px] font-bold text-neutral-900 leading-tight">Sign in</h2>
            <p className="text-[14px] text-neutral-400 mt-2">AI 패션 플랫폼에 오신 것을 환영합니다</p>
          </div>

          {/* 구글 로그인 */}
          <button
            onClick={() => signInWithGoogle(redirectTo)}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border border-neutral-200 rounded-xl text-[15px] font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          {/* 하단 */}
          <div className="mt-auto pt-32">
            <p className="text-[12px] text-neutral-300 leading-relaxed">
              계속 진행하면 <span className="underline cursor-pointer">이용약관</span> 및 <span className="underline cursor-pointer">개인정보 처리방침</span>에 동의하는 것으로 간주합니다.
            </p>
            <p className="text-[12px] text-neutral-300 mt-3">©2026 U:US Mall, all rights reserved</p>
          </div>

        </div>
      </div>

      {/* ── 우측: 이미지 / 영상 ── */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        {IS_VIDEO ? (
          <video
            src={MEDIA_URL}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src={MEDIA_URL}
            alt="Fashion"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* 하단 오버레이 텍스트 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-10">
          <p className="text-[14px] font-medium text-white/80 mb-3">Trusted by fashion brands</p>
          <p className="text-[24px] font-bold text-white leading-snug">
            AI로 만드는<br />패션 콘텐츠의 새로운 기준
          </p>
        </div>
      </div>

    </div>
  );
}
