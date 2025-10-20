---
timestamp: 'Sun Oct 19 2025 19:33:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_193318.d7834009.md]]'
content_id: 4c8757b627acb9d8d030634953cc6683af3a4901f9bb0138af82f3688215aab4
---

# response:

You're on the right track with how `generateContent` handles multiple parts, including images! The `GoogleGenerativeAI` library allows you to pass an array of `Part` objects to `generateContent`. Each `Part` can be either text or inline data (like an image).

The code you provided already demonstrates this correctly. Let's break down what's happening and how you can leverage it further for different prompts:

**Understanding the Current Implementation:**

1. **`parts: any[] = [{ text: prompt }]`**: You initialize an array `parts` and immediately add your primary text prompt as the first element. This is a text `Part`.

2. **`if (imagePath)`**: If an `imagePath` is provided, you:
   * Read the image file using `fs.readFileSync`.
   * Create an `inlineData` object with the base64 encoded image data and its MIME type.
   * Push this as a new `Part` into the `parts` array.

3. **`await model.generateContent(parts)`**: The `generateContent` method then takes this array of `parts` and sends it to the Gemini model. The model can process both the text instructions and the visual information from the image.

**How to Make the AI Accept Another Prompt Alongside the Image:**

You've already implemented the core mechanism! The key is that the `parts` array can contain *multiple text parts* in addition to the image part.

Here's how you can structure it, and then I'll provide an example:

**1. Define Your Prompts:**

You'll have a primary prompt that describes the overall task and potentially secondary prompts that refine or add specific instructions.

**2. Combine Prompts and Image into the `parts` Array:**

The `parts` array is your canvas. You can add as many text `Part`s as you need before or after the image `Part`.

**Example Scenario: Extracting Text and Identifying Specific Objects in an Image**

Let's say you want to extract text AND identify all instances of a "red apple" in the image.

**Conceptual `GeminiLLM` Class Modification (if needed, though your current `executeLLM` is flexible):**

Your `executeLLM` method is already well-suited for this. You just need to construct the `parts` array correctly based on the inputs you pass to it.

```typescript
// Assuming this is within your GeminiLLM class
async executeLLM(options: {
  primaryPrompt: string;
  secondaryPrompt?: string; // Optional secondary prompt
  imagePath?: string;
}): Promise<string> {
  try {
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const parts: any[] = [];

    // Add the primary prompt
    parts.push({ text: options.primaryPrompt });

    // Add the secondary prompt if it exists
    if (options.secondaryPrompt) {
      parts.push({ text: options.secondaryPrompt });
    }

    // Add the image if provided
    if (options.imagePath) {
      const imageData = fs.readFileSync(options.imagePath);
      parts.push({
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png", // Adjust mimeType if needed (e.g., "image/jpeg")
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

**How you would call this from `TextExtractionConcept` (or elsewhere):**

```typescript
// ... inside TextExtractionConcept class ...

async extractTextAndIdentifyApples({ image }: { image: FilePath }): Promise<{ results: ExtractionResultId[] } | { error: string }> {
  try {
    // ... (image validation as before) ...

    const primaryPrompt = `You are an OCR assistant. Read all visible text in the given image and return only the readable text. Do not describe the image or repeat the base64 data. Return plain text only, formatted for readability by numbering each text block you recognize.`;

    const secondaryPrompt = `In addition to extracting text, identify all instances of "red apples" in the image. For each "red apple" found, describe its approximate location (e.g., "top-left", "center", "bottom-right") and any visible text associated with it (e.g., a label on the apple).`;

    // Assuming you have an instance of GeminiLLM
    const llmResponse = await this.geminiLLM.executeLLM({
      primaryPrompt: primaryPrompt,
      secondaryPrompt: secondaryPrompt, // Pass the secondary prompt
      imagePath: image, // Pass the image path
    });

    // Now you would need a more sophisticated parser for llmResponse
    // as it will contain both text extraction and apple identification details.
    // This parsing logic would be specific to how the LLM structures the combined response.

    // ... rest of your logic ...
    return { results: [] }; // Placeholder
  } catch (error: any) {
    console.error("❌ Error extracting text and identifying apples:", error.message);
    return { error: error.message };
  }
}
```

**Key Takeaways:**

* **`parts` Array is Key:** The `generateContent` method expects an array of `Part` objects.
* **Multiple Text Parts:** You can add multiple text `Part`s to the `parts` array. The model will process them sequentially as part of the overall prompt.
* **Order Matters (Sometimes):** While Gemini is good at understanding context, placing instructional prompts before or after the image might subtly influence its focus. For most cases, putting the primary instruction first, then any refinements, and finally the image, is a good strategy.
* **Parsing is Crucial:** When you combine multiple tasks, the output from the LLM will be more complex. You'll need to design your parsing logic carefully to extract the information for each task. You might instruct the LLM to use specific delimiters or sections to separate the results for different tasks.

In your `TextExtraction.ts` file, the `extractTextFromMedia` method already has the `if (imagePath)` block that correctly adds image data to the `parts` array. If you want to pass *another* textual prompt, you simply need to add it as another text `Part` before or after the existing ones.

The prompt you've written for text extraction is quite detailed. If you wanted to add a secondary textual instruction, you could do something like this within your `extractTextFromMedia` method:

```typescript
// ... inside extractTextFromMedia method ...

      const primaryPrompt = `You are an OCR assistant. Read all visible text in the given image...`; // Your existing detailed prompt

      // Define a secondary prompt if you want to add another layer of instruction
      const secondaryInstruction = `Also, please list any numerical data found in the image, even if it's not part of a larger text block.`;

      const promptParts: any[] = [
        { text: primaryInstruction },
        { text: secondaryInstruction }, // Add the secondary prompt here
      ];

      if (imageExists) { // You already have this check
        const resolvedPath = path.resolve(image);
        const buffer = await fs.promises.readFile(resolvedPath);
        const dimensions = sizeOf(buffer);
        if (!dimensions.width || !dimensions.height) {
          return { error: "Unable to determine image dimensions" };
        }

        // Add the image data to the parts
        promptParts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: "image/png", // Ensure this matches your image type
          },
        });
      }

      // Now, pass promptParts to your LLM execution
      const llmResponse = await this.geminiLLM.executeLLMWithParts(promptParts); // Assuming you have a method like this or adapt executeLLM
      const extractedData = this.parseLLMResponse(llmResponse, image);

// ... rest of your method ...
```

You would need to adapt your `GeminiLLM.executeLLM` or create a new method to accept an array of `parts` directly if you want this level of flexibility, or just construct the `parts` array within `TextExtraction.ts` and then pass it to your existing `executeLLM` if that method can be modified to accept `parts` directly.

The current `executeLLM` in your prompt actually *does* accept an array of parts. So the `GeminiLLM` class is already ready! You just need to construct that array of `parts` in your `TextExtractionConcept` method.
