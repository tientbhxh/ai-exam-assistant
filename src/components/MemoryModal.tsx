import React, { useState } from 'react';
import { BrainCircuit, Trash2, Edit2, Plus, UserCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface Rule {
  id?: number;
  rule: string;
  type: string;
  added_by: string;
}

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  learnedRules: Rule[];
  setLearnedRules: (rules: Rule[]) => void;
  currentUser: string;
}

export default function MemoryModal({ isOpen, onClose, learnedRules, setLearnedRules, currentUser }: MemoryModalProps) {
  const [activeTab, setActiveTab] = useState<'base' | 'learned'>('base');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  if (!isOpen) return null;

  const currentRules = learnedRules.filter(r => r.type === activeTab);

  const handleDelete = async (ruleToDelete: Rule) => {
    if (!confirm('Bạn có chắc muốn xóa quy tắc này?')) return;
    
    setLearnedRules(learnedRules.filter(r => r.rule !== ruleToDelete.rule));
    try {
      await supabase.from('learned_rules').delete().eq('rule', ruleToDelete.rule);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (oldRule: Rule) => {
    if (!editValue.trim()) return;
    
    const updated = learnedRules.map(r => 
      r.rule === oldRule.rule ? { ...r, rule: editValue.trim() } : r
    );
    setLearnedRules(updated);
    setEditingId(null);
    
    try {
      await supabase.from('learned_rules')
        .update({ rule: editValue.trim() })
        .eq('rule', oldRule.rule);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    
    const newRuleObj: Rule = {
      rule: newValue.trim(),
      type: activeTab,
      added_by: currentUser
    };
    
    setLearnedRules([...learnedRules, newRuleObj]);
    setIsAdding(false);
    setNewValue('');
    
    try {
      await supabase.from('learned_rules').insert([newRuleObj]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[600px] max-w-full p-6 animate-fade-in flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit size={20} className="text-purple-600" />
            Bộ nhớ Trợ lý
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4">
          <button 
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'base' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('base')}
          >
            Quy tắc gốc (Base Rules)
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'learned' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('learned')}
          >
            Quy tắc bổ sung (Learned Rules)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 bg-slate-50 border border-slate-200 rounded-lg p-2 custom-scrollbar">
          {currentRules.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
              <BrainCircuit size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Chưa có quy tắc nào.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {currentRules.map((r, idx) => (
                <li key={idx} className="flex flex-col bg-white p-3 rounded border border-slate-100 shadow-sm group">
                  {editingId === idx ? (
                    <div className="flex gap-2 w-full">
                      <textarea 
                        className="flex-1 border border-purple-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[60px]"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleSaveEdit(r)} className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">Lưu</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300">Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between w-full">
                        <span className="text-sm text-slate-700 leading-relaxed pr-2 flex-1">
                          <span className="font-semibold text-purple-600 mr-2">#{idx + 1}</span>
                          {r.rule}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(idx); setEditValue(r.rule); }} className="text-slate-400 hover:text-blue-500 p-1" title="Sửa">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(r)} className="text-slate-400 hover:text-red-500 p-1" title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center mt-2 text-[10px] text-slate-400 bg-slate-50 self-start px-2 py-0.5 rounded-full">
                        <UserCircle2 size={12} className="mr-1" />
                        Thêm bởi {r.added_by}
                      </div>
                    </>
                  )}
                </li>
              ))}

              {isAdding && (
                <li className="flex flex-col bg-white p-3 rounded border border-purple-200 shadow-sm">
                  <div className="flex gap-2 w-full">
                    <textarea 
                      className="flex-1 border border-purple-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[60px]"
                      placeholder="Nhập quy tắc mới..."
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      autoFocus
                    />
                    <div className="flex flex-col gap-2">
                      <button onClick={handleAdd} className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">Thêm</button>
                      <button onClick={() => { setIsAdding(false); setNewValue(''); }} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300">Hủy</button>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-auto">
          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus size={16} className="mr-1" /> Thêm quy tắc mới
            </button>
          ) : <div></div>}
          
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
