---
timestamp: 'Sun Oct 19 2025 20:04:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_200455.3a871964.md]]'
content_id: dfb8fbe629a1de657ff06dad641fea2c31e475b27f616b51edbd2531ef796f4c
---

# response:

Let's break down how your AI file gets its prompt from `.md` files and how you can modify it to incorporate an image directly into the `parts` list for processing.

## How the AI File Gets Prompts from `.md` Files

Based on the provided `TextExtraction.ts` file, the prompt is *not* directly loaded from `.md` files. Instead, the prompt is **hardcoded** within the `extractTextFromMedia` method as a string literal:

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

**Therefore, the prompt in your `TextExtraction.ts` file is NOT being dynamically loaded from `.md` files.** It's a static string. If you had a mechanism in another part of your application that *did* read `.md` files and then pass their content as a prompt to `GeminiLLM`, that's a separate concern from this specific `TextExtraction` concept.

## How to Modify AI to Read the Prompt as One Part and Accept an Image

You're on the right track with the `executeLLM` method you provided. This is where the core logic for interacting with the Gemini API resides. Let's clarify how to modify it to achieve your goal.

**Understanding the `parts` Array**

The `executeLLM` function constructs a `parts` array. This array is how you provide multiple pieces of information (text, images, etc.) to the Gemini model in a single API call.

* **Text Parts:** These are represented as `{ text: "your prompt string" }`.
* **Image Parts:** These are represented as `{ inlineData: { data: "base64_encoded_image", mimeType: "image/png" } }`.

**Modifying `executeLLM`**

Your provided `executeLLM` function already correctly handles this. Let's analyze it and then discuss how you can ensure *your prompt* is treated as a single text part.

```typescript
// Assuming this is within your GeminiLLM class
async executeLLM (prompt: string, imagePath?: string): Promise<string> {
    try {
        // Initialize Gemini AI
        const genAI = new GoogleGenerativeAI(this.apiKey); // Assumes this.apiKey is available
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                maxOutputTokens: 1000,
            }
        });

        // This is where we build the 'parts' array
        const parts: any[] = [];

        // Add the prompt as the FIRST text part
        if (prompt) { // Ensure prompt is not empty
            parts.push({ text: prompt });
        } else {
            // Handle case where prompt might be empty if it's not always guaranteed
            console.warn("executeLLM called with an empty prompt.");
            // Decide on behavior: return empty string, throw error, or continue without prompt.
            // For this example, we'll proceed but log a warning.
        }

        // Add the image if an imagePath is provided
        if (imagePath) {
            const imageData = fs.readFileSync(imagePath); // Ensure fs is imported and available
            parts.push({
                inlineData: {
                    data: imageData.toString("base64"),
                    // You might want to dynamically determine mimeType based on the file extension
                    // or have a lookup table. For now, hardcoding 'image/png' or 'image/jpeg' is common.
                    mimeType: "image/jpeg", // Or "image/png", "image/gif", etc.
                },
            });
        }

        // Execute the LLM
        // The model.generateContent method expects an array of parts.
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error('❌ Error calling Gemini API:', (error as Error).message);
        throw error; // Re-throw the error so calling functions can handle it
    }
}
```

**Explanation of Modifications and How to Ensure Prompt is One Part:**

1. **`const parts: any[] = [];`**: We initialize an empty array to hold our prompt and image data.
2. **`if (prompt) { parts.push({ text: prompt }); }`**:
   * This is the crucial part for ensuring your prompt is treated as **one single text part**.
   * We check if `prompt` is not empty.
   * We then create an object `{ text: prompt }` and push it into the `parts` array. This object specifically tells the Gemini API that this is a piece of text.
   * **Crucially, by doing this *before* adding any image data, you are guaranteeing that your prompt will be the first piece of information the LLM processes.** Gemini generally processes parts in the order they appear in the `parts` array.
3. **Image Handling (`if (imagePath) { ... }`)**:
   * This block remains largely the same as your example. It reads the image file, base64 encodes it, and creates an `inlineData` part to be added to the `parts` array.
   * **Order Matters:** Since this comes *after* the prompt `parts.push({ text: prompt });`, the image will be processed *after* the initial prompt text.

**How to Modify the Prompt (if it were from `.md` files):**

Since your current `TextExtraction.ts` has a hardcoded prompt, you would modify that string directly.

If you *were* loading prompts from `.md` files in another part of your application (e.g., in a separate utility function or a different class), here's how you'd approach it:

1. **Reading the `.md` file:** Use `fs.readFileSync` (or `fs.promises.readFile`) to read the content of your `.md` file.
   ```typescript
   import fs from 'fs';
   import path from 'path';

   const markdownFilePath = path.join(__dirname, 'prompts', 'my_ocr_prompt.md'); // Example path
   const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
   ```
2. **Passing to `executeLLM`:** Then, you would pass this `markdownContent` string as the `prompt` argument to your `executeLLM` method.

   ```typescript
   // In some other part of your code:
   const myPrompt = fs.readFileSync('path/to/your/prompt.md', 'utf-8');
   const imageToProcess = 'path/to/your/image.jpg';

   // Assuming you have an instance of GeminiLLM
   const geminiLLMInstance = new GeminiLLM("YOUR_API_KEY");

   const extractedText = await geminiLLMInstance.executeLLM(myPrompt, imageToProcess);
   console.log(extractedText);
   ```

**Key Takeaway for Prompt Modification:**

* **If the prompt is a hardcoded string (like in `TextExtraction.ts`):** Edit the string literal directly within the `TextExtraction.ts` file.
* **If the prompt is dynamically loaded (e.g., from `.md` files):** Modify the content of the `.md` file itself.

By ensuring your prompt is the first item added to the `parts` array in `executeLLM` using `{ text: prompt }`, you guarantee it's sent as a single, distinct piece of information to the Gemini API, followed by your image data.
