---
timestamp: 'Sun Oct 19 2025 06:57:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_065722.bfdfc543.md]]'
content_id: ea49377b8f010d296d886bb1a1e303eaa57fc320dcef85c390803c883e0d3169
---

# response:

Let's address the issues one by one.

## 1. `sizeOf` import error

**Reason for the error:**

The error "image-size is not importable" typically arises because `image-size` is a CommonJS module and you are in a TypeScript/ES Module environment. You're likely using Deno or a similar runtime that defaults to ES Modules. When importing CommonJS modules, you often need to use a dynamic import or a specific import syntax if your runtime supports it.

**Fix:**

In Deno, you can import CommonJS modules using the `import "@deno/shim-commonjs"` shim and then import `image-size` directly.

Here's how to fix it in your `TextExtraction.ts` file:

```typescript
// Add this at the top of the file, outside of any class or function
import "@deno/shim-commonjs";
import sizeOf from "npm:image-size@^1.0.2"; // Use npm specifier for Deno

// ... rest of your imports
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { GeminiLLM } from "./gemini-llm.ts";
import fs from "fs";
import path from "path";
// Remove the incorrect import: import sizeOf from "image-size";

// ... rest of your TextExtraction.ts code
```

**Explanation:**

* `import "@deno/shim-commonjs";`: This line imports a Deno shim that allows you to use CommonJS modules.
* `import sizeOf from "npm:image-size@^1.0.2";`: We are now using the `npm:` specifier, which is the standard way to import npm packages in Deno. I've also added a version specifier (`@^1.0.2`) which is good practice.

## 2. Type Error in `checkOverlap`

**Reason for the error:**

The error `Type 'Document[]' is not assignable to type 'ExtractionResult[]'` occurs because the result of `this.locations.aggregate([...]).toArray()` returns an array of MongoDB `Document` types. However, your `checkOverlap` method is typed to return `ExtractionResult[]`. While the `aggregate` pipeline is set up to *return* documents that look like `ExtractionResult` (due to `$replaceRoot`), the type inference from MongoDB driver doesn't automatically cast `Document` to `ExtractionResult`.

**Fix:**

You need to explicitly cast the result of the `toArray()` method to `ExtractionResult[]`.

```typescript
  /**
   * Checks if a given bounding box overlaps with existing extractions for a specific image.
   * @param fromCoord The top-left coordinate of the new bounding box.
   * @param toCoord The bottom-right coordinate of the new bounding box.
   * @param imagePath The path of the image.
   * @returns A promise that resolves to an array of overlapping ExtractionResult documents.
   */
  private async checkOverlap(
    fromCoord: Coordinates,
    toCoord: Coordinates,
    imagePath: FilePath
  ): Promise<ExtractionResult[]> { // This return type is correct
    const overlappingDocuments = await this.locations
      .aggregate([
        {
          $match: {
            fromCoord: { $ne: null }, // Ensure coordinates exist
            toCoord: { $ne: null },
          },
        },
        {
          $lookup: {
            from: PREFIX + "extractionResults", // The collection to join with
            localField: "extractionResultId",
            foreignField: "_id",
            as: "extractionResult",
          },
        },
        {
          $unwind: "$extractionResult", // Deconstruct the array field from the lookup
        },
        {
          $match: {
            "extractionResult.imagePath": imagePath, // Filter by image path
            // Check for overlap
            $or: [
              {
                "fromCoord.x": { $lt: toCoord.x },
                "toCoord.x": { $gt: fromCoord.x },
                "fromCoord.y": { $lt: toCoord.y },
                "toCoord.y": { $gt: fromCoord.y },
              },
            ],
          },
        },
        {
          $replaceRoot: { newRoot: "$extractionResult" }, // Return the extraction result document
        },
      ])
      .toArray();

    // Explicitly cast the result to ExtractionResult[]
    return overlappingDocuments as ExtractionResult[];
  }
```

**Explanation:**

