'use client';

import React from 'react';
import { Download, FileText, FileDown, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PreviewInterfaceProps {
  content: string | null;
}

export default function PreviewInterface({ content }: PreviewInterfaceProps) {
  
  const handlePrint = () => {
    window.print();
  };

  const exportToWord = () => {
    const contentElement = document.getElementById('exam-content');
    if (!contentElement) return;

    // Build Word-compatible HTML Document
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Đề thi</title><style>body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 5px; } h1 { text-align: center; font-size: 18pt; }</style></head><body>`;
    const footer = `</body></html>`;
    const html = header + contentElement.innerHTML + footer;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'De_Thi_AI.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/50 print:bg-white print:h-auto">
      {/* Header bar (Hidden when printing) */}
      <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-6 shadow-sm z-10 print:hidden">
        <div className="flex items-center space-x-2 text-slate-800">
          <FileText size={18} className="text-blue-600" />
          <h2 className="font-semibold text-sm">Xem trước đề thi</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={exportToWord}
            disabled={!content}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <FileDown size={14} className="text-emerald-600" />
            <span>Tải Word (.doc)</span>
          </button>
          <button 
            onClick={handlePrint}
            disabled={!content}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            <Download size={14} />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Document Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0 print:overflow-visible">
        <div className="max-w-[800px] min-h-[1056px] mx-auto bg-white shadow-sm border border-slate-200 p-12 rounded-sm relative print:border-none print:shadow-none print:p-0 print:min-h-0 print:max-w-none print:m-0">
          
          {!content ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 print:hidden">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Sparkles size={32} className="text-blue-300 animate-pulse" />
              </div>
              <p className="text-sm font-medium">Bản xem trước đề thi sẽ xuất hiện ở đây.</p>
              <p className="text-xs mt-2 max-w-[250px] text-center">Hãy bắt đầu bằng cách trò chuyện với Trợ lý ở khung bên trái.</p>
            </div>
          ) : (
            <div id="exam-content" className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h1:text-center prose-h1:mb-8 prose-h2:text-lg prose-h2:mt-6 prose-p:text-sm prose-li:text-sm prose-table:w-full prose-table:border-collapse prose-th:border prose-th:p-2 prose-td:border prose-td:p-2">
              <ReactMarkdown>
                {content}
              </ReactMarkdown>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
