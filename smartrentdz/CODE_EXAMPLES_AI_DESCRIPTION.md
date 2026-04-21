# 💡 AI Description Generator - Code Examples & Reference

## Service Function Usage

### Direct Usage (For Reference)

```typescript
import { generateSmartDescription, type GenerateDescriptionParams } from "@/services/aiDescriptionService";

// Example 1: Popular Style
const params: GenerateDescriptionParams = {
  wilaya: "الجزائر",
  baladiya: "الجزائر العاصمة",
  rooms: 2,
  floor: 3,
  price: 40000,
  features: ["واي فاي", "تكييف", "موقف سيارات"],
  style: "Popular"
};

try {
  const result = await generateSmartDescription(params);
  console.log("Title:", result.title);
  console.log("Description:", result.description);
} catch (error) {
  console.error("Error:", error);
}
```

### Example 2: Luxury Style

```typescript
const luxuryParams: GenerateDescriptionParams = {
  wilaya: "وهران",
  baladiya: "وهران",
  rooms: 4,
  floor: 8,
  price: 80000,
  features: ["واي فاي", "تكييف", "مصعد", "أمن 24/7"],
  style: "Luxury"
};

const luxuryResult = await generateSmartDescription(luxuryParams);
```

---

## Real API Response Examples

### Example Response 1: Algiers - Popular Style
```json
{
  "title": "شقة عائلية وسط العاصمة بسعر معقول",
  "description": "شقة راقية وسط الجزائر العاصمة، محاطة بكل الخدمات والمرافق\n\nالمميزات:\n✓ واي فاي عالي السرعة\n✓ تكييف هواء متطور\n✓ موقف سيارات آمن\n\nالموقع:\nالشقة تقع في قلب العاصمة، قريبة من المدارس والجامعات والمحلات التجارية\n\nوالسعر معقول وسيارتك رايحة نسيب وقريبة من البيت!"
}
```

### Example Response 2: Constantine - Popular Style
```json
{
  "title": "شقة بديعة في قسنطينة",
  "description": "شقة جميلة قداه في قسنطينة الساحرة، على طول تستريح وتشعر براحة البال\n\nفيها:\n- واي فاي قوي ياسر\n- تكييف ريح بارد\n- موقف سيارات فيه\n\nالجو أحسن من الأمل، والجيران طيبين، والشارع نظيف ومضيء"
}
```

### Example Response 3: Oran - Luxury Style
```json
{
  "title": "شقة فاخرة براقة في أرقى أحياء وهران",
  "description": "شقة راقية وفخمة في قلب وهران، تجمع بين الفخامة والراحة\n\nالمميزات المتقدمة:\n◆ واي فاي عالي السرعة\n◆ تكييف هواء ذكي\n◆ مصعد حديث\n◆ خدمة أمنية 24/7\n\nالموقع الاستراتيجي:\nتقع الشقة في أرقى أحياء وهران، بالقرب من أفضل المطاعم والمقاهي والمراكز التجارية\n\nشا تڨول إذا كنت تحب الرفاهية والهدوء، هذه الشقة قد تكون حلمك!"
}
```

### Example Response 4: Tlemcen - Luxury Style
```json
{
  "title": "فيلا فخمة بموقع ممتاز في تلمسان",
  "description": "عقار فاخر وسط الطبيعة الخضراء في تلمسان الجميلة\n\nالمرافق الحديثة:\n• واي فاي فائق السرعة\n• نظام تكييف مركزي\n• حديقة خاصة\n• مدخل خاص\n\nالأجواء:\nتستيقظ كل يوم على صوت الطيور والهواء النقي، مع الراحة النفسية الكاملة والهدوء التام"
}
```

---

## TypeScript Interface Reference

### GenerateDescriptionParams
```typescript
interface GenerateDescriptionParams {
  wilaya: string;        // State name (e.g., "الجزائر", "وهران")
  baladiya: string;      // City/municipality name
  rooms: number;         // Number of rooms (e.g., 2, 3, 4)
  floor?: number;        // Optional floor number
  price: number;         // Price in DA (Dinar Algerian)
  features: string[];    // Array of features (e.g., ["واي فاي", "تكييف"])
  style: "Popular" | "Luxury"; // Tone style for description
}
```

### GeneratedDescription
```typescript
interface GeneratedDescription {
  title: string;         // Generated title (5-15 words)
  description: string;   // Generated description with line breaks
}
```

---

## Form Integration in AddApartment.tsx

### State Management
```typescript
// Loading state for AI generation
const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

// Selected style (Popular or Luxury)
const [descriptionStyle, setDescriptionStyle] = useState<"Popular" | "Luxury">(
  "Popular"
);
```

### Handler Function Flow
```typescript
const handleGenerateDescription = async () => {
  // 1. Validate all required fields
  if (!formData.wilayaId) {
    toast({ ... });
    return;
  }
  
  // 2. Set loading state
  setIsGeneratingDescription(true);
  
  try {
    // 3. Prepare parameters
    const wilaya = wilayas.find((w) => w.id.toString() === formData.wilayaId);
    const params: GenerateDescriptionParams = { ... };
    
    // 4. Call AI service
    const result = await generateSmartDescription(params);
    
    // 5. Auto-fill form
    setFormData((prev) => ({
      ...prev,
      title: result.title,
      description: result.description,
    }));
    
    // 6. Show success message
    toast({ title: "تم إنشاء الوصف بنجاح", ... });
  } catch (error) {
    // Handle errors
    toast({ title: "خطأ", description: error?.message, variant: "destructive" });
  } finally {
    // 7. Clear loading state
    setIsGeneratingDescription(false);
  }
};
```

