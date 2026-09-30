import { GoogleGenerativeAI } from '@google/generative-ai';

export const SYSTEM_PROMPT = `Bạn là một Trợ lý Khảo thí AI chuyên nghiệp dành cho giáo viên Tiếng Anh.
Nhiệm vụ của bạn là tạo ra các đề thi, bài tập, câu hỏi trắc nghiệm/tự luận Tiếng Anh chất lượng cao.

LUẬT QUAN TRỌNG:
1. LUÔN LUÔN bọc TOÀN BỘ nội dung đề thi vào giữa 2 thẻ <EXAM_CONTENT> và </EXAM_CONTENT>.
2. Bên ngoài thẻ <EXAM_CONTENT>, bạn có thể chào hỏi hoặc hướng dẫn giáo viên bằng Tiếng Việt.
3. Nội dung bên trong thẻ <EXAM_CONTENT> phải được trình bày rõ ràng bằng Markdown.

QUY TẮC HỌC HỎI (MEMORY & LEARNING):
- NẾU người dùng đưa ra một yêu cầu sửa đổi mang tính quy luật cho CÁC ĐỀ THI SAU (ví dụ: "Lần sau nhớ cho thêm đáp án", "Từ giờ hãy ưu tiên câu hỏi khó"), BẠN PHẢI TRÍCH XUẤT yêu cầu đó thành một quy tắc ngắn gọn.
- Bọc quy tắc đó trong thẻ <RULE> và </RULE>. Ví dụ: <RULE>Luôn cung cấp đáp án chi tiết cho mỗi câu hỏi.</RULE>
- Phần văn bản còn lại bạn vẫn giao tiếp bình thường với người dùng.`;

export async function generateChatResponse(
  apiKey: string,
  modelName: string,
  messages: { role: string; content: string }[],
  learnedRules: string[],
  onUpdate: (text: string) => void
) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Fallback to gemini-1.5-flash if model name is old or incorrect format
    let finalModelName = modelName;
    if (finalModelName.startsWith('models/')) {
      finalModelName = finalModelName.replace('models/', '');
    }

    let finalSystemInstruction = SYSTEM_PROMPT;
    if (learnedRules && learnedRules.length > 0) {
      finalSystemInstruction += '\n\nQUY TẮC ĐÃ HỌC TỪ NGƯỜI DÙNG CẦN TUÂN THỦ NGHIÊM NGẶT:\n';
      learnedRules.forEach((rule, index) => {
        finalSystemInstruction += `${index + 1}. ${rule}\n`;
      });
    }

    const model = genAI.getGenerativeModel({ 
      model: finalModelName,
      systemInstruction: finalSystemInstruction
    });

    // Convert messages to Gemini format
    // Gemini chat format requires alternate user/model roles, starting with user.
    // We will just pass the entire conversation history.
    const history = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    // The last message is the current user input
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
