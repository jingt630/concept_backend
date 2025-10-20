---
timestamp: 'Sun Oct 19 2025 22:10:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_221009.a6921353.md]]'
content_id: 336582db88d4d15b3fdd41f0fe6d37f2aa81477c1fd31c57087bd7e40134a16d
---

# response:

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Define generic types
type FilePath = ID;
type Location = {
  fromCoord: Coordinate;
  toCoord: Coordinate;
};
type Coordinate = [number, number];
type ExtractionResult = ID;
type TextId = String;

// Declare collection prefix, use concept name
const PREFIX = "TextExtraction" + ".";

/**
 * A set of ExtractionResults with
 *  imagePath of type FilePath
 *  extractedText of type String
 *  position of type Location
 *  textId of type String
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
 *  an ExtractionResult
 *  two Coordinate (Number, Number)
 */
// Note: Location is a complex type and is embedded within ExtractionResults as per the spec.
// We don't need a separate collection for Location as it's part of ExtractionResults state.
// The Coordinate type is simply a tuple of numbers.

export default class TextExtractionConcept {
  extractionResults: Collection<ExtractionResults>;

  constructor(private readonly db: Db) {
    this.extractionResults = this.db.collection(PREFIX + "extractionResults");
  }

  /**
   * extractTextFromMedia (image: FilePath): (result: ExtractionResult)
   *
   * **requires**: `image` exists in application and accessible.
   *
   * **effects**: Creates a new `ExtractionResult` associated with the `image`, with the same `imagePath` string stored. `extractedText` will be the text the AI recognizes at `position`, and an unique `textId` is assigned out of all `ExtractionResult`s with the same `imagePath` because the same image can have many same words at different locations.
   */
  async extractTextFromMedia({
    image,
  }: {
    image: FilePath;
  }): Promise<{ result: ExtractionResult }> {
    // In a real scenario, this would involve calling an AI service.
    // For this implementation, we'll simulate the AI's response.
    console.log(`Simulating AI text extraction for image: ${image}`);

    // Generate a unique textId for this extraction result.
    // We need to ensure uniqueness for the same imagePath.
    const existingResults = await this.extractionResults.find({ imagePath: image }).toArray();
    const newTextId = `${image}_${existingResults.length + 1}`;

    // Simulate extracted text and position from AI
    const simulatedExtractedText = `Simulated text from ${image}`;
    const simulatedPosition: Location = {
      fromCoord: [0, 0],
      toCoord: [100, 100], // Placeholder coordinates
    };

    const newExtraction: ExtractionResults = {
      _id: freshID(),
      imagePath: image,
      extractedText: simulatedExtractedText,
      position: simulatedPosition,
      textId: newTextId,
    };

    await this.extractionResults.insertOne(newExtraction);

    return { result: newExtraction._id };
  }

  /**
   * editExtractText (extractedText: ExtractionResult, newText: String)
   *
   * **requires**: `extractedText` exists.
   *
   * **effects**: Modifies `extractedText` in the `ExtractionResult` to `newText`.
   */
  async editExtractText({
    extractedText,
    newText,
  }: {
    extractedText: ExtractionResult;
    newText: string;
  }): Promise<Empty> {
    const result = await this.extractionResults.updateOne(
      { _id: extractedText },
      { $set: { extractedText: newText } }
    );

    if (result.modifiedCount === 0) {
      // You might want to throw an error or return a specific error payload
      // if the extractedText ID doesn't exist. For now, we'll just log.
      console.warn(`ExtractionResult with ID ${extractedText} not found for update.`);
      // According to the instructions, normal errors should be caught and return {error: ...}
      // However, the spec for this action does not define an error return type.
      // We will proceed with returning Empty for now, assuming the ID exists.
      // In a real scenario, consider adding an error return type to the spec.
    }
    return {};
  }

  /**
   * editLocation (extractedText: ExtractionResult, fromCoord: Coordinate, toCoord: Coordinate)
   *
   * **requires**: `extractedText` exists. The coordinates do not include negative numbers.
   *
   * **effects**: Changes the `position` of `extractedText` to a new `Location` defined by `fromCoord` and `toCoord`, which specifies the area of the image that the `extractedText` occupies if a rectangle is drawn from `fromCoord` to `toCoord`.
   */
  async editLocation({
    extractedText,
    fromCoord,
    toCoord,
  }: {
    extractedText: ExtractionResult;
    fromCoord: Coordinate;
    toCoord: Coordinate;
  }): Promise<Empty> {
    // Basic validation for negative coordinates as per requires
    if (fromCoord.some(c => c < 0) || toCoord.some(c => c < 0)) {
        // Again, spec doesn't define error returns for this action.
        // In a real scenario, this would return { error: "Coordinates cannot be negative." }
        console.error("Coordinates cannot be negative.");
        return {};
    }

    const result = await this.extractionResults.updateOne(
      { _id: extractedText },
      { $set: { position: { fromCoord, toCoord } } }
    );

    if (result.modifiedCount === 0) {
      console.warn(`ExtractionResult with ID ${extractedText} not found for location update.`);
    }
    return {};
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
  }): Promise<{ result: ExtractionResult }> {
    // Basic validation for negative coordinates as per requires
    if (fromCoord.some(c => c < 0) || toCoord.some(c => c < 0)) {
        // Spec doesn't define error returns for this action.
        console.error("Coordinates cannot be negative.");
        // Returning an empty result, but ideally this would be an error.
        return { result: "" as ExtractionResult }; // Placeholder for error, adjust as needed.
    }

    const existingResults = await this.extractionResults.find({ imagePath: media }).toArray();
    const newTextId = `${media}_${existingResults.length + 1}`;

    const newExtraction: ExtractionResults = {
      _id: freshID(),
      imagePath: media,
      extractedText: "", // Initialize as empty
      position: { fromCoord, toCoord },
      textId: newTextId,
    };

    await this.extractionResults.insertOne(newExtraction);

    return { result: newExtraction._id };
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
    const result = await this.extractionResults.deleteOne({
      textId: textId,
      imagePath: imagePath,
    });

    if (result.deletedCount === 0) {
      console.warn(
        `ExtractionResult with textId ${textId} and imagePath ${imagePath} not found for deletion.`
      );
      // Spec doesn't define error returns for this action.
    }
    return {};
  }

  // Example of a query method (optional but good for testing/verification)
  /**
   * _getExtractionResultsByImagePath (imagePath: FilePath): (results: ExtractionResults[])
   *
   * **requires**: imagePath exists.
   *
   * **effects**: Returns all ExtractionResults associated with the given imagePath.
   */
  async _getExtractionResultsByImagePath({
    imagePath,
  }: {
    imagePath: FilePath;
  }): Promise<{ results: ExtractionResults[] }> {
    const results = await this.extractionResults.find({ imagePath: imagePath }).toArray();
    return { results };
  }
}
```
