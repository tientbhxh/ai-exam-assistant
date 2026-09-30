'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SettingsModal from '@/components/SettingsModal';
import MemoryModal, { Rule } from '@/components/MemoryModal';
import Login from '@/components/Login';
import { supabase } from '@/lib/supabase';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false });
const PreviewInterface = dynamic(() => import('@/components/PreviewInterface'), { ssr: false });
import { generateChatResponse } from '@/lib/gemini';
import { Key, BrainCircuit, CheckSquare, Save } from 'lucide-react';

type SessionState = 'idle' | 'active' | 'review';

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  
  const [learnedRules, setLearnedRules] = useState<Rule[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [suggestedRules, setSuggestedRules] = useState<{rule: string, selected: boolean}[]>([]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase.from('learned_rules').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data) {
        setLearnedRules(data as Rule[]);
      }
    } catch (err) {
      console.error("Lỗi tải trí nhớ từ Supabase:", err);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    const role = localStorage.getItem('auth_role');
    
    if (role) {
      setUserRole(role);
      fetchRules();
    }

    if (savedKey) setApiKey(savedKey);
    else if (role === 'admin') setShowSettings(true);
    
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: any) => setInput(e.target.value);

  const triggerAI = async (inputText: string, forcedState?: SessionState) => {
    if (!apiKey) {
      alert("Vui lòng nhập API Key trước khi gửi!");
      setShowSettings(true);
      return;
    }
    
    const currentState = forcedState || sessionState;
    const userMessage = { id: Date.now().toString(), role: 'user', content: inputText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

    try {
      await generateChatResponse(
        apiKey,
        selectedModel,
        newMessages,
        learnedRules,
        currentState,
        (textChunk) => {
          setMessages(prev => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (copy[lastIdx].role === 'assistant') {
              copy[lastIdx] = { ...copy[lastIdx], content: textChunk };
            }
            return copy;
          });
        }
      );
    } catch (err: any) {
      alert("Lỗi từ Google Gemini: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await triggerAI(text);
  };

  const onButtonClick = async (text: string) => {
    if (text === 'Bắt đầu tạo đề thi' && sessionState === 'idle') {
      setSessionState('active');
    }
    await triggerAI(text);
  };

  const handleStartSession = () => {
    setSessionState('idle');
    setMessages([]);
    setExamContent(null);
    triggerAI("[System: Bắt đầu phiên làm việc. Hãy tóm tắt các quy tắc bạn đang có và hỏi tôi đã sẵn sàng chưa bằng nút bấm Bắt đầu tạo đề thi.]", 'idle');
  };

  const handleEndSession = () => {
    if (!confirm("Bạn có chắc chắn đã thiết kế xong đề thi này và muốn chuyển sang bước Đúc kết kinh nghiệm?")) return;
    setSessionState('review');
    triggerAI("[System: Cô giáo đã hoàn thành đề thi. Hãy phân tích toàn bộ lịch sử trò chuyện vừa rồi, xuất ra các quy tắc/thói quen mới (nếu có) bằng thẻ <RULE>...</RULE>. Nếu không có thì phản hồi Không có quy tắc mới.]", 'review');
  };

  const [examContent, setExamContent] = useState<string | null>(null);

  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
      const latestMessage = assistantMessages[assistantMessages.length - 1];
      
      const examMatch = latestMessage.content.match(/<EXAM_CONTENT>([\s\S]*?)<\/EXAM_CONTENT>/);
      if (examMatch && examMatch[1]) {
        setExamContent(examMatch[1]);
      }
      
      if (sessionState === 'review' && !isLoading) {
        const ruleMatches = [...latestMessage.content.matchAll(/<RULE>([\s\S]*?)<\/RULE>/g)];
        if (ruleMatches.length > 0) {
          const extracted = ruleMatches.map(m => m[1].trim()).filter(Boolean);
          // Only show rules that are not already in learnedRules
          const newUniqueRules = extracted.filter(r => !learnedRules.some(lr => lr.rule === r));
          
          if (newUniqueRules.length > 0 && suggestedRules.length === 0) {
             setSuggestedRules(newUniqueRules.map(r => ({ rule: r, selected: true })));
          }
        }
      }
    }
  }, [messages, sessionState, isLoading, learnedRules, suggestedRules.length]);

  const saveSuggestedRules = async () => {
    const rulesToSave = suggestedRules.filter(r => r.selected).map(r => ({
      rule: r.rule,
      type: 'learned',
      added_by: userRole || 'unknown'
    }));
    
    if (rulesToSave.length > 0) {
      setLearnedRules(prev => [...prev, ...rulesToSave as Rule[]]);
      const { error } = await supabase.from('learned_rules').insert(rulesToSave);
      if (error) console.error("Lỗi lưu rules:", error);
    }
    
    setSuggestedRules([]);
    setSessionState('idle');
    setMessages([]);
    setExamContent(null);
    alert("Đã kết thúc phiên và lưu các quy tắc thành công!");
  };

  const skipReview = () => {
    setSuggestedRules([]);
    setSessionState('idle');
    setMessages([]);
    setExamContent(null);
  };

  const displayMessages = messages.filter(m => !m.content.startsWith('[System:')).map(m => {
    let content = m.content.replace(/<EXAM_CONTENT>[\s\S]*?<\/EXAM_CONTENT>/g, '\n\n*✅ Đã cập nhật đề thi ở bảng bên phải.*');
    content = content.replace(/<RULE>([\s\S]*?)<\/RULE>/g, '');

    const buttons: string[] = [];
    content = content.replace(/<BUTTON>([\s\S]*?)<\/BUTTON>/g, (match: string, p1: string) => {
      buttons.push(p1.trim());
      return '';
    });
    
    return { ...m, content, buttons };
  });

  if (!userRole) {
    return <Login onLoginSuccess={(role) => {
      setUserRole(role);
      fetchRules();
      if (role === 'admin' && !apiKey) setShowSettings(true);
    }} />;
  }

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        apiKey={apiKey} 
        setApiKey={setApiKey} 
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />
      
      <MemoryModal
        isOpen={showMemory}
        onClose={() => setShowMemory(false)}
        learnedRules={learnedRules}
        setLearnedRules={setLearnedRules}
        currentUser={userRole}
      />

      <section className="w-1/3 min-w-[380px] max-w-[500px] border-r border-slate-200 bg-white flex flex-col shadow-sm z-10 print:hidden relative">
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-slate-800">Trợ lý tạo đề thi</h1>
            <p className="text-xs text-slate-500">
              Dành riêng cho cô giáo Sunnie
              <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                {userRole === 'admin' ? 'Admin' : 'Giáo viên'}
              </span>
            </p>
          </div>
          
          <div className="flex space-x-1">
            <button 
              onClick={() => setShowMemory(true)}
              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors relative"
              title="Trí nhớ AI"
            >
              <BrainCircuit size={16} />
              {learnedRules.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
              )}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              title="Cài đặt API Key"
            >
              <Key size={16} />
            </button>
          </div>
          
          <button 
            onClick={() => {
              localStorage.removeItem('auth_role');
              setUserRole(null);
            }}
            className="p-2 ml-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors text-xs"
            title="Đăng xuất"
          >
            Thoát
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <ChatInterface 
            messages={displayMessages} 
            input={input} 
            handleInputChange={handleInputChange} 
            handleSubmit={onSubmit}
            isLoading={isLoading}
            onButtonClick={onButtonClick}
            sessionState={sessionState}
            onStartSession={handleStartSession}
            onEndSession={handleEndSession}
          />
          
          {/* Rules Suggestion Panel (Review State) */}
          {sessionState === 'review' && suggestedRules.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-purple-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] animate-fade-in z-20">
              <h3 className="font-bold text-slate-800 flex items-center text-sm mb-3">
                <BrainCircuit size={16} className="text-purple-600 mr-2" />
                AI đã học được {suggestedRules.length} quy tắc mới!
              </h3>
              <p className="text-xs text-slate-500 mb-3">Vui lòng chọn các quy tắc bạn muốn lưu lại cho những lần sau:</p>
              
              <ul className="space-y-2 mb-4 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                {suggestedRules.map((sr, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={sr.selected}
                      onChange={() => {
                        const copy = [...suggestedRules];
                        copy[idx].selected = !copy[idx].selected;
                        setSuggestedRules(copy);
                      }}
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">{sr.rule}</span>
                  </li>
                ))}
              </ul>
              
              <div className="flex gap-2">
                <button onClick={saveSuggestedRules} className="flex-1 flex justify-center items-center gap-2 bg-purple-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-purple-700">
                  <Save size={16} /> Lưu & Kết thúc
                </button>
                <button onClick={skipReview} className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300">
                  Bỏ qua
                </button>
              </div>
            </div>
          )}
          
          {/* No rules found panel */}
          {sessionState === 'review' && suggestedRules.length === 0 && !isLoading && messages.length > 0 && messages[messages.length-1].role === 'assistant' && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg animate-fade-in z-20 flex justify-between items-center">
              <span className="text-sm text-slate-600">Không có quy tắc mới nào.</span>
              <button onClick={skipReview} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
                Xong
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 bg-slate-100 flex flex-col h-full overflow-hidden relative print:bg-white">
        <PreviewInterface content={examContent} />
      </section>
    </main>
  );
}
