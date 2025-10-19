---
timestamp: 'Sun Oct 19 2025 00:31:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_003137.bc39859c.md]]'
content_id: e6d26095f5a454ad70807485254da25222ca106fff8c8f708ca3e042305bf691
---

# file: src/concepts/TextExtractionConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, freshID } from "@utils/types.ts";
import { GeminiLLM } from "../llm/gemini-llm.ts"; // Assuming gemini-llm.ts is in ../llm/
import fs from "fs";
import path from "path";
import sizeOf from "image-size";

// Declare collection prefix, use concept name
const PREFIX = "TextExtraction" + ".";

// --- Type Definitions ---

// Generic types of this concept
type FilePath = ID;
type ExtractionResultId = ID;
type LocationId = ID;
type TextId = string;
type Coordinate = number;

/**
 * Represents coordinates for a bounding box.
 */
interface Coordinates {
  x: Coordinate;
  y: Coordinate;
}

/**
 * Represents a single extracted text block from an image.
 */
interface ExtractionResultsDoc {
  _id: ExtractionResultId;
  imagePath: FilePath;
  textId: TextId;
  extractedText: string;
  position: LocationId; // Foreign key to Locations collection
}

/**
 * Represents the location (bounding box) of an extracted text block.
 */
interface LocationsDoc {
  _id: LocationId;
  extractionResultId: ExtractionResultId; // Foreign key to ExtractionResults collection
  fromCoord: Coordinates;
  toCoord: Coordinates;
}

// --- Concept Implementation ---

export default class TextExtractionConcept {
  private extractionResults: Collection<ExtractionResultsDoc>;
  private locations: Collection<LocationsDoc>;
  private geminiLLM: GeminiLLM; // Instance of GeminiLLM

  constructor(private readonly db: Db, geminiApiKey: string) {
    this.extractionResults = this.db.collection(PREFIX + "extractionResults");
    this.locations = this.db.collection(PREFIX + "locations");
    this.geminiLLM = new GeminiLLM({ apiKey: geminiApiKey });
  }

  // --- Helper to generate unique textId for a given image path ---
  private async generateUniqueTextId(imagePath: FilePath): Promise<TextId> {
    const count = await this.extractionResults.countDocuments({ imagePath });
    return `${imagePath}_${count}`;
  }

  // --- Helper to parse LLM response ---
  // These helpers are adapted from the provided 'different file'
  private parseNumberedTextList(response: string): { idx: number; text: string }[] {
    if (!response || response === "No text found") return [];

    const items: Array<{ idx: number; text: string }> = [];
    const lines = response.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (/^Number of text block/i.test(line)) continue;

      const m = line.match(/^\s*(\d+)\s*[:\.\)]\s*(.*)$/);
      if (!m) continue;

      const idx = parseInt(m[1], 10);
      let text = m[2].trim();

