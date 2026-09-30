import React from 'react';
import { BrainCircuit, Trash2 } from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  learnedRules: string[];
  setLearnedRules: (rules: string[]) => void;
}

export default function MemoryModal({ isOpen, onClose, learnedRules, setLearnedRules }: MemoryModalProps) {
  if (!isOpen) return null;

  const handleDelete = (index: number) => {
    const newRules = [...learnedRules];
    newRules.splice(index, 1);
    setLearnedRules(newRules);
    localStorage.setItem('gemini_learned_rules', JSON.stringify(newRules));
  };

  const handleClearAll = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ của Trợ lý?")) {
      setLearnedRules([]);
      localStorage.setItem('gemini_learned_rules', JSON.stringify([]));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[500px] max-w-full p-6 animate-fade-in flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit size={20} className="text-purple-600" />
            Trí nhớ & Học hỏi
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        
        <p className="text-sm text-slate-500 mb-4">
          Trợ lý AI sẽ tự động học hỏi từ các góp ý của bạn và áp dụng các quy tắc này cho những lần tạo đề thi sau.
        </p>
        
        <div className="flex-1 overflow-y-auto min-h-[150px] mb-4 bg-slate-50 border border-slate-200 rounded-lg p-2 custom-scrollbar">
          {learnedRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <BrainCircuit size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Trợ lý chưa học được quy tắc nào.</p>
              <p className="text-xs mt-1">Hãy dặn dò Trợ lý trong lúc chat nhé!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {learnedRules.map((rule, idx) => (
                <li key={idx} className="flex items-start justify-between bg-white p-3 rounded border border-slate-100 shadow-sm group">
                  <span className="text-sm text-slate-700 leading-relaxed pr-2 flex-1">
                    <span className="font-semibold text-purple-600 mr-2">#{idx + 1}</span>
                    {rule}
                  </span>
                  <button 
                    onClick={() => handleDelete(idx)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Xóa quy tắc này"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-auto">
          <button 
            onClick={handleClearAll}
            disabled={learnedRules.length === 0}
            className="text-xs text-red-500 hover:text-red-700 disabled:text-slate-300 disabled:cursor-not-allowed font-medium"
          >
            Xóa toàn bộ trí nhớ
          </button>
          
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
