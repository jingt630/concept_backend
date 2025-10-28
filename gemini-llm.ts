// Copy this to: concept_backend/gemini-llm.ts

import { GoogleGenerativeAI } from "npm:@google/generative-ai";

/**
 * Gemini LLM Wrapper
 * Handles image-to-text extraction using Google's Gemini API
 */
export class GeminiLLM {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  /**
   * Execute LLM with prompt and optional image
   * @param prompt - The text prompt for the LLM
   * @param imageInput - OPTIONAL: Either a file path OR a base64 data URI (for image tasks)
   */
  async executeLLM(prompt: string, imageInput?: string): Promise<string> {
    try {
      console.log("🤖 Calling Gemini AI...");

      // Text-only request (for translation, etc.)
      if (!imageInput) {
        console.log("📝 Text-only request (no image)");

        const result = await this.model.generateContent([prompt]);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Gemini API response received");
        console.log(`   Response length: ${text.length} chars`);

        return text;
      }

      // Image request (for extraction)
      let imageData: string;
      let mimeType: string = "image/jpeg"; // Default

      // Check if input is a data URI (base64)
      if (imageInput.startsWith("data:")) {
        console.log("📊 Using base64 data directly (from database)");

        // Extract mime type and base64 data
        const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error("Invalid data URI format");
        }

        mimeType = matches[1];
        imageData = matches[2];

        // Normalize MIME type: Gemini doesn't accept "image/jpg", only "image/jpeg"
        if (mimeType === "image/jpg") {
          mimeType = "image/jpeg";
          console.log(`   ✅ Normalized MIME type: image/jpg → image/jpeg`);
        }

        // Don't log the actual data - it's too long!
        console.log(`   Mime type: ${mimeType}`);
        console.log(`   Base64 length: ${imageData.length} chars`);

      } else {
        // It's a file path - read from disk
        console.log(`📷 Reading image from file: ${imageInput}`);

        const fileBytes = await Deno.readFile(imageInput);
        imageData = btoa(String.fromCharCode(...fileBytes));

        // Detect mime type from extension
        if (imageInput.endsWith(".png")) {
          mimeType = "image/png";
        } else if (imageInput.endsWith(".jpg") || imageInput.endsWith(".jpeg")) {
          mimeType = "image/jpeg";
        } else if (imageInput.endsWith(".webp")) {
          mimeType = "image/webp";
        }

        console.log(`   File size: ${fileBytes.length} bytes`);
        console.log(`   Mime type: ${mimeType}`);
      }

      // Prepare image part for Gemini
      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: mimeType,
        },
      };

      console.log("📤 Sending request to Gemini API...");

      // Call Gemini API
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      console.log("✅ Gemini API response received");
      console.log(`   Response length: ${text.length} chars`);

      return text;
    } catch (error) {
      console.error("❌ Error calling Gemini API:", (error as Error).message);
      throw error;
    }
  }
}
