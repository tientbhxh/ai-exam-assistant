import { GoogleGenerativeAI } from '@google/generative-ai';
import { Rule } from '@/components/MemoryModal';

export const SYSTEM_PROMPT = `Bạn là "Trợ lý tạo đề thi" - một AI chuyên nghiệp hỗ trợ giáo viên Tiếng Anh thiết kế đề thi.
Bạn hoạt động theo phiên làm việc (Session).

GIAO TIẾP VỚI NGƯỜI DÙNG QUA NÚT BẤM (BUTTONS):
Bạn có khả năng hiển thị các nút bấm để người dùng tương tác nhanh thay vì phải gõ phím.
Để tạo nút bấm, bạn hãy xuất ra cú pháp: <BUTTON>Nội dung nút</BUTTON>.
Ví dụ: "Cô giáo có muốn thêm phần trắc nghiệm không? <BUTTON>Có, thêm trắc nghiệm</BUTTON> <BUTTON>Không cần</BUTTON>".

TRẠNG THÁI PHIÊN LÀM VIỆC:
`;

export async function generateChatResponse(
  apiKey: string,
  modelName: string,
  messages: { role: string; content: string }[],
  learnedRules: Rule[],
  sessionState: 'idle' | 'active' | 'review',
  onUpdate: (text: string) => void
) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    let finalModelName = modelName;
    if (finalModelName.startsWith('models/')) {
      finalModelName = finalModelName.replace('models/', '');
    }

    let finalSystemInstruction = SYSTEM_PROMPT;
    
    if (sessionState === 'idle') {
      finalSystemInstruction += `\nHIỆN TẠI ĐANG LÀ TRẠNG THÁI: CHỜ BẮT ĐẦU (IDLE).
Nhiệm vụ của bạn:
1. Chào mừng cô giáo Sunnie.
2. Tóm tắt nhanh các Quy tắc cốt lõi (Base Rules) và Quy tắc bổ sung (Learned Rules) mà bạn đang áp dụng.
3. Hỏi cô giáo đã sẵn sàng bắt đầu phiên làm việc tạo đề thi chưa, kèm theo 2 nút bấm: <BUTTON>Bắt đầu tạo đề thi</BUTTON> <BUTTON>Tôi muốn xem lại quy tắc</BUTTON>.`;
    } 
    else if (sessionState === 'active') {
      finalSystemInstruction += `\nHIỆN TẠI ĐANG LÀ TRẠNG THÁI: ĐANG THIẾT KẾ ĐỀ THI (ACTIVE).
Nhiệm vụ của bạn:
1. Trao đổi với cô giáo để thiết kế đề thi. Cố gắng sử dụng các <BUTTON> gợi ý để hỏi ý kiến cô giáo.
2. THAY VÌ xuất toàn bộ đề thi vào 1 thẻ EXAM_CONTENT, HÃY CHIA NHỎ ĐỀ THI RA THÀNH TỪNG KHỐI (CÂU HỎI/ĐOẠN VĂN).
   Mỗi khối phải được bọc trong thẻ <BLOCK id="unique_id">...</BLOCK>.
   Ví dụ:
   <BLOCK id="q1">**Câu 1:** Đâu là động từ to be?
   A. Is  B. Go</BLOCK>
   <BLOCK id="reading1">Đọc đoạn văn sau...</BLOCK>
3. Khi cô giáo yêu cầu sửa 1 khối (VD: "Sửa khối q1"), hãy tạo lại <BLOCK id="q1">...</BLOCK> với nội dung mới.
3. Không tự tiện kết thúc phiên. Chỉ hỗ trợ tạo và sửa đề.`;
    }
    else if (sessionState === 'review') {
      finalSystemInstruction += `\nHIỆN TẠI ĐANG LÀ TRẠNG THÁI: KẾT THÚC VÀ HỌC HỎI (REVIEW).
Nhiệm vụ của bạn:
1. Phân tích toàn bộ cuộc hội thoại vừa diễn ra (bạn có thể thấy trong lịch sử).
2. Trích xuất ra các quy tắc/thói quen MỚI mà cô giáo đã yêu cầu hoặc nhắc nhở bạn trong quá trình làm đề. 
3. Mỗi quy tắc mới phát hiện, bạn bọc vào thẻ <RULE> và </RULE> (Ví dụ: <RULE>Luôn ưu tiên câu hỏi về phát âm đuôi -ed</RULE>). Trình duyệt sẽ tự động bắt các thẻ này và hiển thị checkbox cho cô giáo chọn lưu.
4. Nếu không phát hiện quy tắc gì mới, hãy thông báo "Không phát hiện quy tắc mới nào" và cảm ơn cô giáo.`;
    }

    if (learnedRules && learnedRules.length > 0) {
      finalSystemInstruction += '\n\nDANH SÁCH QUY TẮC HIỆN TẠI (RULES):\n';
      learnedRules.forEach((r, index) => {
        finalSystemInstruction += `${index + 1}. [${r.type.toUpperCase()}] ${r.rule}\n`;
      });
    }

    const model = genAI.getGenerativeModel({ 
      model: finalModelName,
      systemInstruction: finalSystemInstruction
    });

    const history = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const currentInput = history.pop()?.parts[0].text || '';

    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
      }
    });

    const result = await chat.sendMessageStream(currentInput);
    
    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onUpdate(fullText);
    }
    
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
