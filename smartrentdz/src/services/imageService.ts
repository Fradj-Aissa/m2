/**
 * Image Upload Service - ImgBB via Express Backend
 * Uploads images through the Express backend to ImgBB API
 * Ensures JWT token is included in Authorization header
 */

import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

/**
 * Upload multiple images to ImgBB via Express backend
 * @param files - Array of File objects to upload
 * @returns Promise<string[]> - Array of ImgBB image URLs
 */
export const uploadImagesToImgBB = async (files: File[]): Promise<string[]> => {
  if (!files || files.length === 0) {
    throw new Error("لم يتم اختيار أي صور");
  }

  try {
    // Create FormData with all files
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

    // Get JWT token from localStorage
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("لم يتم العثور على رمز المصادقة. يرجى تسجيل الدخول مرة أخرى");
    }

    // Send to backend endpoint with JWT token in Authorization header
    const response = await axios.post(
      `${API_BASE_URL}/apartments/upload-images`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = response.data;

    if (!data.urls || !Array.isArray(data.urls)) {
      throw new Error("صيغة الاستجابة غير صحيحة من السيرفر");
    }

    return data.urls;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "فشل رفع الصور إلى ImgBB";
    console.error("Error uploading images to ImgBB:", errorMessage);
    throw new Error(errorMessage);
  }
};
