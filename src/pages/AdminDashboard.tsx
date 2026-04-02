import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { API_KEYS, getAllApiKeys, setApiKey } from '../lib/apiSettings';
import { BarChart3, Users, Image as ImageIcon, Clock, AlertCircle, ArrowLeft, Download, X, Key } from 'lucide-react';

interface UsageStat {
  total: number;
  success: number;
  error: number;
  byUser: Record<string, { email: string; count: number; lastUsed: string }>;
  byDay: Record<string, number>;
  byHour: Record<string, number>;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<UsageStat | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<any[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [domainLogs, setDomainLogs] = useState<any[]>([]);
  const [domainStats, setDomainStats] = useState<Record<string, { allowed: number; blocked: number; last: string }>>({});
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [apiKeySaving, setApiKeySaving] = useState<Record<string, boolean>>({});
  const [apiKeyToast, setApiKeyToast] = useState<{ id: string; type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user, period]);

  useEffect(() => {
    if (user) loadApiKeys();
  }, [user]);

  const loadApiKeys = async () => {
    const all = await getAllApiKeys();
    const vals: Record<string, string> = {};
    Object.values(API_KEYS).forEach(k => {
      vals[k.id] = all[k.id]?.value || '';
    });
    setApiKeyValues(vals);
  };

  const handleSaveApiKey = async (keyId: string, label: string) => {
    setApiKeySaving(prev => ({ ...prev, [keyId]: true }));
    const ok = await setApiKey(keyId, apiKeyValues[keyId] || '', label);
    setApiKeySaving(prev => ({ ...prev, [keyId]: false }));
    setApiKeyToast({ id: keyId, type: ok ? 'success' : 'error', msg: ok ? '저장되었습니다' : '저장 실패' });
    setTimeout(() => setApiKeyToast(null), 2500);
  };

