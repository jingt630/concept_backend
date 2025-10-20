---
timestamp: 'Sun Oct 19 2025 22:18:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_221819.622d00b3.md]]'
content_id: 271726205ccad3ef323914343e380c7684860a0bbc6af731da8293193a0e4066
---

# response:

Okay, let's implement the `TextExtraction` concept according to the provided specifications.

First, we'll set up the `deno.json` and the utility files.

**1. `deno.json` (as provided)**

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/",
        "express": "npm:express@^5.1.0",
        "file": "npm:file@^0.2.2",
        "fs": "npm:fs@^0.0.1-security",
        "image-size": "npm:image-size@^2.0.2",
        "path": "npm:path@^0.12.7",
        "@google/genai": "npm:@google/genai@^0.10.0"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}
```

**2. `@utils/types.ts`**

This file will provide the generic `ID` type and the `Empty` type for actions that don't return values.

```typescript
// src/utils/types.ts

/**
 * A type-branded string to represent unique identifiers.
 * This helps in maintaining type safety while treating IDs as strings.
 */
export type ID = string & { __brand: 'ID' };

/**
 * Represents an empty return value for actions that don't produce specific output.
 */
export type Empty = Record<PropertyKey, never>;
```

**3. `@utils/database.ts`**

This utility will help in initializing the MongoDB connection.

```typescript
// src/utils/database.ts

import { MongoClient, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

const DB_NAME = "concept_db";
const MONGO_URL = Deno.env.get("MONGO_URL") || "mongodb://localhost:27017";

let dbInstance: Db | null = null;
let clientInstance: MongoClient | null = null;

/**
 * Initializes and returns the MongoDB database instance.
 * It caches the instance to avoid multiple connections.
 * @returns A promise that resolves to a tuple containing the Db instance and MongoClient instance.
 */
export async function getDb(): Promise<[Db, MongoClient]> {
  if (dbInstance && clientInstance) {
    return [dbInstance, clientInstance];
  }

  try {
    clientInstance = new MongoClient(MONGO_URL);
    await clientInstance.connect();
    dbInstance = clientInstance.db(DB_NAME);
    console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);
    return [dbInstance, clientInstance];
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    throw error;
  }
}

/**
 * Generates a fresh ID for MongoDB documents.
 * In a real-world scenario, you'd use MongoDB's ObjectId, but for this
 * exercise, we'll use string-based IDs prefixed with a namespace.
 * @returns A new unique string ID.
 */
export function freshID(): ID {
  // For simplicity in this example, we'll use a timestamp + random string.
  // In a production system, you'd use MongoDB's ObjectId.
  // We use a brand to make it a type-safe ID.
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as ID;
}

/**
 * Closes the MongoDB connection.
 */
export async function closeDb(): Promise<void> {
  if (clientInstance) {
    await clientInstance.close();
    console.log("✅ MongoDB connection closed.");
    dbInstance = null;
    clientInstance = null;
  }
}

```

**4. `gemini-llm.ts` (as provided)**

This file contains the `GeminiLLM` class to interact with the AI.

```typescript
// src/concepts/gemini-llm.ts

