---
timestamp: 'Sun Oct 19 2025 21:52:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_215233.432f15a2.md]]'
content_id: 5ffc83b5f1d08e207f4e919661481da30d78c3f6eb4659a819074e9b86731cc4
---

# file: src/concepts/TextExtraction/TextExtractionConcept.ts

```typescript
/**
 * TextExtraction Concept
 *
 * Purpose: Extract text from uploaded media for the AI to learn and translate.
 * Principle: Given an image from imagePath, the AI would run extraction to recognize text within the media, and produce a transcript with metadata for the image. One image can have many ExtractionResults.
 */
import { Collection, Db } from "npm:mongodb";
import { GeminiLLM } from "@utils/gemini-llm.ts";
import { Empty, ID } from "@utils/types.ts";

// Declare collection prefix, use concept name
const PREFIX = "TextExtraction.";

// Generic types of this concept
type FilePath = ID;
type Location = ID;
type Coordinate = Number;
type TextId = String;
type ExtractedText = String;

interface ExtractionResult {
  _id: TextId; // Unique ID for each text extraction
  imagePath: FilePath;
  extractedText: ExtractedText;
  position: {
    fromCoord: Coordinate;
    toCoord: Coordinate;
  };
}

interface LocationEntity {
  _id: Location;
  extractionResultId: TextId;
  fromCoord: Coordinate;
  toCoord: Coordinate;
}

export default class TextExtractionConcept {
  extractionResults: Collection<ExtractionResult>;
  locations: Collection<LocationEntity>;
  private geminiLLM: GeminiLLM;

  constructor(private readonly db: Db) {
    this.extractionResults = this.db.collection(PREFIX + "extractionResults");
    this.locations = this.db.collection(PREFIX + "locations");
    this.geminiLLM = new GeminiLLM();
  }

  /**
   * extractTextFromMedia (image: FilePath): (result: ExtractionResult)
   *
   * **requires**: `image` exists in application and accessible.
   *
   * **effects**: Creates a new `ExtractionResult` associated with the `image`, with the same `imagePath` string stored. `extractedText` will be the text the AI recognizes at `position`, and an unique `textId` is assigned out of all `ExtractionResult`s with the same `imagePath` because the same image can have many same words at different locations.
   */
  async extractTextFromMedia({ image }: { image: FilePath }): Promise<
    { result: ExtractionResult } | { error: string }
  > {
    try {
      // In a real scenario, you'd have a mechanism to get the image data
      // For now, we'll assume the image path is sufficient for the LLM call.
      // If the GeminiLLM requires the actual file content, this needs adjustment.
      const prompt = "Extract all text from this image. Provide the text, its location as coordinates, and a unique ID for each text instance.";

      // Calling the LLM to extract text and get positional data.
      // The GeminiLLM.executeLLM is a placeholder for a more sophisticated AI call
      // that returns structured data (text, position, and ID).
      // For this example, we'll simulate a structured response.
      const llmResponse = await this.geminiLLM.executeLLM(prompt, image as string);

      // --- Simulate LLM response parsing ---
      // In a real implementation, this would parse the structured response from the LLM.
      // For demonstration, we'll create dummy data.
      const mockExtractionResults: Omit<ExtractionResult, "_id">[] = [
        {
          imagePath: image,
          extractedText: "This is the first line of text.",
          position: { fromCoord: 10, toCoord: 20 },
        },
        {
          imagePath: image,
          extractedText: "Another piece of text.",
          position: { fromCoord: 30, toCoord: 40 },
        },
      ];

      const savedResults: ExtractionResult[] = [];
      for (const res of mockExtractionResults) {
        const textId = crypto.randomUUID() as TextId; // Generate a unique textId
        const newExtractionResult: ExtractionResult = {
          _id: textId,
          ...res,
        };
        await this.extractionResults.insertOne(newExtractionResult);
        savedResults.push(newExtractionResult);

        // Save location data
        const locationId = crypto.randomUUID() as Location;
        await this.locations.insertOne({
          _id: locationId,
          extractionResultId: textId,
          fromCoord: res.position.fromCoord,
          toCoord: res.position.toCoord,
        });
      }

      // Return the first created ExtractionResult as an example.
      // In a real scenario, you might return all of them, or a specific one.
      if (savedResults.length > 0) {
        return { result: savedResults[0] };
      } else {
        return { error: "No text extracted from the image." };
      }
      // --- End Simulation ---
    } catch (error) {
      console.error("Error extracting text:", error);
      return { error: (error as Error).message };
    }
  }

  /**
   * editExtractText (extractedTextId: TextId, newText: String)
   *
   * **requires**: `extractedTextId` exists.
   *
   * **effects**: Modifies `extractedText` in the `ExtractionResult` associated with `extractedTextId` to `newText`.
   */
  async editExtractText({
    extractedTextId,
    newText,
  }: {
    extractedTextId: TextId;
    newText: ExtractedText;
  }): Promise<Empty | { error: string }> {
    try {
      const updateResult = await this.extractionResults.updateOne(
        { _id: extractedTextId },
        { $set: { extractedText: newText } }
      );

      if (updateResult.matchedCount === 0) {
        return { error: `Extraction result with ID ${extractedTextId} not found.` };
      }

      return {}; // Success
    } catch (error) {
      console.error("Error editing extracted text:", error);
      return { error: (error as Error).message };
    }
  }

  /**
   * editLocation (extractedTextId: TextId, fromCoord: Coordinate, toCoord: Coordinate)
   *
   * **requires**: `extractedTextId` exists. The coordinates do not include negative numbers.
   *
   * **effects**: Changes the `position` of the `ExtractionResult` associated with `extractedTextId` to a new `Location` defined by `fromCoord` and `toCoord`, which specifies the area of the image that the `extractedText` occupies if a rectangle is drawn from `fromCoord` to `toCoord`.
   */
  async editLocation({
    extractedTextId,
    fromCoord,
    toCoord,
  }: {
    extractedTextId: TextId;
    fromCoord: Coordinate;
    toCoord: Coordinate;
  }): Promise<Empty | { error: string }> {
    try {
      if (fromCoord < 0 || toCoord < 0) {
        return { error: "Coordinates cannot be negative." };
      }

      // Update the position in the extractionResults collection
      const updateResult = await this.extractionResults.updateOne(
        { _id: extractedTextId },
        {
          $set: {
            position: { fromCoord: fromCoord, toCoord: toCoord },
          },
        }
      );

      if (updateResult.matchedCount === 0) {
        return { error: `Extraction result with ID ${extractedTextId} not found.` };
      }

      // Update the corresponding entry in the locations collection
      const locationUpdateResult = await this.locations.updateOne(
        { extractionResultId: extractedTextId },
        {
          $set: {
            fromCoord: fromCoord,
            toCoord: toCoord,
          },
        }
      );

      // If no location was found for this extraction result, it might be an inconsistency,
      // but the primary update on extractionResults succeeded.
      // Depending on strictness, you might want to error here or create a new location.
      // For now, we'll just log a warning if the location update failed.
      if (locationUpdateResult.matchedCount === 0) {
        console.warn(`No location found for extraction result ID ${extractedTextId}. A new one might need to be created.`);
        // Optionally, create a new location entry here if preferred
        // await this.locations.insertOne({ _id: crypto.randomUUID() as Location, extractionResultId: extractedTextId, fromCoord: fromCoord, toCoord: toCoord });
      }

      return {}; // Success
    } catch (error) {
      console.error("Error editing location:", error);
      return { error: (error as Error).message };
    }
  }

  /**
   * addExtractionTxt (media: FilePath, fromCoord: Coordinate, toCoord: Coordinate): (result: ExtractionResult)
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
    fromCoord: Coordinate;
    toCoord: Coordinate;
  }): Promise<{ result: ExtractionResult } | { error: string }> {
    try {
      if (fromCoord < 0 || toCoord < 0) {
        return { error: "Coordinates cannot be negative." };
      }

      const textId = crypto.randomUUID() as TextId; // Generate a unique textId
      const newExtractionResult: Omit<ExtractionResult, "_id"> = {
        imagePath: media,
        extractedText: "", // Initialize extractedText as empty
        position: { fromCoord, toCoord },
      };

      const savedExtraction = { _id: textId, ...newExtractionResult };
      await this.extractionResults.insertOne(savedExtraction);

      // Save location data
      const locationId = crypto.randomUUID() as Location;
      await this.locations.insertOne({
        _id: locationId,
        extractionResultId: textId,
        fromCoord: fromCoord,
        toCoord: toCoord,
      });

      return { result: savedExtraction };
    } catch (error) {
      console.error("Error adding text extraction:", error);
      return { error: (error as Error).message };
    }
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
  }): Promise<Empty | { error: string }> {
    try {
      // Delete from extractionResults collection
      const extractionDeleteResult = await this.extractionResults.deleteOne({
        _id: textId,
        imagePath: imagePath,
      });

      if (extractionDeleteResult === null || extractionDeleteResult === 0) {
        return { error: `Extraction result with ID ${textId} for image ${imagePath} not found.` };
      }

      // Delete from locations collection
      const locationDeleteResult = await this.locations.deleteOne({
        extractionResultId: textId,
      });

      if (locationDeleteResult === null || locationDeleteResult === 0) {
        console.warn(`Location for extraction result ID ${textId} not found during deletion.`);
      }

      return {}; // Success
    } catch (error) {
      console.error("Error deleting extraction:", error);
      return { error: (error as Error).message };
    }
  }

  // --- Helper Queries (for verification and principle demonstration) ---

  /**
   * _getExtractionResultsByImagePath (imagePath: FilePath): (result: ExtractionResult)
   *
   * **requires**: `imagePath` is a valid file path.
   * **effects**: Returns all `ExtractionResult`s associated with the given `imagePath`.
   */
  async _getExtractionResultsByImagePath({
    imagePath,
  }: {
    imagePath: FilePath;
  }): Promise<ExtractionResult[] | { error: string }> {
    try {
      const results = await this.extractionResults
        .find({ imagePath: imagePath })
        .toArray();
      return results;
    } catch (error) {
      console.error("Error fetching extraction results by image path:", error);
      return { error: (error as Error).message };
    }
  }

  /**
   * _getLocationByTextId (textId: TextId): (location: LocationEntity)
   *
   * **requires**: `textId` is a valid text ID.
   * **effects**: Returns the `LocationEntity` associated with the given `textId`.
   */
  async _getLocationByTextId({
    textId,
  }: {
    textId: TextId;
  }): Promise<LocationEntity | { error: string }> {
    try {
      const location = await this.locations.findOne({
        extractionResultId: textId,
      });
      if (!location) {
        return { error: `Location not found for text ID ${textId}.` };
      }
      return location;
    } catch (error) {
      console.error("Error fetching location by text ID:", error);
      return { error: (error as Error).message };
    }
  }
}
```
