import React from 'react';
import { ArrowRight, CheckCircle2, Globe, Image as ImageIcon, LayoutTemplate, PlaySquare, Sparkles, Video, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-black text-xl">J</div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">JUNTO AI</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">기능 소개</a>
              <a href="#comparison" className="text-sm font-medium text-slate-600 hover:text-slate-900">비교 우위</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">요금제</a>
              <Link to="/app" className="text-sm font-bold text-slate-900 hover:text-amber-600">로그인</Link>
              <Link to="/app" className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors">
                AI 데모 체험
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4" />
          유어스몰(UUS) 입점사 전용 AI 플랫폼
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
          동대문의 새로운 시작,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">AI가 함께합니다</span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          월 50만원 이상의 촬영비 부담을 구독료 하나로 해결하세요. <br className="hidden md:block" />
          AI 모델컷, 다국어 상세페이지, 숏폼 영상까지 한 번에 생성합니다.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/app" className="bg-slate-900 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            AI 데모 체험하기 <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-50 transition-colors">
            입점 상담 신청
          </button>
        </div>
        
        {/* Hero Image Mockup */}
        <div className="mt-16 relative max-w-5xl mx-auto">
          <div className="aspect-video bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">AI 모델컷 생성 데모 영상 영역</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">도매 사장님들의 현실적인 고민</h2>
            <p className="text-slate-600">JUNTO AI가 완벽하게 해결해 드립니다.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <ImageIcon className="w-8 h-8 text-rose-500" />, title: "부담스러운 촬영 비용", desc: "회당 50만원이 넘는 스튜디오 및 모델 촬영 비용" },
              { icon: <Globe className="w-8 h-8 text-blue-500" />, title: "해외 바이어 소통", desc: "전체 매출의 80%를 차지하는 중국 바이어와의 언어 장벽" },
              { icon: <LayoutTemplate className="w-8 h-8 text-purple-500" />, title: "온라인 전환의 벽", desc: "상세페이지 제작, 영상 편집 등 IT 전문 인력 부재" }
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                <div className="bg-white w-16 h-16 rounded-xl flex items-center justify-center shadow-sm mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">핵심 AI 기능</h2>
            <p className="text-slate-400">사진 한 장으로 글로벌 진출 준비를 끝내세요.</p>
          </div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-semibold mb-6">
                  <ImageIcon className="w-4 h-4" /> AI 모델컷 생성
                </div>
                <h3 className="text-3xl font-bold mb-4">바닥컷 한 장이<br />고퀄리티 룩북으로</h3>
                <p className="text-slate-400 text-lg mb-6">
                  옷 사진만 업로드하세요. 원하는 인종, 체형, 포즈, 배경의 AI 모델이 착용한 고해상도 룩북 이미지를 30초 만에 생성합니다.
                </p>
                <ul className="space-y-3">
                  {['여성복, 남성복, 잡화 완벽 지원', '다양한 글로벌 모델 선택 가능', '스튜디오 촬영 대비 90% 비용 절감'].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-purple-400" /> {text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full">
                <div className="aspect-square bg-slate-800 rounded-2xl border border-slate-700 p-8 relative">
                  {/* Mockup UI */}
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    [AI 모델컷 생성 UI 데모]
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold mb-6">
                  <Globe className="w-4 h-4" /> 다국어 상세페이지
                </div>
                <h3 className="text-3xl font-bold mb-4">클릭 한 번으로<br />중국어 상세페이지 완성</h3>
                <p className="text-slate-400 text-lg mb-6">
                  한국어로 제품 정보만 입력하세요. AI가 레이아웃을 구성하고 중국어/영어로 완벽하게 번역된 상세페이지를 즉시 만들어냅니다.
                </p>
                <ul className="space-y-3">
                  {['패션 전문 용어 맞춤 번역', '중국 바이어 선호 레이아웃 적용', '위안화 가격 자동 변환 표시'].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-blue-400" /> {text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full">
                <div className="aspect-square bg-slate-800 rounded-2xl border border-slate-700 p-8 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    [다국어 상세페이지 UI 데모]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparison" className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">압도적인 경쟁력</h2>
            <p className="text-slate-600">타 상가 대비 저렴한 입점료에 AI 플랫폼까지 무상으로 제공합니다.</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-6 font-bold text-slate-500">비교 항목</div>
              <div className="p-6 font-black text-xl text-amber-600 bg-amber-50/50 text-center border-l border-r border-amber-100">UUS (JUNTO AI)</div>
              <div className="p-6 font-bold text-slate-900 text-center">A 상가 (경쟁사)</div>
            </div>
            {[
              { label: "월 입점료", uus: "58만원", apm: "100만원 이상" },
              { label: "AI 모델컷 생성", uus: "무료 제공 (플랜별 상이)", apm: "지원 안함 (직접 촬영)" },
              { label: "다국어 상세페이지", uus: "자동 생성 지원", apm: "지원 안함" },
              { label: "중국 바이어 대응", uus: "중국어 UI / 더빙 지원", apm: "개별 대응 필요" },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-3 border-b border-slate-100 last:border-0">
                <div className="p-6 text-slate-600 font-medium flex items-center">{row.label}</div>
                <div className="p-6 text-center font-bold text-slate-900 bg-amber-50/30 border-l border-r border-amber-50 flex items-center justify-center">
                  {row.uus}
                </div>
                <div className="p-6 text-center text-slate-500 flex items-center justify-center">{row.apm}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">합리적인 구독 플랜</h2>
            <p className="text-slate-600">매장의 규모와 필요에 맞는 요금제를 선택하세요.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 flex flex-col">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Basic</h3>
              <p className="text-slate-500 text-sm mb-6">소규모 매장을 위한 기본 플랜</p>
              <div className="mb-8">
                <span className="text-4xl font-black text-slate-900">9.9</span>
                <span className="text-slate-500 font-medium">만원 / 월</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['모델컷 50장/월', '상세페이지 10개/월', '숏폼 영상 3개/월', '한국어만 지원', '셀프서비스 전용'].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-slate-400" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                기본 플랜 선택
              </button>
            </div>

            {/* Pro */}
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col relative transform md:-translate-y-4 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-slate-900 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-6">가장 많은 도매상이 선택한 플랜</p>
              <div className="mb-8">
                <span className="text-4xl font-black text-white">29.9</span>
                <span className="text-slate-400 font-medium">만원 / 월</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['모델컷 200장/월', '상세페이지 50개/월', '숏폼 영상 15개/월', '한/중/영 3개 언어 지원', '대행 서비스 포함', '바닥컷 촬영 월 2회 지원'].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 transition-colors">
                추천 플랜 선택
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 flex flex-col">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Enterprise</h3>
              <p className="text-slate-500 text-sm mb-6">대형 매장을 위한 무제한 플랜</p>
              <div className="mb-8">
                <span className="text-4xl font-black text-slate-900">별도 협의</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['무제한 생성', '전 기능 이용 가능', '전담 CS 매니저 배정', '맞춤 AI 모델 학습', 'API 연동 지원', '바닥컷 무제한'].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-slate-400" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                도입 문의하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 bg-amber-400">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">
            지금 바로 AI 플랫폼을 경험해보세요
          </h2>
          <p className="text-amber-900 text-lg mb-10">
            입점 상담을 신청하시면 담당자가 상세히 안내해 드립니다.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/app" className="bg-slate-900 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-800 transition-colors">
              플랫폼 로그인
            </Link>
            <button className="bg-white text-slate-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-50 transition-colors">
              카카오톡 상담하기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
