/**
 * LLM Integration for DayPlanner
 *
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */
import * as fs from 'node:fs';
import { GoogleGenAI } from 'npm:@google/genai';
/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
}

export class GeminiLLM {

    async executeLLM (prompt: string, imagePath?: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
            const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";
            if (GEMINI_API_KEY === undefined) throw new Error("Missing GEMINI_API_KEY");

            let config = {};
            const configPath = Deno.env.get("GEMINI_CONFIG");
            if (configPath) {
                config = JSON.parse(Deno.readTextFileSync(configPath));
            }
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

            console.log("🤖 Calling Gemini AI...");

            // Build the parts array for the request
            const parts: any[] = [{ text: prompt }];

            if (imagePath) {
                console.log("📷 Reading image from:", imagePath);
                const imageData = await Deno.readFile(imagePath);
                const base64Data = btoa(String.fromCharCode(...imageData));

                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/png",
                    },
                });
            }

            // Execute the LLM with proper content structure
            const result = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: [{
                    role: "user",
                    parts: parts
                }],
                ...config,
            });
            // Get text from the result
            // The result object directly has a text() method
            let text: string | undefined;

            try {
                // Try to get text directly from result
                text = await result.text;
                if (typeof text === "undefined"){console.log("result text is undefined");}
            } catch (e) {
                // Fallback: try to access candidates array
                if (result.candidates && result.candidates.length > 0) {
                    const candidate = result.candidates[0];
                    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                        text = candidate.content.parts[0].text || "";
                    } else {
                        throw new Error("No text found in Gemini response candidates");
                    }
                } else {
                    throw new Error("Gemini API returned no candidates");
                }
            }

            if (!text || text.trim() === "") {
                throw new Error("Gemini API returned empty text");
            }

            console.log("✅ Gemini response received");
            return text;
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }
    }
}
