import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic types of this concept
type User = ID;

/**
 * A set of MediaFile objects, each representing a managed media file.
 */
interface MediaFile {
  _id: ID; // Unique identifier for the media file
  filename: string; // The original name of the uploaded file
  filePath: string; // The path within local storage where the file is located
  mediaType: string; // e.g., "png", "jpg", "webp"
  cloudURL: string; // The path in the cloud storage that represents this MediaFile
  uploadDate: Date; // When the file was uploaded
  updateDate: Date; // The last time this MediaFile's metadata was updated
  context?: Record<string, string>; // Result of text extraction for this media
  translatedText?: Record<string, string>; // Rendered translated versions of the context
  owner: User; // The user who owns this media file
}

/**
 * Represents a folder structure within the managed storage.
 * This is a simplified representation; actual folder creation might be handled at the file system level.
 */
interface Folder {
  _id: ID;
  filePath: string; // The full path of the folder
  name: string; // The name of the folder
  owner: User; // The user who owns this folder
}

// Declare collection prefix, use concept name
const PREFIX = "MediaManagement" + ".";

export default class MediaManagementConcept {
  mediaFiles: Collection<MediaFile>;
  folders: Collection<Folder>;
  private readonly owner: User; // Assuming the concept is instantiated for a specific user

  constructor(private readonly db: Db, owner: User) {
    this.mediaFiles = this.db.collection(PREFIX + "mediaFiles");
    this.folders = this.db.collection(PREFIX + "folders");
    this.owner = owner;
  }

  /**
   * upload(filePath: String, mediaType: String, filename: String, relativePath: String): MediaFile
   *
   * **requires** `filename` is alphabets and numbers and space only. `filePath` specifies a valid path within the app's managed storage. `relativePath` is a valid pathway on the user's computer and has the `mediaType`.
   *
   * **effects**
   *   * Creates a new `MediaFile` object with a unique `id`, the provided `filename`, `filePath` (inside the app folder in the user's computer), `mediaType`, `uploadDate`, and initiate `updateDate` as the same date the file is uploaded.
   *   * Initializes `context` to `None` and `translatedVersions` to `None`.
   *   * The owner of the MedialFile is user.
   *   * Returns the newly created `MediaFile`.
   */
  async upload({
    filePath,
    mediaType,
    filename,
    relativePath, // Note: relativePath seems to be unused in the effect description but is part of the input. Assuming it might be for physical file operations not directly modeled here.
  }: {
    filePath: string;
    mediaType: string;
    filename: string;
    relativePath: string;
  }): Promise<MediaFile | {error: string}> {
    // Basic validation as per requirements
    if (!/^[a-zA-Z0-9\s]+$/.test(filename)) {
      return { error: "Filename can only contain alphabets, numbers, and spaces." } as any;
    }
    // Assuming filePath is a conceptual path within the managed storage,
    // and we'd perform physical file operations elsewhere.
    // For this model, we store the conceptual filePath.

    const now = new Date();
    const newMediaFile: MediaFile = {
      _id: freshID(),
      filename,
      filePath,
      mediaType,
      cloudURL: `gs://your-bucket/${this.owner}/${filePath}/${filename}`, // Example cloud URL structure
      uploadDate: now,
      updateDate: now,
      owner: this.owner,
    };

    await this.mediaFiles.insertOne(newMediaFile);
    return newMediaFile;
  }

  /**
   * delete(mediaId: String)
   *
   * **requires** `mediaId` corresponds to an existing `MediaFile` owned by the current user.
   *
   * **effects**
   *   * Removes the `MediaFile` object from system and so user is not the owner of it anymore.
   */
  async delete({ mediaId }: { mediaId: ID }): Promise<Empty | {error: string}> {
    const result = await this.mediaFiles.deleteOne({
      _id: mediaId,
      owner: this.owner,
    });
    if (result.deletedCount === 0) {
      return { error: "Media file not found or not owned by the current user." } as any;
    }
    // In a real implementation, you would also delete the file from cloud storage.
    return {};
  }

