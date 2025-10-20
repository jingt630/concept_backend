---
timestamp: 'Sun Oct 19 2025 20:04:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_200415.3479843f.md]]'
content_id: d2e0939fe4ee1a336e3f8eb4e6e1647196d863f7c62ae12b19789ecd6db9522b
---

# response:

Let's break down how the `TextExtraction.ts` file uses prompts and how you can modify the `GeminiLLM`'s `executeLLM` method to handle prompts and images as you described.

## How `TextExtraction.ts` Gets its Prompt

The `TextExtraction.ts` file **does not read prompts from `.md` files**. Instead, it **hardcodes the prompt directly within the `extractTextFromMedia` method**:

```typescript
      const prompt =
        `You are an OCR assistant. Read all visible text in the given image
        and return only the readable text. Do not describe the image or repeat the base64 data.
        Return plain text only, formatted for readability by numbering each text block you recognize.
        Also keep track of the position of each text block in the image, using coordinates.
        Coordinates are given as (x,y) pairs, where (0,0) is the top-left corner of the image.
        The 'from' coordinate is the top-left corner of the text block, and the 'to' coordinate is
        the bottom-right corner. The coordinates should be integers representing pixel positions in the image
        relative to the image dimensions. If no text can be found, return "No text found". When two or more
        short text segments appear close together (within the same logical phrase or line group), merge them
        into a single text block rather than splitting them. Treat small vertical spacing as part of the same
        block if the text forms a continuous sentence or title.
        Do not add, infer, or search for any information that is not explicitly readable.
        Do not use external knowledge or guess missing words based on what the image might represent.
        Apply the same grouping logic for all languages — English, Chinese, or others — merging vertically or
        horizontally aligned characters that form a single title or phrase.
        When estimating coordinates, ensure that (from) and (to) precisely cover only the visible text area.
        Avoid random or uniform coordinates that do not match the actual layout.
        Keep numeric elements together with their associated words (e.g., “2025” and “Festival”)
        in a single text block whenever they belong to the same phrase or visual line.
        The incoming image's dimensions is ${dimensions.width}x${dimensions.height}. Label text blocks with accurate coordinates
        that are relevant to the image's dimensions.
        Strictly follow this format, with no extra commentary:
        An example response format:
        1: <text> (from: {x:12, y:34}, to: {x:56, y:78})
        2: <text> (from: {x:90, y:12}, to: {x:34, y:56})
        ...
        N: <text> (from: {x:A, y:B}, to: {x:C, y:D})
        Number of text blocks: N`;
```

The prompt is a large string literal that includes placeholders like `${dimensions.width}` which are filled in dynamically.

## Modifying `GeminiLLM.executeLLM`

You want to modify `GeminiLLM.executeLLM` so that:

1. The **prompt is read as one part**.
2. The **image is accepted and pushed to the `parts` list**.

Your provided `executeLLM` code already does exactly this! Let's analyze it:

```typescript
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
        
        // Initialize parts array
        const parts: any[] = []; // Using 'any[]' as per your example, though a more specific type might be better

        // 1. Prompt is read as one part
        // This is handled by:
        parts.push({ text: prompt }); 
        // This line takes the 'prompt' string and adds it as a single object within the 'parts' array.

        // 2. Accept image like in the following code and push it to the parts list.
        if (imagePath) {
            const imageData = fs.readFileSync(imagePath); // Reads the image file
            parts.push({
                inlineData: {
                    data: imageData.toString("base64"), // Converts image data to base64
                    mimeType: "image/png", // Assumes PNG, you might want to infer this
                },
            });
            // This block, when 'imagePath' is provided, reads the image,
            // encodes it in base64, and pushes it as a separate object in the 'parts' array.
            // This is how Gemini's SDK handles multimodal input.
        }

        // Execute the LLM
        const result = await model.generateContent(parts); // 'parts' is passed here, containing both text and image (if provided)
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error('❌ Error calling Gemini API:', (error as Error).message);
        throw error;
    }
}
```

**Your `GeminiLLM.executeLLM` method is already structured correctly for what you want:**

* **Prompt as one part:** `parts.push({ text: prompt });` explicitly adds the `prompt` string as a single text part.
* **Image as a part:** The `if (imagePath)` block correctly reads the image, encodes it, and adds it as an `inlineData` part. This is the standard way to send images to multimodal LLMs like Gemini.

