const axios = require("axios");

/**
 * Upload image to ImgBB
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} imageName - Name of the image file
 * @returns {Promise<string>} - Direct image URL from ImgBB
 */
async function uploadImageToImgBB(imageBuffer, imageName) {
  try {
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    
    if (!IMGBB_API_KEY) {
      throw new Error("ImgBB API key not configured");
    }

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: "image/jpeg" });
    formData.append("image", blob, imageName);
    formData.append("key", IMGBB_API_KEY);
    formData.append("expiration", 15552000); // 180 days

    const response = await axios.post("https://api.imgbb.com/1/upload", formData, {
      headers: formData.getHeaders?.(),
    });

    if (!response.data.success) {
      throw new Error("ImgBB upload failed");
    }

    return response.data.data.url; // Direct image URL
  } catch (error) {
    console.error("Image upload to ImgBB failed:", error.message);
    throw new Error("Failed to upload image to ImgBB");
  }
}

/**
 * Validate Algerian phone number
 * Algerian phone numbers start with 05, 06, or 07 and have 10 digits total
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid Algerian phone number
 */
function validateAlgerianPhoneNumber(phone) {
  // Remove any whitespace or special characters
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  
  // Check if it's a valid Algerian number
  // Format: +213 or 0 followed by 5-7 and then 8 more digits
  const algerianPhoneRegex = /^(?:\+213|0)[5-7]\d{8}$/;
  
  return algerianPhoneRegex.test(cleanPhone);
}

module.exports = {
  uploadImageToImgBB,
  validateAlgerianPhoneNumber,
};
