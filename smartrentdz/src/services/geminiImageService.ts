import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ImageFeedback {
  id: number;
  status: "valid" | "rejected";
  label: string;
  quality: "Low" | "Medium" | "High";
}

export interface InferredDetails {
  property_type: string;
  room_count: number;
  bathroom_count: number;
  amenities: string[];
  finishing_quality: string;
  description: string;
}

export interface PropertyImageAnalysisResult {
  overall_status: "OK" | "REJECT";
  rejection_reason: string | null;
  inferred_details: InferredDetails;
  images_feedback: ImageFeedback[];
}

/**
 * Convert a File object to Base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the base64 part after the comma
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
  });
};

/**
 * Get MIME type from file name
 */
const getMimeType = (fileName: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" => {
  const ext = fileName.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return mimeTypes[ext || ""] || "image/jpeg";
};

/**
 * Analyze property images using Gemini 1.5 Flash
 * @param files - Array of File objects (images)
 * @returns Promise<PropertyImageAnalysisResult>
 */
export async function analyzePropertyImages(
  files: File[]
): Promise<PropertyImageAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY environment variable is not defined");
  }

  if (!files || files.length === 0) {
    throw new Error("لم يتم تحديد أي صور للتحليل");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    // Convert all files to Base64
    const base64Images = await Promise.all(files.map((file) => fileToBase64(file)));

    // Build content array with images and text prompt
    const content: any[] = [];

    // Add images
    base64Images.forEach((base64, index) => {
      content.push({
        inlineData: {
          data: base64,
          mimeType: getMimeType(files[index].name),
        },
      });
    });

    // Add the analysis prompt
    const prompt = `أنت خبير في تحليل صور العقارات. قم بتحليل الصور المرفقة حسب التعليمات التالية:

## المهمة الأولى: التحقق من محتوى آمن (صارم جداً)
- تحقق من وجود: عري، عنف، وجوه أشخاص، أسلحة، أو مواد غير قانونية
- تحقق من وجود محتوى غير ذي صلة: (ميمات، طعام، حيوانات، أو صور غير متعلقة بالعقار)
- إذا كانت أي صورة تنتهك هذه المعايير، ضع overall_status = "REJECT" وأعط سبب رفض واضح بالعربية

## المهمة الثانية: استخراج البيانات
لكل صورة حقيقية للعقار:
- property_type: اختر من [Apartment, Villa, Studio, Office, Garage]
- room_count: عد الغرف النوم المرئية
- bathroom_count: عد الحمامات المرئية
- amenities: ابحث فقط عن [WiFi, Air Conditioning, Heating, Kitchen Cabinets, Elevator, Parking, Balcony, TV, Refrigerator] - أضف فقط إذا كنت متأكداً 90%
- finishing_quality: قيّم الجودة (Normal, Luxury, Super Luxury)
- description: اكتب وصف عربي جذاب (جملتان) يبرز أفضل المميزات

## تنسيق الإجابة (JSON فقط - بدون نصوص أخرى):
{
  "overall_status": "OK" أو "REJECT",
  "rejection_reason": "نص عربي هنا إن كان REJECT، وإلا null",
  "inferred_details": {
    "property_type": "اسم النوع",
    "room_count": رقم,
    "bathroom_count": رقم,
    "amenities": ["عنصر1", "عنصر2"],
    "finishing_quality": "Normal/Luxury/Super Luxury",
    "description": "وصف عربي جذاب"
  },
  "images_feedback": [
    {"id": 0, "status": "valid" أو "rejected", "label": "وصف الصورة", "quality": "Low/Medium/High"}
  ]
}

**ملاحظة مهمة:** أرجع JSON فقط بدون أي نصوص إضافية.`;

    content.push({
      text: prompt,
    });

    // Call Gemini API
    const response = await model.generateContent(content);
    const responseText = response.response.text();

    // Parse the JSON response
    let result: PropertyImageAnalysisResult;
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("فشل استخراج JSON من الاستجابة");
      }

      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[Gemini Service] JSON Parse Error:", parseError);
      console.error("[Gemini Service] Raw Response:", responseText);
      throw new Error("فشل تحليل استجابة الذكاء الاصطناعي");
    }

    return result;
  } catch (error: any) {
    console.error("[Gemini Service] Error:", error);

    if (error.message?.includes("API key")) {
      throw new Error("مفتاح API غير صحيح أو غير مهيأ");
    }

    if (error.message?.includes("JSON")) {
      throw new Error("فشل معالجة استجابة الذكاء الاصطناعي");
    }

    throw new Error(
      error?.message || "حدث خطأ أثناء تحليل الصور. يرجى المحاولة مرة أخرى"
    );
  }
}