  const loadData = async () => {
    setIsLoading(true);

    let query = supabase
      .from('api_usage_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // 기간 필터
    const now = new Date();
    if (period === 'today') {
      query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', weekAgo.toISOString());
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', monthAgo.toISOString());
    }

    const { data, error } = await query.limit(1000);
    if (error) { setIsLoading(false); return; }

    const items = data || [];
    setLogs(items);

    // 통계 계산
    const stat: UsageStat = {
      total: items.length,
      success: items.filter(i => i.status === 'success').length,
      error: items.filter(i => i.status === 'error').length,
      byUser: {},
      byDay: {},
      byHour: {},
    };

    items.forEach(item => {
      // 유저별
      const uid = item.user_id || 'anonymous';
      if (!stat.byUser[uid]) {
        stat.byUser[uid] = { email: item.user_email || '비로그인', count: 0, lastUsed: item.created_at };
      }
      stat.byUser[uid].count++;

      // 일별
      const day = new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      stat.byDay[day] = (stat.byDay[day] || 0) + 1;

      // 시간대별
      const hour = new Date(item.created_at).getHours() + '시';
      stat.byHour[hour] = (stat.byHour[hour] || 0) + 1;
    });

    setStats(stat);

    // 생성 이미지 조회
    const { data: imgData } = await supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setImages(imgData || []);

    // 도메인 접근 로그 조회
    const { data: domainData } = await supabase
      .from('domain_access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    const dLogs = domainData || [];
    setDomainLogs(dLogs);

    // 도메인별 통계
    const dStats: Record<string, { allowed: number; blocked: number; last: string }> = {};
    dLogs.forEach((log: any) => {
      const o = log.origin || 'unknown';
      if (!dStats[o]) dStats[o] = { allowed: 0, blocked: 0, last: log.created_at };
      if (log.status === 'allowed') dStats[o].allowed++;
      else dStats[o].blocked++;
    });
    setDomainStats(dStats);

    setIsLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center"><div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" /></div>;

  const costPerImage = 0.101; // Flash 2K 기준 USD
  const estimatedCost = stats ? (stats.success * costPerImage).toFixed(2) : '0.00';
  const estimatedCostKRW = stats ? Math.round(stats.success * costPerImage * 1515) : 0;

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans antialiased">
      {/* 상단바 */}
      <div className="bg-white border-b border-neutral-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-neutral-400 hover:text-neutral-900 transition-colors no-underline"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-[15px] font-bold text-neutral-900">관리자 대시보드</h1>
        </div>
        <span className="text-[12px] text-neutral-400">{user?.email}</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 기간 필터 */}
        <div className="flex gap-2 mb-6">
          {[
            { label: '오늘', value: 'today' as const },
            { label: '7일', value: 'week' as const },
            { label: '30일', value: 'month' as const },
            { label: '전체', value: 'all' as const },
          ].map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${period === p.value ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50'}`}>{p.label}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" /></div>
        ) : stats ? (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="text-[11px] text-neutral-400 font-semibold">총 API 콜</span>
                </div>
                <p className="text-[28px] font-bold text-neutral-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] text-neutral-400 font-semibold">성공</span>
                </div>
                <p className="text-[28px] font-bold text-emerald-600">{stats.success}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-[11px] text-neutral-400 font-semibold">에러</span>
                </div>
                <p className="text-[28px] font-bold text-red-500">{stats.error}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] text-neutral-400 font-semibold">예상 비용</span>
                </div>
                <p className="text-[28px] font-bold text-neutral-900">${estimatedCost}</p>
                <p className="text-[11px] text-neutral-400">≈ {estimatedCostKRW.toLocaleString()}원</p>
              </div>
            </div>

            {/* 유저별 사용량 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <h3 className="text-[14px] font-bold text-neutral-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> 계정별 사용량</h3>
                <div className="space-y-3">
                  {(Object.entries(stats.byUser) as [string, { email: string; count: number; lastUsed: string }][])
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([uid, info]) => (
                      <div key={uid} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                        <div>
                          <p className="text-[13px] font-medium text-neutral-900">{info.email}</p>
                          <p className="text-[10px] text-neutral-400">마지막: {new Date(info.lastUsed).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[15px] font-bold text-neutral-900">{info.count}회</p>
                          <p className="text-[10px] text-neutral-400">≈ {Math.round(info.count * costPerImage * 1515).toLocaleString()}원</p>
                        </div>
                      </div>
                    ))}
                  {Object.keys(stats.byUser).length === 0 && <p className="text-[13px] text-neutral-400 text-center py-4">데이터가 없습니다</p>}
                </div>
              </div>

              {/* 일별 사용량 */}
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <h3 className="text-[14px] font-bold text-neutral-900 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-500" /> 일별 사용량</h3>
                <div className="space-y-2">
                  {(Object.entries(stats.byDay) as [string, number][]).map(([day, count]) => {
                    const maxCount = Math.max(...(Object.values(stats.byDay) as number[]));
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="text-[12px] text-neutral-500 w-16 shrink-0">{day}</span>
                        <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-[12px] font-semibold text-neutral-700 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                  {Object.keys(stats.byDay).length === 0 && <p className="text-[13px] text-neutral-400 text-center py-4">데이터가 없습니다</p>}
                </div>
              </div>
            </div>

            {/* 최근 로그 */}
            <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
              <h3 className="text-[14px] font-bold text-neutral-900 mb-4">최근 API 호출 로그</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="text-left py-2 pr-4 text-neutral-400 font-semibold">시간</th>
                      <th className="text-left py-2 pr-4 text-neutral-400 font-semibold">계정</th>
                      <th className="text-left py-2 pr-4 text-neutral-400 font-semibold">모델</th>
                      <th className="text-left py-2 pr-4 text-neutral-400 font-semibold">해상도</th>
                      <th className="text-left py-2 pr-4 text-neutral-400 font-semibold">비율</th>
                      <th className="text-left py-2 text-neutral-400 font-semibold">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 50).map(log => (
                      <tr key={log.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                        <td className="py-2 pr-4 text-neutral-600">{new Date(log.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-2 pr-4 text-neutral-600">{log.user_email || '-'}</td>
                        <td className="py-2 pr-4 text-neutral-600">{log.model?.includes('flash') ? 'Flash' : 'Pro'}</td>
                        <td className="py-2 pr-4 text-neutral-600">{log.image_size || '-'}</td>
                        <td className="py-2 pr-4 text-neutral-600">{log.aspect_ratio || '-'}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{log.status === 'success' ? '성공' : '실패'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && <p className="text-[13px] text-neutral-400 text-center py-8">API 호출 기록이 없습니다</p>}
              </div>
            </div>

            {/* 생성 이미지 갤러리 */}
            <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-neutral-900 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-500" /> 생성 이미지</h3>
                <span className="text-[11px] text-neutral-400">{images.length}장</span>
              </div>
              {images.length === 0 ? (
                <p className="text-[13px] text-neutral-400 text-center py-8">생성된 이미지가 없습니다</p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                  {images.map((img: any) => (
                    <div key={img.id} className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-neutral-100 cursor-pointer" onClick={() => setPreviewImg(img.image_url)}>
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex flex-col items-start justify-end p-1.5 opacity-0 group-hover:opacity-100">
                        <span className="text-[9px] text-white font-medium bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">{img.user_id?.slice(0, 8) || '?'}</span>
                        <span className="text-[9px] text-white/80 mt-0.5">{new Date(img.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* 도메인 접근 로그 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* 도메인별 통계 */}
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <h3 className="text-[14px] font-bold text-neutral-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" /> 도메인별 접근 현황</h3>
                <div className="space-y-3">
                  {(Object.entries(domainStats) as [string, { allowed: number; blocked: number; last: string }][])
                    .sort((a, b) => (b[1].allowed + b[1].blocked) - (a[1].allowed + a[1].blocked))
                    .map(([domain, info]) => (
                      <div key={domain} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-neutral-900 truncate">{domain || '(빈 origin)'}</p>
                          <p className="text-[10px] text-neutral-400">마지막: {new Date(info.last).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">{info.allowed} 허용</span>
                          {info.blocked > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">{info.blocked} 차단</span>}
                        </div>
                      </div>
                    ))}
                  {Object.keys(domainStats).length === 0 && <p className="text-[13px] text-neutral-400 text-center py-4">도메인 접근 기록이 없습니다</p>}
                </div>
              </div>

              {/* 최근 차단 로그 */}
              <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
                <h3 className="text-[14px] font-bold text-neutral-900 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /> 최근 차단된 접근</h3>
                <div className="space-y-2">
                  {domainLogs.filter((l: any) => l.status === 'blocked').slice(0, 15).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-neutral-50">
                      <span className="text-[11px] text-red-600 font-medium truncate flex-1">{log.origin || '(빈 origin)'}</span>
                      <span className="text-[10px] text-neutral-400 shrink-0 ml-2">{new Date(log.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {domainLogs.filter((l: any) => l.status === 'blocked').length === 0 && <p className="text-[13px] text-neutral-400 text-center py-4">차단된 접근이 없습니다 (좋은 소식!)</p>}
                </div>
              </div>
            </div>

            {/* API 키 관리 */}
            <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm mt-6">
              <h3 className="text-[14px] font-bold text-neutral-900 mb-5 flex items-center gap-2">
                <Key className="w-4 h-4 text-violet-500" /> API 키 관리
              </h3>
              <div className="space-y-4">
                {Object.values(API_KEYS).map(k => (
                  <div key={k.id} className="flex items-center gap-3">
                    <label className="w-52 shrink-0 text-[12px] font-medium text-neutral-600">{k.label}</label>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        placeholder={k.placeholder}
                        value={apiKeyValues[k.id] || ''}
                        onChange={e => setApiKeyValues(prev => ({ ...prev, [k.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 focus:bg-white transition-colors font-mono"
                      />
                      {apiKeyToast?.id === k.id && (
                        <span className={`absolute right-[90px] top-1/2 -translate-y-1/2 text-[11px] font-semibold ${apiKeyToast.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {apiKeyToast.msg}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleSaveApiKey(k.id, k.label)}
                      disabled={apiKeySaving[k.id]}
                      className="shrink-0 px-4 py-2 bg-neutral-900 text-white text-[12px] font-semibold rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {apiKeySaving[k.id] ? '저장중...' : '저장'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* 이미지 프리뷰 모달 */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-3xl max-h-[85vh] mx-6" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
            <div className="absolute -top-11 right-0 flex gap-2">
              <button onClick={() => { const a = document.createElement('a'); a.href = previewImg; a.download = `admin-${Date.now()}.png`; a.click(); }} className="px-3 py-1.5 bg-white rounded-lg text-[11px] font-semibold text-neutral-900 hover:bg-neutral-100 cursor-pointer flex items-center gap-1">
                <Download className="w-3 h-3" /> 저장
              </button>
              <button onClick={() => setPreviewImg(null)} className="px-3 py-1.5 bg-white/20 rounded-lg text-[11px] font-semibold text-white hover:bg-white/30 cursor-pointer flex items-center gap-1">
                <X className="w-3 h-3" /> 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
