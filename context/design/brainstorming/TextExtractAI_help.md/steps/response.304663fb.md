---
timestamp: 'Sun Oct 19 2025 19:26:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_192603.24aa35c7.md]]'
content_id: 304663fb6813d32c04ca077d1eef2b41d52d9e60398376b6c5bf83ff95d7ef48
---

# response:

You're looking for the file where the LLM prompt is constructed and the image data is prepared for the `geminiLLM.executeLLM` method within your `TextExtractionConcept`.

Based on the provided code, the prompt is constructed directly within the `extractTextFromMedia` method of `TextExtractionConcept.ts`. The image data is read and prepared for `geminiLLM.executeLLM` within that same method.

There isn't a separate, dedicated file solely for controlling how the AI parses the prompt in the sense of a configuration file or a separate "prompt management" module. The logic for prompt construction and image data preparation is **embedded within the `extractTextFromMedia` method itself**.

Let's break down where this happens in `TextExtractionConcept.ts`:

1. **Prompt Construction:**
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
   This `prompt` variable is a long string literal directly within the `extractTextFromMedia` method.

2. **Image Data Preparation and `executeLLM` Call:**

   ```typescript
   const llmResponse = await this.geminiLLM.executeLLM(prompt, image);
   ```

   Here, the `prompt` string and the `image` (which is a `FilePath`) are passed to `this.geminiLLM.executeLLM`.

   Looking at the `geminiLLM.ts` code you provided in the prompt:

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
           const parts: any[] = [{ text: prompt }]; // The prompt text is the first part

           if (imagePath) { // This is where the image is handled
               const imageData = fs.readFileSync(imagePath);
               parts.push({
                   inlineData: {
                       data: imageData.toString("base64"),
                       mimeType: "image/png", // Note: This should ideally be dynamic based on the actual image type
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
       }
   }
   ```

   As you can see in `geminiLLM.ts`, when `imagePath` is provided, `fs.readFileSync(imagePath)` is called, and its base64 encoded data is pushed into the `parts` array, alongside the `prompt`.

**To achieve what you want, you would modify the `TextExtractionConcept.ts` file.**

You don't need a new file for the AI prompt. You can refactor the `extractTextFromMedia` method to separate the prompt string and the image preparation logic more clearly if you wish, but it's all within that method.

**Where to make changes to control LLM parsing:**

The file you need to edit is **`src/concepts/TextExtraction/TextExtraction.ts`**.

**If you wanted to create a separate prompt template file:**

You *could* theoretically create a separate file (e.g., `src/concepts/TextExtraction/prompts.ts`) and define your prompt template there:

```typescript
// src/concepts/TextExtraction/prompts.ts

export const OCR_PROMPT_TEMPLATE = `You are an OCR assistant. Read all visible text in the given image
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
The incoming image's dimensions is {width}x{height}. Label text blocks with accurate coordinates
that are relevant to the image's dimensions.
Strictly follow this format, with no extra commentary:
An example response format:
1: <text> (from: {x:12, y:34}, to: {x:56, y:78})
2: <text> (from: {x:90, y:12}, to: {x:34, y:56})
...
N: <text> (from: {x:A, y:B}, to: {x:C, y:D})
Number of text blocks: N`;
```

And then, in `TextExtractionConcept.ts`, you would import and use it:

```typescript
// src/concepts/TextExtraction/TextExtraction.ts
import { OCR_PROMPT_TEMPLATE } from "./prompts.ts"; // Assuming prompts.ts is in the same directory

// ... inside extractTextFromMedia method ...

      const prompt = OCR_PROMPT_TEMPLATE.replace('{width}', dimensions.width.toString()).replace('{height}', dimensions.height.toString());

      const llmResponse = await this.geminiLLM.executeLLM(prompt, image);
// ... rest of the method ...
```

**However, the core logic for reading the image and preparing `parts` remains within `geminiLLM.ts`.** You cannot move that specific part of the image handling out to a separate "prompt file" because it's part of the `geminiLLM.executeLLM` method's implementation.

**To directly answer your question:**

> where is the file for the AI of this repo??? where I control how the llm parse the prompt.

The file where you control the prompt's content is **`src/concepts/TextExtraction/TextExtraction.ts`**, specifically the `extractTextFromMedia` method where the `prompt` string is defined. The *mechanism* of how the LLM receives and parses that prompt (along with the image) is handled by the `geminiLLM.executeLLM` method in `gemini-llm.ts`.
