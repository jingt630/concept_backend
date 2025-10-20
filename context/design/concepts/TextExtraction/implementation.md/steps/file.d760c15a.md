---
timestamp: 'Sun Oct 19 2025 21:52:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_215224.d1c8c7d7.md]]'
content_id: d760c15a8398c9ef85d4fb0a5be23e050fb29d43b674c8281c3e400b0044c1cf
---

# file: gemini-llm.ts

```typescript
/**
 * LLM Integration for DayPlanner
 *
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */
import * as fs from 'node:fs';
import { mainModule } from "node:process";
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
            const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL");
            if (GEMINI_API_KEY === undefined) throw new Error("Missing GEMINI_API_KEY");
            if (GEMINI_MODEL === undefined) throw new Error("Missing GEMINI_MODEL");
            let config = {};
            const configPath = Deno.env.get("GEMINI_CONFIG");
            if (configPath) {
                config = JSON.parse(Deno.readTextFileSync(configPath));
            }
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

            const parts: any[] = [{ text: prompt }];

            if (imagePath) {
            const imageData = fs.readFileSync(imagePath);
            console.log(imageData.toString("base64"));
            parts.push({
                inlineData: {
                data: imageData.toString("base64"),
                mimeType: "image/png",
                },
            });
            }

            // Execute the LLM
            const result = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: prompt,
                config,
            });
            const response = await result.text;
            console.log(response);
            // const text = response.text();
            const text = "empty for now";
            return text;
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }    }
}



```