      // Remove trailing coordinate parenthesis if present
      text = text.replace(/\s*\([^)]*(from|to)[^)]*\)\s*$/i, '').trim();
      text = text.replace(/\s*\([^)]*\)\s*$/, '').trim();

      text = text.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').replace(/<\/?[^>]+(>|$)/g, '').trim();

      if (text.length > 0) items.push({ idx, text });
    }

    items.sort((a, b) => a.idx - b.idx);
    return items;
  }

  private parseCoordinatesList(response: string): { fromCoord: Coordinates; toCoord: Coordinates }[] {
    const coordRegex =
      /(\s*from:\s\*{x:(-?\d+),\s*y:(-?\d+)},\s*to:\s\*{x:(-?\d+),\s*y:(-?\d+)}\s*)/g;

    const matches = [...response.matchAll(coordRegex)];
    const results = matches.map(match => ({
      fromCoord: { x: parseInt(match[2], 10), y: parseInt(match[3], 10) }, // Indices 2 and 3 for x and y of fromCoord
      toCoord: { x: parseInt(match[4], 10), y: parseInt(match[5], 10) }, // Indices 4 and 5 for x and y of toCoord
    }));
    return results;
  }

  // --- Actions ---

  /**
   * extractTextFromMedia (image: FilePath): (result: ExtractionResultId)
   *
   * **requires**: `image` exists in application and accessible.
   *
   * **effects**: Creates a new `ExtractionResult` associated with the `image`, with the same `imagePath` string stored. `extractedText` will be the text the AI recognizes at `position`, and an unique `textId` is assigned out of all `ExtractionResult`s with the same `imagePath` because the same image can have many same words at different locations.
   */
  async extractTextFromMedia({
    image,
  }: {
    image: FilePath;
  }): Promise<{ result: ExtractionResultId }> {
    // Ensure image exists and get dimensions
    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(image as unknown as fs.PathOrFileDescriptor); // Cast to fs.PathOrFileDescriptor
    } catch (error) {
      console.error(`❌ Error reading image file: ${image}`, error);
      return { error: `Image file not found or could not be read: ${image}` };
    }

    let dimensions: { width?: number; height?: number };
    try {
      dimensions = sizeOf(buffer);
      if (!dimensions.width || !dimensions.height) {
        throw new Error("Unable to determine image dimensions");
      }
    } catch (error) {
      console.error(`❌ Error processing image dimensions for: ${image}`, error);
      return { error: "Unable to determine image dimensions." };
    }

    // Compose LLM prompt
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

    let llmResponse: string;
    try {
      llmResponse = await this.geminiLLM.executeLLM(prompt, image);
    } catch (error) {
      console.error(`❌ Error calling Gemini API for ${image}:`, (error as Error).message);
      return { error: `LLM API error: ${(error as Error).message}` };
    }

    const parsedTextItems = this.parseNumberedTextList(llmResponse);
    const parsedCoordinates = this.parseCoordinatesList(llmResponse);

    if (parsedTextItems.length === 0 && !llmResponse.includes("No text found")) {
      return { error: "LLM returned an unexpected response format or no text." };
    }

    // Process results and save to MongoDB
    for (let i = 0; i < parsedTextItems.length; i++) {
      const textItem = parsedTextItems[i];
      const coords = parsedCoordinates[i] || { fromCoord: { x: 0, y: 0 }, toCoord: { x: 0, y: 0 } }; // Default if no coords found

      const newExtractionResultId = freshID() as ExtractionResultId;
      const newLocationId = freshID() as LocationId;

      // Generate a unique textId for this specific extraction
      const textId = await this.generateUniqueTextId(image);

      try {
        // Save location
        await this.locations.insertOne({
          _id: newLocationId,
          extractionResultId: newExtractionResultId,
          fromCoord: coords.fromCoord,
          toCoord: coords.toCoord,
        });

        // Save extraction result
        await this.extractionResults.insertOne({
          _id: newExtractionResultId,
          imagePath: image,
          textId: textId, // Use the generated unique ID
          extractedText: textItem.text,
          position: newLocationId,
        });
      } catch (dbError: any) {
        console.error(`❌ Database error saving extraction for ${image}:`, dbError.message);
        // Attempt to clean up partially inserted data
        await this.locations.deleteOne({ _id: newLocationId });
        await this.extractionResults.deleteOne({ _id: newExtractionResultId });
        return { error: `Database error: ${dbError.message}` };
      }
    }

    // If no text was found by LLM, ensure no documents are inserted but return success
    if (parsedTextItems.length === 0 && llmResponse.includes("No text found")) {
      return { result: freshID() }; // Return a dummy ID to indicate operation success but no extraction
    }

    // Return the ID of the first extracted result, or a dummy ID if none were extracted
    const firstResultId = parsedTextItems.length > 0 ? (await this.extractionResults.findOne({ imagePath: image, textId: await this.generateUniqueTextId(image) }, { sort: { _id: 1 } }))._id : freshID();
    return { result: firstResultId };
  }


  /**
   * editExtractText (extractionResultId: ExtractionResultId, newText: string)
   *
   * **requires**: `extractionResultId` exists.
   *
   * **effects**: Modifies `extractedText` in the `ExtractionResult` to `newText`.
   */
  async editExtractText({
    extractionResultId,
    newText,
  }: {
    extractionResultId: ExtractionResultId;
    newText: string;
  }): Promise<Empty> {
    const result = await this.extractionResults.updateOne(
      { _id: extractionResultId },
      { $set: { extractedText: newText } },
    );

    if (result.matchedCount === 0) {
      return { error: "ExtractionResult not found" };
    }
    return {};
  }

  /**
   * editLocation (extractionResultId: ExtractionResultId, fromCoord: Coordinates, toCoord: Coordinates)
   *
   * **requires**: `extractionResultId` exists. The coordinates do not include negative numbers.
   *
   * **effects**: Changes the `position` of `extractedText` to a new `Location` defined by `fromCoord` and `toCoord`, which specifies the area of the image that the `extractedText` occupies if a rectangle is drawn from `fromCoord` to `toCoord`.
   */
  async editLocation({
    extractionResultId,
    fromCoord,
    toCoord,
  }: {
    extractionResultId: ExtractionResultId;
    fromCoord: Coordinates;
    toCoord: Coordinates;
  }): Promise<Empty> {
    if (
      fromCoord.x < 0 || fromCoord.y < 0 ||
      toCoord.x < 0 || toCoord.y < 0
    ) {
      return { error: "Coordinates cannot be negative." };
    }

    // Find the locationId associated with the extractionResultId
    const extraction = await this.extractionResults.findOne({ _id: extractionResultId });

    if (!extraction) {
      return { error: "ExtractionResult not found." };
    }

    const result = await this.locations.updateOne(
      { _id: extraction.position },
      { $set: { fromCoord: fromCoord, toCoord: toCoord } },
    );

    if (result.matchedCount === 0) {
      // This indicates the location associated with the extraction was not found.
      // It might be a data integrity issue.
      return { error: "Associated Location not found for the given ExtractionResult." };
    }
    return {};
  }

  /**
   * addExtractionTxt (media: FilePath, fromCoord: Coordinates, toCoord: Coordinates): (result: ExtractionResultId)
   *
   * **requires**: `media` exists. Numbers are non-negative.
   *
   * **effects**: Creates a new `ExtractionResult` with the same `media`, initializes `extractedText` as empty, assigns an unique `textId` based on the `filePath`, and sets the `position` created from the two given coordinates.
   */
  async addExtractionTxt({
    media,
    fromCoord,
    toCoord,
  }: {
    media: FilePath;
    fromCoord: Coordinates;
    toCoord: Coordinates;
  }): Promise<{ result: ExtractionResultId }> {
    if (
      fromCoord.x < 0 || fromCoord.y < 0 ||
      toCoord.x < 0 || toCoord.y < 0
    ) {
      return { error: "Coordinates cannot be negative." };
    }

    const newExtractionResultId = freshID() as ExtractionResultId;
    const newLocationId = freshID() as LocationId;
    const textId = await this.generateUniqueTextId(media); // Generate unique ID

    try {
      // Save location
      await this.locations.insertOne({
        _id: newLocationId,
        extractionResultId: newExtractionResultId,
        fromCoord: fromCoord,
        toCoord: toCoord,
      });

      // Save extraction result with empty extractedText
      await this.extractionResults.insertOne({
        _id: newExtractionResultId,
        imagePath: media,
        textId: textId,
        extractedText: "", // Initializes extractedText as empty
        position: newLocationId,
      });
    } catch (dbError: any) {
      console.error(`❌ Database error adding extraction for ${media}:`, dbError.message);
      // Attempt to clean up partially inserted data
      await this.locations.deleteOne({ _id: newLocationId });
      await this.extractionResults.deleteOne({ _id: newExtractionResultId });
      return { error: `Database error: ${dbError.message}` };
    }

    return { result: newExtractionResultId };
  }

  /**
   * deleteExtraction (textId: String, imagePath: FilePath)
   *
   * **requires**: `textId` exists in the `imagePath`.
   *
   * **effects**: Removes the `ExtractionResult` with the specified `textId`.
   */
  async deleteExtraction({
    textId,
    imagePath,
  }: {
    textId: TextId;
    imagePath: FilePath;
  }): Promise<Empty> {
    const extractionResult = await this.extractionResults.findOne({
      textId: textId,
      imagePath: imagePath,
    });

    if (!extractionResult) {
      return { error: "ExtractionResult not found with the given textId and imagePath." };
    }

    // Remove the associated location first
    try {
      await this.locations.deleteOne({
        extractionResultId: extractionResult._id,
      });
      // Then remove the extraction result
      await this.extractionResults.deleteOne({ _id: extractionResult._id });
    } catch (dbError: any) {
      console.error(`❌ Database error deleting extraction for ${imagePath} (textId: ${textId}):`, dbError.message);
      return { error: `Database error during deletion: ${dbError.message}` };
    }

    return {};
  }

  // --- Helper Queries (for testing and verification) ---

  /**
   * _getExtractionResultsForImage (imagePath: FilePath): (results: ExtractionResultsDoc[])
   * Returns all extraction results for a given image path.
   */
  async _getExtractionResultsForImage({
    imagePath,
  }: {
    imagePath: FilePath;
  }): Promise<{ results: ExtractionResultsDoc[] }> {
    try {
      const results = await this.extractionResults.find({ imagePath }).toArray();
      return { results };
    } catch (error) {
      console.error(`❌ Database error in _getExtractionResultsForImage for ${imagePath}:`, error);
      return { error: `Database query error: ${(error as Error).message}` };
    }
  }

  /**
   * _getLocationForExtraction (extractionResultId: ExtractionResultId): (location: LocationsDoc[])
   * Returns the location details for a specific extraction result.
   */
  async _getLocationForExtraction({
    extractionResultId,
  }: {
    extractionResultId: ExtractionResultId;
  }): Promise<{ location: LocationsDoc[] }> {
    try {
      const location = await this.locations.find({ extractionResultId: extractionResultId }).toArray();
      return { location };
    } catch (error) {
      console.error(`❌ Database error in _getLocationForExtraction for ${extractionResultId}:`, error);
      return { error: `Database query error: ${(error as Error).message}` };
    }
  }

  /**
   * _getAllExtractions(): (extractions: ExtractionResultsDoc[])
   * Returns all extraction results in the collection.
   */
  async _getAllExtractions(): Promise<{ extractions: ExtractionResultsDoc[] }> {
    try {
      const extractions = await this.extractionResults.find({}).toArray();
      return { extractions };
    } catch (error) {
      console.error("❌ Database error in _getAllExtractions:", error);
      return { error: `Database query error: ${(error as Error).message}` };
    }
  }

  /**
   * _getAllLocations(): (locations: LocationsDoc[])
   * Returns all location documents in the collection.
   */
  async _getAllLocations(): Promise<{ locations: LocationsDoc[] }> {
    try {
      const locations = await this.locations.find({}).toArray();
      return { locations };
    } catch (error) {
      console.error("❌ Database error in _getAllLocations:", error);
      return { error: `Database query error: ${(error as Error).message}` };
    }
  }
}
```
