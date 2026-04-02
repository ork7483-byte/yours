import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../lib/useAuth';
import { saveGeneratedImage, getMyImages, deleteImage } from '../lib/imageStorage';
import { 
  BarChart3, 
  Bell, 
  Camera, 
  ChevronDown, 
  CreditCard, 
  FileText, 
  Globe, 
  HelpCircle, 
  Image as ImageIcon, 
  LayoutDashboard, 
  LogOut, 
  Package, 
  Settings, 
  Upload, 
  Video,
  Sparkles,
  CheckCircle2,
  PlaySquare,
  Calendar,
  Clock,
  MessageSquare,
  Wand2,
  Languages,
  Music,
  Download,
  Maximize2,
  Cloud,
  LogIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link, useParams, useLocation } from 'react-router-dom';

// 폴더 내 이미지 자동 로드
const topImages = Object.keys(import.meta.glob('/public/images/fitting/cloth/top/*.{jpg,jpeg,png,webp}', { eager: false })).map(p => p.replace('/public', ''));
const bottomImages = Object.keys(import.meta.glob('/public/images/fitting/cloth/bottom/*.{jpg,jpeg,png,webp}', { eager: false })).map(p => p.replace('/public', ''));
const onepieceImages = Object.keys(import.meta.glob('/public/images/fitting/cloth/onepiece/*.{jpg,jpeg,png,webp}', { eager: false })).map(p => p.replace('/public', ''));
const modelImages = Object.keys(import.meta.glob('/public/images/fitting/models/*.{jpg,jpeg,png,webp}', { eager: false })).map(p => p.replace('/public', ''));
const poseImages = Object.keys(import.meta.glob('/public/images/fitting/poses/*.{jpg,jpeg,png,webp}', { eager: false })).map(p => p.replace('/public', ''));
const bgImages = Object.keys(import.meta.glob('/public/images/fitting/backgrounds/*.{jpg,jpeg,png,webp}', { eager: false })).map(p => p.replace('/public', ''));