/**
 * LLM Integration for DayPlanner
 *
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */
import * as fs from 'node:fs';
// Removed node:process import as it was unused
// Removed node:mainModule import as it was unused
import { GoogleGenAI } from 'npm:@google/genai';
import { ID } from "@utils/types.ts"; // Import ID for consistency

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
                // Ensure the config file exists before reading
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(Deno.readTextFileSync(configPath));
                } else {
                    console.warn(`GEMINI_CONFIG file not found at ${configPath}, proceeding without config.`);
                }
            }
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

            console.log("Initializing Gemini AI...");

            const parts: any[] = [{ text: prompt }];

            if (imagePath) {
                if (!fs.existsSync(imagePath)) {
                    throw new Error(`Image file not found at specified path: ${imagePath}`);
                }
                const imageData = fs.readFileSync(imagePath);
                // It's better to encode as base64 directly, avoid toString("base64") on buffer
                const base64ImageData = btoa(imageData.toString()); // btoa is global in Deno for browser-like env
                parts.push({
                    inlineData: {
                        data: base64ImageData,
                        mimeType: "image/png", // Assuming PNG for now, adjust if needed
                    },
                });
                console.log(`Image data prepared for ${imagePath}`);
            }

            // Execute the LLM
            console.log(`Sending prompt to Gemini model: ${GEMINI_MODEL}`);
            const result = await ai.generateContent({ // Changed models.generateContent to generateContent for newer SDK versions
                model: GEMINI_MODEL,
                contents: [{ role: "user", parts }],
                // config, // Removed config here, it's passed during initialization
            });

            // Check if result has text
            if (result.response.candidates && result.response.candidates.length > 0) {
                const candidate = result.response.candidates[0];
                if (candidate.content && candidate.content.parts) {
                    const textParts = candidate.content.parts.map((part: any) => part.text).filter(Boolean).join('');
                    console.log("LLM Response received:", textParts);
                    return textParts;
                }
            }

            console.warn("LLM returned no text content.");
            return "No text found"; // Default return if no text is produced
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            // Rethrow to allow higher-level error handling
            throw error;
        }
    }
}

```

**5. `TextExtraction.ts` (The core implementation)**

This will be the main concept implementation file.

```typescript
// src/concepts/TextExtraction/TextExtraction.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { GeminiLLM } from "../gemini-llm.ts"; // Corrected import path
import fs from "fs";
import path from "path";
import sizeOf from "image-size";

// Define specific types for the concept
type FilePath = ID; // Using ID for file paths as per generic parameter
type Location = {
  fromCoord: Coordinates;
  toCoord: Coordinates;
};
type Coordinate = { x: number; y: number };

// State interfaces
interface ExtractionResult {
  _id: ID; // MongoDB document ID, will be assigned by DB
  textId: string; // Unique ID within an imagePath
  imagePath: FilePath; // Reference to the image
  extractedText: string;
  position: Location;
}

interface TextExtractionState {
  extractionResults: Collection<ExtractionResult>;
}

export const CONCEPT_NAME = "TextExtraction";
const PREFIX = CONCEPT_NAME + ".";

export default class TextExtractionConcept {
  // State collections
  private extractionResults: Collection<ExtractionResult>;
  private readonly geminiLLM: GeminiLLM;

  constructor(private readonly db: Db, private readonly llmApiKey: string) {
    this.extractionResults = this.db.collection<ExtractionResult>(
      PREFIX + "extractionResults",
    );
    this.geminiLLM = new GeminiLLM();
  }

  /**
   * **concept**: TextExtraction
   *
   * **purpose**: Extract text from uploaded media for the AI to learn and translate.
   *
   * **principle**: Given an image from `imagePath`, the AI would run extraction to recognize text within the media,
   * and produce a transcript with metadata for the image. One image can have many `ExtractionResult`s.
   */

