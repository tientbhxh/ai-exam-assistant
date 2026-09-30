'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SettingsModal from '@/components/SettingsModal';
import MemoryModal from '@/components/MemoryModal';
import Login from '@/components/Login';
import { supabase } from '@/lib/supabase';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false });
const PreviewInterface = dynamic(() => import('@/components/PreviewInterface'), { ssr: false });
import { generateChatResponse } from '@/lib/gemini';
import { Key, BrainCircuit } from 'lucide-react';

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  
  const [learnedRules, setLearnedRules] = useState<string[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch rules from Supabase
  const fetchRules = async () => {
    try {
      const { data, error } = await supabase.from('learned_rules').select('rule');
      if (error) throw error;
      if (data) {
        setLearnedRules(data.map(item => item.rule));
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
      fetchRules(); // Load rules if logged in
    }

    if (savedKey) {
      setApiKey(savedKey);
    } else if (role === 'admin') {
      setShowSettings(true);
    }
    
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: any) => {
    setInput(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!apiKey) {
      alert("Vui lòng nhập API Key trước khi gửi!");
      setShowSettings(true);
      return;
    }
    
    if (!input.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

    try {
      await generateChatResponse(
        apiKey,
        selectedModel,
        newMessages,
        learnedRules,
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

  const [examContent, setExamContent] = useState<string | null>(null);

  // Extract <EXAM_CONTENT> and <RULE> from messages
  useEffect(() => {
    // Look at the latest assistant message
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
      const latestMessage = assistantMessages[assistantMessages.length - 1];
      
      // Extract exam content
      const examMatch = latestMessage.content.match(/<EXAM_CONTENT>([\s\S]*?)<\/EXAM_CONTENT>/);
      if (examMatch && examMatch[1]) {
        setExamContent(examMatch[1]);
      }
      
      // Extract learned rules
      const ruleMatches = [...latestMessage.content.matchAll(/<RULE>([\s\S]*?)<\/RULE>/g)];
      if (ruleMatches.length > 0) {
        let newRulesAdded = false;
        const currentRules = [...learnedRules];
        const newRulesToInsert: string[] = [];
        
        ruleMatches.forEach(match => {
          const rule = match[1].trim();
          if (rule && !currentRules.includes(rule)) {
            currentRules.push(rule);
            newRulesToInsert.push(rule);
            newRulesAdded = true;
          }
        });
        
        if (newRulesAdded) {
          setLearnedRules(currentRules);
          
          // Save to Supabase instead of localStorage
          const saveToSupabase = async () => {
            const records = newRulesToInsert.map(rule => ({ rule }));
            const { error } = await supabase.from('learned_rules').insert(records);
            if (error) console.error("Lỗi lưu rule lên Supabase:", error);
          };
          saveToSupabase();
        }
      }
    }
  }, [messages, learnedRules]);

  // Strip <EXAM_CONTENT> and <RULE> tags from chat display
  const displayMessages = messages.map(m => {
    let strippedContent = m.content.replace(/<EXAM_CONTENT>[\s\S]*?<\/EXAM_CONTENT>/g, '\n\n*✅ Đã tạo đề thi và hiển thị ở bảng bên phải.*');
    strippedContent = strippedContent.replace(/<RULE>([\s\S]*?)<\/RULE>/g, '\n\n*🧠 Đã ghi nhớ quy tắc: "$1"*');
    return { ...m, content: strippedContent };
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
      />

      {/* Sidebar / Chat Interface */}
      <section className="w-1/3 min-w-[380px] max-w-[500px] border-r border-slate-200 bg-white flex flex-col shadow-sm z-10 print:hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-slate-800">Trợ lý Khảo thí AI</h1>
            <p className="text-xs text-slate-500">
              Được cung cấp bởi Google Gemini
              <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                {userRole === 'admin' ? 'Thầy (Admin)' : 'Cô Giáo'}
              </span>
            </p>
          </div>
          
          {userRole === 'admin' && (
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
          )}
          
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
        <div className="flex-1 overflow-hidden">
          <ChatInterface 
            messages={displayMessages} 
            input={input} 
            handleInputChange={handleInputChange} 
            handleSubmit={onSubmit}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Main Content / Preview Interface */}
      <section className="flex-1 bg-slate-100 flex flex-col h-full overflow-hidden relative print:bg-white">
        <PreviewInterface content={examContent} />
      </section>
    </main>
  );
}