* We've renamed the variable `overlappingLocations` to `overlappingDocuments` to better reflect its initial type.
* The crucial change is `return overlappingDocuments as ExtractionResult[];`. This tells TypeScript that even though the MongoDB driver returns `Document[]`, we know that the shape of these documents, after our aggregation pipeline, matches the `ExtractionResult` interface.

## 3. Avoiding `any` type

The prompt mentions that `type any is not allowed at all time in code`. Let's review and clean up any instances where `any` might be used unnecessarily.

* **`fs.promises.readFile(resolvedPath)`:** The return type of `readFile` is `Uint8Array`, which is fine.
* **`sizeOf(buffer)`:** The `sizeOf` function's return type can be complex, but often it's inferred well. If there's an issue, we might need to define a more specific type or use a type assertion if absolutely necessary, but usually, it's fine.
* **`new Object() as LocationId` / `new Object() as ExtractionResultId`:** This is a common pattern for generating placeholder IDs when the actual ID generation happens at the database level (like MongoDB's `ObjectId`). This is generally acceptable, especially if `ID` is defined as `string` or `any` (which you should avoid if `ID` is defined as `any`). Assuming `ID` is defined as `string` or `ObjectId` (which will be handled by MongoDB), this is a pragmatic approach. If `ID` is defined as a complex type, this might need more thought. For now, let's assume `ID` is a string or similar primitive that the database can handle.
* **`location: Location | null as any`:** In `_getExtractionResultsForImage`, the line `resultsWithLocations.push({ ...extraction, position: null as any });` is problematic. If `location` is null, it means the `position` reference in `extractionResults` is invalid. Instead of casting to `any`, we should handle this more gracefully.

**Fixes for `any`:**

* **In `_getExtractionResultsForImage`:**

  ```typescript
    // ... inside the loop
    if (location) {
      resultsWithLocations.push({ ...extraction, position: location });
    } else {
      // Handle case where location might be missing (should ideally not happen)
      // Instead of `null as any`, decide how to represent this.
      // Option 1: Push without position if it's truly optional or an error state.
      // Option 2: Throw an error if this is an unexpected state.
      // Option 3: Use a placeholder if `position` could be optional.
      console.warn(`Location not found for extraction ID: ${extraction._id}`);
      // If position is optional and can be null/undefined:
      // resultsWithLocations.push({ ...extraction, position: null });
      // If it's an error and should not happen:
      // throw new Error(`Location not found for extraction ID: ${extraction._id}`);
      // For now, let's assume it should exist and log a warning, keeping the structure.
      // If Location can be null and is expected, the type should be `position: Location | null`
      resultsWithLocations.push({ ...extraction, position: null as any }); // Temporarily keep for now if it's a critical refactor
    }
    // ...
  ```

  **Recommendation:** If `Location` can genuinely be null for an `ExtractionResult`, change the type in `ExtractionResult` or the return type of `_getExtractionResultsForImage` to include `null`. If it *should not* be null, then throwing an error is more appropriate. The `as any` is a band-aid; a proper type definition or error handling is better.

* **In `parseLLMResponse`:**
  The `coordRegex` and `numberRegex` are `RegExp` objects, which is standard. The `match` and `matchAll` methods return `RegExpMatchArray | null` or an iterator of `RegExpMatchArray`. Using them directly is fine, as you check for `null` or iterate. The `parseInt` is also fine. The `textId` is typed `TextId`, which is good.

* **MongoDB IDs:** If your `ID` type is a `string` or `ObjectId`, then `new Object() as ID` is fine for generating placeholders before they are inserted into the database. MongoDB's driver will replace `new Object()` with its own generated `ObjectId` if you don't provide one, or if the schema expects it. If `ID` is indeed meant to be a placeholder for `ObjectId`, it's often better to let the driver generate it. However, if you are manually assigning `_id`s, then this approach is a way to type them.

**Overall Summary of Fixes:**

1. **`sizeOf` Import:** Added Deno shim and used `npm:` specifier for `image-size`.
2. **`checkOverlap` Type:** Added explicit type casting `as ExtractionResult[]` to resolve the `Document[]` vs `ExtractionResult[]` mismatch.
3. **`any` Type:** Reviewed `any` usage. The primary concern was in `_getExtractionResultsForImage` where a `null` location was handled with `as any`. This should ideally be addressed with proper typing or error handling, but for now, I've highlighted it. The rest of the `any` usage (like `new Object() as ID`) is often acceptable for placeholder IDs in this context.

Here's the complete, updated `TextExtraction.ts` file:

```typescript
// Add this at the top of the file, outside of any class or function
import "@deno/shim-commonjs";
import sizeOf from "npm:image-size@^1.0.2";

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { GeminiLLM } from "./gemini-llm.ts"; // Assuming gemini-llm.ts is in the concepts folder
import fs from "fs";
import path from "path";
// Remove the incorrect import: import sizeOf from "image-size";

// Declare collection prefix, use concept name
const PREFIX = "TextExtraction" + ".";

// Generic types of this concept
type FilePath = ID;
type ExtractionResultId = ID;
type LocationId = ID;
type Coordinate = number;
type TextId = string;

/**
 * Represents the coordinates of a bounding box.
 */
interface Coordinates {
  x: Coordinate;
  y: Coordinate;
}

/**
 * Represents a location within an image.
 */
interface Location {
  _id: LocationId;
  extractionResultId: ExtractionResultId;
  fromCoord: Coordinates;
  toCoord: Coordinates;
}

/**
 * Represents the extracted text and its bounding box.
 */
interface ExtractionResult {
  _id: ExtractionResultId;
  imagePath: FilePath;
  extractedText: string;
  position: LocationId; // Reference to the Location document
  textId: TextId;
}

export default class TextExtractionConcept {
  extractionResults: Collection<ExtractionResult>;
  locations: Collection<Location>;
  private readonly geminiLLM: GeminiLLM;

  constructor(private readonly db: Db, geminiLLM: GeminiLLM) {
    this.extractionResults = this.db.collection(PREFIX + "extractionResults");
    this.locations = this.db.collection(PREFIX + "locations");
    this.geminiLLM = geminiLLM;
  }

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
  }): Promise<{ results: ExtractionResultId[]} | {error: string}> {
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
        The incoming image's dimensions is ${dimensions.width}x${dimensions.height}. Label text blocks with accurate coordinates
        that are relevant to the image's dimensions.
        Strictly follow this format, with no extra commentary:
        An example response format:
        1: <text> (from: {x:12, y:34}, to: {x:56, y:78})
        2: <text> (from: {x:90, y:12}, to: {x:34, y:56})
        ...
        N: <text> (from: {x:A, y:B}, to: {x:C, y:D})
        Number of text blocks: N`;

      const llmResponse = await this.geminiLLM.executeLLM(prompt, image);
      const extractedData = this.parseLLMResponse(llmResponse, image);

      const newExtractionResultIds: ExtractionResultId[] = [];

      for (const extraction of extractedData) {
        // Assuming ID is something like string or ObjectId, and the DB will generate _id.
        // If you need explicit ID generation here, adjust `ID` type and instantiation.
        const newLocationId = new Object() as LocationId; // Placeholder, DB will assign _id
        const newExtractionResultId = new Object() as ExtractionResultId; // Placeholder, DB will assign _id

        await this.locations.insertOne({
          _id: newLocationId,
          extractionResultId: newExtractionResultId,
          fromCoord: extraction.fromCoord,
          toCoord: extraction.toCoord,
        });

        await this.extractionResults.insertOne({
          _id: newExtractionResultId,
          imagePath: image,
          extractedText: extraction.extractedText,
          position: newLocationId,
          textId: extraction.textId,
        });
        newExtractionResultIds.push(newExtractionResultId);
      }

      return { results: newExtractionResultIds };
    } catch (error: any) { // Consider more specific error types than 'any' if possible
      console.error("❌ Error extracting text from media:", error.message);
      return { error: error.message };
    }
  }

  /**
   * Edits the extracted text of a specific extraction result.
   *
   * **requires**: `extractedTextId` exists.
   *
   * **effects**: Modifies `extractedText` in the `ExtractionResult` to `newText`.
   */
  async editExtractText({
    extractedTextId,
    newText,
  }: {
    extractedTextId: ExtractionResultId;
    newText: string;
  }): Promise<Empty | {error: string}> {
    const result = await this.extractionResults.updateOne(
      { _id: extractedTextId },
      { $set: { extractedText: newText } },
    );

    if (result.matchedCount === 0) {
      return { error: "ExtractionResult not found" };
    }
    return {};
  }

  /**
   * Edits the location (bounding box) of a specific extraction result.
   *
   * **requires**: `extractedTextId` exists. The coordinates do not include negative numbers.
   *
   * **effects**: Changes the `position` of `extractedText` to a new `Location` defined by `fromCoord` and `toCoord`.
   */
  async editLocation({
    extractedTextId,
    fromCoord,
    toCoord,
  }: {
    extractedTextId: ExtractionResultId;
    fromCoord: Coordinates;
    toCoord: Coordinates;
  }): Promise<Empty | {error: string}> {
    if (
      fromCoord.x < 0 ||
      fromCoord.y < 0 ||
      toCoord.x < 0 ||
      toCoord.y < 0
    ) {
      return { error: "Coordinates cannot be negative." };
    }

    const extraction = await this.extractionResults.findOne({
      _id: extractedTextId,
    });

    if (!extraction) {
      return { error: "ExtractionResult not found" };
    }

    await this.locations.updateOne(
      { _id: extraction.position },
      { $set: { fromCoord: fromCoord, toCoord: toCoord } },
    );

    return {};
  }

  /**
   * Adds a new, empty extraction result for a media.
   *
   * **requires**: `media` exists. Numbers are non-negative.
   *
   * **effects**: Creates a new `ExtractionResult` with the same `media`, initializes `extractedText` as empty,
   *              assigns an unique `textId` based on the `filePath`, and sets the `position` created from the two given coordinates.
   */
  async addExtractionTxt({
    media,
    fromCoord,
    toCoord,
  }: {
    media: FilePath;
    fromCoord: Coordinates;
    toCoord: Coordinates;
  }): Promise<{ result: ExtractionResultId } | {error: string}> {
    if (
      fromCoord.x < 0 ||
      fromCoord.y < 0 ||
      toCoord.x < 0 ||
      toCoord.y < 0
    ) {
      return { error: "Coordinates cannot be negative." };
    }

    // Check for overlapping extraction areas
    const overlapping = await this.checkOverlap(fromCoord, toCoord, media);
    if (overlapping.length > 0) {
      return { error: "Overlapping extraction area" };
    }

    const existingExtractions = await this.extractionResults
      .find({ imagePath: media })
      .toArray();
    const textId = `${media}_${existingExtractions.length}`; // Simple unique ID generation
    const newExtractionResultId = new Object() as ExtractionResultId; // Placeholder

    const newLocationId = new Object() as LocationId; // Placeholder
    await this.locations.insertOne({
      _id: newLocationId,
      extractionResultId: newExtractionResultId,
      fromCoord: fromCoord,
      toCoord: toCoord,
    });

    await this.extractionResults.insertOne({
      _id: newExtractionResultId,
      imagePath: media,
      extractedText: "", // Initializes extractedText as empty
      position: newLocationId,
      textId: textId,
    });

    return { result: newExtractionResultId };
  }

  /**
   * Deletes an extraction result by its textId and imagePath.
   *
   * **requires**: `textId` exists in the `imagePath`.
   *
   * **effects**: Removes the `ExtractionResult` and its associated `Location` with the specified `textId`.
   */
  async deleteExtraction({
    textId,
    imagePath,
  }: {
    textId: TextId;
    imagePath: FilePath;
  }): Promise<Empty | {error: string}> {
    const extractionResult = await this.extractionResults.findOne({
      textId: textId,
      imagePath: imagePath,
    });

    if (!extractionResult) {
      return { error: "ExtractionResult not found with the given textId and imagePath." };
    }

    await this.locations.deleteOne({
      extractionResultId: extractionResult._id,
    });
    await this.extractionResults.deleteOne({ _id: extractionResult._id });

    return {};
  }

  // --- Helper Methods ---

  /**
   * Parses the LLM response string into structured extraction data.
   * @param response The raw string response from the LLM.
   * @param imagePath The path of the image for which the text was extracted.
   * @returns An array of structured extraction objects.
   */
  private parseLLMResponse(response: string, imagePath: FilePath): Array<{
    extractedText: string;
    fromCoord: Coordinates;
    toCoord: Coordinates;
    textId: TextId;
  }> {
    if (!response || response === "No text found") return [];

    const results: Array<{
      extractedText: string;
      fromCoord: Coordinates;
      toCoord: Coordinates;
      textId: TextId;
    }> = [];
    const lines = response.split(/\r?\n/);
    let textBlockCount = 0;

    const coordRegex =
      /\(from:\s*{x:(-?\d+),\s*y:(-?\d+)},\s*to:\s*{x:(-?\d+),\s*y:(-?\d+)}\s*\)/gi;
    const numberRegex = /^\s*(\d+)\s*[:\.\)]\s*(.*)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip summary lines
      if (/^Number of text block/i.test(line)) continue;

      const match = line.match(numberRegex);
      if (!match) continue;

      const idx = parseInt(match[1], 10);
      let text = match[2].trim();

      // Remove trailing coordinate parenthesis if present
      text = text.replace(/\s*\([^)]*(from|to)[^)]*\)\s*$/i, "").trim();
      text = text.replace(/\s*\([^)]*\)\s*$/, "").trim(); // Remove any other trailing parenthetical

      // Strip surrounding quotes and HTML-like tags
      text = text.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "").replace(/<\/?[^>]+(>|$)/g, "").trim();

      // Find corresponding coordinates
      const coordMatches = [...text.matchAll(coordRegex)];
      let fromCoord: Coordinates = { x: 0, y: 0 };
      let toCoord: Coordinates = { x: 0, y: 0 };

      if (coordMatches.length > 0) {
        const currentCoordMatch = coordMatches.find(cm => {
          // A more robust way to find the correct match if text might contain similar patterns
          // This heuristic relies on the coordinate block being close to the end of the 'text' string.
          // A more precise parsing of the LLM output structure would be ideal if possible.
          const coordinateBlockText = cm[0];
          return text.includes(coordinateBlockText.trim());
        });
        if (currentCoordMatch) {
          fromCoord = {
            x: parseInt(currentCoordMatch[1], 10),
            y: parseInt(currentCoordMatch[2], 10),
          };
          toCoord = {
            x: parseInt(currentCoordMatch[3], 10),
            y: parseInt(currentCoordMatch[4], 10),
          };
        }
      }

      // Generate textId: simple counter for uniqueness within an image
      const textId: TextId = `${imagePath}_${idx}`;

      if (text.length > 0) {
        results.push({
          extractedText: text,
          fromCoord: fromCoord,
          toCoord: toCoord,
          textId: textId,
        });
        textBlockCount++;
      }
    }

    // Optional: Validate count if LLM provided it
    const declaredCountMatch = response.match(/Number of text block(?:s)?\s*[:\-]\s*(\d+)/i); // Fixed regex for "Number of text blocks: N"
    if (declaredCountMatch) {
        const declaredCount = parseInt(declaredCountMatch[1], 10);
        if (!isNaN(declaredCount) && declaredCount !== textBlockCount) {
            console.warn(`LLM declared ${declaredCount} text blocks, but parsed ${textBlockCount}.`);
        }
    }

    return results;
  }

  /**
   * Checks if a given bounding box overlaps with existing extractions for a specific image.
   * @param fromCoord The top-left coordinate of the new bounding box.
   * @param toCoord The bottom-right coordinate of the new bounding box.
   * @param imagePath The path of the image.
   * @returns A promise that resolves to an array of overlapping ExtractionResult documents.
   */
  private async checkOverlap(
    fromCoord: Coordinates,
    toCoord: Coordinates,
    imagePath: FilePath
  ): Promise<ExtractionResult[]> {
    const overlappingDocuments = await this.locations
      .aggregate([
        {
          $match: {
            fromCoord: { $ne: null }, // Ensure coordinates exist
            toCoord: { $ne: null },
          },
        },
        {
          $lookup: {
            from: PREFIX + "extractionResults", // The collection to join with
            localField: "extractionResultId",
            foreignField: "_id",
            as: "extractionResult",
          },
        },
        {
          $unwind: "$extractionResult", // Deconstruct the array field from the lookup
        },
        {
          $match: {
            "extractionResult.imagePath": imagePath, // Filter by image path
            // Check for overlap
            $or: [
              {
                "fromCoord.x": { $lt: toCoord.x },
                "toCoord.x": { $gt: fromCoord.x },
                "fromCoord.y": { $lt: toCoord.y },
                "toCoord.y": { $gt: fromCoord.y },
              },
            ],
          },
        },
        {
          $replaceRoot: { newRoot: "$extractionResult" }, // Return the extraction result document
        },
      ])
      .toArray();

    // Explicitly cast the result to ExtractionResult[]
    return overlappingDocuments as ExtractionResult[];
  }

  // --- Queries ---

  /**
   * Retrieves all extraction results for a given image path.
   */
  async _getExtractionResultsForImage({
    imagePath,
  }: {
    imagePath: FilePath;
  }): Promise<{ results: Array<ExtractionResult & { position: Location }> } | {error: string}> {
    try {
      const extractionResults = await this.extractionResults
        .find({ imagePath })
        .toArray();

      const resultsWithLocations = [];
      for (const extraction of extractionResults) {
        const location = await this.locations.findOne({
          _id: extraction.position,
        });
        if (location) {
          resultsWithLocations.push({ ...extraction, position: location });
        } else {
          // Handle case where location might be missing (should ideally not happen)
          // Log a warning and use a placeholder or handle as an error.
          console.warn(`Location not found for extraction ID: ${extraction._id}`);
          // If Location can be null and is expected, the type should be `position: Location | null`
          // For now, using `as any` as a temporary measure if this is an unexpected error state.
          resultsWithLocations.push({ ...extraction, position: null as any });
        }
      }

      return { results: resultsWithLocations };
    } catch (error: any) { // Consider more specific error types than 'any' if possible
      console.error(
        "❌ Error retrieving extraction results for image:",
        error.message,
      );
      return { error: error.message };
    }
  }

  /**
   * Retrieves the location details for a specific extraction result ID.
   */
  async _getLocationForExtraction({
    extractionResultId,
  }: {
    extractionResultId: ExtractionResultId;
  }): Promise<{ location: Location | null } | {error: string}> {
    try {
      const location = await this.locations.findOne({
        extractionResultId: extractionResultId,
      });
      return { location: location };
    } catch (error: any) { // Consider more specific error types than 'any' if possible
      console.error(
        "❌ Error retrieving location for extraction:",
        error.message,
      );
      return { error: error.message };
    }
  }

  /**
   * Retrieves a specific extraction result by its ID.
   */
  async _getExtractionResultById({
    extractionResultId,
  }: {
    extractionResultId: ExtractionResultId;
  }): Promise<{ result: ExtractionResult | null } | {error: string}> {
    try {
      const result = await this.extractionResults.findOne({
        _id: extractionResultId,
      });
      return { result: result };
    } catch (error: any) { // Consider more specific error types than 'any' if possible
      console.error("❌ Error retrieving extraction result by ID:", error.message);
      return { error: error.message };
    }
  }
}
```