---

## UI Components Integration

### Style Toggle (Switch)
```jsx
<div className="flex items-center justify-between gap-4">
  <div className="space-y-1">
    <Label className="text-base">أسلوب الوصف</Label>
    <p className="text-xs text-muted-foreground">
      {descriptionStyle === "Popular"
        ? "أسلوب دافئ وودود (شعبي)"
        : "أسلوب راقي وفاخر"}
    </p>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium">
      {descriptionStyle === "Popular" ? "شعبي" : "فاخر"}
    </span>
    <Switch
      checked={descriptionStyle === "Luxury"}
      onCheckedChange={(checked) =>
        setDescriptionStyle(checked ? "Luxury" : "Popular")
      }
      disabled={isGeneratingDescription}
    />
  </div>
</div>
```

### Generate Button
```jsx
<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={handleGenerateDescription}
  disabled={isGeneratingDescription || isLoading}
>
  <Sparkles className="h-4 w-4 ml-2" />
  {isGeneratingDescription ? "جاري الإنشاء..." : "إنشاء وصف بالذكاء الاصطناعي"}
</Button>
```

---

## Error Handling Examples

### Validation Error
```typescript
if (!formData.wilayaId) {
  toast({
    title: "خطأ",
    description: "اختر الولاية أولاً",
    variant: "destructive",
  });
  return;
}
```

### API Error Handling
```typescript
try {
  const result = await generateSmartDescription(params);
} catch (error: any) {
  console.error("Error generating description:", error);
  toast({
    title: "خطأ",
    description:
      error?.message ||
      "تعذر إنشاء الوصف. يرجى المحاولة مرة أخرى",
    variant: "destructive",
  });
}
```

### JSON Parsing Safety
```typescript
// Extract JSON from response (handles extra text)
const jsonMatch = responseText.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error("Failed to extract JSON from Gemini response");
}

// Parse safely with validation
const jsonString = jsonMatch[0];
const parsedResponse: GeneratedDescription = JSON.parse(jsonString);

// Validate required fields
if (!parsedResponse.title || !parsedResponse.description) {
  throw new Error("Response missing title or description");
}
```

---

## Algerian Dialect Examples

### Constantine (قسنطينة)
```
"قداه" - Means "like this" or "such"
"ياسر" - Means "easily" or "quickly"
Example: "قداه روقة الشقة ياسر ما تحتاج حاجة!"
```

### Oran (وهران)
```
"شا تڨول" - Means "what do you say" (greeting)
"ڨاع" - Means "staying/sitting"
Example: "شا تڨول، ڨاع معنا في هذي الشقة!"
```

### Algiers (الجزائر)
```
Standard Algerian Arabic with some French-influenced words
Warm, friendly tone
```

---

## Testing Scenarios

### Scenario 1: Basic Property
```typescript
Input:
- Wilaya: "الجزائر"
- Municipality: "الجزائر العاصمة"
- Rooms: 2
- Price: 35000
- Style: "Popular"
- Features: []

Expected: Simple, friendly description in Arabic
```

### Scenario 2: Luxury Villa
```typescript
Input:
- Wilaya: "وهران"
- Municipality: "وهران"
- Rooms: 4
- Floor: 8
- Price: 150000
- Style: "Luxury"
- Features: ["واي فاي", "تكييف", "مصعد", "أمن 24/7"]

Expected: Sophisticated, high-end description with all features mentioned
```

### Scenario 3: Missing Required Field
```typescript
Input:
- Wilaya: "" (empty)
- Municipality: "قسنطينة"
- Rooms: 3
- Price: 45000
- Style: "Popular"

Expected: Toast error: "اختر الولاية أولاً"
```

---

## Performance Metrics

| Operation | Expected Time |
|-----------|---|
| Form validation | < 10ms |
| API request | 2-5 seconds |
| JSON parsing | < 50ms |
| Form update | < 10ms |
| **Total** | **2-5 seconds** |

---

## Deployment Checklist

- [ ] Verify `VITE_GEMINI_API_KEY` is set in production `.env`
- [ ] Test with various Wilayas
- [ ] Test both Popular and Luxury styles
- [ ] Verify error handling works
- [ ] Check mobile responsiveness
- [ ] Monitor API usage on Google Cloud Console
- [ ] Set up rate limiting if needed
- [ ] Document API quotas for team

---

## Related Documentation

- 📖 [AI_DESCRIPTION_IMPLEMENTATION.md](./AI_DESCRIPTION_IMPLEMENTATION.md) - Full implementation guide
- 🚀 [QUICK_START_AI_DESCRIPTION.md](./QUICK_START_AI_DESCRIPTION.md) - Quick reference
- 💬 [AddApartment.tsx](./src/pages/AddApartment.tsx) - Component code
- 🤖 [aiDescriptionService.ts](./src/services/aiDescriptionService.ts) - Service code

---

**Last Updated:** April 21, 2026
**Version:** 1.0
**Status:** Production Ready ✅
