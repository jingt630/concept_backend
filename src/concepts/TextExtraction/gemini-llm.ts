/**
 * LLM Integration for DayPlanner
 *
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */
import fs from 'fs';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAI } from "npm:google-generative-ai";

/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
}

export class GeminiLLM {
    private apiKey: string;

    constructor(config: Config) {
        this.apiKey = config.apiKey;
    }

    async executeLLM (prompt: string, imagePath?: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                generationConfig: {
                    maxOutputTokens: 1000,
                }
            });
            const parts: any[] = [{ text: prompt }];

            if (imagePath) {
            const imageData = fs.readFileSync(imagePath);
            parts.push({
                inlineData: {
                data: imageData.toString("base64"),
                mimeType: "image/png",
                },
            });
            }

            // Execute the LLM
            const result = await model.generateContent(parts);
            const response = await result.response;
            const text = response.text();
            return text;
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }    }
}
