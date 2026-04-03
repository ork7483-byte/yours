import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/useAuth';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

const MEDIA_URL = '/videos/login-bg.webm';
const IS_VIDEO = true;

// 인앱 브라우저 감지
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || '';
  return /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line|wv|WebView/i.test(ua);
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/fitting';
  const [inApp, setInApp] = useState(false);

  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isInAppBrowser()) {
      setRedirecting(true);
      const currentUrl = window.location.href;
      const isAndroid = /android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      const timer = setTimeout(() => {
        if (isAndroid) {
          window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
        } else if (isIOS) {
          window.location.href = currentUrl.replace(/^https?:\/\//, 'x-safari-https://');
        }
        // 리다이렉트 실패 시 폴백
        setTimeout(() => { setRedirecting(false); setInApp(true); }, 1500);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  // 리다이렉트 중 안내 화면
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-sm text-center">
          <div className="w-10 h-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-[16px] font-semibold text-neutral-900 mb-2">
            외부 브라우저로 이동 중입니다
          </p>
          <p className="text-[13px] text-neutral-400">
            원활한 로그인을 위해 Chrome 또는 Safari로 이동됩니다
          </p>
        </div>
      </div>
    );
  }

  // 인앱 브라우저 폴백 UI
  if (inApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-[28px] font-extrabold text-neutral-900 mb-3">
            U:US <span className="font-extralight text-neutral-300">×</span> Junto AI
          </h1>
          <p className="text-[14px] text-neutral-500 mb-6 leading-relaxed">
            원활한 로그인을 위해<br />Chrome 또는 Safari에서 열어주세요
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('링크가 복사되었습니다!\nChrome 또는 Safari에서 붙여넣기 하세요.');
            }}
            className="w-full px-6 py-3.5 bg-neutral-900 text-white text-[15px] font-semibold rounded-xl cursor-pointer transition-colors hover:bg-neutral-700"
          >
            링크 복사하기
          </button>
          <p className="text-[12px] text-neutral-300 mt-4">
            복사한 링크를 Chrome 또는 Safari 주소창에 붙여넣기 하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ── 좌측: 로고 + 로그인 ── */}
      <div className="w-full lg:flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-8">
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link to="/" className="no-underline">
              <h1 className="text-[42px] font-extrabold text-neutral-900 tracking-tight leading-[1.1] hover:opacity-70 transition-opacity cursor-pointer text-center">
                U:US <span className="font-extralight text-neutral-300">×</span> Junto AI
              </h1>
            </Link>
            <p className="text-[25px] text-[#E8532E] font-bold text-center whitespace-nowrap" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              AI로 만드는 패션 콘텐츠의 새로운 기준
            </p>
          </motion.div>
          <button
            onClick={() => signInWithGoogle(redirectTo)}
            className="flex items-center justify-center gap-3 px-16 py-3.5 bg-white border border-neutral-200 rounded-xl text-[15px] font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>

      {/* ── 우측: 영상 ── */}
      <div className="hidden lg:block w-[38%] h-screen relative overflow-hidden">
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
      </div>

    </div>
  );
}
