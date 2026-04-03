import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Move, Save, Eye, Pencil, RotateCcw, Image as ImageIcon, Globe, Sparkles, CheckCircle2, Camera, ArrowRight, HelpCircle, LogIn } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

/* ─── 스크롤 페이드인 훅 ─── */
function useScrollFade() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─── 타입 ─── */
interface ElementLayout {
  x: number; y: number; w: number; h: number; rotate: number;
}

type LayoutMap = Record<string, ElementLayout>;

/* ─── 화살표 타입 ─── */
interface ArrowLayout {
  x: number; y: number; w: number; h: number; rotate: number; curve: number;
}

type ArrowMap = Record<string, ArrowLayout>;

/* ─── 기본 레이아웃 ─── */
// 1920px 기준 로컬 저장값을 비율로 변환하여 적용
function getDefaultLayout(): LayoutMap {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const s = vw / 1920; // 스케일 팩터
  return {
    'left-main':      { x: 135 * s,  y: 201 * s, w: 397 * s, h: 563 * s, rotate: 0 },
    'left-dress':     { x: 38 * s,   y: 115 * s, w: 143 * s, h: 192 * s, rotate: 0 },
    'left-bag':       { x: 449 * s,  y: 237 * s, w: 171 * s, h: 151 * s, rotate: 0 },
    'left-shoes':     { x: 41 * s,   y: 647 * s, w: 152 * s, h: 205 * s, rotate: -1 },
    'center-text':    { x: 637 * s,  y: 298 * s, w: 661 * s, h: 266 * s, rotate: 0 },
    'right-main':     { x: 1425 * s, y: 233 * s, w: 401 * s, h: 506 * s, rotate: 0 },
    'right-product':  { x: 1352 * s, y: 154 * s, w: 170 * s, h: 218 * s, rotate: 0 },
  };
}

const DEFAULT_ARROWS: ArrowMap = {
  'arrow-dress':  { x: 100, y: 180, w: 80, h: 60, rotate: 20, curve: 0.4 },
  'arrow-bag':    { x: 310, y: 310, w: 70, h: 50, rotate: -15, curve: 0.4 },
  'arrow-shoes':  { x: 110, y: 440, w: 90, h: 70, rotate: 10, curve: 0.5 },
};

const ARROW_STORAGE_KEY = 'main2-hero-arrows';

const STORAGE_KEY = 'main2-hero-layout';

