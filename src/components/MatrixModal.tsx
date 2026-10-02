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
- **Nhận biết (NB):** Nghe hiểu các thông tin chi tiết, đơn giản (Thời gian, số lượng người nói, địa chỉ, số điện thoại, số tiền, phương hướng).
- **Thông hiểu (TH):** Hiểu nội dung chính của đoạn hội thoại để tìm câu trả lời đúng. Hiểu được ý chính của người nói. Hiểu được các thông tin chi tiết cụ thể để chọn True/False.
- **Vận dụng (VD):** Tổng hợp thông tin từ nhiều chi tiết, phân tích và loại trừ các phương án nhiễu (distractors) để tìm câu trả lời đúng. Nắm được ý chính để đưa ra suy luận phù hợp.
- **Vận dụng cao (VDC):** Sử dụng các thông tin nghe được để ứng dụng vào bài Nói/Viết (Câu hỏi tích hợp kỹ năng).

## II. PRONUNCIATION (Ngữ âm)
- **Nhận biết (NB):** Nhận biết các nguyên âm, phụ âm đã học thông qua các từ vựng quen thuộc. Phân biệt cách phát âm đuôi \`-s/-es\` và \`-ed\` trong các từ đơn lẻ.
- **Thông hiểu (TH):** Nhận diện trọng âm của các từ có hai hoặc ba âm tiết.
- **Vận dụng & Vận dụng cao (VD/VDC):** Ứng dụng kiến thức ngữ âm vào bài thi Nói (Tích hợp kiểm tra kỹ năng Nói).

## III. VOCABULARY (Từ vựng)
- **Nhận biết (NB):** Nhận biết từ loại (danh, động, tính, trạng). Kết hợp được các cụm từ/thành ngữ đã học thuộc lòng trong sách giáo khoa.
- **Thông hiểu (TH):** Hiểu nghĩa của từ/cụm từ quan trọng được sử dụng trong ngữ cảnh tương tự sách giáo khoa. Nắm vững Phrasal verbs và các cụm giới từ cố định (tính từ + giới từ, danh từ + giới từ). Nhận diện từ nối dùng để liên kết mệnh đề.
- **Vận dụng (VD):** Xử lý các câu hỏi về Phrasal verbs phức tạp, từ đồng nghĩa/trái nghĩa.
- **Vận dụng cao (VDC):** Xử lý các câu hỏi về Collocation/Idiom mở rộng (chưa được học trực tiếp trong sách giáo khoa).

## IV. GRAMMAR (Ngữ pháp)
- **Nhận biết (NB):** Nhận biết thì (Tense) thông qua dấu hiệu nhận biết. Nhận dạng động từ theo sau một số động từ đã học (V-ing, to-V). Sự hòa hợp chủ - vị. Nhận dạng câu điều kiện loại 2, 3 và câu bị động cơ bản.
- **Thông hiểu (TH):** Hiểu cách sử dụng, phân biệt nghĩa của các điểm ngữ pháp (Should/shouldn't; Wh-questions). Viết lại câu/nối câu sử dụng các chủ điểm ngữ pháp đã học.
- **Vận dụng (VD):** Vận dụng các điểm ngữ pháp đã học vào bài viết ở dạng câu/đoạn, hoặc tích hợp Nghe/Nói.
- **Vận dụng cao (VDC):** Sử dụng linh hoạt các cấu trúc phức tạp để triển khai bài viết ở mức độ đoạn văn dài.

## V. READING (Đọc hiểu)
### 1. Close Test (Điền khuyết)
- **Nhận biết (NB):** Điền dạng động từ theo sau động từ khác. Điền từ chỉ định (this/that/these/those) hoặc mạo từ (a/an/the). Điền lượng từ (many, a few, much, little). Điền đại từ quan hệ (who, whom, which, that, whose).
- **Thông hiểu (TH):** Điền các cụm từ (collocations/phrasal verbs) quen thuộc đã học thuộc lòng trong SGK. Điền từ dựa vào nghĩa ngữ cảnh quen thuộc.
- **Vận dụng (VD):** Điền liên từ để nối các câu. Câu hỏi từ vựng dựa vào ngữ cảnh suy luận (tương tự ngữ cảnh SGK).
- **Vận dụng cao (VDC):** Điền từ vựng ở mức độ khó, khác với lớp nghĩa thông thường trong SGK, đòi hỏi phải kết hợp chặt chẽ với ngữ cảnh toàn bài. 

### 2. Comprehension (Đọc hiểu trả lời câu hỏi)
- **Nhận biết (NB):** Tìm thông tin đơn giản, hiển hiện rõ ràng trên mặt chữ (năm, tên, tuổi, sở thích...).
- **Thông hiểu (TH):** Hiểu nghĩa đại từ tham chiếu (Reference words: it, they, them...). Tìm thông tin chi tiết. Tìm từ đồng nghĩa ở mức độ dễ đã học trong SGK.
- **Vận dụng (VD):** Tìm Ý chính (Main idea) của đoạn văn. Trả lời các câu hỏi dạng Except / True / False / Not Given. Tìm từ đồng nghĩa ở mức độ khó (chưa gặp bao giờ, phải đoán qua ngữ cảnh).
- **Vận dụng cao (VDC):** Câu hỏi suy luận (Inference). Tìm mục đích của tác giả (Author's purpose). Tìm quy luật sắp xếp các ý, nguồn gốc văn bản, hoặc giọng điệu (Tone) của văn bản.

## VI. WRITING (Viết)
- **Nhận biết (NB):** Nhận diện lỗi sai (Error identification) về sự hòa hợp, đại từ phản thân, loại từ, thì của động từ, câu điều kiện.
- **Thông hiểu (TH):** Viết lại câu (Sentence transformation) chuyển đổi câu đơn giản với V-ing/to-V, chuyển đổi thì, bị động, gián tiếp.
- **Vận dụng (VD):** Viết lại câu phức tạp (chuyển đổi giữa gerund và infinitive, câu điều kiện 2/3, sử dụng từ nối bắt buộc phải hiểu nghĩa câu).
- **Vận dụng cao (VDC):** Vận dụng cấu trúc để viết đoạn văn hoặc thư tín hoàn chỉnh.

## VII. SPEAKING (Nói)
- **Nhận biết (NB):** Giới thiệu bản thân (Sở thích, môi trường, môn học...).
- **Thông hiểu (TH):** Trình bày theo chủ đề (Theme-speaking) sử dụng ngôn ngữ đã học.
- **Vận dụng (VD):** Sử dụng từ vựng linh hoạt, diễn đạt ý bằng nhiều cách khác nhau. Phát âm tương đối chuẩn.
- **Vận dụng cao (VDC):** Phản xạ Q&A (Hỏi - Đáp). Hiểu, đặt câu hỏi và trả lời một cách linh hoạt, tự nhiên, thuần thục.`;

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