export default function Dashboard() {
  const loc = useLocation();
  const tabMap: Record<string, string> = { '/fitting': 'lookbook', '/video': 'video', '/reservation': 'floorcut', '/help': 'cs' };
  const [activeTab, setActiveTab] = useState(tabMap[loc.pathname] || 'lookbook');
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState('2/3');
  const [shootingStyle, setShootingStyle] = useState('studio');
  const [lightingDir, setLightingDir] = useState('front');
  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryPreview, setGalleryPreview] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);

  // UI States for Demo
  const [lookbookModel, setLookbookModel] = useState('korean_f');
  const [lookbookPose, setLookbookPose] = useState('pose1');
  const [lookbookBg, setLookbookBg] = useState('studio');
  const [clothingMode, setClothingMode] = useState<'separates' | 'onepiece'>('separates');
  const [uploadedTop, setUploadedTop] = useState<{ data: string, mimeType: string, url: string } | null>(null);
  const [uploadedBottom, setUploadedBottom] = useState<{ data: string, mimeType: string, url: string } | null>(null);
  const [uploadedDress, setUploadedDress] = useState<{ data: string, mimeType: string, url: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [customModels, setCustomModels] = useState<{id: string, img: string, data: string, mimeType: string}[]>([]);
  const [customPoses, setCustomPoses] = useState<{id: string, img: string, data: string, mimeType: string}[]>([]);
  const [customBgs, setCustomBgs] = useState<{id: string, img: string, data: string, mimeType: string}[]>([]);

  // 선택된 모델/포즈/배경의 이미지 데이터 (fetch된 base64)
  const [selectedModelData, setSelectedModelData] = useState<{data: string, mimeType: string} | null>(null);
  const [selectedPoseData, setSelectedPoseData] = useState<{data: string, mimeType: string} | null>(null);
  const [selectedBgData, setSelectedBgData] = useState<{data: string, mimeType: string} | null>(null);

  // 예시 이미지 선택 시 fetch→base64 변환
  const selectPresetFor = async (type: 'model' | 'pose' | 'bg', imgUrl: string, id: string) => {
    if (type === 'model') setLookbookModel(id);
    else if (type === 'pose') setLookbookPose(id);
    else setLookbookBg(id);
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const imgData = { data: base64, mimeType: blob.type || 'image/jpeg' };
        if (type === 'model') setSelectedModelData(imgData);
        else if (type === 'pose') setSelectedPoseData(imgData);
        else setSelectedBgData(imgData);
      };
      reader.readAsDataURL(blob);
    } catch {}
  };

  const [aiModel, setAiModel] = useState('gemini-3.1-flash-image-preview');
  const [imageResolution, setImageResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [modalPreview, setModalPreview] = useState<{ img: string; type: 'model' | 'pose' | 'bg'; id: string } | null>(null);
  const [detailLangs, setDetailLangs] = useState(['cn']);
  const [videoVibe, setVideoVibe] = useState('trendy');
  const [videoVoice, setVideoVoice] = useState('cn_f');
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    setActiveTab(tabMap[loc.pathname] || 'lookbook');
  }, [loc.pathname]);

  // 갤러리 로드
  const loadGallery = async () => {
    if (!user) return;
    setGalleryLoading(true);
    const { images } = await getMyImages(user.id);
    setGallery(images);
    setGalleryLoading(false);
  };

  useEffect(() => {
    if (user) loadGallery();
  }, [user]);

  const menuItems = [
    { id: 'lookbook', label: '제품 → 모델컷', icon: <ImageIcon className="w-5 h-5" /> },
    { id: 'video', label: '숏폼 영상 서비스', icon: <Video className="w-5 h-5" /> },
    { id: 'floorcut', label: '바닥컷 촬영 예약', icon: <Camera className="w-5 h-5" /> },
    { id: 'cs', label: '대행 요청', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  const selectPresetImage = async (type: 'top' | 'bottom' | 'dress', imgUrl: string) => {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const newImage = { data: base64String, mimeType: blob.type || 'image/jpeg', url: imgUrl };
        if (type === 'top') setUploadedTop(newImage);
        else if (type === 'bottom') setUploadedBottom(newImage);
        else if (type === 'dress') setUploadedDress(newImage);
        setErrorMsg(null);
      };
      reader.readAsDataURL(blob);
    } catch { setErrorMsg('이미지를 불러올 수 없습니다.'); }
  };

  const handleClothingUpload = (type: 'top' | 'bottom' | 'dress', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const newImage = {
          data: base64String,
          mimeType: file.type,
          url: URL.createObjectURL(file)
        };
        if (type === 'top') setUploadedTop(newImage);
        else if (type === 'bottom') setUploadedBottom(newImage);
        else if (type === 'dress') setUploadedDress(newImage);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomUpload = (type: 'model' | 'pose' | 'bg', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const newId = `custom_${type}_${Date.now()}`;
        const newItem = { 
          id: newId, 
          img: URL.createObjectURL(file),
          data: base64String,
          mimeType: file.type
        };
        
        const imgData = { data: base64String, mimeType: file.type };
        if (type === 'model') {
          setCustomModels(prev => [...prev, newItem]);
          setLookbookModel(newId);
          setSelectedModelData(imgData);
        } else if (type === 'pose') {
          setCustomPoses(prev => [...prev, newItem]);
          setLookbookPose(newId);
          setSelectedPoseData(imgData);
        } else if (type === 'bg') {
          setCustomBgs(prev => [...prev, newItem]);
          setLookbookBg(newId);
          setSelectedBgData(imgData);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (clothingMode === 'separates' && !uploadedTop && !uploadedBottom) {
      setErrorMsg("상의 또는 하의 이미지를 최소 1장 첨부해주세요.");
      return;
    }
    if (clothingMode === 'onepiece' && !uploadedDress) {
      setErrorMsg("원피스 이미지를 첨부해주세요.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    
    try {
      const apiKey = (typeof process !== 'undefined' ? process.env.API_KEY || process.env.GEMINI_API_KEY : undefined) || import.meta.env.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      // 모델/포즈/배경 이미지 데이터 결정 (커스텀 업로드 or 예시 프리셋)
      const customModel = customModels.find(m => m.id === lookbookModel);
      const customPose = customPoses.find(p => p.id === lookbookPose);
      const customBg = customBgs.find(b => b.id === lookbookBg);

      const modelData = customModel ? { data: customModel.data, mimeType: customModel.mimeType } : selectedModelData;
      const poseData = customPose ? { data: customPose.data, mimeType: customPose.mimeType } : selectedPoseData;
      const bgData = customBg ? { data: customBg.data, mimeType: customBg.mimeType } : selectedBgData;

      const parts: any[] = [];
      let stepCounter = 1;

      // ═══════════════════════════════════════════
      // 공식 가이드 기반 최적화 프롬프트 엔진
      // ═══════════════════════════════════════════

      const styleMap: Record<string, string> = {
        studio: 'in a clean white photography studio with soft, even lighting',
        street: 'on an urban street during golden hour with natural bokeh background',
        editorial: 'in a high-fashion editorial setting with dramatic cinematic lighting',
        minimal: 'in a minimalist setting with soft neutral tones and gentle light',
        outdoor: 'in a beautiful outdoor setting with warm golden sunlight',
      };

      const lightMap: Record<string, string> = {
        front: 'with soft front lighting at 45 degrees',
        side: 'with dramatic side lighting emphasizing fabric texture',
        back: 'with ethereal backlighting creating a rim light effect',
        natural: 'with natural ambient window light',
      };

      // 시스템 프롬프트 — 간결하고 서술적 (공식 가이드: 서술형 > 키워드 나열)
      const styleDesc = styleMap[shootingStyle] || styleMap.studio;
      const lightDesc = lightMap[lightingDir] || lightMap.front;

      parts.push({ text: `Generate a photorealistic fashion lookbook photograph ${styleDesc} ${lightDesc}. The image should look like it was shot by a professional fashion photographer for a luxury brand catalog. Each reference image below serves exactly one purpose — clothing for the garment only, face for appearance only, pose for body position only, background for the scene only.\n\n` });

      let instructions = "\nCombine all elements into one seamless photograph where:";

      // 의상
      if (clothingMode === 'separates') {
        if (uploadedTop && uploadedBottom) {
          parts.push({ text: `${stepCounter++}. The TOP garment to wear:` });
          parts.push({ inlineData: { data: uploadedTop.data, mimeType: uploadedTop.mimeType } });
          parts.push({ text: `\n${stepCounter++}. The BOTTOM garment to wear:` });
          parts.push({ inlineData: { data: uploadedBottom.data, mimeType: uploadedBottom.mimeType } });
          instructions += "\n- The model wears both garments exactly as shown — same fabric, color, texture, pattern, and all details preserved.";
        } else if (uploadedTop) {
          parts.push({ text: `${stepCounter++}. The TOP garment to wear:` });
          parts.push({ inlineData: { data: uploadedTop.data, mimeType: uploadedTop.mimeType } });
          instructions += "\n- The model wears this top with a complementary neutral bottom.";
        } else if (uploadedBottom) {
          parts.push({ text: `${stepCounter++}. The BOTTOM garment to wear:` });
          parts.push({ inlineData: { data: uploadedBottom.data, mimeType: uploadedBottom.mimeType } });
          instructions += "\n- The model wears this bottom with a complementary neutral top.";
        }
      } else if (clothingMode === 'onepiece' && uploadedDress) {
        parts.push({ text: `${stepCounter++}. The dress/outfit to wear:` });
        parts.push({ inlineData: { data: uploadedDress.data, mimeType: uploadedDress.mimeType } });
        instructions += "\n- The model wears this outfit exactly as shown — same fabric, silhouette, and all details preserved.";
      }

      // 모델
      if (modelData) {
        parts.push({ text: `\n${stepCounter++}. Face/appearance reference (use face and body type only, ignore their clothing):` });
        parts.push({ inlineData: { data: modelData.data, mimeType: modelData.mimeType } });
        instructions += "\n- The model's face and body type match this reference exactly.";
      } else {
        instructions += "\n- A professional fashion model with natural beauty.";
      }

      // 포즈
      if (poseData) {
        parts.push({ text: `\n${stepCounter++}. Pose reference (replicate body position only, ignore face and clothing):` });
        parts.push({ inlineData: { data: poseData.data, mimeType: poseData.mimeType } });
        instructions += "\n- The model holds this exact pose.";
      } else {
        instructions += "\n- The model stands in a natural, confident three-quarter pose.";
      }

      // 배경
      if (bgData) {
        parts.push({ text: `\n${stepCounter++}. Background/scene reference (use environment only, ignore people):` });
        parts.push({ inlineData: { data: bgData.data, mimeType: bgData.mimeType } });
        instructions += "\n- The background matches this scene.";
      }

      instructions += "\n\nThe clothing must drape naturally on the body with realistic folds and shadows. The final image should be indistinguishable from a real photograph.";

      const ratioLabel = imageRatio.replace('/', ':');
      
      parts.push({ text: instructions });

      const resMap: Record<string, number> = { '0.5K': 512, '1K': 1024, '2K': 2048, '4K': 4096 };
      const generateConfig: any = {
        aspectRatio: ratioLabel,
        thinkingConfig: { thinkingLevel: 'HIGH' },
        imageResolution: resMap[imageResolution] || 1024,
      };
      if (aiModel === 'gemini-3-pro-image-preview') {
        generateConfig.responseModalities = ['TEXT', 'IMAGE'];
      }

      const response = await ai.models.generateContent({
        model: aiModel,
        contents: {
          parts: parts,
        },
        config: generateConfig,
      });

      let newImageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (newImageUrl) {
        setGeneratedImage(newImageUrl);
        // 자동 클라우드 저장
        if (user) {
          saveGeneratedImage(newImageUrl, user.id, `피팅 ${ratioLabel}`).then(({ error }) => {
            if (!error) loadGallery();
          });
        }
      } else {
        setErrorMsg("이미지 생성에 실패했습니다. (응답에 이미지 데이터가 없습니다)");
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      const errMsg = error.message || JSON.stringify(error);
      if (errMsg.includes("Requested entity was not found") || errMsg.includes("permission denied")) {
        setHasApiKey(false);
        setErrorMsg("API 키 권한이 없거나 유효하지 않습니다. 다시 설정해주세요.");
      } else {
        setErrorMsg(`오류가 발생했습니다: ${errMsg}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  };

  const renderContent = () => {
    if (!hasApiKey) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
            <Sparkles className="w-12 h-12 text-slate-900 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">API 키 설정 필요</h2>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              고품질 이미지 생성 모델(Pro 2)을 사용하려면 결제가 등록된 Google Cloud 프로젝트의 API 키를 선택해야 합니다.
              <br/><br/>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">빌링 문서 확인하기</a>
            </p>
            <button 
              onClick={async () => {
                if ((window as any).aistudio) {
                  await (window as any).aistudio.openSelectKey();
                  setHasApiKey(true);
                }
              }}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              API 키 선택하기
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'lookbook': {
        const handleThumbClick = (img: string, type: 'model' | 'pose' | 'bg', id: string) => {
          setModalPreview({ img, type, id });
        };
        const handleModalSelect = () => {
          if (!modalPreview) return;
          selectPresetFor(modalPreview.type, modalPreview.img, modalPreview.id);
          setModalPreview(null);
        };
        const isSelected = (type: 'model' | 'pose' | 'bg', id: string) => {
          if (type === 'model') return lookbookModel === id;
          if (type === 'pose') return lookbookPose === id;
          return lookbookBg === id;
        };

        return (
          <div className="flex flex-col md:flex-row h-full min-h-screen bg-[#FAFAF9]">
            {/* 좌측 패널 */}
            <div className="w-full md:w-[360px] shrink-0 bg-white flex flex-col border-b md:border-b-0 md:border-r border-neutral-100">
              <div className="flex-1 overflow-y-auto py-6 px-5 md:py-4 md:px-5 flex flex-col gap-0">

                {/* 01 의상 */}
                <div className="mb-2 bg-white rounded-xl p-3.5 pl-4 border border-neutral-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-[10px] text-neutral-600 tracking-[0.15em] tabular-nums select-none font-semibold">01</span>
                    <h3 className="text-[13px] font-bold text-neutral-900">의상</h3>
                    <div className="flex bg-white p-0.5 rounded-lg ml-auto shadow-sm border border-neutral-100" role="tablist">
                      <button role="tab" aria-selected={clothingMode === 'separates'} onClick={() => setClothingMode('separates')} className={`px-3.5 py-2 text-[11px] font-medium rounded-md transition-colors duration-200 cursor-pointer min-h-[36px] flex items-center ${clothingMode === 'separates' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}>상/하의</button>
                      <button role="tab" aria-selected={clothingMode === 'onepiece'} onClick={() => setClothingMode('onepiece')} className={`px-3.5 py-2 text-[11px] font-medium rounded-md transition-colors duration-200 cursor-pointer min-h-[36px] flex items-center ${clothingMode === 'onepiece' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}>원피스</button>
                    </div>
                  </div>
                  {clothingMode === 'separates' ? (
                    <div>
                      <p className="text-[11px] text-neutral-400 mb-2 font-medium uppercase tracking-wider">상의</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scroll-hide">
                        {topImages.map((img, i) => (
                          <button key={`top${i}`} onClick={() => selectPresetImage('top', img)} className={`w-[68px] h-[68px] shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-sm ${uploadedTop?.url === img ? 'border-neutral-900 shadow-md ring-2 ring-neutral-900/10' : 'border-neutral-200/60 hover:shadow-md'}`}>
                            <img src={img} alt="상의 예시" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button aria-label="상의 업로드" onClick={() => document.getElementById('top-upload')?.click()} className="w-[68px] h-[68px] shrink-0 bg-neutral-50 border border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 transition-all duration-200 flex items-center justify-center">
                          {uploadedTop && !uploadedTop.url.startsWith('/images') ? <img src={uploadedTop.url} alt="상의" className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-neutral-300" />}
                        </button>
                        <input id="top-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleClothingUpload('top', e)} />
                      </div>
                      <p className="text-[11px] text-neutral-400 mb-2 font-medium uppercase tracking-wider">하의</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
                        {bottomImages.map((img, i) => (
                          <button key={`bot${i}`} onClick={() => selectPresetImage('bottom', img)} className={`w-[68px] h-[68px] shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-sm ${uploadedBottom?.url === img ? 'border-neutral-900 shadow-md ring-2 ring-neutral-900/10' : 'border-neutral-200/60 hover:shadow-md'}`}>
                            <img src={img} alt="하의 예시" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button aria-label="하의 업로드" onClick={() => document.getElementById('bottom-upload')?.click()} className="w-[68px] h-[68px] shrink-0 bg-neutral-50 border border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 transition-all duration-200 flex items-center justify-center">
                          {uploadedBottom && !uploadedBottom.url.startsWith('/images') ? <img src={uploadedBottom.url} alt="하의" className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-neutral-300" />}
                        </button>
                        <input id="bottom-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleClothingUpload('bottom', e)} />
                      </div>
                      <button onClick={() => document.getElementById('bottom-upload')?.click()} className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 border border-dashed border-pink-300 text-pink-600 bg-pink-50/40 hover:bg-pink-100 transition-all cursor-pointer"><Upload className="w-3 h-3" /> 내 이미지 첨부</button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
                        {onepieceImages.map((img, i) => (
                          <button key={`dress${i}`} onClick={() => selectPresetImage('dress', img)} className={`w-[68px] h-[68px] shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-sm ${uploadedDress?.url === img ? 'border-neutral-900 shadow-md ring-2 ring-neutral-900/10' : 'border-neutral-200/60 hover:shadow-md'}`}>
                            <img src={img} alt="원피스 예시" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button aria-label="원피스 업로드" onClick={() => document.getElementById('dress-upload')?.click()} className="w-[68px] h-[68px] shrink-0 bg-neutral-50 border border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 transition-all duration-200 flex items-center justify-center">
                          {uploadedDress && !uploadedDress.url.startsWith('/images') ? <img src={uploadedDress.url} alt="원피스" className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-neutral-300" />}
                        </button>
                        <input id="dress-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleClothingUpload('dress', e)} />
                      </div>
                      <button onClick={() => document.getElementById('dress-upload')?.click()} className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 border border-dashed border-pink-300 text-pink-600 bg-pink-50/40 hover:bg-pink-100 transition-all cursor-pointer"><Upload className="w-3 h-3" /> 내 이미지 첨부</button>
                    </div>
                  )}
                </div>

                {/* 02 모델 */}
                <div className="mb-2 bg-white rounded-xl p-3.5 pl-4 border border-neutral-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-[10px] text-neutral-600 tracking-[0.15em] tabular-nums select-none font-semibold">02</span>
                    <h3 className="text-[13px] font-bold text-neutral-900">모델</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
                      {[
                        ...modelImages.map((img, i) => ({ id: `model${i}`, img })),
                        ...customModels
                      ].map(m => (
                        <button key={m.id} aria-label={`모델 ${m.id} 미리보기`} onClick={() => handleThumbClick(m.img, 'model', m.id)} className={`w-[68px] h-[68px] shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 focus:outline-none ${lookbookModel === m.id ? 'border-neutral-900 shadow-md ring-2 ring-neutral-900/10' : 'border-neutral-200/60 hover:shadow-md'}`}>
                          <img src={m.img} alt={`모델 ${m.id}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      <button aria-label="커스텀 모델 업로드" onClick={() => document.getElementById('model-upload')?.click()} className="w-[68px] h-[68px] shrink-0 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-100 transition-all duration-200 focus:outline-none">
                        <span className="text-neutral-400 text-lg font-light">+</span>
                      </button>
                      <input id="model-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleCustomUpload('model', e)} />
                    </div>
                    <button onClick={() => document.getElementById('model-upload')?.click()} className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 border border-dashed border-blue-300 text-blue-600 bg-blue-50/40 hover:bg-blue-100 transition-all cursor-pointer"><Upload className="w-3 h-3" /> 내 이미지 첨부</button>
                </div>

                {/* 03 포즈 */}
                <div className="mb-2 bg-white rounded-xl p-3.5 pl-4 border border-neutral-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-[10px] text-neutral-600 tracking-[0.15em] tabular-nums select-none font-semibold">03</span>
                    <h3 className="text-[13px] font-bold text-neutral-900">포즈</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
                      {[
                        ...poseImages.map((img, i) => ({ id: `pose${i}`, img })),
                        ...customPoses
                      ].map(p => (
                        <button key={p.id} aria-label={`포즈 ${p.id} 미리보기`} onClick={() => handleThumbClick(p.img, 'pose', p.id)} className={`w-[68px] h-[68px] shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 focus:outline-none ${lookbookPose === p.id ? 'border-neutral-900 shadow-md ring-2 ring-neutral-900/10' : 'border-neutral-200/60 hover:shadow-md'}`}>
                          <img src={p.img} alt={`포즈 ${p.id}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      <button aria-label="커스텀 포즈 업로드" onClick={() => document.getElementById('pose-upload')?.click()} className="w-[68px] h-[68px] shrink-0 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-100 transition-all duration-200 focus:outline-none">
                        <span className="text-neutral-400 text-lg font-light">+</span>
                      </button>
                      <input id="pose-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleCustomUpload('pose', e)} />
                    </div>
                    <button onClick={() => document.getElementById('pose-upload')?.click()} className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 border border-dashed border-amber-300 text-amber-600 bg-amber-50/40 hover:bg-amber-100 transition-all cursor-pointer"><Upload className="w-3 h-3" /> 내 이미지 첨부</button>
                </div>

                {/* 04 배경 */}
                <div className="mb-2 bg-white rounded-xl p-3.5 pl-4 border border-neutral-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-[10px] text-neutral-600 tracking-[0.15em] tabular-nums select-none font-semibold">04</span>
                    <h3 className="text-[13px] font-bold text-neutral-900">배경</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
                      {[
                        ...bgImages.map((img, i) => ({ id: `bg${i}`, img })),
                        ...customBgs
                      ].map(b => (
                        <button key={b.id} aria-label={`배경 ${b.id} 미리보기`} onClick={() => handleThumbClick(b.img, 'bg', b.id)} className={`w-[68px] h-[68px] shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 focus:outline-none ${lookbookBg === b.id ? 'border-neutral-900 shadow-md ring-2 ring-neutral-900/10' : 'border-neutral-200/60 hover:shadow-md'}`}>
                          <img src={b.img} alt={`배경 ${b.id}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      <button aria-label="커스텀 배경 업로드" onClick={() => document.getElementById('bg-upload')?.click()} className="w-[68px] h-[68px] shrink-0 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-100 transition-all duration-200 focus:outline-none">
                        <span className="text-neutral-400 text-lg font-light">+</span>
                      </button>
                      <input id="bg-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleCustomUpload('bg', e)} />
                    </div>
                    <button onClick={() => document.getElementById('bg-upload')?.click()} className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 border border-dashed border-emerald-300 text-emerald-600 bg-emerald-50/40 hover:bg-emerald-100 transition-all cursor-pointer"><Upload className="w-3 h-3" /> 내 이미지 첨부</button>
                </div>

              </div>

              {/* 하단 고정: 에러 + 생성 버튼 */}
              <div className="px-5 py-4 md:px-5 md:py-4 border-t border-neutral-100 bg-white">
                {errorMsg && (
                  <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-medium text-center">{errorMsg}</div>
                )}
                <button onClick={handleGenerate} disabled={isGenerating} aria-label="이미지 생성하기" className={`w-full py-3 rounded-lg font-semibold text-[13px] tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${isGenerating ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2'}`}>
                  {isGenerating ? <span className="animate-pulse">생성 중...</span> : <><Wand2 className="w-4 h-4" /> 생성하기</>}
                </button>
              </div>
            </div>

            {/* 중앙 — 이미지 프리뷰 */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 md:px-6 md:py-5 relative min-h-0 bg-neutral-100/50">
              {/* 비율 선택 */}
              <div className="flex items-center gap-2.5 mb-3 bg-white rounded-xl px-4 py-2.5 border border-neutral-100 shadow-sm">
                <span className="text-[12px] font-semibold text-neutral-600 shrink-0">비율 :</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: '16:9', value: '16/9' },
                    { label: '3:2', value: '3/2' },
                    { label: '4:3', value: '4/3' },
                    { label: '1:1', value: '1/1' },
                    { label: '3:4', value: '3/4' },
                    { label: '2:3', value: '2/3' },
                    { label: '9:16', value: '9/16' },
                  ].map(r => (
                    <button key={r.value} onClick={() => setImageRatio(r.value)} className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${imageRatio === r.value ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-100 text-neutral-400 hover:text-neutral-600'}`}>{r.label}</button>
                  ))}
                </div>
              </div>
              {/* 스타일 + 조명 선택 */}
              <div className="flex gap-3 mb-3">
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-neutral-100 shadow-sm flex-1">
                  <span className="text-[12px] font-semibold text-neutral-600 shrink-0">스타일 :</span>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { label: '스튜디오', value: 'studio' },
                      { label: '스트릿', value: 'street' },
                      { label: '에디토리얼', value: 'editorial' },
                      { label: '미니멀', value: 'minimal' },
                      { label: '아웃도어', value: 'outdoor' },
                    ].map(s => (
                      <button key={s.value} onClick={() => setShootingStyle(s.value)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${shootingStyle === s.value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400 hover:text-neutral-600'}`}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-neutral-100 shadow-sm">
                  <span className="text-[12px] font-semibold text-neutral-600 shrink-0">조명 :</span>
                  <div className="flex gap-1">
                    {[
                      { label: '정면', value: 'front' },
                      { label: '측면', value: 'side' },
                      { label: '역광', value: 'back' },
                      { label: '자연', value: 'natural' },
                    ].map(l => (
                      <button key={l.value} onClick={() => setLightingDir(l.value)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${lightingDir === l.value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400 hover:text-neutral-600'}`}>{l.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-full max-w-sm md:max-w-lg xl:max-w-xl bg-neutral-200/40 rounded-lg overflow-hidden relative group" style={{ aspectRatio: imageRatio, boxShadow: '0 25px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                {generatedImage ? (
                  <>
                    <img src={generatedImage} alt="AI 생성 이미지" className={`w-full h-full object-cover transition-all duration-500 cursor-pointer ${isGenerating ? 'opacity-40 blur-sm scale-[1.02]' : 'opacity-100'}`} referrerPolicy="no-referrer" onClick={() => !isGenerating && setShowFullPreview(true)} />
                    {/* 다운로드 버튼 — 우상단 */}
                    {!isGenerating && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement('a');
                          link.href = generatedImage;
                          link.download = `junto-ai-${Date.now()}.png`;
                          link.click();
                        }}
                        className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-lg text-neutral-900 hover:bg-white transition-colors cursor-pointer shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400/60">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-50" strokeWidth={1} />
                    <p className="text-[14px] font-normal text-neutral-500">의상을 첨부하고 생성하기를 눌러주세요</p>
                  </div>
                )}
                {isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[2px]">
                    <div className="w-8 h-8 border-[1.5px] border-neutral-900 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-neutral-900 font-medium text-sm tracking-wide">이미지 생성 중...</p>
                  </div>
                )}
              </div>

            </div>

            {/* 우측 — 저장 갤러리 */}
            <div className="w-[280px] shrink-0 bg-white border-l border-neutral-100 flex flex-col hidden lg:flex">
              <div className="px-3.5 py-3 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-neutral-900">내 갤러리</h3>
                <span className="text-[11px] text-neutral-400">{gallery.length}장</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5">
                {!user ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <Cloud className="w-8 h-8 text-neutral-200 mb-3" />
                    <p className="text-[13px] text-neutral-400 mb-4">로그인하면 생성한 이미지를<br/>자동으로 저장할 수 있어요</p>
                    <button onClick={signInWithGoogle} className="px-4 py-2 bg-neutral-900 text-white text-[12px] font-semibold rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors">Google 로그인</button>
                  </div>
                ) : galleryLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  </div>
                ) : gallery.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <ImageIcon className="w-8 h-8 text-neutral-200 mb-3" strokeWidth={1} />
                    <p className="text-[13px] text-neutral-400">아직 저장된 이미지가 없어요.<br/>이미지를 생성하고 저장해보세요!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {gallery.map((img: any) => (
                      <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-100 cursor-pointer" onClick={() => setGalleryPreview(img.image_url)}>
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-1 p-1.5 w-full">
                            <button
                              onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = img.image_url; a.download = `yours-${img.id}.png`; a.click(); }}
                              className="flex-1 py-1.5 bg-white/90 rounded text-[10px] font-semibold text-neutral-900 hover:bg-white transition-colors cursor-pointer"
                            >저장</button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const path = img.image_url.split('/generated-images/')[1];
                                await deleteImage(img.id, path || '');
                                loadGallery();
                              }}
                              className="py-1.5 px-2 bg-red-500/80 rounded text-[10px] font-semibold text-white hover:bg-red-600 transition-colors cursor-pointer"
                            >삭제</button>
                          </div>
                        </div>
                        <div className="absolute top-1.5 right-1.5 text-[9px] text-white bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          {new Date(img.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 갤러리 크게 보기 모달 */}
            <AnimatePresence>
              {galleryPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
                  onClick={() => setGalleryPreview(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative max-w-3xl max-h-[85vh] mx-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src={galleryPreview} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                    <div className="absolute -top-11 right-0 flex gap-2">
                      <button onClick={() => { const a = document.createElement('a'); a.href = galleryPreview; a.download = `yours-${Date.now()}.png`; a.click(); }} className="px-3 py-1.5 bg-white rounded-lg text-[11px] font-semibold text-neutral-900 hover:bg-neutral-100 cursor-pointer flex items-center gap-1">
                        <Download className="w-3 h-3" /> 저장
                      </button>
                      <button onClick={() => setGalleryPreview(null)} className="px-3 py-1.5 bg-white/20 rounded-lg text-[11px] font-semibold text-white hover:bg-white/30 cursor-pointer">닫기</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 크게 보기 모달 */}
            <AnimatePresence>
              {showFullPreview && generatedImage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
                  onClick={() => setShowFullPreview(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative max-w-4xl max-h-[90vh] mx-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src={generatedImage} alt="AI 생성 이미지" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                    <div className="absolute -top-12 right-0 flex gap-2">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = generatedImage;
                          link.download = `junto-ai-${Date.now()}.png`;
                          link.click();
                        }}
                        className="px-4 py-2 bg-white rounded-lg text-[12px] font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> 저장
                      </button>
                      <button
                        onClick={() => setShowFullPreview(false)}
                        className="px-4 py-2 bg-white/20 rounded-lg text-[12px] font-semibold text-white hover:bg-white/30 transition-colors cursor-pointer"
                      >
                        닫기
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 썸네일 미리보기 모달 */}
            <AnimatePresence>
              {modalPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                  onClick={() => setModalPreview(null)}
                  role="dialog"
                  aria-modal="true"
                  aria-label="이미지 미리보기"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 10 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-[360px] w-full mx-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
                      <img src={modalPreview.img} alt="선택 미리보기" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="p-5 flex gap-3">
                      <button
                        onClick={() => setModalPreview(null)}
                        className="flex-1 py-3 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                      >
                        닫기
                      </button>
                      <button
                        onClick={handleModalSelect}
                        className={`flex-1 py-3 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${isSelected(modalPreview.type, modalPreview.id) ? 'bg-neutral-200 text-neutral-500 cursor-default' : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98]'}`}
                        disabled={isSelected(modalPreview.type, modalPreview.id)}
                      >
                        {isSelected(modalPreview.type, modalPreview.id) ? '선택됨' : '선택하기'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }

      case 'video':
        return (
          <div className="min-h-screen bg-[#FAFAF9] flex items-start justify-center py-8 px-5 md:py-16 md:px-8">
            <div className="max-w-3xl w-full">
              {/* 헤더 */}
              <div className="mb-12">
                <h1 className="text-[1.5rem] md:text-[2rem] font-bold text-black mb-3">AI 영상 제작</h1>
                <p className="text-neutral-500 text-[15px]">사진 몇 장만 선택하면 틱톡, 릴스에 바로 올릴 수 있는 숏폼 영상을 만들어 드립니다.</p>
              </div>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-neutral-100">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[12px] font-bold flex items-center justify-center">1</span>
                    <h3 className="text-[15px] font-bold text-black">영상에 들어갈 사진을 골라주세요 (최대 5장)</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-28 aspect-[4/5] bg-neutral-100 rounded-lg border border-neutral-200 shrink-0 relative overflow-hidden">
                        <img src={`https://picsum.photos/seed/fashion${i}/200/300`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-2 right-2 w-5 h-5 bg-neutral-900 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{i}</div>
                      </div>
                    ))}
                    <button className="w-28 aspect-[4/5] bg-neutral-50 rounded-lg border border-dashed border-neutral-300 shrink-0 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-100 transition-all">
                      <Upload className="w-4 h-4 text-neutral-400 mb-1" />
                      <span className="text-[11px] text-neutral-400 font-medium">추가</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-neutral-100">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[12px] font-bold flex items-center justify-center">2</span>
                    <h3 className="text-[15px] font-bold text-black">음악 분위기 선택</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { id: 'trendy', name: '트렌디 팝', desc: '틱톡/릴스 추천' },
                      { id: 'calm', name: '차분한 감성', desc: '카페 음악 스타일' },
                      { id: 'dance', name: '신나는 댄스', desc: '시선 집중' },
                    ].map(vibe => (
                      <button key={vibe.id} onClick={() => setVideoVibe(vibe.id)} className={`p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 text-left ${videoVibe === vibe.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-neutral-300'}`}>
                        <span className={`text-[14px] font-semibold block mb-1 ${videoVibe === vibe.id ? 'text-black' : 'text-neutral-700'}`}>{vibe.name}</span>
                        <span className="text-[12px] text-neutral-400">{vibe.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-neutral-100">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[12px] font-bold flex items-center justify-center">3</span>
                    <h3 className="text-[15px] font-bold text-black">AI 성우 선택</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'cn_f', name: '중국어 여성 성우', desc: '중국 바이어 타겟' },
                      { id: 'kr_f', name: '한국어 여성 성우', desc: '국내 쇼핑몰용' },
                      { id: 'none', name: '음악만 (성우 없음)', desc: '깔끔한 영상' },
                    ].map(voice => (
                      <button key={voice.id} onClick={() => setVideoVoice(voice.id)} className={`p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 flex items-center justify-between ${videoVoice === voice.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-neutral-300'}`}>
                        <div>
                          <span className={`text-[14px] font-semibold block ${videoVoice === voice.id ? 'text-black' : 'text-neutral-700'}`}>{voice.name}</span>
                          <span className="text-[12px] text-neutral-400">{voice.desc}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${videoVoice === voice.id ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300'}`}>
                          {videoVoice === voice.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 생성 버튼 */}
                <button onClick={handleGenerate} disabled={isGenerating} className={`w-full py-4 rounded-xl font-semibold text-[15px] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${isGenerating ? 'bg-neutral-200 text-neutral-400' : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98]'}`}>
                  {isGenerating ? <span className="animate-pulse">영상 제작 중...</span> : <><Video className="w-4 h-4" /> 영상 제작하기</>}
                </button>
              </div>
            </div>
          </div>
        );

      case 'floorcut':
        return (
          <div className="min-h-screen bg-[#FAFAF9] flex items-start justify-center py-8 px-5 md:py-16 md:px-8">
            <div className="max-w-2xl w-full">
              <div className="mb-12">
                <h1 className="text-[1.5rem] md:text-[2rem] font-bold text-black mb-3">촬영 예약</h1>
                <p className="text-neutral-500 text-[15px]">유어스몰 현장 스튜디오에서 전문 포토그래퍼가 바닥컷을 촬영해 드립니다.</p>
              </div>

              <div className="bg-white rounded-xl p-5 md:p-8 border border-neutral-100 space-y-5 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-900 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-neutral-400"/> 날짜 선택</label>
                    <input type="date" className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-[14px] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-neutral-50" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-900 mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-neutral-400"/> 시간 선택</label>
                    <select className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-[14px] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-neutral-50">
                      <option>오전 10:00</option>
                      <option>오후 02:00</option>
                      <option>오후 04:00</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-900 mb-2">촬영할 의류 수량</label>
                  <input type="number" placeholder="예: 5" className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-[14px] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-neutral-50" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-900 mb-2">요청 사항 (선택)</label>
                  <textarea rows={3} placeholder="촬영 관련 특별 요청사항이 있다면 적어주세요." className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-[14px] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-neutral-50 resize-none"></textarea>
                </div>
                <button className="w-full bg-neutral-900 text-white py-4 rounded-xl font-semibold text-[15px] hover:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer">
                  예약 신청하기
                </button>
              </div>
            </div>
          </div>
        );

      case 'cs':
        return (
          <div className="min-h-screen bg-[#FAFAF9] flex items-start justify-center py-8 px-5 md:py-16 md:px-8">
            <div className="max-w-2xl w-full">
              <div className="mb-12">
                <h1 className="text-[1.5rem] md:text-[2rem] font-bold text-black mb-3">Help</h1>
                <p className="text-neutral-500 text-[15px]">AI 사용이 어려우신가요? 저희가 대신 작업해 드립니다.</p>
              </div>

              <div className="bg-white rounded-xl p-5 md:p-8 border border-neutral-100 space-y-5 md:space-y-6">
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-900 mb-2">요청 유형</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: 'modelcut', label: 'AI 모델컷 대행' },
                      { id: 'translate', label: '상세페이지 번역 대행' },
                      { id: 'video', label: '숏폼 영상 대행' },
                      { id: 'etc', label: '기타 문의' },
                    ].map(opt => (
                      <button key={opt.id} className="px-4 py-3 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-700 hover:border-neutral-900 hover:text-black transition-all cursor-pointer text-left focus:border-neutral-900 focus:bg-neutral-50">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-900 mb-2">상세 내용</label>
                  <textarea rows={5} placeholder="어떤 작업이 필요하신지 자세히 적어주세요." className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-[14px] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-neutral-50 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-900 mb-2">연락처</label>
                  <input type="text" placeholder="연락 가능한 전화번호 또는 이메일" className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-[14px] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-neutral-50" />
                </div>
                <button className="w-full bg-neutral-900 text-white py-4 rounded-xl font-semibold text-[15px] hover:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer">
                  요청 보내기
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans antialiased">
      {/* Top Navigation Bar */}
      {/* 상단 바: 홈 링크 + 로그인 */}
      <div className="bg-white border-b border-neutral-100 px-4 md:px-6 py-2.5 flex items-center justify-between shrink-0 z-10">
        <Link to="/" className="text-sm md:text-base font-bold text-black no-underline">Yours <span className="text-neutral-400 font-normal">x</span> Junto AI</Link>
        <div className="flex items-center gap-3">
          {/* AI 모델 선택 */}
          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-100 p-0.5 rounded-md">
              {[
                { id: 'gemini-3.1-flash-image-preview', label: '나노바나나2' },
                { id: 'gemini-3-pro-image-preview', label: '나노바나나 Pro' },
              ].map(m => (
                <button key={m.id} onClick={() => setAiModel(m.id)} className={`px-3 py-1 text-[10px] font-semibold tracking-wider rounded-[4px] transition-all duration-200 cursor-pointer ${aiModel === m.id ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>{m.label}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['1K', '2K', '4K']).map(res => (
                <button key={res} onClick={() => setImageResolution(res)} className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${imageResolution === res ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-400'}`}>{res}</button>
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-neutral-200 hidden md:block" />
          {authLoading ? null : user ? (
            <>
              <span className="text-[12px] text-neutral-500 hidden md:inline">{user.email}</span>
              <button onClick={signOut} className="px-3 py-1.5 text-[12px] font-medium text-neutral-500 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">로그아웃</button>
            </>
          ) : (
            <button onClick={signInWithGoogle} className="px-4 py-2 bg-neutral-900 text-white text-[12px] font-semibold rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5" /> Google 로그인
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
{/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 w-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {/* End of Briefing Section */}
          
        </div>
      </main>
    </div>
  );
}
