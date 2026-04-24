import axios from "axios";
import { z } from "zod";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const smartSearchFiltersSchema = z.object({
  wilaya: z.string().nullable(),
  municipality: z.string().nullable(),
  minPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  minRooms: z.number().nullable(),
  maxRooms: z.number().nullable(),
  priceUnit: z.enum(["day", "week", "month"]).nullable(),
  propertyType: z.enum(["Apartment", "House", "Studio"]).nullable(),
});

export type SmartSearchFilters = z.infer<typeof smartSearchFiltersSchema>;

const DEFAULT_FILTERS: SmartSearchFilters = {
  wilaya: null,
  municipality: null,
  minPrice: null,
  maxPrice: null,
  minRooms: null,
  maxRooms: null,
  priceUnit: null,
  propertyType: null,
};

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const fenced = trimmed.match(/```json\s*([\s\S]*?)```|```\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || fenced?.[2];

    if (candidate) {
      return JSON.parse(candidate.trim());
    }

    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error("No JSON object found in AI response");
    }

    return JSON.parse(objectMatch[0]);
  }
}

function getReadableAxiosError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Unknown error";
  }

  const responseData = error.response?.data as
    | { error?: { message?: string } }
    | undefined;

  return (
    responseData?.error?.message ||
    error.message ||
    "Groq API request failed"
  );
}

export async function parseSmartSearchQuery(query: string): Promise<SmartSearchFilters> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_GROQ_API_KEY environment variable is not defined");
  }

  const systemPrompt = `
أنت خبير عقارات وجغرافيا جزائري.

المهمة:
حوّل طلب المستخدم المكتوب باللهجة الجزائرية أو العربية أو الفرنسية إلى فلاتر بحث عقارية منظمة.

القواعد:
1. إذا ذكر المستخدم بلدية، استنتج الولاية التابعة لها وأرجع الاسم الرسمي بالعربية.
2. افهم صيغ المقارنة:
- "أكثر من" أو "فوق" أو "foug" تعني حد أدنى.
- "أقل من" أو "تحت" أو "taht" أو "ماكسيموم" تعني حد أقصى.
- "بين X و Y" تعني حد أدنى وحد أقصى.
3. يجب أن تكون النتيجة قابلة للتطبيق على فلاتر الموقع الفعلية وليست عشوائية.
4. بالنسبة للغرف، حاول فهم الطلب بما يمكن مطابقته مع القوائم الموجودة في الواجهة مثل:
- 1 غرفة
- 2 غرف
- 3 غرف
- 2 غرف أو أكثر
- 3 غرف أو أكثر
- 4 غرف أو أكثر
5. بالنسبة لمدة الكراء يجب أن تكون النتيجة واحدة من القيم التالية فقط حسب النص:
- day لليومي
- week للأسبوعي
- month للكراء الشهري
6. حوّل الأسعار المذكورة بالملايين إلى أرقام صحيحة:
- "3 ملاين" = 30000
- "10 ملاين" = 100000
7. إذا لم تُذكر قيمة بوضوح فأرجع null.
8. يجب أن يكون الرد JSON فقط بدون شرح أو markdown.

صيغة JSON المطلوبة حصراً:
{
  "wilaya": "string أو null",
  "municipality": "string أو null",
  "minPrice": "number أو null",
  "maxPrice": "number أو null",
  "minRooms": "number أو null",
  "maxRooms": "number أو null",
  "priceUnit": "day أو week أو month أو null",
  "propertyType": "Apartment أو House أو Studio أو null"
}
`.trim();

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query.trim() },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      throw new Error("Groq returned an empty response");
    }

    const parsed = extractJsonObject(content);
    return smartSearchFiltersSchema.parse({
      ...DEFAULT_FILTERS,
      ...parsed,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = getReadableAxiosError(error);
      console.error("[AI SEARCH] Groq API request failed:", {
        message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(message);
    } else {
      console.error("[AI SEARCH] Failed to parse smart search response:", error);
      throw error instanceof Error ? error : new Error("Failed to parse smart search response");
    }
  }
}
