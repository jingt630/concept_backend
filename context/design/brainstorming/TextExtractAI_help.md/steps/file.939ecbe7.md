---
timestamp: 'Sun Oct 19 2025 00:31:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_003137.bc39859c.md]]'
content_id: 939ecbe769992ce5a94d60d53744fe183b3f29da409c4eb91946c927d2e9711c
---

# file: src/llm/gemini-llm.ts

```typescript
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  async executeLLM(prompt: string, imagePath?: string): Promise<string> {
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });
      const parts: any[] = [{ text: prompt }];

      if (imagePath) {
        // Ensure the file exists before reading
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found at path: ${imagePath}`);
        }
        const imageData = await fs.promises.readFile(imagePath);
        // Determine MIME type dynamically, default to png if unknown
        const mimeType = imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg')
          ? 'image/jpeg'
          : 'image/png';

        parts.push({
          inlineData: {
            data: imageData.toString("base64"),
            mimeType: mimeType,
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
      // Rethrow the error to be handled by the caller
      throw error;
    }
  }
}
```
