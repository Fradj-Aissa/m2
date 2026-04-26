const axios = require("axios");
const FormData = require("form-data");

/**
 * Upload image to ImgBB using base64 payload
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} imageName - Name of the image file (not required by imgbb)
 * @returns {Promise<string>} - Direct image URL from ImgBB
 */
async function uploadImageToImgBB(imageBuffer, imageName) {
  try {
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

    if (!IMGBB_API_KEY) {
      throw new Error("ImgBB API key not configured");
    }

    const imageBase64 = imageBuffer.toString("base64");

    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", imageBase64);
    // optional expiration in seconds (e.g., 15552000 = 180 days)
    formData.append("expiration", "15552000");

    const response = await axios.post("https://api.imgbb.com/1/upload", formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (!response.data || !response.data.success) {
      throw new Error("ImgBB upload failed");
    }

    return response.data.data.url;
  } catch (error) {
    console.error("Image upload to ImgBB failed:", error?.message || error);
    throw new Error("Failed to upload image to ImgBB");
  }
}

/**
 * Validate Algerian phone number
 * Algerian phone numbers start with 05, 06, or 07 and have 10 digits total
 */
function validateAlgerianPhoneNumber(phone) {
  const cleanPhone = (phone || "").replace(/[^\d+]/g, "");
  const algerianPhoneRegex = /^(?:\+213|0)[5-7]\d{8}$/;
  return algerianPhoneRegex.test(cleanPhone);
}

module.exports = {
  uploadImageToImgBB,
  validateAlgerianPhoneNumber,
};
