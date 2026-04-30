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
 * Convert a File object to Base64 string with error handling
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate file
    if (!file || !(file instanceof File)) {
      reject(new Error(`ملف غير صحيح: ${file?.name || "unknown"}`));
      return;
    }

    // Check file size (max 20MB for safety)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error(`حجم الملف كبير جداً: ${file.name} (يجب أن يكون أقل من 20MB)`));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result as string;
        if (!result) {
          reject(new Error(`فشل قراءة الملف: ${file.name}`));
          return;
        }

        // Extract the base64 part after the comma
        const base64 = result.split(",")[1] || result;
        if (!base64 || base64.length === 0) {
          reject(new Error(`بيانات Base64 فارغة للملف: ${file.name}`));
          return;
        }

        console.log(`[Gemini Service] ✓ Base64 conversion successful: ${file.name} (${base64.length} chars)`);
        resolve(base64);
      } catch (error) {
        reject(new Error(`خطأ في معالجة Base64: ${error instanceof Error ? error.message : "unknown"}`));
      }
    };

    reader.onerror = () => {
      const error = reader.error;
      reject(new Error(`فشل قراءة الملف ${file.name}: ${error?.message || "unknown error"}`));
    };

    reader.onabort = () => {
      reject(new Error(`تم إيقاف قراءة الملف: ${file.name}`));
    };

    // Start reading the file
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      reject(new Error(`خطأ في بدء القراءة: ${error instanceof Error ? error.message : "unknown"}`));
    }
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
  const startTime = Date.now();
  
  console.log(`[Gemini Service] Starting image analysis with ${files?.length || 0} file(s)`);

  // 1. VALIDATE API KEY
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    const error = "VITE_GEMINI_API_KEY environment variable is not defined or empty";
    console.error(`[Gemini Service] ✗ ${error}`);
    throw new Error(error);
  }
  console.log(`[Gemini Service] ✓ API Key loaded (length: ${apiKey.length})`);

  // 2. VALIDATE FILES
  if (!files || !Array.isArray(files) || files.length === 0) {
    const error = "لم يتم تحديد أي صور للتحليل";
    console.error(`[Gemini Service] ✗ ${error}`);
    throw new Error(error);
  }
  console.log(`[Gemini Service] ✓ Files validation passed: ${files.length} file(s)`);

  try {
    // 3. INITIALIZE GEMINI CLIENT
    console.log("[Gemini Service] Initializing GoogleGenerativeAI client...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("[Gemini Service] ✓ Model initialized: gemini-2.5-flash");

    // 4. CONVERT FILES TO BASE64
    console.log("[Gemini Service] Converting images to Base64...");
    const base64Images = await Promise.all(
      files.map((file, idx) => 
        fileToBase64(file)
          .then(base64 => {
            console.log(`[Gemini Service] ✓ Image ${idx + 1}/${files.length} converted`);
            return base64;
          })
          .catch(err => {
            console.error(`[Gemini Service] ✗ Error converting image ${idx + 1}: ${err.message}`);
            throw err;
          })
      )
    );
    console.log("[Gemini Service] ✓ All images converted to Base64");

    // 5. BUILD REQUEST CONTENT
    console.log("[Gemini Service] Building request content...");
    const content: any[] = [];

    // Add images with detailed logging
    base64Images.forEach((base64, index) => {
      const mimeType = getMimeType(files[index].name);
      content.push({
        inlineData: {
          data: base64,
          mimeType,
        },
      });
      console.log(`[Gemini Service] ✓ Added image ${index + 1}: ${mimeType}`);
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
    console.log("[Gemini Service] ✓ Prompt added to content");

    // 6. CALL GEMINI API WITH TIMEOUT
    console.log("[Gemini Service] Calling Gemini API (timeout: 30s)...");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("API call timeout after 30 seconds")), 30000)
    );

    const response = await Promise.race([
      model.generateContent(content),
      timeoutPromise,
    ]);

    console.log("[Gemini Service] ✓ Received response from Gemini API");

    // 7. EXTRACT AND PARSE RESPONSE
    const responseText = response.response.text();
    console.log(`[Gemini Service] Raw response length: ${responseText.length} characters`);
    console.log(`[Gemini Service] Raw response preview: ${responseText.substring(0, 200)}...`);

    // 8. PARSE JSON WITH MARKDOWN SUPPORT
    let result: PropertyImageAnalysisResult;
    try {
      // Remove markdown code block markers if present
      let cleanText = responseText
        .replace(/```json\n?/g, "") // Remove ```json
        .replace(/```\n?/g, "") // Remove ```
        .trim();

      console.log(`[Gemini Service] Cleaned response: ${cleanText.substring(0, 200)}...`);

      // Extract JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
        throw new Error(
          `Could not extract JSON from response. Raw: ${responseText.substring(0, 500)}`
        );
      }

      const jsonString = jsonMatch[0];
      console.log(`[Gemini Service] Extracted JSON: ${jsonString.substring(0, 200)}...`);

      result = JSON.parse(jsonString);

      // Validate required fields
      if (!result.overall_status) {
        throw new Error("Response missing 'overall_status' field");
      }
      if (!result.inferred_details && result.overall_status === "OK") {
        throw new Error("Response missing 'inferred_details' for OK status");
      }

      console.log(
        `[Gemini Service] ✓ JSON parsed successfully. Status: ${result.overall_status}`
      );
    } catch (parseError) {
      console.error(
        `[Gemini Service] ✗ JSON Parse Error: ${parseError instanceof Error ? parseError.message : parseError}`
      );
      console.error(`[Gemini Service] Full raw response:\n${responseText}`);
      throw new Error(
        `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Gemini Service] ✓ Analysis complete (${elapsed}ms)`);
    return result;
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[Gemini Service] ✗ Fatal error (${elapsed}ms):`, error);

    // Provide specific error messages
    if (error.message?.includes("API key")) {
      throw new Error("مفتاح API غير صحيح أو غير مهيأ");
    }

    if (error.message?.includes("timeout")) {
      throw new Error("انتهت مهلة الانتظار. يرجى المحاولة مرة أخرى");
    }

    if (error.message?.includes("JSON") || error.message?.includes("parse")) {
      throw new Error("فشل معالجة استجابة الذكاء الاصطناعي");
    }

    if (error.message?.includes("UNAUTHENTICATED") || error.message?.includes("401")) {
      throw new Error("مشكلة في التحقق من مفتاح API");
    }

    throw new Error(
      error?.message || "حدث خطأ أثناء تحليل الصور. يرجى المحاولة مرة أخرى"
    );
  }
}
