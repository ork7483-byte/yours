import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import MobileMenu from '../components/MobileMenu';
import { Download, Trash2, X, Image as ImageIcon, Video as VideoIcon, LogIn } from 'lucide-react';

interface WorkItem {
  id: string;
  image_url: string;
  created_at: string;
  prompt_summary?: string | null;
}

function isVideo(item: WorkItem) {
  return (
    item.prompt_summary?.startsWith('영상') ||
    item.image_url?.includes('.mp4') ||
    item.image_url?.includes('.webm')
  );
}

export default function MyWork() {
  const { user, loading, signOut } = useAuth();
  const loc = useLocation();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [preview, setPreview] = useState<WorkItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    supabase
      .from('generated_images')
      .select('id, image_url, created_at, prompt_summary')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setItems(data || []);
        setBusy(false);
      });
  }, [user]);

  if (!loading && !user) return <Navigate to="/login?redirect=/my" replace />;

  const images = items.filter(it => !isVideo(it));
  const videos = items.filter(it => isVideo(it));

  async function handleDelete(item: WorkItem) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('generated_images').delete().eq('id', item.id);
    if (!error) setItems(prev => prev.filter(p => p.id !== item.id));
  }

  async function handleDownload(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = blob.type.includes('video') ? 'mp4' : blob.type.includes('png') ? 'png' : 'jpg';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `junto-${Date.now()}.${ext}`;
      a.click();
    } catch {
      window.open(url, '_blank');
    }
  }

  const showImages = activeTab === 'all' || activeTab === 'image';
  const showVideos = activeTab === 'all' || activeTab === 'video';

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight text-black no-underline">
            Junto AI
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Home', href: '/' },
              { label: 'AI 피팅', href: '/fitting' },
              { label: 'AI 영상', href: '/video' },
              { label: '내 작업', href: '/my' },
              { label: 'Help', href: '/help' },
            ].map(item => (
              <Link
                key={item.href}
                to={item.href}
                className={`px-3 py-1.5 text-[13px] rounded-lg no-underline transition-colors ${
                  loc.pathname === item.href
                    ? 'text-neutral-900 bg-neutral-100 font-semibold'
                    : 'text-neutral-400 font-medium hover:text-neutral-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={signOut}
                className="hidden md:block text-[13px] text-neutral-400 hover:text-neutral-900"
              >
                로그아웃
              </button>
            )}
            <MobileMenu />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[1.8rem] md:text-[2.4rem] font-bold text-black tracking-tight">
              내 작업
            </h1>
            <p className="text-[14px] text-neutral-500 mt-1">
              AI로 생성한 이미지와 영상을 한 곳에서
            </p>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-neutral-500">
              이미지 <b className="text-black">{images.length}</b>
            </span>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-500">
              영상 <b className="text-black">{videos.length}</b>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b border-neutral-100">
          {[
            { id: 'all', label: '전체' },
            { id: 'image', label: '이미지' },
            { id: 'video', label: '영상' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-black border-black'
                  : 'text-neutral-400 border-transparent hover:text-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading / Empty */}
        {busy && (
          <div className="py-20 text-center text-neutral-400 text-[14px]">불러오는 중...</div>
        )}
        {!busy && items.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-neutral-400 text-[14px] mb-4">아직 생성한 작업이 없어요</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/fitting"
                className="px-4 py-2 text-[13px] font-semibold bg-black text-white rounded-lg no-underline hover:bg-neutral-800"
              >
                AI 피팅 시작
              </Link>
              <Link
                to="/video"
                className="px-4 py-2 text-[13px] font-semibold border border-neutral-200 text-black rounded-lg no-underline hover:bg-neutral-50"
              >
                AI 영상 시작
              </Link>
            </div>
          </div>
        )}

        {/* Images Section */}
        {!busy && showImages && images.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-neutral-500" />
              <h2 className="text-[15px] font-semibold text-black">이미지</h2>
              <span className="text-[12px] text-neutral-400">({images.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  kind="image"
                  onClick={() => setPreview(item)}
                  onDelete={() => handleDelete(item)}
                  onDownload={() => handleDownload(item.image_url)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Videos Section */}
        {!busy && showVideos && videos.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <VideoIcon className="w-4 h-4 text-neutral-500" />
              <h2 className="text-[15px] font-semibold text-black">영상</h2>
              <span className="text-[12px] text-neutral-400">({videos.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {videos.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  kind="video"
                  onClick={() => setPreview(item)}
                  onDelete={() => handleDelete(item)}
                  onDownload={() => handleDownload(item.image_url)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty section for current tab */}
        {!busy && activeTab === 'image' && images.length === 0 && items.length > 0 && (
          <div className="py-12 text-center text-neutral-400 text-[14px]">
            생성된 이미지가 없어요
          </div>
        )}
        {!busy && activeTab === 'video' && videos.length === 0 && items.length > 0 && (
          <div className="py-12 text-center text-neutral-400 text-[14px]">
            생성된 영상이 없어요
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            {isVideo(preview) ? (
              <video
                src={preview.image_url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            ) : (
              <img
                src={preview.image_url}
                alt=""
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
            )}
            <button
              onClick={() => handleDownload(preview.image_url)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-neutral-100"
            >
              <Download className="w-4 h-4" />
              다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaCard({
  item,
  kind,
  onClick,
  onDelete,
  onDownload,
}: {
  item: WorkItem;
  kind: 'image' | 'video';
  onClick: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-100 cursor-pointer">
      <div onClick={onClick} className="w-full h-full">
        {kind === 'video' ? (
          <video
            src={item.image_url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {/* Overlay Actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onDownload(); }}
          className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-black"
          title="다운로드"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-8 h-8 rounded-full bg-white/90 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-black"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Video Badge */}
      {kind === 'video' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded font-medium">
          VIDEO
        </div>
      )}
    </div>
  );
}
