import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

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

  constructor(private readonly db: Db) {
    this.extractionResults = this.db.collection(PREFIX + "extractionResults");
    this.locations = this.db.collection(PREFIX + "locations");
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
    const existingExtractions = await this.extractionResults
      .find({ imagePath: image })
      .toArray();
    const textId = `${image}_${existingExtractions.length}`; // Simple unique ID generation
    const newExtractionResultId = new ObjectId().toString() as ExtractionResult;

    // For simplicity, we'll create a placeholder location.
    // In a real system, AI would determine this.
    const newLocationId = new ObjectId().toString() as Location;
    const placeholderFromCoord: [Coordinate, Coordinate] = [0, 0];
    const placeholderToCoord: [Coordinate, Coordinate] = [100, 100];

    await this.locations.insertOne({
      _id: newLocationId,
      extractionResultId: newExtractionResultId,
      fromCoord: placeholderFromCoord,
      toCoord: placeholderToCoord,
    });

    // Placeholder for extracted text, AI would determine this
    const placeholderExtractedText = "Placeholder extracted text for " + image;

    await this.extractionResults.insertOne({
      _id: newExtractionResultId,
      imagePath: image,
      extractedText: placeholderExtractedText,
      position: newLocationId,
      textId: textId,
    });

    return { result: newExtractionResultId };
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
  }): Promise<Empty | { error: string }> {
    const result = await this.extractionResults.updateOne(
      { _id: extractedText },
      { $set: { extractedText: newText } },
    );

    if (result.matchedCount === 0) {
      return { error: "ExtractionResult not found" };
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
      _id: extractedText,
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
    fromCoord: [Coordinate, Coordinate];
    toCoord: [Coordinate, Coordinate];
  }): Promise<{ result: ExtractionResult } | { error: string }> {
    if (
      fromCoord.some((c) => c < 0) ||
      toCoord.some((c) => c < 0)
    ) {
      return { error: "Coordinates cannot be negative." };
    }

    const existingExtractions = await this.extractionResults
      .find({ imagePath: media })
      .toArray();
    const textId = `${media}_${existingExtractions.length}`; // Simple unique ID generation
    const newExtractionResultId = new ObjectId().toString() as ExtractionResult;

    const newLocationId = new ObjectId().toString() as Location;
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
    const extractionResult = await this.extractionResults.findOne({
      textId: textId,
      imagePath: imagePath,
    });

    if (!extractionResult) {
      return {
        error:
          "ExtractionResult not found with the given textId and imagePath.",
      };
    }

    await this.locations.deleteOne({
      extractionResultId: extractionResult._id,
    });
    await this.extractionResults.deleteOne({ _id: extractionResult._id });

    return {};
  }

  // --- Helper Queries (for testing and verification) ---

  /**
   * _getExtractionResultsForImage (imagePath: FilePath): (results: ExtractionResults)
   * Returns all extraction results for a given image path.
   */
  async _getExtractionResultsForImage({
    imagePath,
  }: {
    imagePath: FilePath;
  }): Promise<{ results: ExtractionResults[] }> {
    const results = await this.extractionResults.find({ imagePath }).toArray();
    // The actual implementation needs to fetch associated location data if needed.
    // For simplicity, we return the raw extraction result documents here.
    // In a real scenario, you might want to join or fetch related location data.
    return { results: results };
  }

  /**
   * _getLocationForExtraction (extractionResultId: ExtractionResult): (location: Locations)
   * Returns the location details for a specific extraction result.
   */
  async _getLocationForExtraction({
    extractionResultId,
  }: {
    extractionResultId: ExtractionResult;
  }): Promise<{ location: Locations[] }> {
    const location = await this.locations.find({
      extractionResultId: extractionResultId,
    }).toArray();
    return { location: location };
  }
}
