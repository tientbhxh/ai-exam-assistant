'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SettingsModal from '@/components/SettingsModal';
import MemoryModal, { Rule } from '@/components/MemoryModal';
import Login from '@/components/Login';
import { supabase } from '@/lib/supabase';

import { generateChatResponse } from '@/lib/llm';
import { Key, BrainCircuit, Save, Upload } from 'lucide-react';
import * as xlsx from 'xlsx';
import { ExamBlock, TestFormRow } from '@/components/PreviewInterface';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false });
const PreviewInterface = dynamic(() => import('@/components/PreviewInterface'), { ssr: false });

type SessionState = 'idle' | 'active' | 'review';

export default function Home() {
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [openRouterKeys, setOpenRouterKeys] = useState<string[]>([]);
  const [provider, setProvider] = useState<'google' | 'openrouter'>('google');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [smartModel, setSmartModel] = useState<string>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  
  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({message, type});
    const duration = type === 'error' ? 15000 : 4000; // Lỗi hiện 15 giây để kịp chụp ảnh
    setTimeout(() => setToast(null), duration);
  };
  
  const [learnedRules, setLearnedRules] = useState<Rule[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [suggestedRules, setSuggestedRules] = useState<{rule: string, selected: boolean}[]>([]);
  const [grade, setGrade] = useState<string>('Lớp 9');

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase.from('learned_rules').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data) {
        const rules = data as Rule[];
        setLearnedRules(rules.filter(r => r.type !== 'api_key'));
        
        // Trích xuất các API Keys đã lưu trên Cloud
        const cloudGoogleKeys = rules.filter(r => r.type === 'api_key').map(r => r.rule);
        if (cloudGoogleKeys.length > 0) setApiKeys(cloudGoogleKeys);

        const cloudOpenRouterKeys = rules.filter(r => r.type === 'openrouter_api_key').map(r => r.rule);
        if (cloudOpenRouterKeys.length > 0) setOpenRouterKeys(cloudOpenRouterKeys);
      }
    } catch (err) {
      console.error("Lỗi tải trí nhớ từ Supabase:", err);
    }
  };

  useEffect(() => {
    const savedGoogleKeys = localStorage.getItem('gemini_api_keys');
    const savedOpenRouterKeys = localStorage.getItem('openrouter_api_keys');
    const savedProvider = localStorage.getItem('ai_provider');
    const savedOldKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    const savedSmartModel = localStorage.getItem('smart_model');
    const role = localStorage.getItem('auth_role');
    
    if (role) {
      setUserRole(role);
      fetchRules();
    }

    if (savedGoogleKeys) setApiKeys(JSON.parse(savedGoogleKeys));
    if (savedOpenRouterKeys) setOpenRouterKeys(JSON.parse(savedOpenRouterKeys));
    if (savedProvider) setProvider(savedProvider as 'google' | 'openrouter');
    
    if (!savedGoogleKeys && savedOldKey) {
      setApiKeys([savedOldKey]);
      localStorage.setItem('gemini_api_keys', JSON.stringify([savedOldKey]));
      localStorage.removeItem('gemini_api_key');
    } else if (role === 'admin') {
      setShowSettings(true);
    }
    
    if (savedModel) setSelectedModel(savedModel);
    if (savedSmartModel) setSmartModel(savedSmartModel);
  }, []);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: any) => setInput(e.target.value);

  const triggerAI = async (inputText: string, forcedState?: SessionState) => {
    if (provider === 'google' && (!apiKeys || apiKeys.length === 0)) {
      showToast("Vui lòng nhập ít nhất 1 Google API Key trước khi gửi!", "error");
      setShowSettings(true);
      return;
    }
    if (provider === 'openrouter' && (!openRouterKeys || openRouterKeys.length === 0)) {
      showToast("Vui lòng nhập ít nhất 1 OpenRouter API Key trước khi gửi!", "error");
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

    let finalModelToUse = selectedModel;
    if (smartModel && smartModel !== 'none') {
      const lowerInput = inputText.toLowerCase();
      const isHardTask = lowerInput.includes('vận dụng cao') || lowerInput.includes('vdc') || 
                         lowerInput.includes('reading') || lowerInput.includes('đọc hiểu') || 
                         lowerInput.includes('đoạn văn') || lowerInput.includes('listening') || 
                         lowerInput.includes('nghe') || lowerInput.includes('bài nghe');
      
      if (isHardTask) {
        finalModelToUse = smartModel;
        const shortName = smartModel.replace('models/', '').replace('anthropic/', '').replace('openai/', '').replace('meta-llama/', '').replace('google/', '');
        showToast(`Đã tự động gọi Thợ Chính (${shortName}) để xử lý tác vụ phức tạp!`, "success");
      }
    }

    try {
      await generateChatResponse(
        provider,
        provider === 'google' ? apiKeys : openRouterKeys,
        finalModelToUse,
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
      showToast("Lỗi từ Google Gemini: " + err.message, "error");
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
    let nextState = sessionState;
    if (text === 'Bắt đầu tạo đề thi' && sessionState === 'idle') {
      setSessionState('active');
      nextState = 'active';
    }
    await triggerAI(text, nextState);
  };

  const [testForm, setTestForm] = useState<TestFormRow[] | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = xlsx.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      const parsedForm: TestFormRow[] = [];
      let currentSection = '';
      let currentKnowledge = '';
      let currentLevel = '';
      let currentPrompt = '';

      for (let i = 1; i < data.length; i++) { // Skip header row 0
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const section = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : currentSection;
        const qNumRaw = row[1];
        if (qNumRaw === undefined || qNumRaw === null || String(qNumRaw).trim() === '' || isNaN(Number(qNumRaw))) continue; 
        const qNum = Number(qNumRaw);

        const knowledge = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : currentKnowledge;
        const level = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : currentLevel;
        const prompt = row[4] !== undefined && row[4] !== null ? String(row[4]).trim() : currentPrompt;

        parsedForm.push({
          section,
          questionNumber: qNum,
          knowledge,
          level,
          prompt
        });

        currentSection = section;
        currentKnowledge = knowledge;
        currentLevel = level;
        currentPrompt = prompt;
      }
      
      setTestForm(parsedForm);
      showToast(`Đã tải lên Cấu trúc đề thi gồm ${parsedForm.length} câu hỏi!`, "success");
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleStartSession = () => {
    if (!testForm) {
      showToast("Vui lòng tải lên file Excel Cấu trúc Đề thi trước khi bắt đầu!", "error");
      return;
    }

    setSessionState('idle');
    setMessages([]);
    setBlocks([]);
    
    let formMd = "| Phần | Câu | Kiến thức | Mức độ | Đề bài |\n|---|---|---|---|---|\n";
    testForm.forEach(r => {
      formMd += `| ${r.section} | ${r.questionNumber} | ${r.knowledge} | ${r.level} | ${r.prompt} |\n`;
    });

    const sysPrompt = `[System: Bắt đầu phiên làm việc.
Đây là thông tin Đề thi sẽ tạo:
- Dành cho học sinh: ${grade}
- Dưới đây là Cấu trúc Đề thi (Test Form) đã được tải lên:
\n${formMd}\n
LƯU Ý QUAN TRỌNG: BẠN ĐÃ NẮM RÕ KHỐI LỚP VÀ CẤU TRÚC ĐỀ THI. TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP hỏi lại cô giáo về khối lớp hay cấu trúc đề thi nữa.
Hãy xác nhận bạn đã hiểu cấu trúc này, tóm tắt các quy tắc bạn đang có và hỏi tôi đã sẵn sàng chưa bằng nút bấm <BUTTON>Bắt đầu tạo đề thi</BUTTON>.]`;

    triggerAI(sysPrompt, 'idle');
  };

  const handleEndSession = () => {
    if (!confirm("Bạn có chắc chắn đã thiết kế xong đề thi này và muốn chuyển sang bước Đúc kết kinh nghiệm?")) return;
    setSessionState('review');
    triggerAI("[System: Cô giáo đã hoàn thành đề thi. Hãy phân tích toàn bộ lịch sử trò chuyện vừa rồi, xuất ra các quy tắc/thói quen mới (nếu có) bằng thẻ <RULE>...</RULE>. Nếu không có thì phản hồi Không có quy tắc mới.]", 'review');
  };

  const [blocks, setBlocks] = useState<ExamBlock[]>([]);

  const handleApproveBlock = (id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, status: 'approved' } : b));
  };

  const handleRejectBlock = (id: string, reason: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected' } : b));
    triggerAI(`[System: Cô giáo đã TỪ CHỐI khối có id="${id}" với lý do: "${reason}". Hãy SỬA LẠI KHỐI ĐÓ (nhớ bọc lại bằng <BLOCK id="${id}">...</BLOCK>). Các khối khác giữ nguyên.]`);
  };

  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
      const newBlocksMap = new Map<string, ExamBlock>();
      
      messages.forEach(m => {
        if (m.role === 'assistant') {
          // Parse <BLOCK id="..." level="...">...</BLOCK> with robust attribute parsing
          const blockMatches = [...m.content.matchAll(/<BLOCK\s+([^>]+)>([\s\S]*?)<\/BLOCK>/g)];
          blockMatches.forEach(match => {
            const attrs = match[1];
            let content = match[2].trim();
            
            const idMatch = attrs.match(/id="([^"]+)"/);
            const levelMatch = attrs.match(/level="([^"]+)"/);
            
            const id = idMatch ? idMatch[1] : `block-${Date.now()}`;
            let level = levelMatch ? levelMatch[1] : undefined;
            
            // Fallback: Nếu AI quên thuộc tính level nhưng lại chèn [NB], [TH] vào cuối nội dung
            if (!level) {
              const levelTagMatch = content.match(/\[(NB|TH|VD|VDC|Nhận biết|Thông hiểu|Vận dụng)\]\s*$/i);
              if (levelTagMatch) {
                level = levelTagMatch[1];
                content = content.replace(/\[(NB|TH|VD|VDC|Nhận biết|Thông hiểu|Vận dụng)\]\s*$/i, '').trim();
              }
            }

            newBlocksMap.set(id, { id, content, status: 'pending', level });
          });
        }
      });

      setBlocks(prev => {
        if (messages.length === 0) return [];
        const merged = Array.from(newBlocksMap.values()).map(newBlock => {
          const existing = prev.find(p => p.id === newBlock.id);
          if (existing && existing.content === newBlock.content) {
            return existing;
          }
          return newBlock;
        });
        return merged;
      });
      
      const latestMessage = assistantMessages[assistantMessages.length - 1];
      
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
    setBlocks([]);
    showToast("Đã kết thúc phiên và lưu các quy tắc thành công!", "success");
  };

  const skipReview = () => {
    setSuggestedRules([]);
    setSessionState('idle');
    setMessages([]);
    setBlocks([]);
  };

  const displayMessages = messages.filter(m => !m.content.startsWith('[System:')).map(m => {
    let content = m.content.replace(/<BLOCK\s+([^>]+)>[\s\S]*?<\/BLOCK>/g, '\n\n*✅ Khối nội dung đã được kết xuất ở bảng bên phải.*');
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
      if (role === 'admin' && apiKeys.length === 0) setShowSettings(true);
    }} />;
  }

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-fade-in flex items-center transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        provider={provider}
        setProvider={setProvider}
        apiKeys={apiKeys} 
        setApiKeys={setApiKeys} 
        openRouterKeys={openRouterKeys}
        setOpenRouterKeys={setOpenRouterKeys}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        smartModel={smartModel}
        setSmartModel={setSmartModel}
      />
      
      <MemoryModal
        isOpen={showMemory}
        onClose={() => setShowMemory(false)}
        learnedRules={learnedRules}
        setLearnedRules={setLearnedRules}
        currentUser={userRole}
      />

      <section className="w-1/3 min-w-[380px] max-w-[500px] border-r border-slate-200 bg-white flex flex-col shadow-sm z-10 print:hidden relative">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg text-slate-800">Trợ lý tạo đề thi</h1>
              <p className="text-xs text-slate-500 flex items-center mt-1">
                Dành riêng cho cô giáo Sunnie
                <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                  {userRole === 'admin' ? 'Admin' : 'Giáo viên'}
                </span>
              </p>
              <div className="mt-1.5 flex items-center">
                <span className={`px-1.5 py-0.5 text-[10px] uppercase font-bold rounded-sm border ${provider === 'google' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                  {provider === 'google' ? 'Google' : 'OpenRouter'}
                </span>
                <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                  {selectedModel.replace('models/', '').replace('anthropic/', '').replace('openai/', '').replace('meta-llama/', '').replace('google/', '')}
                </span>
              </div>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('auth_role');
                setUserRole(null);
              }}
              className="px-2 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors text-xs font-medium"
              title="Đăng xuất"
            >
              Thoát
            </button>
          </div>
          
          <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <select 
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="text-xs font-medium border-none bg-transparent px-2 py-1 text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-200 rounded transition-colors"
            >
              <option value="Lớp 6">Lớp 6</option>
              <option value="Lớp 7">Lớp 7</option>
              <option value="Lớp 8">Lớp 8</option>
              <option value="Lớp 9">Lớp 9</option>
              <option value="Lớp 10">Lớp 10</option>
              <option value="Lớp 11">Lớp 11</option>
              <option value="Lớp 12">Lớp 12</option>
            </select>
            
            <div className="flex space-x-1 items-center">
              <label 
                className="p-1.5 cursor-pointer text-slate-400 hover:text-emerald-600 hover:bg-white rounded-md transition-colors relative shadow-sm"
                title="Tải lên Cấu trúc đề (Excel)"
              >
                <Upload size={16} />
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                {testForm && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>
                )}
              </label>
              <button 
                onClick={() => setShowMemory(true)}
                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-white rounded-md transition-colors relative shadow-sm"
                title="Trí nhớ AI"
              >
                <BrainCircuit size={16} />
                {learnedRules.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full border border-white"></span>
                )}
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors shadow-sm"
                title="Cài đặt API Key"
              >
                <Key size={16} />
              </button>
            </div>
          </div>
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
        <PreviewInterface 
          blocks={blocks}
          testForm={testForm} 
          onApprove={handleApproveBlock}
          onReject={handleRejectBlock}
        />
      </section>
    </main>
  );
}
