import React, { useState, useEffect } from 'react';
import { BookOpen, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Rule } from './MemoryModal';

interface MatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  examMatrix: string;
  setExamMatrix: (matrix: string) => void;
  currentUser: string;
}

const DEFAULT_MATRIX = `# MA TRẬN ĐẶC TẢ CÁC MỨC ĐỘ ĐÁNH GIÁ ĐỀ THI TIẾNG ANH

> **Chỉ thị 1 (Tuân thủ Ma trận):** Khi tạo câu hỏi, BẮT BUỘC phải đối chiếu với bảng đặc tả dưới đây. Phân loại câu hỏi phải phản ánh đúng bản chất của mức độ được yêu cầu.
> 
> **Chỉ thị 2 (Nghệ thuật tạo Bẫy cho mức độ Vận dụng - VD):** Cấm ra đề theo kiểu "tìm từ khóa là thấy đáp án". Phương án nhiễu phải buộc học sinh tổng hợp thông tin từ 2-3 câu khác nhau. Hãy dùng kỹ thuật Paraphrase (đảo cấu trúc, dùng từ đồng nghĩa) cho đáp án đúng, và lấy nguyên si từ vựng trong bài để tạo đáp án sai.
>
> **Chỉ thị 3 (Nghệ thuật tạo Bẫy cho mức độ Vận dụng cao - VDC):** Đây là mức độ tư duy cao nhất. Phương án nhiễu (distractors) phải cực kỳ tinh vi: chứa đựng một "nửa sự thật" (đúng một vế, sai một vế), hoặc mang ý nghĩa khái quát quá rộng/quá hẹp so với bài. Học sinh bắt buộc phải hiểu được "hàm ý ẩn" (read between the lines) hoặc logic toàn bài mới có thể thoát bẫy.

## I. LISTENING (Nghe hiểu)
- **Nhận biết (NB):** Nghe hiểu các thông tin chi tiết, đơn giản.
- **Thông hiểu (TH):** Hiểu nội dung chính của đoạn hội thoại để tìm câu trả lời đúng.
- **Vận dụng (VD):** Tổng hợp thông tin từ nhiều chi tiết, phân tích và loại trừ các phương án nhiễu.
- **Vận dụng cao (VDC):** Sử dụng thông tin nghe được để ứng dụng vào bài Nói/Viết.`;

export default function MatrixModal({ isOpen, onClose, examMatrix, setExamMatrix, currentUser }: MatrixModalProps) {
  const [value, setValue] = useState(examMatrix || DEFAULT_MATRIX);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(examMatrix || DEFAULT_MATRIX);
    }
  }, [isOpen, examMatrix]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setExamMatrix(value);
    try {
      // Check if matrix rule exists
      const { data } = await supabase.from('learned_rules').select('id').eq('type', 'matrix').limit(1);
      
      if (data && data.length > 0) {
        await supabase.from('learned_rules').update({ rule: value }).eq('id', data[0].id);
      } else {
        await supabase.from('learned_rules').insert([{
          rule: value,
          type: 'matrix',
          added_by: currentUser
        }]);
      }
    } catch (e) {
      console.error("Lỗi lưu ma trận:", e);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[800px] max-w-[95vw] h-[85vh] animate-fade-in flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-600" />
            Quản lý Ma trận Đặc tả (Exam Matrix)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        {/* Editor Area */}
        <div className="flex-1 p-4 bg-slate-100 flex flex-col">
          <p className="text-xs text-slate-500 mb-2 font-medium">
            Bạn có thể chỉnh sửa nội dung bên dưới bằng định dạng Markdown. AI sẽ tự động đọc bản ma trận này trước khi ra đề.
          </p>
          <textarea
            className="flex-1 w-full p-4 border border-slate-300 rounded-lg shadow-inner text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 custom-scrollbar resize-none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
          />
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Đang lưu...' : 'Lưu Ma trận'}
          </button>
        </div>

      </div>
    </div>
  );
}