  /**
   * move(mediaId: String, newFilePath: String)
   *
   * **requires** `mediaId` exists and is owned by the current user. `newFilePath` specifies a valid pathway within the storage workspace for the user.
   *
   * **effects**
   *   * Updates the `filePath` of the `MediaFile` object corresponding to `mediaId` to reflect the new location. Physically moves the file data in app storage.
   */
  async move({
    mediaId,
    newFilePath,
  }: {
    mediaId: ID;
    newFilePath: string;
  }): Promise<Empty | {error: string}> {
    const now = new Date();
    const result = await this.mediaFiles.updateOne(
      { _id: mediaId, owner: this.owner },
      { $set: { filePath: newFilePath, updateDate: now } }
    );

    if (result.modifiedCount === 0) {
      return { error: "Media file not found or not owned by the current user." } as any;
    }

    // In a real implementation, you would also move the physical file in app storage and potentially update the cloudURL if it depends on filePath.
    return {};
  }

  /**
   * createFolder(filePath: String, name: String)
   *
   * **requires** `filePath` is valid. `name` is unique within the folder the `filePath`.
   *
   * **effects** Creates a new folder structure within the app's managed storage.
   */
  async createFolder({
    filePath,
    name,
  }: {
    filePath: string;
    name: string;
  }): Promise<Folder | {error: string}> {
    // Basic validation: Ensure name is unique for the given filePath and owner
    const existingFolder = await this.folders.findOne({
      filePath,
      name,
      owner: this.owner,
    });
    if (existingFolder) {
      return { error: "A folder with this name already exists at this location." } as any;
    }

    // Simplified validation for filePath (e.g., ensuring it's a conceptual path)
    // In a real system, you might validate against existing folder paths.

    const newFolder: Folder = {
      _id: freshID(),
      filePath: filePath,
      name: name,
      owner: this.owner,
    };

    await this.folders.insertOne(newFolder);
    return newFolder;
  }

  /**
   * updateContext(mediaId: String, extractionResult: Dictionary[String:String])
   *
   * **requires** `mediaId` exists and is owned by the current user. `extractionResult` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId.
   *
   * **effects** Updates the `context` field of the `MediaFile` corresponding to `mediaId` with the provided `extractionResult`. If context field doesn't exist, create one and updates with extractionResult.
   */
  async updateContext({
    mediaId,
    extractionResult,
  }: {
    mediaId: ID;
    extractionResult: Record<string, string>;
  }): Promise<Empty | {error: string}> {
    const now = new Date();
    const result = await this.mediaFiles.updateOne(
      { _id: mediaId, owner: this.owner },
      {
        $set: { context: extractionResult, updateDate: now },
      }
    );

    if (result.modifiedCount === 0) {
      return { error: "Media file not found or not owned by the current user." } as any;
    }
    return {};
  }

  /**
   * addTranslatedText(mediaId: String, translatedText: Dictionary[String:String])
   *
   * **requires** `mediaId` exists and is owned by the current user. `translatedText` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId.
   *
   * **effects** Appends the `outputVersion` to the `translatedVersions` list of the `MediaFile` corresponding to `mediaId`.
   */
  async addTranslatedText({
    mediaId,
    translatedText,
  }: {
    mediaId: ID;
    translatedText: Record<string, string>;
  }): Promise<Empty | {error: string}> {
    const now = new Date();
    const result = await this.mediaFiles.updateOne(
      { _id: mediaId, owner: this.owner },
      {
        $set: { translatedText: translatedText, updateDate: now },
      }
    );

    if (result.modifiedCount === 0) {
      return { error: "Media file not found or not owned by the current user." } as any;
    }
    return {};
  }

  // --- Queries ---

  /**
   * _getMediaFile(mediaId: ID): MediaFile[]
   *
   * Retrieves a specific media file by its ID, ensuring it belongs to the current user.
   */
  async _getMediaFile(mediaId: ID): Promise<MediaFile[]> {
    return await this.mediaFiles
      .find({ _id: mediaId, owner: this.owner })
      .toArray();
  }

  /**
   * _listMediaFiles(filePath: String): MediaFile[]
   *
   * Lists all media files within a given directory path for the current user.
   */
  async _listMediaFiles(filePath: string): Promise<MediaFile[]> {
    return await this.mediaFiles
      .find({ filePath: filePath, owner: this.owner })
      .toArray();
  }

  /**
   * _listFolders(filePath: String): Folder[]
   *
   * Lists all subfolders within a given directory path for the current user.
   */
  async _listFolders(filePath: string): Promise<Folder[]> {
    return await this.folders
      .find({ filePath: filePath, owner: this.owner })
      .toArray();
  }
}
