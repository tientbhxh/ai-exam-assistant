import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export default function SettingsModal({ isOpen, onClose, apiKey, setApiKey, selectedModel, setSelectedModel }: SettingsModalProps) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [modelInput, setModelInput] = useState(selectedModel);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  useEffect(() => {
    setKeyInput(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setModelInput(selectedModel);
  }, [selectedModel]);

  // Load available models automatically if key exists when opened
  useEffect(() => {
    if (isOpen && keyInput) {
      fetchModels(keyInput);
    }
  }, [isOpen]);

  const fetchModels = async (key: string) => {
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
            name: model.displayName || model.name.replace('models/', ''),
            description: model.description || ''
          }));
          
        setAvailableModels(validModels);
        if (validModels.length > 0) {
           const exists = validModels.find((m: any) => m.id === modelInput);
           if (!exists) setModelInput(validModels[0].id);
        }
      } else {
        console.error("Lỗi tải danh sách model:", data.error?.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingModels(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', keyInput);
    localStorage.setItem('gemini_model', modelInput);
    setApiKey(keyInput);
    setSelectedModel(modelInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[450px] p-6 animate-fade-in">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Cấu hình API Key</h2>
        <p className="text-sm text-slate-500 mb-4">
          Nhập Google Gemini API Key của bạn để sử dụng ứng dụng. Key này được lưu trữ an toàn ngay trên trình duyệt của bạn (LocalStorage).
        </p>
        
        <div className="mb-6">
          <input 
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-md px-3 py-2.5 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="AIzaSy..."
          />
          <button 
            onClick={() => fetchModels(keyInput)} 
            disabled={isFetchingModels || !keyInput}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isFetchingModels ? 'Đang tải danh sách...' : 'Quét Model hỗ trợ'}
          </button>
        </div>

        {availableModels.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Model sử dụng:</label>
            <select
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-sm rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          {apiKey && (
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              Đóng
            </button>
          )}
          <button 
            onClick={handleSave} 
            disabled={!keyInput.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 rounded-md transition-colors"
          >
            Lưu và Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}
