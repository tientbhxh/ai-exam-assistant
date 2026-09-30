'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Loader2, PlayCircle, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  messages: any[];
  input: string;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any) => void;
  isLoading: boolean;
  onButtonClick?: (text: string) => void;
  sessionState: 'idle' | 'active' | 'review';
  onStartSession: () => void;
  onEndSession: () => void;
}

export default function ChatInterface({ 
  messages, input, handleInputChange, handleSubmit, isLoading, onButtonClick, sessionState, onStartSession, onEndSession 
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sessionState]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Session Controls */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex justify-center z-10">
        {sessionState === 'idle' && (
          <button onClick={onStartSession} className="flex items-center space-x-1 px-4 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-full shadow-sm hover:bg-purple-700 transition-colors animate-pulse">
            <PlayCircle size={14} />
            <span>Bắt đầu Phiên Làm Việc Mới</span>
          </button>
        )}
        {sessionState === 'active' && (
          <button onClick={onEndSession} className="flex items-center space-x-1 px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-full shadow-sm hover:bg-emerald-700 transition-colors">
            <CheckCircle size={14} />
            <span>Hoàn thành Đề Thi</span>
          </button>
        )}
        {sessionState === 'review' && (
          <span className="flex items-center space-x-1 px-4 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-full shadow-sm">
            <Loader2 size={14} className="animate-spin" />
            <span>Đang đúc kết kinh nghiệm...</span>
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
        {/* Welcome Message */}
        {messages.length === 0 && sessionState === 'idle' && (
          <div className="flex justify-center animate-fade-in mt-10">
            <div className="bg-white rounded-xl p-6 max-w-sm text-center shadow-sm border border-slate-200">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <PlayCircle size={24} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Phiên làm việc mới</h3>
              <p className="text-xs text-slate-500 mb-4">
                Bấm "Bắt đầu" để Trợ lý nhắc lại các Quy tắc và cùng cô giáo tạo một đề thi xuất sắc.
              </p>
              <button onClick={onStartSession} className="w-full py-2 bg-purple-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-purple-700 transition-colors">
                Bắt đầu ngay
              </button>
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex flex-col max-w-[90%]`}>
              <div 
                className={`rounded-2xl p-3 text-sm shadow-sm border bg-white text-slate-800 border-slate-200 ${
                  m.role === 'user' ? 'rounded-tr-sm self-end' : 'rounded-tl-sm self-start'
                }`}
              >
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
              
              {/* Interactive Buttons from AI */}
              {m.buttons && m.buttons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 self-start ml-2">
                  {m.buttons.map((btnText: string, i: number) => (
                    <button 
                      key={i}
                      onClick={() => onButtonClick && onButtonClick(btnText)}
                      disabled={isLoading || sessionState === 'review'}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {btnText}
                    </button>
                  ))}
                </div>
              )}
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
      
      <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            value={input}
            onChange={handleInputChange}
            type="text"
            placeholder={sessionState === 'active' ? "Nhập yêu cầu để tạo đề thi..." : (sessionState === 'idle' ? "Vui lòng Bắt đầu phiên làm việc..." : "Đang chờ phân tích...")}
            className="w-full bg-slate-50 border border-slate-300 text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
            disabled={isLoading || sessionState !== 'active'}
          />
          <button 
            type="submit"
            disabled={isLoading || !input?.trim() || sessionState !== 'active'}
            className="absolute right-1.5 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
          >
            <Send size={16} className="-ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
