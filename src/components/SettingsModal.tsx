import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: string[];
  setApiKeys: (keys: string[]) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export default function SettingsModal({ isOpen, onClose, apiKeys, setApiKeys, selectedModel, setSelectedModel }: SettingsModalProps) {
  const [keysInput, setKeysInput] = useState<string[]>(apiKeys || []);
  const [newKey, setNewKey] = useState('');
  const [modelInput, setModelInput] = useState(selectedModel);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  useEffect(() => {
    setKeysInput(apiKeys || []);
  }, [apiKeys]);

  useEffect(() => {
    setModelInput(selectedModel);
  }, [selectedModel]);

  // Load available models automatically if key exists when opened
  useEffect(() => {
    if (isOpen && keysInput.length > 0) {
      fetchModels(keysInput[0]);
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
    localStorage.setItem('gemini_api_keys', JSON.stringify(keysInput));
    localStorage.setItem('gemini_model', modelInput);
    setApiKeys(keysInput);
    setSelectedModel(modelInput);
    onClose();
  };

  const handleAddKey = () => {
    if (newKey.trim() && !keysInput.includes(newKey.trim())) {
      setKeysInput([...keysInput, newKey.trim()]);
      setNewKey('');
    }
  };

  const handleRemoveKey = (index: number) => {
    const copy = [...keysInput];
    copy.splice(index, 1);
    setKeysInput(copy);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[450px] p-6 animate-fade-in">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Cấu hình API Key</h2>
        <p className="text-sm text-slate-500 mb-4">
          Nhập Google Gemini API Key của bạn để sử dụng ứng dụng. Key này được lưu trữ an toàn ngay trên trình duyệt của bạn (LocalStorage).
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Danh sách API Keys:</label>
          
          <ul className="space-y-2 mb-3 max-h-[120px] overflow-y-auto custom-scrollbar">
            {keysInput.map((k, idx) => (
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
            {keysInput.length === 0 && (
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
              placeholder="Thêm API Key mới (AIzaSy...)"
            />
            <button 
              onClick={handleAddKey}
              disabled={!newKey.trim()}
              className="px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 disabled:opacity-50"
            >
              Thêm
            </button>
          </div>
          
          <div className="mt-3">
            <button 
              onClick={() => keysInput.length > 0 && fetchModels(keysInput[0])} 
              disabled={isFetchingModels || keysInput.length === 0}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {isFetchingModels ? 'Đang tải danh sách...' : 'Quét Model hỗ trợ (Dùng Key #1)'}
            </button>
          </div>
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
          {apiKeys && apiKeys.length > 0 && (
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              Đóng
            </button>
          )}
          <button 
            onClick={handleSave} 
            disabled={keysInput.length === 0}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 rounded-md transition-colors"
          >
            Lưu và Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}
