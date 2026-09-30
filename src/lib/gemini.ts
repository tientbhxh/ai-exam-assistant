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
  apiKeys: string[],
  modelName: string,
  messages: { role: string; content: string }[],
  learnedRules: Rule[],
  sessionState: 'idle' | 'active' | 'review',
  onUpdate: (text: string) => void
) {
  let lastError: any = null;
  
  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(apiKeys[i]);
    
    let finalModelName = modelName;
    if (finalModelName.startsWith('models/')) {
      finalModelName = finalModelName.replace('models/', '');
    }

    let finalSystemInstruction = SYSTEM_PROMPT;
    
    if (sessionState === 'idle') {
      finalSystemInstruction += `\nHIỆN TẠI ĐANG LÀ TRẠNG THÁI: CHỜ BẮT ĐẦU (IDLE).
Nhiệm vụ của bạn:
1. Chào mừng cô giáo Sunnie.
2. BẮT BUỘC liệt kê rõ ràng 2 nhóm: "Các quy tắc cốt lõi (Base Rules)" và "Các thói quen tôi đã học được từ cô (Learned Rules)" dựa trên DANH SÁCH QUY TẮC được cung cấp bên dưới. Đừng tóm tắt quá ngắn gọn khiến các Learned Rules bị bỏ sót.
3. Hỏi cô giáo đã sẵn sàng bắt đầu phiên làm việc tạo đề thi chưa, kèm theo 2 nút bấm: <BUTTON>Bắt đầu tạo đề thi</BUTTON> <BUTTON>Tôi muốn xem lại quy tắc</BUTTON>.`;
    } 
    else if (sessionState === 'active') {
      finalSystemInstruction += `\nHIỆN TẠI ĐANG LÀ TRẠNG THÁI: ĐANG THIẾT KẾ ĐỀ THI (ACTIVE).
Nhiệm vụ của bạn:
1. Trao đổi với cô giáo để thiết kế đề thi. Cố gắng sử dụng các <BUTTON> gợi ý để hỏi ý kiến cô giáo.
2. BĂM NHỎ ĐỀ THI ĐẾN TỪNG CÂU HỎI:
   Tuyệt đối KHÔNG gộp nhiều câu hỏi vào một khối. MỖI CÂU HỎI phải là 1 khối riêng biệt.
   Nếu có đoạn văn đọc hiểu, ĐOẠN VĂN là 1 khối riêng, sau đó MỖI CÂU HỎI TRẮC NGHIỆM bên dưới là 1 khối riêng.
   Mỗi khối được bọc trong thẻ <BLOCK id="unique_id" level="Mức độ">...</BLOCK>. (Mức độ lấy từ Cấu trúc đề: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao. Nếu là đoạn văn thì để trống).
   Ví dụ ĐÚNG:
   <BLOCK id="q1" level="Nhận biết">**Câu 1:** Đâu là động từ to be? A. Is B. Go</BLOCK>
   <BLOCK id="q2" level="Thông hiểu">**Câu 2:** Quá khứ của Go là gì? A. Went B. Gone</BLOCK>
   <BLOCK id="reading1" level="">Read the following passage: ...</BLOCK>
   <BLOCK id="q3" level="Vận dụng cao">**Câu 3:** Theo đoạn văn trên...</BLOCK>
3. ĐỀ THI DÀI? HÃY TẠO TỪNG PHẦN:
   Đề thi thường rất dài. Để tránh bị lỗi hệ thống, hãy TẠO TỪNG PHẦN MỘT (Ví dụ: tạo xong Phần 1, dừng lại và hỏi cô giáo xem có cần sửa gì không, sau đó mới tạo tiếp Phần 2). Dùng <BUTTON>Tiếp tục tạo Phần 2</BUTTON>.
4. Khi cô giáo yêu cầu sửa 1 khối (VD: "Sửa khối q1"), hãy tạo lại chỉ <BLOCK id="q1">...</BLOCK> với nội dung mới.
5. Không tự tiện kết thúc phiên. Chỉ hỗ trợ tạo và sửa đề.`;
    }
    else if (sessionState === 'review') {
      finalSystemInstruction += `\nHIỆN TẠI ĐANG LÀ TRẠNG THÁI: KẾT THÚC VÀ HỌC HỎI (REVIEW).
Nhiệm vụ của bạn:
1. Phân tích toàn bộ cuộc hội thoại vừa diễn ra (bạn có thể thấy trong lịch sử).
2. Trích xuất ra các quy tắc/thói quen MỚI mà cô giáo đã yêu cầu hoặc nhắc nhở bạn trong quá trình làm đề. 
3. Mỗi quy tắc mới phát hiện, bạn bọc vào thẻ <RULE> và </RULE> (Ví dụ: <RULE>Luôn ưu tiên câu hỏi về phát âm đuôi -ed</RULE>). Trình duyệt sẽ tự động bắt các thẻ này và hiển thị checkbox cho cô giáo chọn lưu.
4. BẮT BUỘC chèn thêm một câu đùa vui vẻ, nịnh nọt ở cuối tin nhắn: "Cảm ơn cô Sunnie đã xác nhận em hoàn thành nhiệm vụ, nếu không đại ca Shrek mắng em chết" (có thể biến tấu từ ngữ cho tự nhiên, nhưng ý chính là sợ đại ca Shrek mắng).
5. Nếu không phát hiện quy tắc gì mới, vẫn phải nói câu đùa cảm ơn ở trên.`;
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
          maxOutputTokens: 8192,
        }
      });

      const result = await chat.sendMessageStream(currentInput);
      
      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onUpdate(fullText);
      }
      
      return fullText; // Return successfully if no error
    } catch (error: any) {
      console.error(`Gemini API Error with key index ${i}:`, error);
      lastError = error;
      const msg = (error.message || '').toLowerCase();
      // If error is related to quota/rate limit, and we have more keys to try
      if ((msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests')) && i < apiKeys.length - 1) {
        console.log(`Auto-rotating API Key... Switching to key index ${i + 1}`);
        continue;
      }
      // If it's a different error or we're out of keys, break loop and throw
      break;
    }
  }

  // If we exhaust all keys or break early, throw the last error
  throw lastError;
}