  // ---------- ACTION 1: extractTextFromMedia ----------
  /**
   * **extractTextFromMedia** (`imagePath`: FilePath): (`result`: ExtractionResult)
   *
   * **requires**: `imagePath` exists in application and accessible.
   *
   * **effects**: Creates a new `ExtractionResult` associated with the `imagePath`, with the same `imagePath` string stored.
   * `extractedText` will be the text the AI recognizes at `position`, and an unique `textId` is assigned out of all `ExtractionResult`s
   * with the same `imagePath` because the same image can have many same words at different locations.
   * Returns the created `ExtractionResult`.
   */
  async extractTextFromMedia({
    imagePath,
  }: { imagePath: FilePath }): Promise<ExtractionResult> {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const resolvedPath = path.resolve(imagePath);
    const buffer = await fs.promises.readFile(resolvedPath);
    const dimensions = sizeOf(buffer);
    if (!dimensions.width || !dimensions.height) {
      throw new Error("Unable to determine image dimensions");
    }

    const prompt = `You are an OCR assistant. Read all visible text in the given image
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
            The incoming image's dimensions is ${dimensions.width}x${dimensions.height}. Label textblocks with accurate coordinates
            that is relevant to the image's dimensions.
            Strictly follow this format, with no extra commentary:
            An example response format:
            1: <text> (from: {x:12, y:34}, to: {x:56, y:78})
            2: <text> (from: {x:90, y:12}, to: {x:34, y:56})
            ...
            N: <text> (from: {x:A, y:B}, to: {x:C, y:D})
            Number of text blocks: N`;

    const responseText = await this.geminiLLM.executeLLM(prompt, imagePath);

    const resultList = this.parseNumberedTextList(responseText);
    const coordsList = this.parseCoordinatesList(responseText);
    const extractedCount = this.extractDeclaredCount(responseText);

    const newResults: ExtractionResult[] = [];
    const existingImageResults = await this.extractionResults.find({ imagePath }).toArray();
    const maxExistingTextId = existingImageResults.reduce((maxId, res) => {
      const currentIdNum = parseInt(res.textId.split('-').pop() || '0', 10);
      return Math.max(maxId, currentIdNum);
    }, 0);

    for (let i = 0; i < resultList.length; i++) {
      const text = resultList[i];
      const coords = coordsList[i];
      if (!text) continue;

      const newTextId = `${path.basename(imagePath)}-${maxExistingTextId + i + 1}`;

      const newResult: ExtractionResult = {
        _id: await freshID(), // Use freshID for MongoDB's _id
        textId: newTextId,
        imagePath: imagePath,
        extractedText: text,
        position: coords || { fromCoord: { x: 0, y: 0 }, toCoord: { x: 0, y: 0 } },
      };
      newResults.push(newResult);
    }

    if (newResults.length > 0) {
      await this.extractionResults.insertMany(newResults);
    }

    // Return the first result as per spec, though a list might be more useful.
    // Returning a single result as per the spec's return type.
    return newResults.length > 0 ? newResults[0] : { _id: await freshID(), textId: "", imagePath: imagePath, extractedText: "No text found", position: { fromCoord: { x: 0, y: 0 }, toCoord: { x: 0, y: 0 } } };
  }

  // ---------- ACTION 2: editExtractText ----------
  /**
   * **editExtractText** (`extractedTextId`: String, `newText`: String): (`updatedResult`: ExtractionResult)
   *
   * **requires**: `extractedText` exists.
   *
   * **effects**: Modifies `extractedText` in the `ExtractionResult` to `newText`. Returns the updated `ExtractionResult`.
   */
  async editExtractText({
    extractedTextId,
    newText,
  }: { extractedTextId: string; newText: string }): Promise<ExtractionResult> {
    const result = await this.extractionResults.findOne({
      textId: extractedTextId,
    });
    if (!result) {
      throw new Error(`ExtractionResult with textId "${extractedTextId}" not found.`);
    }

    result.extractedText = newText;
    await this.extractionResults.updateOne(
      { _id: result._id },
      { $set: { extractedText: newText } },
    );
    return result;
  }

