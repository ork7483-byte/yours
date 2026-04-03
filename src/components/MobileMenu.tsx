import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'AI 피팅', href: '/fitting' },
  { label: 'AI 영상', href: '/video' },
  { label: '촬영 예약', href: '/reservation' },
  { label: 'Help', href: '/help' },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="md:hidden">
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
        aria-label="메뉴 열기"
      >
        <Menu className="w-5 h-5 text-neutral-700" />
      </button>

      {/* 오버레이 + 슬라이드 패널 */}
      <AnimatePresence>
        {open && (
          <>
            {/* 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setOpen(false)}
            />

            {/* 메뉴 패널 (우측에서 슬라이드) */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* 상단: 닫기 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <span className="text-[15px] font-bold text-neutral-900">메뉴</span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* 메뉴 항목 */}
              <nav className="flex-1 py-3 px-3">
                {NAV_ITEMS.map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl text-[15px] font-medium no-underline transition-all mb-1 ${
                        isActive
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* 하단: 계정 */}
              <div className="border-t border-neutral-100 px-5 py-4">
                {user ? (
                  <div className="space-y-3">
                    <p className="text-[12px] text-neutral-400 truncate">{user.email}</p>
                    <button
                      onClick={() => { signOut(); setOpen(false); }}
                      className="w-full py-2.5 text-[14px] font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full py-2.5 text-[14px] font-semibold text-white bg-neutral-900 rounded-xl text-center no-underline hover:bg-neutral-700 transition-colors"
                  >
                    로그인/회원가입
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
