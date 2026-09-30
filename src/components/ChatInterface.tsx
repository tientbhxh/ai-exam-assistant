'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  messages: any[];
  input: string;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any) => void;
  isLoading: boolean;
}

export default function ChatInterface({ messages, input, handleInputChange, handleSubmit, isLoading }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-4 max-w-[90%] text-sm text-slate-800 shadow-sm border border-slate-200/50">
              <p className="font-semibold mb-2">Xin chào! 👋</p>
              <p>Tôi là trợ lý AI chuyên tạo đề thi Tiếng Anh. Để có một đề thi chất lượng, hãy cho tôi biết:</p>
              <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-600">
                <li>Đề thi dành cho <b>lớp mấy / trình độ nào</b>?</li>
                <li>Thời gian làm bài là <b>bao lâu</b>?</li>
                <li>Cấu trúc phần thi (Trắc nghiệm, Tự luận, Nghe...)?</li>
              </ul>
              <p className="mt-3 italic text-xs text-slate-500">Hoặc bạn cứ nhập bất cứ yêu cầu nào, tôi sẽ hỏi thêm nếu cần!</p>
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div 
              className={`rounded-2xl p-3 max-w-[90%] text-sm shadow-sm border bg-white text-slate-800 border-slate-200 ${
                m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
              }`}
            >
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-slate-200 text-slate-500">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            value={input}
            onChange={handleInputChange}
            type="text"
            placeholder="Nhập yêu cầu..."
            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input?.trim()}
            className="absolute right-1.5 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
          >
            <Send size={16} className="-ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
