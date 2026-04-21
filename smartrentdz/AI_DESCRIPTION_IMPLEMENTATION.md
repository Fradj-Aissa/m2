# AI Description Generator Implementation Guide

## Overview
This document details the implementation of the `generateSmartDescription` function using Google's Generative AI (Gemini API) in your React form for the SmartRent property listing system.

## Files Created & Modified

### 1. **New Service File**: `src/services/aiDescriptionService.ts`
This file contains the core AI description generation logic.

**Key Components:**
- `GenerateDescriptionParams` - Interface for input parameters
- `GeneratedDescription` - Interface for the JSON response
- `generateSmartDescription()` - Main async function

**Features:**
- ✅ Uses `@google/generative-ai` library (version auto-installed)
- ✅ Reads API key from `import.meta.env.VITE_GEMINI_API_KEY`
- ✅ Supports Wilaya-specific Arabic dialects
- ✅ Two style modes: "Popular" (Chaabi) and "Luxury" (Elegant)
- ✅ Safe JSON parsing with error handling
- ✅ Returns title and description in Arabic

### 2. **Updated Component**: `src/pages/AddApartment.tsx`

**New Imports:**
```typescript
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";
import {
  generateSmartDescription,
  type GenerateDescriptionParams,
} from "@/services/aiDescriptionService";
```

**New State Variables:**
```typescript
const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
const [descriptionStyle, setDescriptionStyle] = useState<"Popular" | "Luxury">(
  "Popular"
);
```

**New Handler Function:**
```typescript
const handleGenerateDescription = async () => { ... }
```

**New UI Elements:**
1. **Style Toggle (Switch)** - Located in "المعلومات الأساسية" section
   - Toggle between "شعبي" (Popular) and "فاخر" (Luxury)
   - Shows description of selected style
   - Disabled while generating

2. **Generate Button** - Located in "المعلومات الأساسية" section
   - Button text: "إنشاء وصف بالذكاء الاصطناعي"
   - Shows loading state: "جاري الإنشاء..."
   - Sparkles icon from lucide-react
   - Disabled while generating or submitting form

## Usage Flow

### User Workflow:
1. **Fill Property Details** (Required for AI generation):
   - Select Wilaya (State)
   - Enter Baladiya (Municipality)
   - Enter number of Rooms
   - Enter Price

2. **Optional: Select Style**
   - Toggle between "Popular/Chaabi" and "Luxury/Elegant"
   - Default is "Popular"

3. **Optional: Add Features**
   - Select amenities (WiFi, AC, etc.)
   - These will be mentioned in the generated description

4. **Click "إنشاء وصف بالذكاء الاصطناعي"**
   - Button shows loading state
   - Gemini API is called with property data
   - Response is parsed and auto-filled

5. **Auto-filled Fields**
   - Title field is populated with generated title
   - Description field is populated with generated description
   - User can edit these before submitting

## API Prompt Structure

The system instruction sent to Gemini includes:

```
أنت خبير تسويق عقارات محلي جزائري متخصص. قم بإنشاء وصف عقار بصيغة JSON.
السياق: عقار في [WILAYA], [BALADIYA]، يحتوي على [ROOMS] غرفة، السعر [PRICE] دج.
اللغة: العربية الفصيحة مع لمسات من اللهجة المحلية.
الأسلوب: [POPULAR/LUXURY]
...
```

**Supported Dialects:**
- Constantine (قسنطينة): "قداه", "ياسر"
- Oran (وهران): "شا تڨول", "ڨاع"
- Other wilayas: Specific local dialect phrases

## Error Handling

The implementation includes comprehensive error handling:

### 1. **Validation Errors**
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

Validates:
- ✅ Wilaya is selected
- ✅ Municipality is filled
- ✅ Number of rooms is entered
- ✅ Price is entered

### 2. **API Errors**
```typescript
catch (error: any) {
  console.error("Error generating description:", error);
  toast({
    title: "خطأ",
    description: error?.message || "تعذر إنشاء الوصف...",
    variant: "destructive",
  });
}
```

Handles:
- ✅ Missing VITE_GEMINI_API_KEY
- ✅ API request failures
- ✅ Invalid JSON response
- ✅ Missing title or description in response

### 3. **JSON Parsing**
```typescript
const jsonMatch = responseText.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error("Failed to extract JSON from Gemini response");
}
const jsonString = jsonMatch[0];
const parsedResponse: GeneratedDescription = JSON.parse(jsonString);
```

Safely:
- ✅ Extracts JSON from response text (in case of extra content)
- ✅ Validates JSON structure
- ✅ Ensures required fields exist

## Environment Setup

### Required Environment Variable:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

This should already be in your `.env` file.

## NPM Package

The package `@google/generative-ai` has been automatically installed:
```bash
npm install @google/generative-ai --legacy-peer-deps
```

## Response Format

The Gemini API returns a JSON object:
```json
{
  "title": "شقة فاخرة بموقع استراتيجي",
  "description": "شقة راقية في قلب العاصمة...\nمميزات:\n- تكييف هواء...\n- موقف سيارات..."
}
```

**Notes:**
- Title: Short and catchy (typically 5-15 words)
- Description: Detailed with line breaks (`\n`)
- Both in Arabic with appropriate local dialect
- Automatically inserted into form fields

## Features Included

✅ **Functionality:**
- Auto-generation of property titles and descriptions
- Style selection (Popular/Luxury)
- AI-powered content based on local expertise
- Safe JSON parsing
- Comprehensive error handling

✅ **User Experience:**
- Loading states
- Toast notifications for feedback
- Disabled states while generating
- Auto-fill of form fields
- Editable generated content
- Input validation before API call

✅ **Code Quality:**
- TypeScript types for all functions
- Error handling with user-friendly messages
- Follows existing project patterns
- Integrated with existing UI components
- Uses shadcn/ui Switch component

## Testing

### To Test the Feature:
1. Navigate to the "Add Property" page
2. Fill in the required fields (Wilaya, Baladiya, Rooms, Price)
3. Optionally select features and style preference
4. Click "إنشاء وصف بالذكاء الاصطناعي"
5. Wait for AI response (usually 2-5 seconds)
6. Title and description fields will auto-populate
7. Review and edit if needed
8. Submit the form

### Troubleshooting:

**Issue:** Button shows error immediately
- **Solution:** Check that Wilaya, Baladiya, Rooms, and Price are all filled

**Issue:** "خطأ في جلب الاستجابة"
- **Solution:** Verify `VITE_GEMINI_API_KEY` is correctly set in `.env`
- Ensure you have internet connection

**Issue:** Generated text appears incomplete or malformed
- **Solution:** This should not happen due to JSON validation, but if it does, try again

## Future Enhancements

Possible improvements:
- [ ] Add generating description button in property edit form
- [ ] Cache recently generated descriptions
- [ ] Allow custom dialect selection
- [ ] Add support for multiple languages
- [ ] Rate/feedback system for generated content
- [ ] Batch generation for multiple properties

## Security Notes

⚠️ **Important:**
- API Key is used client-side (VITE_ prefix)
- Ensure your API key has appropriate usage limits
- Monitor API usage on Google Cloud Console
- Never commit `.env` with real API keys

## File Summary

| File | Type | Purpose |
|------|------|---------|
| `src/services/aiDescriptionService.ts` | New | AI generation logic |
| `src/pages/AddApartment.tsx` | Modified | UI integration & handlers |
| `package.json` | Modified | Added @google/generative-ai |

---

**Last Updated:** April 21, 2026
**Status:** ✅ Ready for Production