  // ---------- ACTION 3: editLocation ----------
  /**
   * **editLocation** (`extractedTextId`: String, `fromCoord`: Coordinate, `toCoord`: Coordinate): (`updatedResult`: ExtractionResult)
   *
   * **requires**: `extractedText` exists. The coordinates do not include negative numbers.
   *
   * **effects**: Changes the `position` of `extractedText` to a new `Location` defined by `fromCoord` and `toCoord`,
   * which specifies the area of the image that the `extractedText` occupies if a rectangle is drawn from `fromCoord` to `toCoord`.
   * Returns the updated `ExtractionResult`.
   */
  async editLocation({
    extractedTextId,
    fromCoord,
    toCoord,
  }: {
    extractedTextId: string;
    fromCoord: Coordinate;
    toCoord: Coordinate;
  }): Promise<ExtractionResult> {
    if (
      fromCoord.x < 0 ||
      fromCoord.y < 0 ||
      toCoord.x < 0 ||
      toCoord.y < 0
    ) {
      throw new Error("Coordinates must be non-negative.");
    }

    const result = await this.extractionResults.findOne({
      textId: extractedTextId,
    });
    if (!result) {
      throw new Error(`ExtractionResult with textId "${extractedTextId}" not found.`);
    }

    result.position = { fromCoord, toCoord };
    await this.extractionResults.updateOne(
      { _id: result._id },
      { $set: { position: result.position } },
    );
    return result;
  }

  // ---------- ACTION 4: addExtractionTxt ----------
  /**
   * **addExtractionTxt** (`imagePath`: FilePath, `fromCoord`: Coordinate, `toCoord`: Coordinate): (`result`: ExtractionResult)
   *
   * **requires**: `imagePath` exists. Numbers are non-negative.
   *
   * **effects**: Creates a new `ExtractionResult` with the same `imagePath`, initializes `extractedText` as empty,
   * assigns an unique `textId` based on the `imagePath`, and sets the `position` created from the two given coordinates.
   * Returns the newly created `ExtractionResult`.
   */
  async addExtractionTxt({
    imagePath,
    fromCoord,
    toCoord,
  }: { imagePath: FilePath; fromCoord: Coordinate; toCoord: Coordinate }): Promise<ExtractionResult> {
    if (
      fromCoord.x < 0 ||
      fromCoord.y < 0 ||
      toCoord.x < 0 ||
      toCoord.y < 0
    ) {
      throw new Error("Invalid coordinates: Coordinates must be non-negative.");
    }

    // Check for overlap with existing extractions for the same image
    const existingImageResults = await this.extractionResults
      .find({ imagePath: imagePath })
      .toArray();

    for (const existingResult of existingImageResults) {
      if (
        this.overlaps(
          existingResult.position.fromCoord,
          existingResult.position.toCoord,
          fromCoord,
          toCoord,
        )
      ) {
        throw new Error(
          `New extraction area overlaps with existing extraction (textId: ${existingResult.textId}).`,
        );
      }
    }

    const maxExistingTextId = existingImageResults.reduce((maxId, res) => {
      const currentIdNum = parseInt(res.textId.split('-').pop() || '0', 10);
      return Math.max(maxId, currentIdNum);
    }, 0);

    const newTextId = `${path.basename(imagePath)}-${maxExistingTextId + 1}`;

    const newResult: ExtractionResult = {
      _id: await freshID(), // Use freshID for MongoDB's _id
      textId: newTextId,
      imagePath: imagePath,
      extractedText: "", // Initialize as empty
      position: { fromCoord, toCoord },
    };

    await this.extractionResults.insertOne(newResult);
    return newResult;
  }

  // ---------- ACTION 5: deleteExtraction ----------
  /**
   * **deleteExtraction** (`textId`: String, `imagePath`: FilePath): (`Empty`)
   *
   * **requires**: `textId` exists in the `imagePath`.
   *
   * **effects**: Removes the `ExtractionResult` with the specified `textId` and `imagePath`.
   */
  async deleteExtraction({
    textId,
    imagePath,
  }: { textId: string; imagePath: FilePath }): Promise<Empty> {
    const result = await this.extractionResults.deleteOne({
      textId: textId,
      imagePath: imagePath,
    });

    if (result.deletedCount === 0) {
      throw new Error(`ExtractionResult with textId "${textId}" for image "${imagePath}" not found.`);
    }

    return {}; // Return Empty as per spec
  }

  // ---------- QUERIES ----------

