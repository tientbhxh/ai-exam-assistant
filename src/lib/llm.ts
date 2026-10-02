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
  provider: 'google' | 'openrouter',
  apiKeys: string[],
  modelName: string,
  messages: { role: string; content: string }[],
  learnedRules: Rule[],
  examMatrix: string,
  sessionState: 'idle' | 'active' | 'review',
  onUpdate: (text: string) => void
) {
  let lastError: any = null;

  // Xây dựng System Prompt chung
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
2. BĂM NHỎ TOÀN BỘ ĐỀ THI THÀNH TỪNG KHỐI (BLOCK):
   Tuyệt đối MỌI NỘI DUNG (Tiêu đề phần thi, Đoạn văn, Câu hỏi) đều PHẢI nằm trong thẻ BLOCK riêng biệt.
   - Tiêu đề phần thi (VD: I. READING, II. LISTENING) là 1 khối riêng (level để trống).
   - Đoạn văn đọc hiểu HOẶC Kịch bản bài nghe (Audio Script) BẮT BUỘC phải là 1 khối riêng biệt (level để trống). Tuyệt đối không được quên tạo Kịch bản cho phần Listening!
   - MỖI CÂU HỎI là 1 khối riêng biệt. Tuyệt đối KHÔNG gộp nhiều câu vào 1 khối.
   - ĐỊNH DẠNG CÂU HỎI TRẮC NGHIỆM: Các phương án A, B, C, D PHẢI được trình bày dưới dạng danh sách gạch đầu dòng (List) để hiển thị đúng xuống dòng. MỖI CÂU HỎI phải đi kèm Đáp án đúng ở cuối.
   Cú pháp: <BLOCK id="unique_id" level="Mức độ">...</BLOCK>. (Mức độ lấy từ Cấu trúc đề: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao. Nếu là tiêu đề/đoạn văn thì để trống).
   TUYỆT ĐỐI KHÔNG in chữ [NB], [TH], [VD], [VDC] vào bên trong nội dung câu hỏi! Bạn PHẢI ghi nó vào thuộc tính level.
   Ví dụ ĐÚNG:
   <BLOCK id="title1" level="">**I. PRONUNCIATION**</BLOCK>
   <BLOCK id="q1" level="Nhận biết">
   **Câu 1:** Đâu là động từ to be?
   - A. Is
   - B. Go
   - C. Do
   - D. Are
   
   **Đáp án:** A
   </BLOCK>
   <BLOCK id="reading1" level="">Read the following passage: ...</BLOCK>
   <BLOCK id="q3" level="Vận dụng cao">**Câu 3:** Theo đoạn văn trên...</BLOCK>
3. LUẬT "CHỐNG THAM LAM" (BẮT BUỘC TUÂN THỦ):
   - ĐỐI VỚI BÀI ĐỌC (READING) / NGHE (LISTENING): TUYỆT ĐỐI CẤM tạo Bài đọc/Kịch bản VÀ Câu hỏi trong cùng một lần trả lời. Bạn PHẢI tuân thủ quy trình 2 bước:
     + Bước 1: Chỉ tạo <BLOCK> chứa đoạn văn/Kịch bản nghe. Trình bày xong, DỪNG LẠI và hỏi cô giáo bằng nút bấm: <BUTTON>Đoạn văn OK, tạo câu hỏi</BUTTON> <BUTTON>Viết lại đoạn văn</BUTTON>.
     + Bước 2: Khi cô giáo bấm OK, mới bắt đầu tạo các khối Câu hỏi.
   - GIỚI HẠN SỐ LƯỢNG: Khi tạo câu hỏi cho phần Reading/Listening, nếu có hơn 5 câu, hãy CHIA NHỎ ra (tạo 5 câu một đợt). Dùng nút <BUTTON>Tạo 5 câu tiếp theo</BUTTON>.
4. Khi cô giáo yêu cầu sửa 1 khối (VD: "Sửa khối q1"), hãy tạo lại chỉ <BLOCK id="q1">...</BLOCK> với nội dung mới.
5. Không tự tiện kết thúc phiên. Chỉ hỗ trợ tạo và sửa đề.`;

    if (examMatrix) {
      finalSystemInstruction += `\n\n=== MA TRẬN ĐẶC TẢ ĐỀ THI (EXAM MATRIX) ===\n${examMatrix}\n============================================\n`;
    }
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

  // ==========================================
  // NHÁNH 1: GOOGLE GEMINI (Direct API)
  // ==========================================
  if (provider === 'google') {
    for (let i = 0; i < apiKeys.length; i++) {
      let retries = 2; // Tự động thử lại 2 lần nếu bị 503 High Demand
      while (retries >= 0) {
        try {
          const genAI = new GoogleGenerativeAI(apiKeys[i]);
          let finalModelName = modelName;
          if (finalModelName.startsWith('models/')) finalModelName = finalModelName.replace('models/', '');

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
          try {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              fullText += chunkText;
              onUpdate(fullText);
            }
          } catch (streamErr: any) {
            console.warn("Stream parse error (returning partial text):", streamErr);
            if (fullText.trim().length === 0) throw streamErr;
          }
          
          return fullText;
        } catch (error: any) {
          console.error(`Google API Error with key index ${i} (Retries left: ${retries}):`, error);
          lastError = error;
          const msg = (error.message || '').toLowerCase();
          
          if (msg.includes('503') || msg.includes('overloaded') || msg.includes('high demand') || msg.includes('fetch failed')) {
            if (retries > 0) {
              console.log(`503 High Demand (Google). Đang chờ 3 giây để thử lại...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              retries--;
              continue; 
            }
          }
          
          if ((msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests')) && i < apiKeys.length - 1) {
            console.log(`Auto-rotating Google API Key... Switching to key index ${i + 1}`);
          }
          break; 
        }
      }
    }
    throw lastError;
  }

  // ==========================================
  // NHÁNH 2: OPENROUTER (OpenAI Compatible)
  // ==========================================
  if (provider === 'openrouter') {
    // Chuyển đổi định dạng messages sang chuẩn OpenAI
    const openRouterMessages = [
      { role: 'system', content: finalSystemInstruction },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    for (let i = 0; i < apiKeys.length; i++) {
      let retries = 2;
      while (retries >= 0) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKeys[i]}`,
              'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://ai-exam.local',
              'X-Title': 'Sunnie AI Exam Assistant',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelName,
              messages: openRouterMessages,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
          }

          if (!response.body) throw new Error("No response body from OpenRouter");

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let fullText = '';
          
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    fullText += content;
                    onUpdate(fullText);
                  }
                } catch (e) {
                  // Some data might be broken across chunks, usually fine to ignore in simple implementations
                  // or we can buffer it. For simplicity, we catch and ignore incomplete JSON.
                }
              }
            }
          }
          
          return fullText;
        } catch (error: any) {
          console.error(`OpenRouter API Error with key index ${i} (Retries left: ${retries}):`, error);
          lastError = error;
          const msg = (error.message || '').toLowerCase();
          
          if (msg.includes('503') || msg.includes('overloaded') || msg.includes('fetch failed') || msg.includes('502')) {
            if (retries > 0) {
              console.log(`OpenRouter Server Error. Đang chờ 3 giây để thử lại...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              retries--;
              continue;
            }
          }
          
          if ((msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) && i < apiKeys.length - 1) {
             console.log(`Auto-rotating OpenRouter API Key... Switching to key index ${i + 1}`);
          }
          break;
        }
      }
    }
    throw lastError;
  }
}
