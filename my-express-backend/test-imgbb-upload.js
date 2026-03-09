/**
 * Test ImgBB Image Upload Endpoint
 * Run with: node test-imgbb-upload.js
 */

const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

const API_BASE_URL = "http://localhost:3000/api";

/**
 * Test image upload endpoint
 */
async function testImageUpload() {
  try {
    console.log("🚀 Starting ImgBB image upload test...\n");

    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    // Create FormData with the test image
    const formData = new FormData();
    formData.append("images", testImageBuffer, {
      filename: "test-image.png",
      contentType: "image/png",
    });

    console.log("📤 Sending request to: POST /api/apartments/upload-images\n");

    const response = await axios.post(
      `${API_BASE_URL}/apartments/upload-images`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    console.log("✅ Upload successful!\n");
    console.log("📋 Response:");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.urls && response.data.urls.length > 0) {
      console.log("\n✨ Image uploaded to ImgBB:");
      response.data.urls.forEach((url, index) => {
        console.log(`   [${index + 1}] ${url}`);
      });
    }
  } catch (error) {
    console.error("❌ Error during upload:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testImageUpload();