/* ─── 드래그/리사이즈 블록 ─── */
function DraggableBlock({
  id, layout, editing, onUpdate, children, className = '',
}: {
  id: string;
  layout: ElementLayout;
  editing: boolean;
  onUpdate: (id: string, patch: Partial<ElementLayout>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ type: 'move' | 'resize' | 'rotate'; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; origR: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent, type: 'move' | 'resize' | 'rotate') => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      origX: layout.x,
      origY: layout.y,
      origW: layout.w,
      origH: layout.h,
      origR: layout.rotate,
    };
  }, [editing, layout]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const s = dragState.current;

    if (s.type === 'move') {
      onUpdate(id, { x: s.origX + dx, y: s.origY + dy });
    } else if (s.type === 'resize') {
      onUpdate(id, { w: Math.max(40, s.origW + dx), h: Math.max(40, s.origH + dy) });
    } else if (s.type === 'rotate') {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      const startAngle = Math.atan2(s.startY - cy, s.startX - cx) * (180 / Math.PI);
      onUpdate(id, { rotate: Math.round(s.origR + (angle - startAngle)) });
    }
  }, [id, onUpdate]);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  return (
    <div
      ref={ref}
      className={`absolute ${editing ? 'cursor-move' : ''} ${className}`}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.w,
        height: layout.h,
        transform: `rotate(${layout.rotate}deg)`,
        zIndex: editing ? 20 : undefined,
      }}
      onPointerDown={(e) => { if (editing) onPointerDown(e, 'move'); }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* 콘텐츠 */}
      <div className="w-full h-full" style={{ pointerEvents: editing ? 'none' : 'auto' }}>
        {children}
      </div>

      {/* 편집 오버레이 */}
      {editing && (
        <>
          <div className="absolute inset-0 border-2 border-blue-500/60 rounded pointer-events-none" />
          <div className="absolute -top-5 left-0 text-[9px] font-mono text-blue-500 bg-blue-50 px-1 rounded pointer-events-none select-none">
            {id} ({layout.w}x{layout.h})
          </div>

          {/* 리사이즈 핸들 — 우하단 */}
          <div
            className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 rounded-full cursor-se-resize flex items-center justify-center shadow-md z-30 hover:scale-110 transition-transform"
            onPointerDown={(e) => onPointerDown(e, 'resize')}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5"><path d="M2 8 L8 2 M5 8 L8 5" /></svg>
          </div>

          {/* 로테이트 핸들 — 상단 중앙 */}
          <div
            className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-green-500 rounded-full cursor-grab flex items-center justify-center shadow-md z-30 hover:scale-110 transition-transform"
            onPointerDown={(e) => onPointerDown(e, 'rotate')}
          >
            <RotateCcw className="w-2.5 h-2.5 text-white" />
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Service 5: 쇼케이스 탭 슬라이더 ─── */
const SHOWCASE_TABS = [
  { id: 'shirt', label: '상의', before: '/images/top.webp', after: '/images/set2_2(p).webp' },
  { id: 'skirt', label: '바지', before: '/images/bottom.webp', after: '/images/bottom_.webp' },
  { id: 'skirts', label: '스커트', before: '/images/skirts.webp', after: '/images/skirts_.webp' },
  { id: 'dress', label: '원피스', before: '/images/one.webp', after: '/images/one_.webp' },
  { id: 'coat', label: '자켓', before: '/images/jacket.webp', after: '/images/jacket_.webp' },
  { id: 'bag', label: '가방', before: '/images/bag.webp', after: '/images/bag_.webp' },
  { id: 'bag2', label: '가방2', before: '/images/bag2.webp', after: '/images/bag2_.webp' },
  { id: 'sunglasses', label: '썬글라스', before: '/images/sun.png', after: '/images/sun_.png' },
  { id: 'shoes', label: '구두', before: '/images/shoe.webp', after: '/images/shoe_.webp' },
];

function ServiceShowcase() {
  const [activeTab, setActiveTab] = useState(SHOWCASE_TABS[0].id);

  interface ThumbConfig { size: number; posX: number; posY: number; objX: number; objY: number; zoom: number; }
  const defaultThumb: ThumbConfig = { size: 140, posX: 3, posY: 2.5, objX: 50, objY: 50, zoom: 100 };
  const defaultConfigs: Record<string, Partial<ThumbConfig>> = {
    shirt: { posX: 1.8, posY: 1.75, objY: 41, zoom: 136 },
    skirt: { posX: 3, posY: 2.5, zoom: 95 },
    skirts: { posX: 1.8, posY: 1.9, objY: 41, zoom: 112 },
    dress: { posX: 3, posY: 3.1, zoom: 120 },
    coat: { posX: 2, posY: 2.35, objY: 39, zoom: 134 },
    bag: { posX: 3.2, posY: 2.2, objY: 97, zoom: 157 },
    bag2: { posX: 3, posY: 2.5, objY: 69, zoom: 146 },
    sunglasses: { posX: 3.4, posY: 2.35, objY: 31, zoom: 92 },
    shoes: { posX: 3.8, posY: 2.65, objY: 100, zoom: 150 },
  };

  const [thumbConfigs, setThumbConfigs] = useState<Record<string, ThumbConfig>>(() => {
    try {
      const s = localStorage.getItem('showcase-thumb-configs');
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  const getThumb = (id: string): ThumbConfig => ({ ...defaultThumb, ...(defaultConfigs[id] || {}), ...(thumbConfigs[id] || {}) });
  const updateThumb = (id: string, patch: Partial<ThumbConfig>) => {
    setThumbConfigs(prev => {
      const next = { ...prev, [id]: { ...getThumb(id), ...patch } };
      localStorage.setItem('showcase-thumb-configs', JSON.stringify(next));
      return next;
    });
  };

  const tc = getThumb(activeTab);
  const thumbDrag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgDrag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = SHOWCASE_TABS.find(t => t.id === activeTab) || SHOWCASE_TABS[0];

  return (
    <section id="service5" className="py-16 md:py-32 bg-white/70 relative z-10">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-16">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h2 className="text-[1.6rem] md:text-[40px] font-bold leading-[1.2] text-black mb-5 scroll-fade">
            평범한 제품 사진을<br/>AI로 아름다운 비주얼로
          </h2>
        </div>

        {/* 탭 버튼 */}
        <div className="flex justify-center gap-2 md:gap-3 mb-8 md:mb-12 flex-wrap">
          {SHOWCASE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="cursor-pointer px-4 py-2.5 md:px-8 md:py-3.5 rounded-lg md:rounded-xl text-[13px] md:text-[15px] font-semibold transition-all duration-300"
              style={{
                background: activeTab === tab.id ? '#0a0a0a' : '#fafafa',
                color: activeTab === tab.id ? '#fff' : '#525252',
                border: activeTab === tab.id ? '1px solid #0a0a0a' : '1px solid #e5e5e5',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 이미지 영역 */}
        <div className="max-w-[500px] mx-auto">
          <div ref={containerRef} className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 shadow-2xl shadow-black/10">
            {SHOWCASE_TABS.map(tab => (
              <div
                key={tab.id}
                className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  opacity: activeTab === tab.id ? 1 : 0,
                  transform: activeTab === tab.id ? 'scale(1)' : 'scale(1.02)',
                  pointerEvents: activeTab === tab.id ? 'auto' : 'none',
                }}
              >
                <img
                  src={tab.after}
                  alt={`${tab.label} 결과`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* 원본 썸네일 — 드래그 이동 가능 */}
                <div
                  className="absolute bg-white rounded-xl shadow-2xl shadow-black/15 p-1 z-10 overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{ width: getThumb(tab.id).size, height: getThumb(tab.id).size, left: `${getThumb(tab.id).posX}%`, top: `${getThumb(tab.id).posY}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    const t = getThumb(tab.id); thumbDrag.current = { startX: e.clientX, startY: e.clientY, origX: t.posX, origY: t.posY };
                  }}
                  onPointerMove={(e) => {
                    if (!thumbDrag.current || !containerRef.current) return;
                    const rect = containerRef.current.getBoundingClientRect();
                    const dx = ((e.clientX - thumbDrag.current.startX) / rect.width) * 100;
                    const dy = ((e.clientY - thumbDrag.current.startY) / rect.height) * 100;
                    updateThumb(tab.id, {
                      posX: Math.max(0, Math.min(85, thumbDrag.current.origX + dx)),
                      posY: Math.max(0, Math.min(85, thumbDrag.current.origY + dy)),
                    });
                  }}
                  onPointerUp={() => {
                    thumbDrag.current = null;
                    // saved via updateThumb
                  }}
                >
                  <div className="w-full h-full rounded-lg overflow-hidden">
                    <img
                      src={tab.before}
                      alt={`${tab.label} 원본`}
                      className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: `${getThumb(tab.id).objX}% ${getThumb(tab.id).objY}%`, transform: `scale(${getThumb(tab.id).zoom / 100})` }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* 썸네일 조절 (숨김) */}
          <div className="hidden flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-neutral-400">크기</span>
              <input type="range" min={80} max={300} value={tc.size} onChange={(e) => updateThumb(activeTab, { size: Number(e.target.value) })} className="w-28 accent-black cursor-pointer" />
              <span className="text-[12px] text-neutral-400 tabular-nums w-10">{tc.size}px</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-neutral-400">확대</span>
              <input type="range" min={50} max={200} value={tc.zoom} onChange={(e) => updateThumb(activeTab, { zoom: Number(e.target.value) })} className="w-28 accent-black cursor-pointer" />
              <span className="text-[12px] text-neutral-400 tabular-nums w-10">{tc.zoom}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-neutral-400">X</span>
              <input type="range" min={0} max={100} value={tc.objX} onChange={(e) => updateThumb(activeTab, { objX: Number(e.target.value) })} className="w-20 accent-black cursor-pointer" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-neutral-400">Y</span>
              <input type="range" min={0} max={100} value={tc.objY} onChange={(e) => updateThumb(activeTab, { objY: Number(e.target.value) })} className="w-20 accent-black cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ 섹션 ─── */
const FAQ_ITEMS = [
  { q: 'AI 모델컷의 퀄리티는 실제 촬영과 비교했을 때 어떤가요?', a: '4K 네이티브 해상도로 생성되며, 자연스러운 조명과 그림자 처리로 실제 스튜디오 촬영에 준하는 퀄리티를 제공합니다. 의류의 텍스처, 라벨, 디테일까지 정밀하게 재현됩니다.' },
  { q: '어떤 종류의 의류까지 지원하나요?', a: '여성복, 남성복, 잡화(가방, 신발, 액세서리)까지 모두 지원합니다. 바닥컷, 행거컷, 마네킹컷 등 다양한 형태의 원본 사진으로 모델컷을 생성할 수 있습니다.' },
  { q: '다국어 상세페이지는 어떤 언어를 지원하나요?', a: '현재 한국어, 중국어(간체/번체), 영어를 지원하며, 패션 전문 용어에 특화된 번역 엔진을 사용합니다. 위안화 가격 자동 변환 기능도 포함되어 있습니다.' },
  { q: '무료 체험이 가능한가요?', a: '네, 회원가입 후 무료 크레딧이 제공되어 AI 모델컷 생성을 직접 체험해보실 수 있습니다. 별도 결제 정보 없이 바로 시작 가능합니다.' },
  { q: '기존 쇼핑몰 플랫폼과 연동이 되나요?', a: '네, API를 통해 카페24, 스마트스토어, 쿠팡 등 주요 이커머스 플랫폼과 연동이 가능합니다. 생성된 이미지와 상세페이지를 바로 업로드할 수 있습니다.' },
];

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 md:py-32 bg-white/70 relative z-10">
      <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-16">
        <div className="text-center mb-14">
          <h2 className="text-[1.8rem] md:text-[2.5rem] font-bold text-black mb-3 scroll-fade">자주 묻는 질문</h2>
          <div className="w-24 h-[2px] bg-black/15 mx-auto overflow-hidden">
            <div className="h-full bg-black/40 animate-[slideRight_2s_ease-out_forwards]" />
          </div>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border border-neutral-200/60 rounded-2xl overflow-hidden bg-white/60">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-5 md:px-7 py-4 md:py-5 text-left cursor-pointer"
              >
                <span className="text-[16px] font-semibold text-black pr-4">{item.q}</span>
                <span className={`text-neutral-400 text-xl shrink-0 transition-transform duration-300 ${openIdx === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: openIdx === i ? 200 : 0, opacity: openIdx === i ? 1 : 0 }}
              >
                <p className="px-5 md:px-7 pb-5 md:pb-6 text-neutral-600 text-[14px] md:text-[15px] leading-relaxed">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA 섹션 (5가지 스타일) ─── */
function CtaSection() {
  const style = 6;

  return (
    <section id="cta" className="py-16 md:py-32 bg-white/70 relative z-10">
      <div className="text-center mb-12 px-8">
        <h2 className="text-[1.8rem] md:text-[2.8rem] lg:text-[3.5rem] font-bold leading-[1.15] text-black tracking-tight scroll-fade">
          U:US의 도약,<br/>Junto AI가 함께 합니다.
        </h2>
      </div>
      <div className="max-w-[1400px] mx-auto px-8">
        <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
          <img
            src="/images/cta-editorial.jpg"
            alt="에디토리얼 CTA"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>
    </section>
  );
}

/* ─── 드래그 가능한 화살표 ─── */
function DraggableArrow({
  id, layout, editing, onUpdate,
}: {
  id: string;
  layout: ArrowLayout;
  editing: boolean;
  onUpdate: (id: string, patch: Partial<ArrowLayout>) => void;
}) {
  const dragState = useRef<{ type: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent, type: 'move' | 'resize') => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { type, startX: e.clientX, startY: e.clientY, origX: layout.x, origY: layout.y, origW: layout.w, origH: layout.h };
  }, [editing, layout]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const s = dragState.current;
    if (s.type === 'move') onUpdate(id, { x: s.origX + dx, y: s.origY + dy });
    else onUpdate(id, { w: Math.max(30, s.origW + dx), h: Math.max(20, s.origH + dy) });
  }, [id, onUpdate]);

  const onPointerUp = useCallback(() => { dragState.current = null; }, []);

  const c = layout.curve;
  const path = `M 4 ${layout.h - 4} C ${layout.w * c} ${layout.h * 0.2}, ${layout.w * (1 - c)} ${layout.h * 0.6}, ${layout.w - 4} 4`;

  return (
    <div
      className={`absolute ${editing ? 'cursor-move' : 'pointer-events-none'}`}
      style={{ left: layout.x, top: layout.y, width: layout.w, height: layout.h, transform: `rotate(${layout.rotate}deg)`, zIndex: editing ? 15 : 5 }}
      onPointerDown={(e) => { if (editing) onPointerDown(e, 'move'); }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width={layout.w} height={layout.h} viewBox={`0 0 ${layout.w} ${layout.h}`} fill="none" className="overflow-visible">
        <path d={path} stroke="#333" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* 화살촉 */}
        <circle cx={layout.w - 4} cy={4} r="3" fill="#333" />
      </svg>

      {editing && (
        <>
          <div className="absolute inset-0 border border-orange-400/60 rounded pointer-events-none" />
          <div className="absolute -top-4 left-0 text-[8px] font-mono text-orange-500 bg-orange-50 px-1 rounded pointer-events-none select-none">{id}</div>
          {/* 리사이즈 */}
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-orange-500 rounded-full cursor-se-resize z-30 hover:scale-110 transition-transform" onPointerDown={(e) => onPointerDown(e, 'resize')} />
          {/* 커브 조절 */}
          <div className="flex absolute -bottom-6 left-0 gap-1">
            <button onClick={(e) => { e.stopPropagation(); onUpdate(id, { curve: Math.max(0.1, layout.curve - 0.1) }); }} className="w-4 h-4 bg-orange-100 text-orange-600 rounded text-[9px] font-bold cursor-pointer hover:bg-orange-200">-</button>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(id, { curve: Math.min(0.9, layout.curve + 0.1) }); }} className="w-4 h-4 bg-orange-100 text-orange-600 rounded text-[9px] font-bold cursor-pointer hover:bg-orange-200">+</button>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(id, { rotate: layout.rotate + 15 }); }} className="w-4 h-4 bg-orange-100 text-orange-600 rounded text-[9px] font-bold cursor-pointer hover:bg-orange-200">R</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── 네비 메뉴 ─── */
const NAV_ITEMS = [
  { id: 'main', label: 'Home', href: '/' },
  { id: 'lookbook', label: 'AI 피팅', href: '/fitting' },
  { id: 'video', label: 'AI 영상', href: '/video' },
  { id: 'floorcut', label: '촬영 예약', href: '/reservation' },
  { id: 'cs', label: 'Help', href: '/help' },
];

/* ─── 메인 컴포넌트 ─── */
export default function Main2() {
  useScrollFade();
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [layouts, setLayouts] = useState<LayoutMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { ...getDefaultLayout() };
    } catch { return { ...getDefaultLayout() }; }
  });
  const [arrows, setArrows] = useState<ArrowMap>(() => {
    try {
      const saved = localStorage.getItem(ARROW_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { ...DEFAULT_ARROWS };
    } catch { return { ...DEFAULT_ARROWS }; }
  });
  const [saved, setSaved] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navProgress, setNavProgress] = useState(0);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const updateArrow = useCallback((id: string, patch: Partial<ArrowLayout>) => {
    setArrows(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const updateLayout = useCallback((id: string, patch: Partial<ElementLayout>) => {
    setLayouts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    localStorage.setItem(ARROW_STORAGE_KEY, JSON.stringify(arrows));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setLayouts({ ...getDefaultLayout() });
    setArrows({ ...DEFAULT_ARROWS });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ARROW_STORAGE_KEY);
  };

  // 스크롤 감지: 네비 축소
  useEffect(() => {
    const handler = () => {
      const sy = window.scrollY;
      setScrolled(sy > 60);
      setNavProgress(Math.min(1, Math.max(0, sy / 300)));
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ESC로 편집 모드 해제
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditing(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const location = useLocation();

  return (
    <div className="min-h-screen font-sans antialiased relative">
      {/* 고정 비디오 배경 */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0"
        src="/videos/home-bg.webm"
        autoPlay muted loop playsInline
      />
      <div className="fixed inset-0 bg-white/70 z-0" />
      {/* ─── 네비게이션 ─── */}
      <nav className="fixed top-0 left-0 right-0 z-40 relative" style={{ pointerEvents: 'none' }}>
        <div className="flex justify-center" style={{ padding: `${navProgress * 12}px ${navProgress * 20}% 0` }}>
          <div
            style={{
              pointerEvents: 'auto',
              width: navProgress > 0.5 ? 'auto' : '100%',
              paddingTop: 20 - navProgress * 14,
              paddingBottom: 20 - navProgress * 14,
              paddingLeft: 40 - navProgress * 28,
              paddingRight: 40 - navProgress * 28,
              background: `rgba(255,255,255,${0.8 + navProgress * 0.12})`,
              backdropFilter: 'blur(20px)',
              borderRadius: navProgress * 9999,
              border: navProgress > 0.5 ? '1px solid rgba(0,0,0,0.08)' : 'none',
              borderBottom: navProgress < 0.5 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              boxShadow: `0 ${navProgress * 4}px ${navProgress * 24}px rgba(0,0,0,${navProgress * 0.06})`,
            }}
          >
            <div className="flex items-center" style={{ gap: 8 - navProgress * 4, maxWidth: navProgress < 0.3 ? 1280 : 'none', margin: '0 auto' }}>
              {/* 로고 */}
              <div className="overflow-hidden" style={{ width: (1 - navProgress) * 200, opacity: 1 - navProgress * 1.5, flexShrink: 0 }}>
                <span className="text-sm md:text-lg font-bold tracking-tight text-black whitespace-nowrap">U:US <span className="text-neutral-400 font-normal">x</span> Junto AI</span>
              </div>
              {/* 스페이서 */}
              <div style={{ flex: navProgress < 0.5 ? 1 : 0 }} />
              {/* 메뉴 */}
              <div className="flex items-center" style={{ gap: 4 - navProgress * 2 }}>
                {NAV_ITEMS.map(item => {
                  const isActive = location.pathname === item.href;
                  const isHovered = hoveredNav === item.id;
                  const fontSize = 16 - navProgress * 2;
                  let color = '#a3a3a3';
                  if (isActive) color = navProgress > 0.5 ? '#fff' : '#000';
                  else if (isHovered) color = '#E8532E';
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onMouseEnter={() => setHoveredNav(item.id)}
                      onMouseLeave={() => setHoveredNav(null)}
                      className="cursor-pointer font-medium whitespace-nowrap no-underline"
                      style={{
                        padding: `8px ${16 - navProgress * 2}px`,
                        borderRadius: navProgress > 0.5 ? 9999 : 8,
                        fontSize,
                        transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                        background: navProgress > 0.5 && isActive ? '#000' : 'transparent',
                        color,
                        fontWeight: isActive ? 600 : 500,
                        boxShadow: navProgress > 0.5 && isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              {/* 로그인/로그아웃 */}
              <div className="ml-2" style={{ opacity: 1 - navProgress * 1.2, flexShrink: 0 }}>
                {user ? (
                  <button onClick={signOut} className="px-4 py-2 text-[13px] font-medium text-neutral-500 border border-neutral-200 rounded-full hover:bg-neutral-100 cursor-pointer transition-colors whitespace-nowrap" style={{ pointerEvents: 'auto' }}>
                    로그아웃
                  </button>
                ) : (
                  <Link to="/login?redirect=/" className="px-4 py-2 text-[13px] font-semibold text-white bg-neutral-900 rounded-full hover:bg-neutral-700 cursor-pointer transition-colors no-underline whitespace-nowrap" style={{ pointerEvents: 'auto' }}>
                    로그인/회원가입
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 에디터 툴바 (숨김) */}
      <div className="hidden">
        {editing && (
          <>
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-500 hover:bg-neutral-50 shadow-lg transition-colors cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-lg transition-colors cursor-pointer">
              <Save className="w-3.5 h-3.5" /> {saved ? '저장됨!' : '저장'}
            </button>
          </>
        )}
        <button
          onClick={() => setEditing(!editing)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all cursor-pointer ${editing ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}
        >
          {editing ? <><Eye className="w-3.5 h-3.5" /> 미리보기</> : <><Pencil className="w-3.5 h-3.5" /> 편집</>}
        </button>
      </div>

      {/* 편집 모드 안내 (숨김) */}

      {/* Hero Section */}
      <section id="main" className="relative z-10 min-h-screen overflow-hidden bg-white/70" style={{ touchAction: editing ? 'none' : 'auto' }}>

        {/* 좌측 메인 이미지 */}
        <div className="hidden md:block">
          <DraggableBlock id="left-main" layout={layouts['left-main']} editing={editing} onUpdate={updateLayout}>
            <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl shadow-neutral-400/20">
              <img src="/images/hero.webp" alt="AI 생성 패션 모델컷" className="w-full h-full object-cover" />
            </div>
          </DraggableBlock>
        </div>

        {/* 좌측 의상 썸네일 */}
        <div className="hidden md:block">
          <DraggableBlock id="left-dress" layout={layouts['left-dress']} editing={editing} onUpdate={updateLayout}>
            <div className="w-full h-full bg-white rounded-lg shadow-lg border border-neutral-100 p-1.5">
              <img src="/images/Hero_.webp" alt="원본 의상" className="w-full h-full object-cover rounded" />
            </div>
          </DraggableBlock>
        </div>

        {/* 좌측 가방 */}
        <div className="hidden md:block">
          <DraggableBlock id="left-bag" layout={layouts['left-bag']} editing={editing} onUpdate={updateLayout}>
            <div className="w-full h-full bg-white rounded-lg shadow-lg border border-neutral-100 p-1.5">
              <img src="/images/jacket.webp" alt="자켓 아이템" className="w-full h-full object-cover rounded" />
            </div>
          </DraggableBlock>
        </div>

        {/* 좌측 신발 */}
        <div className="hidden md:block">
          <DraggableBlock id="left-shoes" layout={layouts['left-shoes']} editing={editing} onUpdate={updateLayout}>
            <div className="w-full h-full bg-white rounded-lg shadow-lg border border-neutral-100 p-1.5">
              <img src="/images/skirts.webp" alt="스커트 아이템" className="w-full h-full object-cover rounded" />
            </div>
          </DraggableBlock>
        </div>

        {/* 중앙 텍스트 — 데스크톱: DraggableBlock / 모바일: 일반 흐름 */}
        <div className="hidden md:block">
          <DraggableBlock id="center-text" layout={layouts['center-text']} editing={editing} onUpdate={updateLayout}>
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
              <h1 className="text-[clamp(2.2rem,4.5vw,3.5rem)] font-bold leading-[1.4] tracking-tight text-black animate-[fadeInUp_1s_ease-out_both]">
                <span className="inline-block bg-gradient-to-b from-neutral-400 to-black bg-clip-text text-transparent">U:US</span>의 새로운 시작,<br/>
                <span className="inline-block bg-gradient-to-b from-neutral-400 to-black bg-clip-text text-transparent">Junto AI</span>가 함께 합니다.
              </h1>
            </div>
          </DraggableBlock>
        </div>
        {/* 모바일 히어로 */}
        <div className="md:hidden flex flex-col items-center justify-center min-h-screen px-5 py-20 gap-8">
          <h1 className="text-[1.8rem] font-bold leading-[1.4] tracking-tight text-black text-center animate-[fadeInUp_1s_ease-out_both]">
            <span className="inline-block bg-gradient-to-b from-neutral-400 to-black bg-clip-text text-transparent">U:US</span>의 새로운 시작,<br/>
            <span className="inline-block bg-gradient-to-b from-neutral-400 to-black bg-clip-text text-transparent">Junto AI</span>가 함께 합니다.
          </h1>
          {/* 모바일 이미지 그리드 */}
          <div className="w-full grid grid-cols-2 gap-3 animate-[fadeInUp_1s_ease-out_0.3s_both]">
            <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg">
              <img src="/images/hero.webp" alt="AI 모델컷" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg">
              <img src="/images/hero(2).webp" alt="AI 제품 사진" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex gap-2.5 animate-[fadeInUp_1s_ease-out_0.5s_both]">
            <div className="w-16 h-16 rounded-lg overflow-hidden shadow-md border border-neutral-100 bg-white p-1">
              <img src="/images/Hero_.webp" alt="원본 의상" className="w-full h-full object-cover rounded" />
            </div>
            <div className="w-16 h-16 rounded-lg overflow-hidden shadow-md border border-neutral-100 bg-white p-1">
              <img src="/images/jacket.webp" alt="자켓" className="w-full h-full object-cover rounded" />
            </div>
            <div className="w-16 h-16 rounded-lg overflow-hidden shadow-md border border-neutral-100 bg-white p-1">
              <img src="/images/skirts.webp" alt="스커트" className="w-full h-full object-cover rounded" />
            </div>
            <div className="w-16 h-16 rounded-lg overflow-hidden shadow-md border border-neutral-100 bg-white p-1">
              <img src="/images/hero(2)_.webp" alt="원본 제품" className="w-full h-full object-cover rounded" />
            </div>
          </div>
        </div>

        {/* 우측 메인 이미지 */}
        <div className="hidden md:block">
          <DraggableBlock id="right-main" layout={layouts['right-main']} editing={editing} onUpdate={updateLayout}>
            <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl shadow-neutral-400/20">
              <img src="/images/hero(2).webp" alt="AI 생성 제품 사진" className="w-full h-full object-cover" />
            </div>
          </DraggableBlock>
        </div>

        {/* 우측 원본 제품 */}
        <div className="hidden md:block">
          <DraggableBlock id="right-product" layout={layouts['right-product']} editing={editing} onUpdate={updateLayout}>
            <div className="w-full h-full bg-white rounded-lg shadow-lg border border-neutral-100 p-1.5">
              <img src="/images/hero(2)_.webp" alt="원본 제품" className="w-full h-full object-cover rounded" />
            </div>
          </DraggableBlock>
        </div>
      </section>

      {/* ─── 대표님들의 핵심 고민 ─── */}
      <section className="py-16 md:py-32 bg-white/70 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-16">
          <div className="text-center mb-14">
            <h2 className="text-[1.8rem] md:text-[2.5rem] font-bold text-black mb-4 scroll-fade">대표님들의 핵심 고민</h2>
            <div className="w-24 h-[2px] bg-black/15 mx-auto overflow-hidden">
              <div className="h-full bg-black/40 animate-[slideRight_2s_ease-out_forwards]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 scroll-fade scroll-fade-delay-1">
            {[
              {
                img: '/images/h1.png',
                title: '부담스러운 촬영 비용',
                desc: '회당 50만원이 넘는 스튜디오 및 모델 촬영 비용',
              },
              {
                img: '/images/h2.png',
                title: '해외 바이어 소통',
                desc: '중국 바이어와의 언어 장벽',
              },
              {
                img: '/images/h3.png',
                title: '온라인 전환의 벽',
                desc: '상세페이지 제작, 영상 편집 등 IT 전문 인력 부재',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-200/60 p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-[4/3] rounded-xl overflow-hidden mb-5 bg-neutral-100">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">{item.title}</h3>
                <p className="text-neutral-800 text-[15px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 서비스 타이틀 ─── */}
      <div className="pt-12 md:pt-24 pb-4 bg-white/70 relative z-10">
        <div className="text-center">
          <h2 className="text-[1.8rem] md:text-[2.5rem] font-bold text-black mb-4 scroll-fade">이렇게 해결해 드릴게요!</h2>
          <div className="w-24 h-[2px] bg-black/15 mx-auto overflow-hidden">
            <div className="h-full bg-black/40 animate-[slideRight_2s_ease-out_forwards]" />
          </div>
        </div>
      </div>

      {/* ─── Service 1: AI 모델컷 생성 (이미지 좌 / 텍스트 우) ─── */}
      <section id="service1" className="pt-8 md:pt-12 pb-16 md:pb-32 bg-white/70 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-16 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* 좌측 — Before/After 이미지 */}
          <div className="flex-1 w-full">
            <div className="bg-neutral-100 rounded-2xl p-10 flex items-center justify-center gap-6 relative scroll-fade">
              <div className="w-[200px] aspect-[4/5] rounded-lg overflow-hidden shadow-lg border border-neutral-200 bg-white">
                <img src="/images/one.webp" alt="원본 바닥컷" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              {/* 화살표 */}
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="shrink-0 text-neutral-400">
                <path d="M8 24 C 16 18, 32 18, 40 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M36 20 L40 24 L36 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <div className="w-[200px] aspect-[4/5] rounded-lg overflow-hidden shadow-2xl">
                <img src="/images/one_.webp" alt="AI 생성 모델컷" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
          {/* 우측 — 텍스트 */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-100 text-purple-700 scroll-fade text-[16px] font-semibold mb-6">
              <ImageIcon className="w-4 h-4" /> 핵심 AI 기능 1
            </div>
            <h3 className="text-[1.6rem] md:text-[2.3rem] font-bold leading-[1.3] text-black mb-4 md:mb-5 scroll-fade scroll-fade-delay-1">바닥컷 한 장이<br/>고퀄리티 룩북으로</h3>
            <p className="hidden">
              옷 사진만 업로드하세요. 원하는 인종, 체형, 포즈, 배경의 AI 모델이 착용한 고해상도 룩북 이미지를 30초 만에 생성합니다.
            </p>
            <ul className="space-y-4 scroll-fade scroll-fade-delay-2">
              {['여성복, 남성복, 잡화 완벽 지원', '다양한 글로벌 모델 선택 가능', '스튜디오 촬영 대비 90% 비용 절감'].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-neutral-900 text-[16px]">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Service 2: 숏폼 영상 제작 (텍스트 좌 / 이미지 우) ─── */}
      <section id="service2" className="py-16 md:py-32 bg-white/70 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-16 flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16">
          {/* 우측 — 준비중 */}
          <div className="flex-1 w-full">
            <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 flex items-center justify-center">
              <p className="text-neutral-400 text-[15px] font-medium">Coming Soon (곧 오픈 예정)</p>
            </div>
          </div>
          {/* 좌측 — 텍스트 */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-100 text-blue-700 scroll-fade text-[16px] font-semibold mb-6">
              <Globe className="w-4 h-4" /> 핵심 AI 기능 2
            </div>
            <h3 className="text-[1.6rem] md:text-[2.3rem] font-bold leading-[1.3] text-black mb-4 md:mb-5 scroll-fade scroll-fade-delay-1">클릭 한 번으로<br/>중국어 상세페이지 완성</h3>
            <p className="hidden">
              한국어로 제품 정보만 입력하세요. AI가 레이아웃을 구성하고 중국어/영어로 완벽하게 번역된 상세페이지를 즉시 만들어냅니다.
            </p>
            <ul className="space-y-4 scroll-fade scroll-fade-delay-2">
              {['패션 전문 용어 맞춤 번역', '중국 바이어 선호 레이아웃 적용', '위안화 가격 자동 변환 표시'].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-neutral-900 text-[16px]">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Service 3: 숏폼 영상 제작 (이미지 좌 / 텍스트 우) ─── */}
      <section id="service3" className="py-16 md:py-32 bg-white/70 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-16 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* 좌측 — 숏폼 영상 */}
          <div className="flex-1 w-full">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-neutral-400/10">
              <video src="/images/cs-3.webm" className="w-full h-full object-cover" autoPlay muted loop playsInline />
            </div>
          </div>
          {/* 우측 — 텍스트 */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-100 text-emerald-700 scroll-fade text-[16px] font-semibold mb-6">
              <Sparkles className="w-4 h-4" /> 핵심 AI 기능 3
            </div>
            <h3 className="text-[1.6rem] md:text-[2.3rem] font-bold leading-[1.3] text-black mb-4 md:mb-5 scroll-fade scroll-fade-delay-1">사진만 올리면<br/>숏폼 영상이 완성</h3>
            <p className="hidden">
              제품 사진 몇 장만 선택하세요. AI가 트렌디한 음악과 자연스러운 전환 효과를 적용하여 틱톡, 릴스에 바로 올릴 수 있는 숏폼 영상을 자동 제작합니다.
            </p>
            <ul className="space-y-4 scroll-fade scroll-fade-delay-2">
              {['제품 디테일 & 로고 자동 인식', '시즌별 캠페인 이미지 일괄 생성', '숏폼 영상 자동 제작 지원'].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-neutral-900 text-[16px]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Service 4: 바닥컷 촬영 예약 (텍스트 좌 / 이미지 우) ─── */}
      <section id="service4" className="py-16 md:py-32 bg-white/70 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-16 flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16">
          {/* 우측 — 스튜디오 이미지 */}
          <div className="flex-1 w-full">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-neutral-400/10">
              <img src="/images/badak.png" alt="바닥컷 촬영 스튜디오" className="w-full h-full object-cover" />
            </div>
          </div>
          {/* 좌측 — 텍스트 */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-100 text-amber-700 scroll-fade text-[16px] font-semibold mb-6">
              <Camera className="w-4 h-4" /> 바닥컷 예약서비스
            </div>
            <h3 className="text-[1.6rem] md:text-[2.3rem] font-bold leading-[1.3] text-black mb-4 md:mb-5 scroll-fade scroll-fade-delay-1">전문 포토그래퍼가<br/>직접 촬영해 드립니다</h3>
            <p className="hidden">
              유어스몰 현장 스튜디오에서 전문 포토그래퍼가 바닥컷을 촬영합니다. 온라인 예약 한 번이면 고퀄리티 원본 사진이 준비됩니다.
            </p>
            <ul className="space-y-4 scroll-fade scroll-fade-delay-2">
              {['전문 스튜디오 & 장비 완비', '예약 후 당일 촬영 가능', '촬영본 즉시 AI 모델컷 변환 연동'].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-neutral-900 text-[16px]">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Help 섹션 ─── */}
      <section className="py-16 md:py-32 bg-white/70 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-16 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          <div className="flex-1 w-full">
            <div className="aspect-[4/3] rounded-2xl bg-neutral-100 flex items-center justify-center overflow-hidden">
              <img src="https://picsum.photos/seed/help-support/800/600" alt="Help 서비스" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-100 text-rose-700 text-[16px] font-semibold mb-6 scroll-fade">
              <HelpCircle className="w-4 h-4" /> 헬프 서비스
            </div>
            <h3 className="text-[1.6rem] md:text-[2.3rem] font-bold leading-[1.3] text-black mb-4 md:mb-5 scroll-fade scroll-fade-delay-1">AI가 어렵다면,<br/>저희가 대신 해드립니다</h3>
            <p className="hidden"></p>
            <ul className="space-y-4 scroll-fade scroll-fade-delay-2">
              {['AI 모델컷 생성부터 상세페이지까지 풀 대행', '전담 매니저 1:1 배정', '작업 완료 후 수정 무제한'].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-neutral-900 text-[16px]">
                  <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0" /> {text}
                </li>
              ))}
            </ul>
            <Link to="/help" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-neutral-900 text-white rounded-full text-[14px] font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all no-underline scroll-fade scroll-fade-delay-3">
              문의하기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 쇼케이스 탭 슬라이더 ─── */}
      <ServiceShowcase />

      {/* ─── Coming Soon 그리드 ─── */}
      <section className="py-16 md:py-32 bg-white/70 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-16">
          <div className="text-center mb-14">
            <h2 className="text-[1.8rem] md:text-[2.5rem] font-bold text-black mb-3 scroll-fade">Coming Soon</h2>
            <p className="text-neutral-800 text-[16px] mb-5">곧 업데이트 될 기능들입니다.</p>
            <div className="w-24 h-[2px] bg-black/15 mx-auto overflow-hidden">
              <div className="h-full bg-black/40 animate-[slideRight_2s_ease-out_forwards]" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {[
              { img: '/images/cs-1.jpg', title: 'AI 가상 피팅', desc: '어떤 의류든 AI 모델에 즉시 입혀보세요. 촬영 없이 전문 모델 사진을 완성합니다.' },
              { img: '/images/cs-product-to-model.jpg', title: '제품컷 → 모델컷', desc: '바닥컷 한 장을 모델 착용 사진으로 즉시 변환합니다.' },
              { img: '/images/cs-3.webm', title: 'AI 패션 영상 생성', desc: '정적인 제품 사진을 틱톡, 릴스용 다이나믹 영상으로 자동 제작합니다.', isVideo: true },
              { img: '/images/cs-model-creation.jpg', title: 'AI 모델 생성', desc: '텍스트 설명만으로 고유한 AI 모델을 생성하고 브랜드에 맞는 모델을 만듭니다.' },
              { img: '/images/cs-pose-control.jpg', title: 'AI 포즈 컨트롤', desc: 'AI 모델의 포즈를 정밀하게 지정하여 무한한 촬영 각도를 구현합니다.' },
              { img: '/images/cs-ghost.jpg', title: '제품컷 → 모델컷', desc: '제품 사진에서 마네킹을 즉시 제거합니다. 편집 기술 없이도 전문 결과물을 얻습니다.' },
            ].map((item, i) => (
              <div key={i} className="bg-neutral-50/80 rounded-2xl border border-neutral-200/50 p-5 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 group">
                <div className="aspect-[3/2] rounded-xl overflow-hidden mb-4 bg-neutral-100 relative">
                  {(item as any).isVideo ? (
                    <video src={item.img} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" autoPlay muted loop playsInline />
                  ) : (
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                  )}
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-semibold text-white tracking-wider">COMING SOON</div>
                </div>
                <h3 className="text-[17px] font-bold text-black mb-2">{item.title}</h3>
                <p className="text-neutral-600 text-[14px] leading-relaxed mb-3">{item.desc}</p>
                <span className="text-neutral-400 text-[13px] font-medium inline-flex items-center gap-1 group-hover:text-black transition-colors">
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <FaqSection />

      {/* ─── CTA ─── */}
      <CtaSection />
    </div>
  );
}