## How to Integrate and Make it Read Prompts from `.md` files (Optional Extension)

If you want to make the prompt *dynamic* and read from `.md` files instead of being hardcoded, you would need to:

1. **Modify `TextExtraction.ts` to pass the prompt path:** Instead of constructing the prompt string inside `extractTextFromMedia`, you'd pass a path to a `.md` file.
2. **Add a file reading mechanism in `GeminiLLM` (or a service that uses `GeminiLLM`):** The `executeLLM` method (or a higher-level service) would need to read the content of the `.md` file and then pass that content as the `prompt` argument.

**Example of how you might read a prompt from an `.md` file:**

Let's say you have a file `prompts/ocr_prompt.md` with your prompt content.

**Modify `TextExtraction.ts`:**

```typescript
// ... imports ...

export default class TextExtractionConcept {
  // ... existing properties and constructor ...

  /**
   * Extract text from an image using an LLM and store the results.
   *
   * **requires**: `image` exists in application and accessible.
   *
   * **effects**: Creates new `ExtractionResult` and `Location` documents for each detected text block.
   *              `extractedText` will be the text the AI recognizes at `position`.
   *              An unique `textId` is assigned for each `ExtractionResult` associated with the same `imagePath`.
   */
  async extractTextFromMedia({
    image,
  }: {
    image: FilePath;
  }): Promise<{ results: ExtractionResultId[] } | { error: string }> {
    try {
      const imageExists = fs.existsSync(image);
      if (!imageExists) {
        return { error: "Image file not found" };
      }

      const resolvedPath = path.resolve(image);
      const buffer = await fs.promises.readFile(resolvedPath);
      const dimensions = sizeOf(buffer);
      if (!dimensions.width || !dimensions.height) {
        return { error: "Unable to determine image dimensions" };
      }

      // --- MODIFICATION START ---
      // Read prompt from a file instead of hardcoding
      const promptFilePath = path.join(__dirname, "../prompts/ocr_prompt.md"); // Adjust path as needed
      const promptTemplate = await fs.promises.readFile(promptFilePath, "utf-8");
      
      // Dynamically inject image dimensions into the prompt template
      const prompt = promptTemplate.replace('${dimensions.width}x${dimensions.height}', `${dimensions.width}x${dimensions.height}`);
      // --- MODIFICATION END ---

      // Pass the prompt string and image path to executeLLM
      const llmResponse = await this.geminiLLM.executeLLM(prompt, image); 
      const extractedData = this.parseLLMResponse(llmResponse, image);

      // ... rest of your existing code ...
    } catch (error: any) {
      console.error("❌ Error extracting text from media:", error.message);
      return { error: error.message };
    }
  }
  // ... rest of the class ...
}
```

**And your `GeminiLLM` class (assuming it has the `executeLLM` method you provided):**

```typescript
// In your GeminiLLM.ts or wherever this class resides

import { GoogleGenerativeAI } from "@google/generative-ai"; // Make sure this import is correct
import fs from "fs";
import path from "path"; // Import path module if you need it for resolving directories

export class GeminiLLM {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async executeLLM(prompt: string, imagePath?: string): Promise<string> {
        try {
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                generationConfig: {
                    maxOutputTokens: 1000,
                }
            });
            
            const parts: any[] = [];

            // The prompt is added as one part
            parts.push({ text: prompt });

            // If an image path is provided, read and add it as a part
            if (imagePath) {
                const imageData = await fs.promises.readFile(imagePath); // Use promises for async read
                // You might want to dynamically determine mimeType based on file extension
                const mimeType = "image/png"; // Example, could be image/jpeg, etc.
                parts.push({
                    inlineData: {
                        data: imageData.toString("base64"),
                        mimeType: mimeType,
                    },
                });
            }

            // Execute the LLM with the constructed parts
            const result = await model.generateContent(parts);
            const response = await result.response;
            const text = response.text();
            return text;
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }
    }
}
```

In summary, your `GeminiLLM.executeLLM` is already doing what you want. If you wish to read prompts from `.md` files, you'll need to add the file reading logic *before* calling `executeLLM`, passing the read content as the `prompt` argument.
