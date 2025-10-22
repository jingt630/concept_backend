import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM } from "../../../gemini-llm.ts";

// Declare collection prefix, use concept name
const PREFIX = "TextExtraction" + ".";

// Generic types of this concept
type FilePath = ID;
type ExtractionResult = ID;
type Location = ID;
type Coordinate = number;
type TextId = string;

/**
 * A set of ExtractionResults with
 *   imagePath of type FilePath
 *   extractedText of type String
 *   position of type Location
 *   textId of type String
 */
interface ExtractionResults {
  _id: ExtractionResult;
  imagePath: FilePath;
  extractedText: string;
  position: Location;
  textId: TextId;
}

/**
 * A set of Location with
 *   an ExtractionResult
 *   two Coordinate (Number, Number)
 */
interface Locations {
  _id: Location;
  extractionResultId: ExtractionResult;
  fromCoord: [Coordinate, Coordinate];
  toCoord: [Coordinate, Coordinate];
}

export default class TextExtractionConcept {
  extractionResults: Collection<ExtractionResults>;
  locations: Collection<Locations>;
  mediaFiles: Collection<any>; // Reference to MediaManagement collection
  private geminiLLM: GeminiLLM;

  constructor(private readonly db: Db) {
    this.extractionResults = this.db.collection(PREFIX + "extractionResults");
    this.locations = this.db.collection(PREFIX + "locations");
    this.mediaFiles = this.db.collection("MediaManagement.mediaFiles");
    this.geminiLLM = new GeminiLLM();
  }

  /**
   * Get image dimensions from file
   */
  private async getImageDimensions(
    filePath: string,
  ): Promise<{ width: number; height: number }> {
    try {
      // For simplicity, we'll use default dimensions if we can't determine
      // In a real implementation, you'd use an image library to read dimensions
      return { width: 1024, height: 768 }; // Default dimensions
    } catch (error) {
      console.warn("⚠️ Could not determine image dimensions, using defaults");
      return { width: 1024, height: 768 };
    }
  }

  /**
   * Parse numbered text list from Gemini response
   */
  private parseNumberedTextList(response: string): string[] {
    if (!response || response === "No text found") return [];

    const items: Array<{ idx: number; text: string }> = [];
    const lines = response.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip the final summary line
      if (/^Number of text block/i.test(line)) continue;

      // Match "1: text", "1. text", "1) text"
      const m = line.match(/^\s*(\d+)\s*[:\.\)]\s*(.*)$/);
      if (!m) continue;

      const idx = parseInt(m[1], 10);
      let text = m[2].trim();

