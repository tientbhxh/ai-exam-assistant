'use client';

import React, { useState } from 'react';
import { Download, FileText, FileDown, Sparkles, CheckCircle2, XCircle, RefreshCw, BarChart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Helper function to calculate Flesch Reading Ease (100-point scale)
function calculateReadability(text: string): number | null {
  if (!text) return null;
  const cleanText = text.replace(/[*#_>`~\[\]]|<[^>]+>/g, '').trim();
  const words = cleanText.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
  if (words.length < 40) return null; // Quá ngắn, không đo

  const sentences = cleanText.split(/[.!?]+/).filter(Boolean).length || 1;
  
  let syllables = 0;
  words.forEach(word => {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return;
    if (word.length <= 3) { syllables += 1; return; }
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const sylMatch = word.match(/[aeiouy]{1,2}/g);
    syllables += sylMatch ? sylMatch.length : 1;
  });

  // Flesch Reading Ease formula
  let fre = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  fre = Math.max(0, Math.min(100, fre)); // Giới hạn từ 0-100
  return Math.round(fre);
}

export interface ExamBlock {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  level?: string;
}

export interface TestFormRow {
  section: string;
  questionNumber: number;
  knowledge: string;
  level: string;
  prompt: string;
}

interface PreviewInterfaceProps {
  blocks: ExamBlock[];
  testForm: TestFormRow[] | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export default function PreviewInterface({ blocks, testForm, onApprove, onReject }: PreviewInterfaceProps) {
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [showRejectInput, setShowRejectInput] = useState<{ [key: string]: boolean }>({});

  const handlePrint = () => {
    window.print();
  };

  const exportToWord = () => {
    const contentElement = document.getElementById('exam-content');
    if (!contentElement) return;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Đề thi</title><style>body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 5px; } h1 { text-align: center; font-size: 18pt; }</style></head><body>`;
    const footer = `</body></html>`;
    const html = header + contentElement.innerHTML + footer;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'De_Thi.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const allApproved = blocks.length > 0 && blocks.every(b => b.status === 'approved');

  // Stitched markdown for print/export (Hidden in UI, visible in print)
  const fullContent = blocks.map(b => b.content).join('\n\n');

  return (
    <div className="flex flex-col h-full bg-slate-100/50 print:bg-white print:h-auto">
      {/* Header bar */}
      <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-6 shadow-sm z-10 print:hidden">
        <div className="flex items-center space-x-2 text-slate-800">
          <FileText size={18} className="text-blue-600" />
          <h2 className="font-semibold text-sm">Giao diện Thiết kế Đề thi</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {!allApproved && blocks.length > 0 && (
            <span className="text-xs font-medium text-amber-600 mr-2 bg-amber-50 px-2 py-1 rounded">Vui lòng duyệt các khối</span>
          )}
          <button 
            onClick={exportToWord}
            disabled={!allApproved}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <FileDown size={14} className="text-emerald-600" />
            <span>Tải Word (.doc)</span>
          </button>
          <button 
            onClick={handlePrint}
            disabled={!allApproved}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            <Download size={14} />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Document Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar print:p-0 print:overflow-visible">
        
        {/* INTERACTIVE BUILDER UI (Hidden when printing) */}
        <div className="max-w-[800px] mx-auto space-y-4 print:hidden">
          {blocks.length === 0 ? (
            testForm ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Cấu trúc Đề thi (Đã xác nhận)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border p-2">PHẦN</th>
                        <th className="border p-2 text-center">CÂU</th>
                        <th className="border p-2">KIẾN THỨC</th>
                        <th className="border p-2 text-center">MỨC ĐỘ</th>
                        <th className="border p-2">ĐỀ BÀI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testForm.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="border p-2 font-medium">{row.section}</td>
                          <td className="border p-2 text-center">{row.questionNumber}</td>
                          <td className="border p-2 text-slate-600">{row.knowledge}</td>
                          <td className="border p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${row.level === 'NB' ? 'bg-green-100 text-green-700' : row.level === 'TH' ? 'bg-blue-100 text-blue-700' : row.level === 'VD' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{row.level}</span>
                          </td>
                          <td className="border p-2 text-xs text-slate-500 max-w-[200px] truncate" title={row.prompt}>{row.prompt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 mt-20">
                <div className="bg-white p-4 rounded-full mb-4 shadow-sm border border-slate-100">
                  <Sparkles size={32} className="text-blue-300 animate-pulse" />
                </div>
                <p className="text-sm font-medium">Chưa có câu hỏi nào được tạo.</p>
                <p className="text-xs mt-2 max-w-[250px] text-center">Bạn có thể Tải lên Cấu trúc đề (Excel) ở cột bên trái, hoặc chat với Trợ lý để bắt đầu.</p>
              </div>
            )
          ) : (
            blocks.map((block) => {
              const isApproved = block.status === 'approved';
              const isRejected = block.status === 'rejected';
              
              // Đo Readability nếu là Khối chưa có level và khá dài
              let readabilityScore = null;
              if (!block.level || block.level.trim() === '') {
                 readabilityScore = calculateReadability(block.content);
              }

              return (
                <div 
                  key={block.id} 
                  className={`bg-white shadow-sm border rounded-xl overflow-hidden transition-all duration-300 relative ${
                    isApproved ? 'border-emerald-500 shadow-emerald-100/50' : 
                    isRejected ? 'border-red-300 bg-red-50/30' : 
                    'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {readabilityScore !== null && (
                     <div className="absolute top-3 right-3 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-bold flex items-center shadow-sm">
                       <BarChart size={12} className="mr-1" />
                       Readability: {readabilityScore}/100 
                       <span className="font-normal ml-1">
                         ({readabilityScore >= 90 ? 'Lớp 5' : readabilityScore >= 80 ? 'Lớp 6' : readabilityScore >= 70 ? 'Lớp 7' : readabilityScore >= 60 ? 'Lớp 8-9' : readabilityScore >= 50 ? 'Lớp 10-12' : 'Đại học'})
                       </span>
                     </div>
                  )}
                  <div className={`p-4 prose prose-slate max-w-none prose-p:text-sm prose-li:text-sm whitespace-pre-wrap ${
                    isRejected ? 'opacity-50' : ''
                  }${readabilityScore !== null ? ' pt-8' : ''}`}>
                    <ReactMarkdown>{block.content}</ReactMarkdown>
                  </div>
                  
                  <div className={`px-4 py-3 bg-slate-50 border-t flex items-center justify-between transition-colors ${
                    isApproved ? 'bg-emerald-50/50 border-emerald-100' : 'border-slate-100'
                  }`}>
                    <div className="flex items-center space-x-3 text-xs font-medium text-slate-400">
                      <span>ID Khối: <span className="font-mono">{block.id}</span></span>
                      {block.level && block.level.trim() !== '' && (
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] uppercase font-bold tracking-wider">
                          {block.level}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!isApproved && !showRejectInput[block.id] && (
                        <button 
                          onClick={() => setShowRejectInput({ ...showRejectInput, [block.id]: true })}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors"
                        >
                          <XCircle size={14} className="mr-1" /> Từ chối
                        </button>
                      )}
                      
                      {!isApproved && showRejectInput[block.id] && (
                        <div className="flex items-center animate-fade-in">
                          <input 
                            type="text" 
                            placeholder="Lý do? (VD: Dễ quá)" 
                            value={rejectReason[block.id] || ''}
                            onChange={(e) => setRejectReason({ ...rejectReason, [block.id]: e.target.value })}
                            className="text-xs border border-red-300 rounded-l px-2 py-1.5 focus:outline-none w-[200px]"
                            autoFocus
                          />
                          <button 
                            onClick={() => {
                              onReject(block.id, rejectReason[block.id] || 'Đổi câu khác');
                              setShowRejectInput({ ...showRejectInput, [block.id]: false });
                            }}
                            className="bg-red-500 text-white px-2 py-1.5 text-xs font-medium rounded-r hover:bg-red-600"
                          >
                            Gửi
                          </button>
                          <button 
                            onClick={() => setShowRejectInput({ ...showRejectInput, [block.id]: false })}
                            className="ml-2 text-slate-400 hover:text-slate-600"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}

                      {!isApproved && (
                        <button 
                          onClick={() => onApprove(block.id)}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 rounded hover:bg-emerald-200 transition-colors shadow-sm"
                        >
                          <CheckCircle2 size={14} className="mr-1" /> Duyệt
                        </button>
                      )}

                      {isApproved && (
                        <div className="flex items-center text-emerald-600 text-xs font-medium">
                          <CheckCircle2 size={16} className="mr-1" /> Đã duyệt
                          <button 
                            onClick={() => onReject(block.id, 'Tôi đổi ý, hãy làm lại khối này')}
                            className="ml-4 text-slate-400 hover:text-blue-500 flex items-center"
                          >
                            <RefreshCw size={12} className="mr-1" /> Làm lại
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PRINT/EXPORT VIEW (Hidden in UI, visible when printing) */}
        <div 
          id="exam-content" 
          className="hidden print:block prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h1:text-center prose-h1:mb-8 prose-h2:text-lg prose-h2:mt-6 prose-p:text-sm prose-li:text-sm prose-table:w-full prose-table:border-collapse prose-th:border prose-th:p-2 prose-td:border prose-td:p-2 whitespace-pre-wrap"
        >
          <ReactMarkdown>{fullContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
