import { GeminiLLM } from "./gemini-llm.ts";

async function testSpiritedAway() {
  console.log("🎬 Testing AI with Spirited Away Poster\n");

  // Path to the image (adjust if needed)
  const imagePath = "Manga.png";

  const prompt =
    `You are an OCR assistant. Read all visible text in the given image
and return only the readable text. Do not describe the image or repeat the base64 data.
Return plain text only, formatted for readability by numbering each text block u recognize.
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
Keep numeric elements together with their associated words (e.g., "2025" and "Festival")
in a single text block whenever they belong to the same phrase or visual line. Label textblocks with accurate coordinates
that is relevant to the image's dimensions.
Strictly follow this format, with no extra commentary:
An example response format:
1: <text> (from: {x:12, y:34}, to: {x:56, y:78})
2: <text> (from: {x:90, y:12}, to: {x:34, y:56})
...
N: <text> (from: {x:A, y:B}, to: {x:C, y:D})
Number of text blocks: N`;

  try {
    const llm = new GeminiLLM();
    console.log("🔄 Calling Gemini AI...\n");

    const result = await llm.executeLLM(prompt, imagePath);

    console.log("✅ AI EXTRACTION RESULT:");
    console.log("=".repeat(70));
    console.log(result);
    console.log("=".repeat(70));
  } catch (error) {
    console.error("❌ Error");
    console.error("Full error:", error);
  }
}

testSpiritedAway();