      // Remove trailing coordinate parenthesis
      text = text.replace(/\s*\([^)]*(from|to)[^)]*\)\s*$/i, "").trim();
      text = text.replace(/\s*\([^)]*\)\s*$/, "").trim();

      // Strip surrounding quotes and HTML-like tags
      text = text.replace(/^["'""''\s]+|["'""''\s]+$/g, "").replace(
        /<\/?[^>]+(>|$)/g,
        "",
      ).trim();

      if (text.length > 0) items.push({ idx, text });
    }

    if (items.length === 0) return [];

    items.sort((a, b) => a.idx - b.idx);
    return items.map((p) => p.text);
  }

  /**
   * Parse coordinates list from Gemini response
   */
  private parseCoordinatesList(
    response: string,
  ): Array<
    { fromCoord: [Coordinate, Coordinate]; toCoord: [Coordinate, Coordinate] }
  > {
    const coordRegex =
      /\(\s*from:\s*\{x:(-?\d+),\s*y:(-?\d+)\},\s*to:\s*\{x:(-?\d+),\s*y:(-?\d+)\}\s*\)/g;

    const matches = [...response.matchAll(coordRegex)];
    const results = matches.map((match) => ({
      fromCoord: [parseInt(match[1], 10), parseInt(match[2], 10)] as [
        Coordinate,
        Coordinate,
      ],
      toCoord: [parseInt(match[3], 10), parseInt(match[4], 10)] as [
        Coordinate,
        Coordinate,
      ],
    }));

    return results;
  }

  /**
   * Helper function to get full file path
   */
  private getImagePath(userId: ID, mediaFile: any): string {
    // Build path and remove any double slashes
    const rawPath =
      `./uploads/${userId}${mediaFile.filePath}/${mediaFile.filename}`;

    // Replace multiple slashes with single slash (but keep ./ at the beginning)
    const normalizedPath = rawPath.replace(/([^:]\/)\/+/g, "$1");

    console.log(`📂 Constructed path: ${normalizedPath}`);
    return normalizedPath;
  }

  /**
   * extractTextFromMedia (userId: ID, mediaId: ID, prompt?: string): (result: ExtractionResult)
   *
   * **requires**: `mediaId` exists in MediaManagement and belongs to `userId`.
   *
   * **effects**: Uses AI (Google Gemini) to extract text from the image with coordinates. Creates multiple `ExtractionResult` objects for each text block found.
   */
  async extractTextFromMedia({
    userId,
    mediaId,
  }: {
    userId: ID;
    mediaId: ID;
  }): Promise<{ results: ExtractionResult[] } | { error: string }> {
    // Get the media file from MediaManagement
    const mediaFile = await this.mediaFiles.findOne({
      _id: mediaId,
      owner: userId,
    });

    if (!mediaFile) {
      return { error: "Media file not found or access denied" };
    }

    try {
      console.log(
        `🤖 Starting Gemini AI text extraction for: ${mediaFile.filename}`,
      );

      // Get full image path
      const imagePath = this.getImagePath(userId, mediaFile);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(imagePath);
      console.log(
        `📐 Image dimensions: ${dimensions.width}x${dimensions.height}`,
      );

      // Build the OCR prompt
      const ocrPrompt =
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

      // Call Gemini AI
      const aiResponse = await this.geminiLLM.executeLLM(ocrPrompt, imagePath);
      console.log(`✅ Gemini extraction complete`);

      // Parse the response
      const textBlocks = this.parseNumberedTextList(aiResponse);
      const coordinates = this.parseCoordinatesList(aiResponse);

      console.log(`📝 Found ${textBlocks.length} text blocks`);

      // Create extraction results for each text block
      const extractionIds: ExtractionResult[] = [];

      for (let i = 0; i < textBlocks.length; i++) {
        const existingExtractions = await this.extractionResults
          .find({ imagePath: mediaId })
          .toArray();
        const textId = `${mediaId}_${existingExtractions.length}`;
        const newExtractionResultId = freshID() as ExtractionResult;

        // Get coordinates or use defaults
        const coords = coordinates[i] || {
          fromCoord: [0, 0] as [Coordinate, Coordinate],
          toCoord: [100, 100] as [Coordinate, Coordinate],
        };

        // Create location
        const newLocationId = freshID() as Location;
        await this.locations.insertOne({
          _id: newLocationId,
          extractionResultId: newExtractionResultId,
          fromCoord: coords.fromCoord,
          toCoord: coords.toCoord,
        });

        // Store the extraction result
        await this.extractionResults.insertOne({
          _id: newExtractionResultId,
          imagePath: mediaId,
          extractedText: textBlocks[i],
          position: newLocationId,
          textId: textId,
        });

        extractionIds.push(newExtractionResultId);
      }

      console.log(`✅ Created ${extractionIds.length} extraction records`);
      return { results: extractionIds };
    } catch (error) {
      console.error("❌ Error in extractTextFromMedia:", error);
      return { error: "error.message" };
    }
  }

  /**
   * editExtractText (userId: ID, extractionId: ExtractionResult, newText: String)
   *
   * **requires**: `extractionId` exists and belongs to user.
   *
   * **effects**: Modifies `extractedText` in the `ExtractionResult` to `newText`.
   */
  async editExtractText({
    userId,
    extractionId,
    newText,
  }: {
    userId: ID;
    extractionId: ExtractionResult;
    newText: string;
  }): Promise<Empty | { error: string }> {
    // Verify ownership through mediaFile
    const extraction = await this.extractionResults.findOne({
      _id: extractionId,
    });
    if (!extraction) {
      return { error: "ExtractionResult not found" };
    }

    const mediaFile = await this.mediaFiles.findOne({
      _id: extraction.imagePath,
      owner: userId,
    });

    if (!mediaFile) {
      return { error: "Access denied" };
    }

    const oldText = extraction.extractedText;

    // Update the extraction text
    const result = await this.extractionResults.updateOne(
      { _id: extractionId },
      { $set: { extractedText: newText } },
    );

    if (result.matchedCount === 0) {
      return { error: "ExtractionResult not found" };
    }

    console.log(`✅ Updated extraction text from "${oldText}" to "${newText}"`);

    // AUTO-SYNC: Update all existing translations for this text
    if (extraction.textId) {
      console.log(`🔄 Auto-syncing translations for textId: ${extraction.textId}`);
      await this.syncTranslationsForText(extraction.textId, newText);
    }

    return {};
  }

  /**
   * syncTranslationsForText - Auto-updates all translations when original text changes
   *
   * @param textId - The textId of the extraction
   * @param newText - The new original text
   */
  private async syncTranslationsForText(textId: string, newText: string): Promise<void> {
    try {
      const translationsCollection = this.db.collection("Translation.translations");

      // Find all translations for this textId
      const translations = await translationsCollection.find({
        originalTextId: textId
      }).toArray();

      if (translations.length === 0) {
        console.log(`ℹ️ No translations found for textId: ${textId}, skipping sync`);
        return;
      }

      console.log(`🔍 Found ${translations.length} translations to sync`);

      // Language mapping for better prompts
      const languageNames: Record<string, string> = {
        'en': 'English',
        'es': 'Spanish',
        'zh': 'Chinese',
        'ja': 'Japanese'
      };

      // Re-translate for each existing translation
      for (const translation of translations) {
        const targetLanguageName = languageNames[translation.targetLanguage] || translation.targetLanguage;

        console.log(`🌐 Re-translating to ${targetLanguageName}...`);

        const prompt = `You are a professional translator. Translate the following text to ${targetLanguageName}.

Original text: "${newText}"

Requirements:
- Provide ONLY the translated text
- No explanations or notes
- Maintain the original meaning and tone
- If it's already in ${targetLanguageName}, just return the original text

Translation:`;

        try {
          const translatedText = await this.geminiLLM.executeLLM(prompt);

          // Update the translation
          await translationsCollection.updateOne(
            { _id: translation._id },
            { $set: { translatedText: translatedText.trim() } }
          );

          console.log(`✅ Updated ${translation.targetLanguage} translation: "${translatedText.trim()}"`);
        } catch (error) {
          console.error(`❌ Failed to re-translate to ${translation.targetLanguage}:`, error);
          // Continue with other translations even if one fails
        }
      }

      console.log(`🎉 Translation sync complete for textId: ${textId}`);
    } catch (error) {
      console.error(`❌ Error syncing translations:`, error);
      // Don't throw - we don't want to fail the edit if sync fails
    }
  }

  /**
   * editLocation (userId: ID, extractionId: ExtractionResult, fromCoord: Coordinate, toCoord: Coordinate)
   *
   * **requires**: `extractionId` exists and belongs to user. The coordinates do not include negative numbers.
   *
   * **effects**: Changes the `position` of extraction to a new `Location` defined by `fromCoord` and `toCoord`.
   */
  async editLocation({
    userId,
    extractionId,
    fromCoord,
    toCoord,
  }: {
    userId: ID;
    extractionId: ExtractionResult;
    fromCoord: [Coordinate, Coordinate];
    toCoord: [Coordinate, Coordinate];
  }): Promise<Empty | { error: string }> {
    if (
      fromCoord.some((c) => c < 0) ||
      toCoord.some((c) => c < 0)
    ) {
      return { error: "Coordinates cannot be negative." };
    }

    const extraction = await this.extractionResults.findOne({
      _id: extractionId,
    });

    if (!extraction) {
      return { error: "ExtractionResult not found" };
    }

    // Verify ownership
    const mediaFile = await this.mediaFiles.findOne({
      _id: extraction.imagePath,
      owner: userId,
    });

    if (!mediaFile) {
      return { error: "Access denied" };
    }

    await this.locations.updateOne(
      { _id: extraction.position },
      { $set: { fromCoord: fromCoord, toCoord: toCoord } },
    );

    return {};
  }

  /**
   * addExtractionTxt (userId: ID, mediaId: ID, text: string, location: object): (result: ExtractionResult)
   *
   * **requires**: `mediaId` exists and belongs to user. Coordinates are non-negative.
   *
   * **effects**: Creates a new `ExtractionResult` with the given text and location.
   */
  async addExtractionTxt({
    userId,
    mediaId,
    text,
    location,
  }: {
    userId: ID;
    mediaId: ID;
    text: string;
    location: { x: number; y: number; width: number; height: number };
  }): Promise<{ result: ExtractionResult } | { error: string }> {
    // Verify ownership
    const mediaFile = await this.mediaFiles.findOne({
      _id: mediaId,
      owner: userId,
    });

    if (!mediaFile) {
      return { error: "Media file not found or access denied" };
    }

    // Convert location to coordinates
    const fromCoord: [Coordinate, Coordinate] = [location.x, location.y];
    const toCoord: [Coordinate, Coordinate] = [
      location.x + location.width,
      location.y + location.height,
    ];

    if (
      fromCoord.some((c) => c < 0) ||
      toCoord.some((c) => c < 0)
    ) {
      return { error: "Coordinates cannot be negative." };
    }

    const existingExtractions = await this.extractionResults
      .find({ imagePath: mediaId })
      .toArray();
    const textId = `${mediaId}_${existingExtractions.length}`;
    const newExtractionResultId = freshID() as ExtractionResult;

    const newLocationId = freshID() as Location;
    await this.locations.insertOne({
      _id: newLocationId,
      extractionResultId: newExtractionResultId,
      fromCoord: fromCoord,
      toCoord: toCoord,
    });

    await this.extractionResults.insertOne({
      _id: newExtractionResultId,
      imagePath: mediaId,
      extractedText: text,
      position: newLocationId,
      textId: textId,
    });

    return { result: newExtractionResultId };
  }

  /**
   * deleteExtraction (userId: ID, extractionId: ExtractionResult)
   *
   * **requires**: `extractionId` exists and belongs to user.
   *
   * **effects**: Removes the `ExtractionResult` and its associated location.
   */
  async deleteExtraction({
    userId,
    extractionId,
  }: {
    userId: ID;
    extractionId: ExtractionResult;
  }): Promise<Empty | { error: string }> {
    const extractionResult = await this.extractionResults.findOne({
      _id: extractionId,
    });

    if (!extractionResult) {
      return { error: "ExtractionResult not found" };
    }

    // Verify ownership
    const mediaFile = await this.mediaFiles.findOne({
      _id: extractionResult.imagePath,
      owner: userId,
    });

    if (!mediaFile) {
      return { error: "Access denied" };
    }

    await this.locations.deleteOne({
      extractionResultId: extractionResult._id,
    });
    await this.extractionResults.deleteOne({ _id: extractionResult._id });

    return {};
  }

  // --- Helper Queries (for testing and verification) ---

  /**
   * _getExtractionResultsForImage (userId: ID, mediaId: ID): ExtractionResults[]
   * Returns all extraction results for a given media file.
   */
  async _getExtractionResultsForImage({
    userId,
    mediaId,
  }: {
    userId: ID;
    mediaId: ID;
  }): Promise<ExtractionResults[] | { error: string }> {
    // Verify ownership
    const mediaFile = await this.mediaFiles.findOne({
      _id: mediaId,
      owner: userId,
    });

    if (!mediaFile) {
      console.log("media requested for the user isn't found");
      return { error: "Media file not found or access denied" } as any;
    }

    const results = await this.extractionResults.find({ imagePath: mediaId })
      .toArray();
    return results;
  }

  /**
   * _getLocationForExtraction (userId: ID, extractionResultId: ExtractionResult): Locations[]
   * Returns the location details for a specific extraction result.
   */
  async _getLocationForExtraction({
    userId,
    extractionResultId,
  }: {
    userId: ID;
    extractionResultId: ExtractionResult;
  }): Promise<Locations[] | { error: string }> {
    // Verify ownership through extraction -> mediaFile
    const extraction = await this.extractionResults.findOne({
      _id: extractionResultId,
    });
    if (!extraction) {
      return { error: "Extraction not found" } as any;
    }

    const mediaFile = await this.mediaFiles.findOne({
      _id: extraction.imagePath,
      owner: userId,
    });

    if (!mediaFile) {
      return { error: "Access denied" } as any;
    }

    const location = await this.locations.find({
      extractionResultId: extractionResultId,
    }).toArray();
    return location;
  }
}
