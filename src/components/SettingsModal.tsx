import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'google' | 'openrouter';
  setProvider: (p: 'google' | 'openrouter') => void;
  apiKeys: string[];
  setApiKeys: (keys: string[]) => void;
  openRouterKeys: string[];
  setOpenRouterKeys: (keys: string[]) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const OPENROUTER_MODELS = [
  { id: '~anthropic/claude-sonnet-latest', name: 'Claude Sonnet Latest (Đề xuất cho Reading/Logic)' },
  { id: '~openai/gpt-sol-latest', name: 'GPT Sol Latest (Thông minh nhất)' },
  { id: 'openai/gpt-4o', name: 'GPT-4o (Toàn diện, tốc độ)' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o-mini (Siêu tốc, giá rẻ)' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (Mã nguồn mở, rất nhanh)' },
  { id: 'google/gemini-flash-1.5-8b', name: 'Gemini 1.5 Flash-8B (Rất nhanh)' }
];

export default function SettingsModal({ 
  isOpen, onClose, 
  provider, setProvider,
  apiKeys, setApiKeys, 
  openRouterKeys, setOpenRouterKeys,
  selectedModel, setSelectedModel 
}: SettingsModalProps) {
  
  const [activeTab, setActiveTab] = useState<'google' | 'openrouter'>(provider);
  
  const [keysInputGoogle, setKeysInputGoogle] = useState<string[]>(apiKeys || []);
  const [keysInputOpenRouter, setKeysInputOpenRouter] = useState<string[]>(openRouterKeys || []);
  
  const [newKey, setNewKey] = useState('');
  const [modelInput, setModelInput] = useState(selectedModel);
  
  const [availableModelsGoogle, setAvailableModelsGoogle] = useState<any[]>([]);
  const [availableModelsOpenRouter, setAvailableModelsOpenRouter] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  useEffect(() => {
    setActiveTab(provider);
    setKeysInputGoogle(apiKeys || []);
    setKeysInputOpenRouter(openRouterKeys || []);
    setModelInput(selectedModel);
  }, [isOpen, provider, apiKeys, openRouterKeys, selectedModel]);

  // Load available models automatically if key exists when opened (for Google)
  useEffect(() => {
    if (isOpen && activeTab === 'google' && keysInputGoogle.length > 0 && availableModelsGoogle.length === 0) {
      fetchModelsGoogle(keysInputGoogle[0]);
    }
    if (isOpen && activeTab === 'openrouter' && keysInputOpenRouter.length > 0 && availableModelsOpenRouter.length === 0) {
      fetchModelsOpenRouter(keysInputOpenRouter[0]);
    }
  }, [isOpen, activeTab]);

  const fetchModelsGoogle = async (key: string) => {
    if (!key.trim()) return;
    setIsFetchingModels(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json();
      if (res.ok) {
        const validModels = (data.models || [])
          .filter((model: any) => 
            model.supportedGenerationMethods && 
            model.supportedGenerationMethods.includes('generateContent')
          )
          .map((model: any) => ({
            id: model.name.replace('models/', ''),
            name: model.displayName || model.name.replace('models/', '')
          }));
          
        setAvailableModelsGoogle(validModels);
        if (validModels.length > 0 && activeTab === 'google') {
           const exists = validModels.find((m: any) => m.id === modelInput);
           if (!exists) setModelInput(validModels[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const fetchModelsOpenRouter = async (key: string) => {
    if (!key.trim()) return;
    setIsFetchingModels(true);
    try {
      const res = await fetch(`https://openrouter.ai/api/v1/models`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      const data = await res.json();
      if (res.ok) {
        const validModels = (data.data || []).map((model: any) => {
          const isFree = model.pricing && (parseFloat(model.pricing.prompt || '0') === 0) && (parseFloat(model.pricing.completion || '0') === 0);
          return {
            id: model.id,
            name: model.name + (isFree ? ' (Miễn phí)' : ''),
            isFree: isFree
          };
        });
        
        validModels.sort((a: any, b: any) => {
           if (a.isFree && !b.isFree) return -1;
           if (!a.isFree && b.isFree) return 1;
           return 0;
        });

        setAvailableModelsOpenRouter(validModels);
        if (validModels.length > 0 && activeTab === 'openrouter') {
           const exists = validModels.find((m: any) => m.id === modelInput);
           if (!exists) setModelInput(validModels[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingModels(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    localStorage.setItem('ai_provider', activeTab);
    localStorage.setItem('gemini_api_keys', JSON.stringify(keysInputGoogle));
    localStorage.setItem('openrouter_api_keys', JSON.stringify(keysInputOpenRouter));
    
    // Đảm bảo model được chọn hợp lệ với provider tương ứng
    let finalModel = modelInput;
    if (activeTab === 'openrouter' && availableModelsOpenRouter.length === 0) {
      const exists = OPENROUTER_MODELS.find(m => m.id === modelInput);
      if (!exists) finalModel = OPENROUTER_MODELS[0].id;
    }
    
    localStorage.setItem('gemini_model', finalModel); // Dùng chung key localStorage cho tiện
    
    setProvider(activeTab);
    setApiKeys(keysInputGoogle);
    setOpenRouterKeys(keysInputOpenRouter);
    setSelectedModel(finalModel);
    onClose();

    try {
      // Đồng bộ API Keys lên Cloud
      await supabase.from('learned_rules').delete().in('type', ['api_key', 'openrouter_api_key']);
      
      const inserts: any[] = [];
      keysInputGoogle.forEach(k => inserts.push({ type: 'api_key', rule: k, added_by: 'admin' }));
      keysInputOpenRouter.forEach(k => inserts.push({ type: 'openrouter_api_key', rule: k, added_by: 'admin' }));
      
      if (inserts.length > 0) {
        await supabase.from('learned_rules').insert(inserts);
      }
    } catch (err) {
      console.error("Lỗi đồng bộ API Keys lên Cloud:", err);
    }
  };

  const currentKeys = activeTab === 'google' ? keysInputGoogle : keysInputOpenRouter;
  
  const handleAddKey = () => {
    if (!newKey.trim()) return;
    const val = newKey.trim();
    if (activeTab === 'google' && !keysInputGoogle.includes(val)) {
      setKeysInputGoogle([...keysInputGoogle, val]);
    } else if (activeTab === 'openrouter' && !keysInputOpenRouter.includes(val)) {
      setKeysInputOpenRouter([...keysInputOpenRouter, val]);
    }
    setNewKey('');
  };

  const handleRemoveKey = (index: number) => {
    if (activeTab === 'google') {
      const copy = [...keysInputGoogle];
      copy.splice(index, 1);
      setKeysInputGoogle(copy);
    } else {
      const copy = [...keysInputOpenRouter];
      copy.splice(index, 1);
      setKeysInputOpenRouter(copy);
    }
  };

  const handleTabSwitch = (tab: 'google' | 'openrouter') => {
    setActiveTab(tab);
    // Khi chuyển tab, tự động chọn model mặc định đầu tiên nếu model hiện tại không thuộc provider mới
    if (tab === 'openrouter') {
      const existsInFetched = availableModelsOpenRouter.find(m => m.id === modelInput);
      const existsInHardcoded = OPENROUTER_MODELS.find(m => m.id === modelInput);
      if (!existsInFetched && !existsInHardcoded) {
        setModelInput(availableModelsOpenRouter.length > 0 ? availableModelsOpenRouter[0].id : OPENROUTER_MODELS[0].id);
      }
    } else {
      const exists = availableModelsGoogle.find(m => m.id === modelInput);
      if (!exists && availableModelsGoogle.length > 0) setModelInput(availableModelsGoogle[0].id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[480px] overflow-hidden animate-fade-in flex flex-col">
        
        {/* Header Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'google' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            onClick={() => handleTabSwitch('google')}
          >
            Google Gemini
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'openrouter' ? 'border-purple-600 text-purple-600 bg-purple-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            onClick={() => handleTabSwitch('openrouter')}
          >
            OpenRouter
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4 h-8">
            {activeTab === 'google' 
              ? "Sử dụng API trực tiếp từ Google AI Studio. Hoạt động rất nhanh và ổn định, có tự động Retry." 
              : "Sử dụng cổng trung gian OpenRouter để truy cập GPT-4o, Claude 3.5. Yêu cầu API Key của OpenRouter."}
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Danh sách API Keys ({activeTab === 'google' ? 'Google' : 'OpenRouter'}):</label>
            
            <ul className="space-y-2 mb-3 max-h-[120px] overflow-y-auto custom-scrollbar">
              {currentKeys.map((k, idx) => (
                <li key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <span className="text-xs text-slate-600 font-mono truncate mr-2">{k}</span>
                  <button 
                    onClick={() => handleRemoveKey(idx)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium shrink-0"
                  >
                    Xóa
                  </button>
                </li>
              ))}
              {currentKeys.length === 0 && (
                <p className="text-xs text-slate-500 italic">Chưa có API Key nào.</p>
              )}
            </ul>

            <div className="flex gap-2">
              <input 
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                className="flex-1 bg-slate-50 border border-slate-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={activeTab === 'google' ? "AIzaSy..." : "sk-or-v1-..."}
              />
              <button 
                onClick={handleAddKey}
                disabled={!newKey.trim()}
                className={`px-3 py-2 text-white text-xs font-medium rounded disabled:opacity-50 ${activeTab === 'google' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                Thêm
              </button>
            </div>
            
            {activeTab === 'google' && (
              <div className="mt-3">
                <button 
                  onClick={() => keysInputGoogle.length > 0 && fetchModelsGoogle(keysInputGoogle[0])} 
                  disabled={isFetchingModels || keysInputGoogle.length === 0}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {isFetchingModels ? 'Đang tải danh sách...' : 'Quét Model hỗ trợ (Dùng Key #1)'}
                </button>
              </div>
            )}

            {activeTab === 'openrouter' && (
              <div className="mt-3 flex justify-between items-center">
                <button 
                  onClick={() => keysInputOpenRouter.length > 0 && fetchModelsOpenRouter(keysInputOpenRouter[0])} 
                  disabled={isFetchingModels || keysInputOpenRouter.length === 0}
                  className="text-xs font-medium text-purple-600 hover:text-purple-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {isFetchingModels ? 'Đang tải danh sách OpenRouter...' : 'Tải danh sách Model từ OpenRouter'}
                </button>
                {availableModelsOpenRouter.length > 0 && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Đã tải {availableModelsOpenRouter.length} models</span>
                )}
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Model sử dụng:</label>
            <select
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-sm rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activeTab === 'google' ? (
                availableModelsGoogle.length > 0 ? (
                  availableModelsGoogle.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))
                ) : (
                  <option value={modelInput}>{modelInput} (Hãy Quét Model)</option>
                )
              ) : (
                availableModelsOpenRouter.length > 0 ? (
                  availableModelsOpenRouter.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))
                ) : (
                  OPENROUTER_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))
                )
              )}
            </select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            {((provider === 'google' && keysInputGoogle.length > 0) || (provider === 'openrouter' && keysInputOpenRouter.length > 0)) && (
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                Đóng
              </button>
            )}
            <button 
              onClick={handleSave} 
              disabled={currentKeys.length === 0}
              className={`px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300 rounded-md transition-colors ${activeTab === 'google' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              Lưu và Bắt đầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
