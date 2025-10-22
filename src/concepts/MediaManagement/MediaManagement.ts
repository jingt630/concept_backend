import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import MediaStorageConcept from "./MediaStorage.ts";

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
  private mediaStorage: MediaStorageConcept;

  constructor(private readonly db: Db) {
    this.mediaFiles = this.db.collection(PREFIX + "mediaFiles");
    this.folders = this.db.collection(PREFIX + "folders");
    this.mediaStorage = new MediaStorageConcept(db);
  }

  /**
   * upload(filePath: String, mediaType: String, filename: String, relativePath: String, fileData?: String): MediaFile
   *
   * **requires** `filename` is alphabets and numbers and space only. `filePath` specifies a valid path within the app's managed storage. `relativePath` is a valid pathway on the user's computer and has the `mediaType`.
   *
   * **effects**
   *   * Creates a new `MediaFile` object with a unique `id`, the provided `filename`, `filePath` (inside the app folder in the user's computer), `mediaType`, `uploadDate`, and initiate `updateDate` as the same date the file is uploaded.
   *   * If fileData is provided (base64), saves the actual file to disk.
   *   * Initializes `context` to `None` and `translatedVersions` to `None`.
   *   * The owner of the MedialFile is user.
   *   * Returns the newly created `MediaFile`.
   */
  async upload({
    userId,
    filePath,
    mediaType,
    filename,
    relativePath,
    fileData,
  }: {
    userId: ID;
    filePath: string;
    mediaType: string;
    filename: string;
    relativePath: string;
    fileData?: string; // Base64 encoded file data
  }): Promise<MediaFile | { error: string }> {
    // Basic validation - allow common filename characters including dots for extensions
    if (!/^[a-zA-Z0-9\s._-]+$/.test(filename)) {
      return {
        error:
          "Filename can only contain alphabets, numbers, spaces, dots, hyphens, and underscores.",
      } as any;
    }

    console.log(`📤 Upload starting for: ${filename}`);
    console.log(`   - User: ${userId}`);
    console.log(`   - Path: ${filePath}`);
    console.log(`   - Type: ${mediaType}`);
    console.log(`   - Has file data: ${!!fileData}`);
    if (fileData) {
      console.log(`   - File data length: ${fileData.length} chars`);
    }

    const now = new Date();
    const newMediaFile: MediaFile = {
      _id: freshID(),
      filename,
      filePath,
      mediaType,
      cloudURL: `gs://your-bucket/${userId}/${filePath}/${filename}`, // Example cloud URL structure
      uploadDate: now,
      updateDate: now,
      owner: userId,
    };

    // Save the actual file to disk if fileData is provided
    if (fileData) {
      try {
        // Create directory structure: ./uploads/{userId}/{filePath}/
        // Normalize path to avoid double slashes
        const rawStorageDir = `./uploads/${userId}${filePath}`;
        const storageDir = rawStorageDir.replace(/([^:]\/)\/+/g, "$1");
        console.log(`📁 Creating directory: ${storageDir}`);
        await Deno.mkdir(storageDir, { recursive: true });

        // Decode base64 and save file
        const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
        console.log(`🔢 Decoded base64 length: ${base64Data.length}`);

        const fileBytes = Uint8Array.from(
          atob(base64Data),
          (c) => c.charCodeAt(0),
        );
        console.log(`📦 File bytes: ${fileBytes.length} bytes`);

        const fullPath = `${storageDir}/${filename}`;
        await Deno.writeFile(fullPath, fileBytes);
        console.log(`✅ File saved to disk: ${fullPath}`);

        // Verify file was saved
        try {
          const stat = await Deno.stat(fullPath);
          console.log(`✅ File verified on disk: ${stat.size} bytes`);
        } catch (statErr) {
          console.error(`❌ Could not verify file: ${statErr}`);
        }
      } catch (err) {
        console.error("❌ Error saving file to disk:", err);
        return { error: `Failed to save file` } as any;
      }
    } else {
      console.warn(
        `⚠️ WARNING: No fileData provided! File will NOT be saved to disk.`,
      );
    }

    await this.mediaFiles.insertOne(newMediaFile);
    console.log(`✅ Database record created: ${newMediaFile._id}`);

    // Also store image data in database for preview
    if (fileData) {
      const mimeType = `image/${mediaType}`;
      await this.mediaStorage.storeImage({
        userId,
        mediaId: newMediaFile._id,
        imageData: fileData,
        mimeType,
      });
      console.log(`✅ Image data stored in database for preview`);
    }

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
  async delete(
    { userId, mediaId }: { userId: ID; mediaId: ID },
  ): Promise<Empty | { error: string }> {
    const result = await this.mediaFiles.deleteOne({
      _id: mediaId,
      owner: userId,
    });
    if (result.deletedCount === 0) {
      return {
        error: "Media file not found or not owned by the current user.",
      } as any;
    }

    // Also delete the stored image data
    await this.mediaStorage.deleteImage({ userId, mediaId });
    console.log(`✅ Deleted media file and stored image data`);

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
    userId,
    mediaId,
    newFilePath,
  }: {
    userId: ID;
    mediaId: ID;
    newFilePath: string;
  }): Promise<Empty | { error: string }> {
    const now = new Date();
    const result = await this.mediaFiles.updateOne(
      { _id: mediaId, owner: userId },
      { $set: { filePath: newFilePath, updateDate: now } },
    );

    if (result.modifiedCount === 0) {
      return {
        error: "Media file not found or not owned by the current user.",
      } as any;
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
    userId,
    filePath,
    name,
  }: {
    userId: ID;
    filePath: string;
    name: string;
  }): Promise<Folder | { error: string }> {
    // Basic validation: Ensure name is unique for the given filePath and owner
    const existingFolder = await this.folders.findOne({
      filePath,
      name,
      owner: userId,
    });
    if (existingFolder) {
      return {
        error: "A folder with this name already exists at this location.",
      } as any;
    }

    // Simplified validation for filePath (e.g., ensuring it's a conceptual path)
    // In a real system, you might validate against existing folder paths.

    const newFolder: Folder = {
      _id: freshID(),
      filePath: filePath,
      name: name,
      owner: userId,
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
    userId,
    mediaId,
    extractionResult,
  }: {
    userId: ID;
    mediaId: ID;
    extractionResult: Record<string, string>;
  }): Promise<Empty | { error: string }> {
    const now = new Date();
    const result = await this.mediaFiles.updateOne(
      { _id: mediaId, owner: userId },
      {
        $set: { context: extractionResult, updateDate: now },
      },
    );

    if (result.modifiedCount === 0) {
      return {
        error: "Media file not found or not owned by the current user.",
      } as any;
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
    userId,
    mediaId,
    translatedText,
  }: {
    userId: ID;
    mediaId: ID;
    translatedText: Record<string, string>;
  }): Promise<Empty | { error: string }> {
    const now = new Date();
    const result = await this.mediaFiles.updateOne(
      { _id: mediaId, owner: userId },
      {
        $set: { translatedText: translatedText, updateDate: now },
      },
    );

    if (result.modifiedCount === 0) {
      return {
        error: "Media file not found or not owned by the current user.",
      } as any;
    }
    return {};
  }

  // --- Queries ---

  /**
   * _getMediaFile(mediaId: ID): MediaFile[]
   *
   * Retrieves a specific media file by its ID, ensuring it belongs to the current user.
   */
  async _getMediaFile(
    { userId, mediaId }: { userId: ID; mediaId: ID },
  ): Promise<MediaFile[]> {
    return await this.mediaFiles
      .find({ _id: mediaId, owner: userId })
      .toArray();
  }

  /**
   * _listMediaFiles(filePath: String): MediaFile[]
   *
   * Lists all media files within a given directory path for the current user.
   */
  async _listMediaFiles(
    { userId, filePath }: { userId: ID; filePath: string },
  ): Promise<MediaFile[]> {
    return await this.mediaFiles
      .find({ filePath: filePath, owner: userId })
      .toArray();
  }

  /**
   * _listFolders(filePath: String): Folder[]
   *
   * Lists all subfolders within a given directory path for the current user.
   */
  async _listFolders(
    { userId, filePath }: { userId: ID; filePath: string },
  ): Promise<Folder[]> {
    return await this.folders
      .find({ filePath: filePath, owner: userId })
      .toArray();
  }

  /**
   * _serveImage(userId: ID, mediaId: ID): ImageData
   *
   * Serves the actual image file for preview/display.
   * Returns the file bytes and content type.
   */
  async _serveImage(
    { userId, mediaId }: { userId: ID; mediaId: ID },
  ): Promise<{ data: Uint8Array; contentType: string } | { error: string }> {
    // Get the media file metadata
    const mediaFiles = await this.mediaFiles
      .find({ _id: mediaId, owner: userId })
      .toArray();

    if (mediaFiles.length === 0) {
      return { error: "Media file not found or access denied" } as any;
    }

    const mediaFile = mediaFiles[0];

    try {
      // Try to get image from database first (faster, more reliable)
      console.log(
        `📷 Attempting to serve image from database for mediaId: ${mediaId}`,
      );
      const storedImage = await this.mediaStorage._getImage({
        userId,
        mediaId,
      });

      if (storedImage && !("error" in storedImage)) {
        console.log(
          `✅ Serving image from database (${storedImage.size} bytes)`,
        );

        // Convert base64 to binary
        // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
        let base64Data = storedImage.imageData;
        if (base64Data.startsWith("data:")) {
          base64Data = base64Data.split(",")[1];
        }

        console.log(`🔢 Decoding base64 data (${base64Data.length} chars)`);
        const binaryData = Uint8Array.from(
          atob(base64Data),
          (c) => c.charCodeAt(0),
        );
        console.log(`✅ Binary data created (${binaryData.length} bytes)`);

        return {
          data: binaryData,
          contentType: storedImage.mimeType,
        };
      }

      // Fallback: try to read from disk (for old files that weren't stored in DB)
      console.log(`⚠️ Image not in database, trying disk...`);
      const rawPath =
        `./uploads/${userId}${mediaFile.filePath}/${mediaFile.filename}`;
      const fullPath = rawPath.replace(/([^:]\/)\/+/g, "$1");

      console.log(`📷 Serving image from disk: ${fullPath}`);
      const fileData = await Deno.readFile(fullPath);

      // Store it in database for next time
      console.log(`💾 Caching image in database for future requests...`);
      const base64Data = btoa(String.fromCharCode(...fileData));
      const mimeType = `image/${mediaFile.mediaType}`;
      await this.mediaStorage.storeImage({
        userId,
        mediaId,
        imageData: `data:${mimeType};base64,${base64Data}`,
        mimeType,
      });

      return {
        data: fileData,
        contentType: mimeType,
      };
    } catch (err) {
      console.error(`❌ Error serving image for mediaId ${mediaId}:`, err);
      return { error: `Failed to serve image` } as any;
    }
  }
}
