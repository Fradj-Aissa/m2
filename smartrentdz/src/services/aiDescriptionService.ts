export interface GenerateDescriptionParams {
  wilaya: string;
  baladiya: string;
  rooms: number;
  floor?: number;
  price: number;
  features: string[];
  style: "Popular" | "Luxury";
}

export interface GeneratedDescription {
  title: string;
  description: string;
}

/**
 * Robust JSON extraction helper using Regex
 * Handles potential Markdown wrapping like ```json ... ```
 */
const extractJSONFromResponse = (text: string): GeneratedDescription | null => {
  try {
    // Look for the first { and last } to isolate the JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.title && parsed.description) {
      return parsed as GeneratedDescription;
    }
    return null;
  } catch (error) {
    console.error("[AI SERVICE] JSON Parsing failed:", error);
    return null;
  }
};

/**
 * Internal method to make the direct fetch request to Groq API
 */
const performGroqRequest = async (apiKey: string, prompt: string) => {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      top_p: 0.95,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorStatus = response.status;
    const errorBody = await response.json().catch(() => ({}));
    throw { status: errorStatus, data: errorBody };
  }

  return await response.json();
};

/**
 * Main service to generate smart descriptions using Groq
 */
export async function generateSmartDescription(
  params: GenerateDescriptionParams
): Promise<GeneratedDescription> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_GROQ_API_KEY environment variable is not defined");
  }

  const featuresList = params.features?.length > 0 ? params.features.join("، ") : "لا توجد مرافق معددة";

  // Prompt engineered for Algerian Real Estate context
  const systemPrompt = `
أنت خبير تسويق عقاري جزائري محترف. مهمتك هي إنشاء عنوان ووصف لعقار بناءً على البيانات المقدمة.

البيانات:
- الموقع: ${params.baladiya}، ولاية ${params.wilaya}
- الغرف: ${params.rooms} غرف
- الطابق: ${params.floor ? `${params.floor}` : "غير محدد"}
- السعر: ${params.price} دج
- المميزات: ${featuresList}
- الأسلوب المطلوب: ${params.style === "Popular" ? "شعبي محلي" : "عصري فخم"}

المتطلبات:
1. إذا كان الأسلوب "شعبي"، استخدم كلمات من لهجة ولاية ${params.wilaya} (مثلاً لهجة وهرانية، قسنطينية، أو عاصمية حسب الولاية) لجعل الإعلان قريب من الناس.
2. إذا كان الأسلوب "عصري فخم"، استخدم لغة عربية ترويجية راقية واحترافية.
3. ركز على راحة السكن وجاذبية الموقع والمرافق المتوفرة.
4. الرد يجب أن يكون حصراً بصيغة JSON كالتالي:
{"title": "عنوان جذاب ومختصر", "description": "وصف مفصل ومشوق"}
`;

  try {
    console.log("[AI SERVICE] Attempting call with Groq");
    const data = await performGroqRequest(apiKey, systemPrompt);

    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) throw new Error("Empty response content");

    const finalResult = extractJSONFromResponse(responseText);

    if (finalResult) {
      console.log("[AI SERVICE] Success! Generated with Groq");
      return finalResult;
    }

    throw new Error("Failed to extract valid JSON from response");
  } catch (error: any) {
    console.error("[AI SERVICE] Groq request failed:", error);
    const errorMessage = error.data?.error?.message || error.message || "Unknown error";
    throw new Error(`Groq generation failed. Error: ${errorMessage}`);
  }
}