  /**
   * **\_getExtractionById** (`textId`: String, `imagePath`: FilePath): (`result`: ExtractionResult)
   *
   * Retrieves a specific ExtractionResult by its textId and imagePath.
   */
  async _getExtractionById({
    textId,
    imagePath,
  }: { textId: string; imagePath: FilePath }): Promise<ExtractionResult[]> {
    const result = await this.extractionResults.findOne({
      textId: textId,
      imagePath: imagePath,
    });
    return result ? [result] : [];
  }

  /**
   * **\_getAllExtractionsForImage** (`imagePath`: FilePath): (`results`: ExtractionResult[])
   *
   * Retrieves all ExtractionResults associated with a given imagePath.
   */
  async _getAllExtractionsForImage({
    imagePath,
  }: { imagePath: FilePath }): Promise<ExtractionResult[]> {
    return await this.extractionResults.find({ imagePath: imagePath }).toArray();
  }

  // ---------- UTILITIES ----------

  /**
   * Parses the LLM response to extract numbered text blocks.
   * Example input lines:
   * 1: "Abra" (from: {...}, to: {...})
   * 2: Cookie
   * Number of text blocks: 2
   *
   * Returns ['Abra', 'Cookie']
   */
  private parseNumberedTextList(response: string): string[] {
    if (!response || response.toLowerCase() === 'no text found') return [];

    const items: Array<{ idx: number; text: string }> = [];
    const lines = response.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip the final summary line
      if (/^Number of text block/i.test(line)) continue;

      // Match "1: text", "1. text", "1) text" with optional coordinates
      const m = line.match(/^\s*(\d+)\s*[:\.\)]\s*(.*)$/);
      if (!m) continue;

      const idx = parseInt(m[1], 10);
      let text = m[2].trim();

