import { GoogleGenAI, Type } from "@google/genai";

// Ideally, this should be handled by a backend proxy to keep keys safe.
// For this frontend-only demo, we assume the environment variable is present.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateSmartPlaylistValues = async (businessDescription: string, availableMediaNames: string[]): Promise<{ name: string; suggestedDuration: number; strategy: string } | null> => {
  if (!apiKey) {
    console.warn("Gemini API Key missing");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        คุณคือผู้เชี่ยวชาญด้านป้ายโฆษณาดิจิทัล (Digital Signage)
        ฉันมีธุรกิจที่อธิบายได้ว่า: "${businessDescription}"
        ฉันมีไฟล์สื่อดังนี้: ${availableMediaNames.join(', ')}

        ช่วยแนะนำชื่อเพลย์ลิสต์ (ภาษาไทย), ระยะเวลาที่เหมาะสมในการแสดงแต่ละภาพ (วินาที), และกลยุทธ์สั้นๆ 1 ประโยค (ภาษาไทย) ว่าทำไมการจัดแบบนี้ถึงได้ผล
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "ชื่อเพลย์ลิสต์ภาษาไทย" },
            suggestedDuration: { type: Type.NUMBER, description: "ระยะเวลาหน่วยวินาที เช่น 10 หรือ 15" },
            strategy: { type: Type.STRING, description: "คำอธิบายกลยุทธ์ภาษาไทย" }
          },
          required: ["name", "suggestedDuration", "strategy"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;

  } catch (error) {
    console.error("Error generating playlist strategy:", error);
    return null;
  }
};