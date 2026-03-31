import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
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
  Maximize2
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
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

      // 시스템 프롬프트
      parts.push({ text: `You are an expert fashion photographer and AI image editor.
Your task is to generate a highly realistic fashion lookbook photo by combining the provided reference images.

CRITICAL RULES - Each reference image serves ONE specific purpose. Do NOT mix them:
- CLOTHING images: ONLY extract the garment design, fabric, color, and pattern. Ignore any person, mannequin, or background in the clothing image.
- FACE/MODEL images: ONLY use the face, skin tone, hair, and body type. Ignore any clothing or background in this image.
- POSE images: ONLY replicate the body position and posture. Ignore the person's face, clothing, and background.
- BACKGROUND images: ONLY use the scene/environment. Ignore any people or objects.

Now process the following inputs:\n\n` });

      let instructions = "\n\nFINAL INSTRUCTIONS:\n";

      // 의상
      if (clothingMode === 'separates') {
        if (uploadedTop && uploadedBottom) {
          parts.push({ text: `${stepCounter++}. [TOP GARMENT] - This image contains the TOP/UPPER clothing to dress the model in. Extract ONLY the garment design:` });
          parts.push({ inlineData: { data: uploadedTop.data, mimeType: uploadedTop.mimeType } });
          parts.push({ text: `\n${stepCounter++}. [BOTTOM GARMENT] - This image contains the BOTTOM/LOWER clothing to dress the model in. Extract ONLY the garment design:` });
          parts.push({ inlineData: { data: uploadedBottom.data, mimeType: uploadedBottom.mimeType } });
          instructions += "- CLOTHING: Dress the model in BOTH the provided top and bottom garments. Preserve exact fabric texture, color, pattern, and details of each garment.\n";
        } else if (uploadedTop) {
          parts.push({ text: `${stepCounter++}. [TOP GARMENT] - This image contains the TOP/UPPER clothing to dress the model in. Extract ONLY the garment design:` });
          parts.push({ inlineData: { data: uploadedTop.data, mimeType: uploadedTop.mimeType } });
          instructions += "- CLOTHING: Dress the model in the provided top garment. Choose a complementary bottom. Preserve exact fabric texture, color, pattern of the top.\n";
        } else if (uploadedBottom) {
          parts.push({ text: `${stepCounter++}. [BOTTOM GARMENT] - This image contains the BOTTOM/LOWER clothing to dress the model in. Extract ONLY the garment design:` });
          parts.push({ inlineData: { data: uploadedBottom.data, mimeType: uploadedBottom.mimeType } });
          instructions += "- CLOTHING: Dress the model in the provided bottom garment. Choose a complementary top. Preserve exact fabric texture, color, pattern of the bottom.\n";
        }
      } else if (clothingMode === 'onepiece' && uploadedDress) {
        parts.push({ text: `${stepCounter++}. [ONE-PIECE GARMENT] - This image contains a one-piece dress/outfit to dress the model in. Extract ONLY the garment design:` });
        parts.push({ inlineData: { data: uploadedDress.data, mimeType: uploadedDress.mimeType } });
        instructions += "- CLOTHING: Dress the model in the provided one-piece outfit. Preserve exact fabric texture, color, pattern, and details.\n";
      }

      // 모델
      if (modelData) {
        parts.push({ text: `\n${stepCounter++}. [FACE/MODEL REFERENCE] - Use ONLY the face, skin tone, hair style, and body proportions from this image. IGNORE any clothing or background in this image:` });
        parts.push({ inlineData: { data: modelData.data, mimeType: modelData.mimeType } });
        instructions += "- MODEL: Replicate the face, skin tone, hair, and body type from the face reference. Do NOT copy the clothing or background from this image.\n";
      } else {
        instructions += "- MODEL: Use a professional fashion model.\n";
      }

      // 포즈
      if (poseData) {
        parts.push({ text: `\n${stepCounter++}. [POSE REFERENCE] - Replicate ONLY the body position and posture from this image. IGNORE the person's face, clothing, and background:` });
        parts.push({ inlineData: { data: poseData.data, mimeType: poseData.mimeType } });
        instructions += "- POSE: Match the exact body position and posture from the pose reference. Do NOT copy the face, clothing, or background from this image.\n";
      } else {
        instructions += "- POSE: Use a natural, confident fashion model pose.\n";
      }

      // 배경
      if (bgData) {
        parts.push({ text: `\n${stepCounter++}. [BACKGROUND REFERENCE] - Use ONLY the scene/environment from this image. IGNORE any people or objects:` });
        parts.push({ inlineData: { data: bgData.data, mimeType: bgData.mimeType } });
        instructions += "- BACKGROUND: Place the model in the provided background scene. Do NOT copy any people or clothing from this image.\n";
      } else {
        instructions += "- BACKGROUND: Use a clean, professional studio background with natural lighting.\n";
      }

      instructions += "\nOUTPUT: Generate a single, seamless, photorealistic 8K resolution fashion lookbook image. The clothing must fit the model naturally with proper folds, shadows, and proportions. Ensure natural lighting and shadows consistent with the background.";
      
      parts.push({ text: instructions });

      const generateConfig: any = {};
      if (aiModel === 'gemini-3-pro-image-preview') {
        const resMap = { '1K': 1024, '2K': 2048, '4K': 4096 };
        generateConfig.responseModalities = ['TEXT', 'IMAGE'];
        generateConfig.imageResolution = resMap[imageResolution];
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
          if (modalPreview.type === 'model') setLookbookModel(modalPreview.id);
          else if (modalPreview.type === 'pose') setLookbookPose(modalPreview.id);
          else if (modalPreview.type === 'bg') setLookbookBg(modalPreview.id);
          setModalPreview(null);
        };
        const isSelected = (type: 'model' | 'pose' | 'bg', id: string) => {
          if (type === 'model') return lookbookModel === id;
          if (type === 'pose') return lookbookPose === id;
          return lookbookBg === id;
        };

        return (
          <div className="flex h-full min-h-screen bg-[#FAFAF9]">
            {/* 좌측 패널 */}
            <div className="w-[380px] shrink-0 bg-white flex flex-col border-r border-neutral-100">
              <div className="flex-1 overflow-y-auto py-8 px-10 flex flex-col gap-0">

                {/* 01 의상 */}
                <div className="mb-3 bg-pink-50/60 rounded-xl p-5 border border-pink-100/60">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] text-neutral-400 tracking-[0.15em] tabular-nums select-none font-medium">01</span>
                    <h3 className="text-[14px] font-bold text-neutral-900">의상</h3>
                    <div className="flex bg-white p-0.5 rounded-lg ml-auto shadow-sm border border-neutral-100" role="tablist">
                      <button role="tab" aria-selected={clothingMode === 'separates'} onClick={() => setClothingMode('separates')} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors duration-200 cursor-pointer ${clothingMode === 'separates' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}>상/하의</button>
                      <button role="tab" aria-selected={clothingMode === 'onepiece'} onClick={() => setClothingMode('onepiece')} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors duration-200 cursor-pointer ${clothingMode === 'onepiece' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}>원피스</button>
                    </div>
                  </div>
                  {clothingMode === 'separates' ? (
                    <div>
                      <p className="text-[11px] text-neutral-400 mb-2 font-medium uppercase tracking-wider">상의</p>
                      <div className="grid grid-cols-3 gap-2.5 mb-5">
                        {topImages.map((img, i) => (
                          <button key={`top${i}`} onClick={() => selectPresetImage('top', img)} className={`w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-sm ${uploadedTop?.url === img ? 'border-neutral-900 shadow-sm' : 'border-neutral-200/60 hover:border-neutral-400'}`}>
                            <img src={img} alt="상의 예시" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button aria-label="상의 업로드" onClick={() => document.getElementById('top-upload')?.click()} className="w-full aspect-square bg-neutral-50 border border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 transition-all duration-200 flex items-center justify-center">
                          {uploadedTop && !uploadedTop.url.startsWith('/images') ? <img src={uploadedTop.url} alt="상의" className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-neutral-300" />}
                        </button>
                        <input id="top-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleClothingUpload('top', e)} />
                      </div>
                      <p className="text-[11px] text-neutral-400 mb-2 font-medium uppercase tracking-wider">하의</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {bottomImages.map((img, i) => (
                          <button key={`bot${i}`} onClick={() => selectPresetImage('bottom', img)} className={`w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-sm ${uploadedBottom?.url === img ? 'border-neutral-900 shadow-sm' : 'border-neutral-200/60 hover:border-neutral-400'}`}>
                            <img src={img} alt="하의 예시" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button aria-label="하의 업로드" onClick={() => document.getElementById('bottom-upload')?.click()} className="w-full aspect-square bg-neutral-50 border border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 transition-all duration-200 flex items-center justify-center">
                          {uploadedBottom && !uploadedBottom.url.startsWith('/images') ? <img src={uploadedBottom.url} alt="하의" className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-neutral-300" />}
                        </button>
                        <input id="bottom-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleClothingUpload('bottom', e)} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {onepieceImages.map((img, i) => (
                          <button key={`dress${i}`} onClick={() => selectPresetImage('dress', img)} className={`w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-sm ${uploadedDress?.url === img ? 'border-neutral-900 shadow-sm' : 'border-neutral-200/60 hover:border-neutral-400'}`}>
                            <img src={img} alt="원피스 예시" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button aria-label="원피스 업로드" onClick={() => document.getElementById('dress-upload')?.click()} className="w-full aspect-square bg-neutral-50 border border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 transition-all duration-200 flex items-center justify-center">
                          {uploadedDress && !uploadedDress.url.startsWith('/images') ? <img src={uploadedDress.url} alt="원피스" className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-neutral-300" />}
                        </button>
                        <input id="dress-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleClothingUpload('dress', e)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 02 모델 */}
                <div className="mb-3 bg-blue-50/60 rounded-xl p-5 border border-blue-100/60">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] text-neutral-400 tracking-[0.15em] tabular-nums select-none font-medium">02</span>
                    <h3 className="text-[14px] font-bold text-neutral-900">모델</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                      {[
                        ...modelImages.map((img, i) => ({ id: `model${i}`, img })),
                        ...customModels
                      ].map(m => (
                        <button key={m.id} aria-label={`모델 ${m.id} 미리보기`} onClick={() => selectPresetFor('model', m.img, m.id)} className={`w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${lookbookModel === m.id ? 'border-neutral-900 shadow-lg ring-2 ring-neutral-900/5' : 'border-neutral-200/60 hover:border-neutral-400'}`}>
                          <img src={m.img} alt={`모델 ${m.id}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      <button aria-label="커스텀 모델 업로드" onClick={() => document.getElementById('model-upload')?.click()} className="w-full aspect-square bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2">
                        <span className="text-neutral-400 text-lg font-light">+</span>
                      </button>
                      <input id="model-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleCustomUpload('model', e)} />
                    </div>
                </div>

                {/* 03 포즈 */}
                <div className="mb-3 bg-amber-50/60 rounded-xl p-5 border border-amber-100/60">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] text-neutral-400 tracking-[0.15em] tabular-nums select-none font-medium">03</span>
                    <h3 className="text-[14px] font-bold text-neutral-900">포즈</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                      {[
                        ...poseImages.map((img, i) => ({ id: `pose${i}`, img })),
                        ...customPoses
                      ].map(p => (
                        <button key={p.id} aria-label={`포즈 ${p.id} 미리보기`} onClick={() => selectPresetFor('pose', p.img, p.id)} className={`w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${lookbookPose === p.id ? 'border-neutral-900 shadow-lg ring-2 ring-neutral-900/5' : 'border-neutral-200/60 hover:border-neutral-400'}`}>
                          <img src={p.img} alt={`포즈 ${p.id}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      <button aria-label="커스텀 포즈 업로드" onClick={() => document.getElementById('pose-upload')?.click()} className="w-full aspect-square bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2">
                        <span className="text-neutral-400 text-lg font-light">+</span>
                      </button>
                      <input id="pose-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleCustomUpload('pose', e)} />
                    </div>
                </div>

                {/* 04 배경 */}
                <div className="mb-3 bg-emerald-50/60 rounded-xl p-5 border border-emerald-100/60">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] text-neutral-400 tracking-[0.15em] tabular-nums select-none font-medium">04</span>
                    <h3 className="text-[14px] font-bold text-neutral-900">배경</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                      {[
                        ...bgImages.map((img, i) => ({ id: `bg${i}`, img })),
                        ...customBgs
                      ].map(b => (
                        <button key={b.id} aria-label={`배경 ${b.id} 미리보기`} onClick={() => selectPresetFor('bg', b.img, b.id)} className={`w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${lookbookBg === b.id ? 'border-neutral-900 shadow-lg ring-2 ring-neutral-900/5' : 'border-neutral-200/60 hover:border-neutral-400'}`}>
                          <img src={b.img} alt={`배경 ${b.id}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      <button aria-label="커스텀 배경 업로드" onClick={() => document.getElementById('bg-upload')?.click()} className="w-full aspect-square bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2">
                        <span className="text-neutral-400 text-lg font-light">+</span>
                      </button>
                      <input id="bg-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleCustomUpload('bg', e)} />
                    </div>
                </div>

                {/* AI 모델 선택 */}
                <div className="bg-neutral-100/60 rounded-xl p-5 border border-neutral-200/60">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] text-neutral-400 font-medium tracking-wider">AI</span>
                    <div className="flex bg-neutral-100 p-0.5 rounded-md" role="radiogroup" aria-label="AI 모델 선택">
                      {[
                        { id: 'gemini-3.1-flash-image-preview', label: 'Flash' },
                        { id: 'gemini-3-pro-image-preview', label: 'Pro' },
                      ].map(m => (
                        <button key={m.id} role="radio" aria-checked={aiModel === m.id} onClick={() => setAiModel(m.id)} className={`px-3.5 py-1.5 text-[10px] font-semibold tracking-wider rounded-[5px] transition-all duration-200 cursor-pointer ${aiModel === m.id ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>{m.label}</button>
                      ))}
                    </div>
                    {aiModel === 'gemini-3-pro-image-preview' && (
                      <div className="flex gap-1.5">
                        {(['1K', '2K', '4K'] as const).map(res => (
                          <button key={res} onClick={() => setImageResolution(res)} className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all duration-200 cursor-pointer ${imageResolution === res ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-400 hover:text-neutral-600'}`}>{res}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 하단 고정: 에러 + 생성 버튼 */}
              <div className="px-8 py-6 border-t border-neutral-100 bg-white">
                {errorMsg && (
                  <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-medium text-center">{errorMsg}</div>
                )}
                <button onClick={handleGenerate} disabled={isGenerating} aria-label="이미지 생성하기" className={`w-full py-4 rounded-lg font-semibold text-[13px] tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${isGenerating ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2'}`}>
                  {isGenerating ? <span className="animate-pulse">생성 중...</span> : <><Wand2 className="w-4 h-4" /> 생성하기</>}
                </button>
              </div>
            </div>

            {/* 중앙 — 이미지 프리뷰 */}
            <div className="flex-1 flex flex-col items-center justify-center px-20 py-12 relative min-h-0">
              <div className="w-full max-w-lg aspect-[4/5] bg-neutral-200/40 rounded-lg overflow-hidden relative group" style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                {generatedImage ? (
                  <>
                    <img src={generatedImage} alt="AI 생성 이미지" className={`w-full h-full object-cover transition-all duration-500 ${isGenerating ? 'opacity-40 blur-sm scale-[1.02]' : 'opacity-100'}`} referrerPolicy="no-referrer" />
                    {/* 호버 시 액션 버튼 */}
                    {!isGenerating && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 justify-end">
                        <button
                          onClick={() => setShowFullPreview(true)}
                          className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-[12px] font-semibold text-neutral-900 hover:bg-white transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Maximize2 className="w-3.5 h-3.5" /> 크게 보기
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = generatedImage;
                            link.download = `junto-ai-${Date.now()}.png`;
                            link.click();
                          }}
                          className="px-4 py-2 bg-neutral-900/90 backdrop-blur-sm rounded-lg text-[12px] font-semibold text-white hover:bg-neutral-900 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> 저장
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400/60">
                    <ImageIcon className="w-10 h-10 mb-4 opacity-40" strokeWidth={1} />
                    <p className="text-[13px] font-light tracking-wide text-neutral-400">의상을 첨부하고 생성하기를 눌러주세요</p>
                  </div>
                )}
                {isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[2px]">
                    <div className="w-8 h-8 border-[1.5px] border-neutral-900 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-neutral-900 font-medium text-sm tracking-wide">이미지 생성 중...</p>
                  </div>
                )}
              </div>

              {/* 우측 태그라인 */}
              <div className="absolute right-20 top-1/2 -translate-y-1/2 max-w-[220px] text-right hidden xl:block select-none">
                <p className="text-[22px] font-extralight text-neutral-600 leading-[1.6] tracking-tight">
                  스튜디오도, 모델도,<br/>촬영도<br/>
                  <span className="font-semibold text-neutral-900">더이상 필요하지<br/>않습니다.</span>
                </p>
              </div>
            </div>

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
          <div className="max-w-4xl mx-auto pb-20">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-rose-50 p-8 text-center border-b border-rose-100">
                <h2 className="text-2xl font-black text-rose-900 mb-2">🎬 숏폼 영상 만들기</h2>
                <p className="text-rose-700 font-medium">사진 몇 장만 고르면 틱톡, 릴스에 올릴 수 있는 세련된 영상이 뚝딱!</p>
              </div>
              
              <div className="p-8 space-y-12">
                {/* Step 1 */}
                <motion.section variants={itemVariants}>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="bg-rose-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-md">1</span>
                    영상에 들어갈 사진을 골라주세요 (최대 5장)
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 px-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-32 h-40 bg-slate-100 rounded-2xl border-2 border-slate-200 flex flex-col items-center justify-center shrink-0 relative overflow-hidden group">
                        <img src={`https://picsum.photos/seed/fashion${i}/200/300`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-2 right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white">
                          {i}
                        </div>
                      </div>
                    ))}
                    <div className="w-32 h-40 bg-rose-50 rounded-2xl border-2 border-dashed border-rose-300 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-rose-100 transition-colors">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                        <span className="text-rose-500 text-2xl font-bold">+</span>
                      </div>
                      <span className="text-rose-700 font-bold text-sm">사진 추가</span>
                    </div>
                  </div>
                </motion.section>

                {/* Step 2 */}
                <motion.section variants={itemVariants}>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="bg-rose-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-md">2</span>
                    어떤 분위기의 음악을 깔아드릴까요?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'trendy', name: '트렌디한 팝', desc: '틱톡/릴스 추천', icon: '🎧' },
                      { id: 'calm', name: '차분한 감성', desc: '카페 음악 스타일', icon: '☕' },
                      { id: 'dance', name: '신나는 댄스', desc: '시선 집중!', icon: '💃' },
                    ].map(vibe => (
                      <div 
                        key={vibe.id}
                        onClick={() => setVideoVibe(vibe.id)}
                        className={`p-5 rounded-2xl cursor-pointer border-2 transition-all flex flex-col items-center text-center gap-2 ${videoVibe === vibe.id ? 'border-rose-600 bg-rose-50 shadow-md' : 'border-slate-200 hover:border-rose-300'}`}
                      >
                        <span className="text-4xl mb-1">{vibe.icon}</span>
                        <span className={`font-bold ${videoVibe === vibe.id ? 'text-rose-900' : 'text-slate-700'}`}>{vibe.name}</span>
                        <span className="text-xs text-slate-500">{vibe.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.section>

                {/* Step 3 */}
                <motion.section variants={itemVariants}>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="bg-rose-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-md">3</span>
                    AI 성우가 제품을 설명해 줄까요?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'cn_f', name: '중국어 여성 성우', desc: '중국 바이어에게 딱 맞아요', flag: '🇨🇳' },
                      { id: 'kr_f', name: '한국어 여성 성우', desc: '국내 쇼핑몰용', flag: '🇰🇷' },
                      { id: 'none', name: '목소리 없이 음악만', desc: '깔끔한 영상', flag: '🎵' },
                    ].map(voice => (
                      <div 
                        key={voice.id}
                        onClick={() => setVideoVoice(voice.id)}
                        className={`p-5 rounded-2xl cursor-pointer border-2 transition-all flex items-center gap-4 ${videoVoice === voice.id ? 'border-rose-600 bg-rose-50 shadow-md' : 'border-slate-200 hover:border-rose-300'}`}
                      >
                        <span className="text-3xl">{voice.flag}</span>
                        <div className="flex-1 text-left">
                          <div className={`font-bold ${videoVoice === voice.id ? 'text-rose-900' : 'text-slate-700'}`}>{voice.name}</div>
                          <div className="text-xs text-slate-500">{voice.desc}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${videoVoice === voice.id ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300'}`}>
                          {videoVoice === voice.id && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>

                {/* Action */}
                <motion.button 
                  variants={itemVariants}
                  onClick={handleGenerate}
                  className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-rose-700 transition-all shadow-lg hover:shadow-rose-500/30 flex items-center justify-center gap-3"
                >
                  {isGenerating ? <span className="animate-pulse">음악과 더빙을 합성하여 영상을 만들고 있습니다...</span> : <><PlaySquare className="w-6 h-6" /> 숏폼 영상 완성하기 (클릭)</>}
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'floorcut':
        return (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">바닥컷 촬영 예약</h2>
              <p className="text-slate-500">유어스몰 현장 스튜디오에서 전문 포토그래퍼가 촬영해 드립니다.</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4"/> 날짜 선택</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Clock className="w-4 h-4"/> 시간 선택</label>
                  <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500">
                    <option>오전 10:00</option>
                    <option>오후 02:00</option>
                    <option>오후 04:00</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">촬영할 의류 수량</label>
                <input type="number" placeholder="예: 5" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500" />
              </div>
              <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                예약 신청하기
              </button>
            </div>
          </div>
        );

      case 'cs':
        return (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">대행 서비스 요청 (CS)</h2>
              <p className="text-slate-500">AI 사용이 어려우신가요? 저희가 대신 작업해 드립니다.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">요청 유형</label>
                <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-500">
                  <option>AI 모델컷 생성 대행</option>
                  <option>상세페이지 번역 및 제작 대행</option>
                  <option>숏폼 영상 제작 대행</option>
                  <option>기타 문의</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">상세 내용</label>
                <textarea rows={5} placeholder="어떤 작업이 필요하신지 자세히 적어주세요." className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-500"></textarea>
              </div>
              <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                요청 보내기
              </button>
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
      {/* 상단 탭 바 제거됨 — 메인 페이지 네비에서 직접 접근 */}

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