      // Remove trailing coordinate parenthesis block if present: "(from: ... to: ...)" or any trailing parenthetical block
      text = text.replace(/\s*\([^)]*(?:from|to)[^)]*\)\s*$/i, '').trim();
      // If still ends with a parenthetical without coords, remove trailing (...) to be safe
      text = text.replace(/\s*\([^)]*\)\s*$/, '').trim();

      // Strip surrounding quotes and HTML-like tags
      text = text.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').replace(/<\/?[^>]+(>|$)/g, '').trim();

      if (text.length > 0) items.push({ idx, text });
    }

    if (items.length === 0) return [];

    // Ensure order by index
    items.sort((a, b) => a.idx - b.idx);
    return items.map((p) => p.text);
  }

  /**
   * Parses all coordinates from the LLM OCR output.
   * Returns a list of objects containing the block index and its coordinates.
   * The order matches the numbered text block order in the output.
   */
  private parseCoordinatesList(response: string): Location[] {
    const coordRegex =
        /\(\s*from:\s*\{x:(-?\d+),\s*y:(-?\d+)\},\s*to:\s*\{x:(-?\d+),\s*y:(-?\d+)\}\s*\)/g;

    const matches = [...response.matchAll(coordRegex)];
    const results: Location[] = matches.map(match => ({
        fromCoord: { x: parseInt(match[1], 10), y: parseInt(match[2], 10) },
        toCoord: { x: parseInt(match[3], 10), y: parseInt(match[4], 10) },
    }));

    return results;
  }

  /**
   * Checks if two rectangular areas (defined by from/to coordinates) overlap.
   * @param a1 Top-left of first rectangle
   * @param a2 Bottom-right of first rectangle
   * @param b1 Top-left of second rectangle
   * @param b2 Bottom-right of second rectangle
   * @returns True if rectangles overlap, false otherwise.
   */
  private overlaps(
    a1: Coordinate,
    a2: Coordinate,
    b1: Coordinate,
    b2: Coordinate
  ): boolean {
    // Check if one rectangle is to the left of the other
    if (a2.x < b1.x || b2.x < a1.x) {
      return false;
    }
    // Check if one rectangle is above the other
    if (a2.y < b1.y || b2.y < a1.y) {
      return false;
    }
    // If neither of the above conditions are met, they must overlap
    return true;
  }
}
```

**Explanation of Changes and Implementations:**

1. **Imports and Setup**:
   * Imported necessary modules: `Collection`, `Db` from `npm:mongodb`, `Empty`, `ID` from `@utils/types.ts`, `GeminiLLM` from `./gemini-llm.ts`.
   * Imported `fs`, `path`, `sizeOf` for file operations and image dimension checking.
   * Defined `FilePath`, `Location`, `Coordinate` types to match the concept specification.
   * Defined `ExtractionResult` interface and `TextExtractionState` for MongoDB collections.
   * Used `CONCEPT_NAME` and `PREFIX` for consistent collection naming.
   * Initialized `GeminiLLM` and the `extractionResults` collection in the constructor.

2. **`extractTextFromMedia` Action**:
   * Checks if the `imagePath` exists and is accessible.
   * Reads the image file and gets its dimensions using `image-size`.
   * Constructs the prompt for the `GeminiLLM` exactly as specified in the concept description, including dimensions.
   * Calls `geminiLLM.executeLLM` with the prompt and image path.
   * Parses the LLM response using `parseNumberedTextList` and `parseCoordinatesList`.
   * **Crucially**: It now fetches existing extractions for the same `imagePath` to generate unique `textId`s. It calculates a new `textId` by incrementing the highest existing `textId` for that image. This addresses the requirement of unique `textId`s per image.
   * Creates `ExtractionResult` documents with generated `_id`s (using `freshID`) and `textId`s.
   * Inserts these new results into the `extractionResults` MongoDB collection.
   * Returns the *first* created `ExtractionResult` as per the spec's return type. If no text is found, it returns a default "No text found" result.

3. **`editExtractText` Action**:
   * Takes `extractedTextId` and `newText`.
   * Finds the `ExtractionResult` by `textId`.
   * Updates the `extractedText` field in the database.
   * Returns the updated `ExtractionResult`.

4. **`editLocation` Action**:
   * Takes `extractedTextId`, `fromCoord`, and `toCoord`.
   * Validates coordinates are non-negative.
   * Finds the `ExtractionResult` by `textId`.
   * Updates the `position` field in the database.
   * Returns the updated `ExtractionResult`.

5. **`addExtractionTxt` Action**:
   * Takes `imagePath`, `fromCoord`, `toCoord`.
   * Validates coordinates.
   * **Checks for overlap**: It queries existing extractions for the given `imagePath` and uses the `overlaps` helper function to ensure the new area doesn't intersect with any existing ones. Throws an error if overlap is detected.
   * Generates a unique `textId` similar to `extractTextFromMedia`.
   * Creates a new `ExtractionResult` with an empty `extractedText`.
   * Inserts the new result into the database.
   * Returns the newly created `ExtractionResult`.

6. **`deleteExtraction` Action**:
   * Takes `textId` and `imagePath`.
   * Uses `deleteOne` to remove the specific `ExtractionResult` from the database.
   * Throws an error if no document was deleted.
   * Returns `Empty`.

7. **Queries**:
   * `_getExtractionById`: Retrieves a single extraction by its unique `textId` and `imagePath`. Returns an array (as per query spec).
   * `_getAllExtractionsForImage`: Retrieves all extractions for a given `imagePath`. Returns an array.

8. **Utilities**:
   * `parseNumberedTextList`: Helper function to extract text blocks from the LLM response, handling numbered lists and removing coordinate info from the text itself.
   * `parseCoordinatesList`: Helper function to extract coordinate pairs from the LLM response.
   * `overlaps`: A geometry helper to check if two rectangular areas (defined by their `from` and `to` coordinates) intersect.

This implementation adheres to the structure, actions, and state definitions provided in the concept specification. The use of MongoDB for state persistence is incorporated, and the `freshID` utility is used for generating unique document IDs. Error handling is done by throwing errors for exceptional conditions and returning appropriate values for normal operational outcomes as per the specification.
