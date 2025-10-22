/**
 * MediaStorage - Store actual image data in MongoDB
 *
 * This solves the preview issue by storing images in the database
 * instead of relying on disk storage.
 */

import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "MediaStorage.";

/**
 * StoredImage - Contains the actual binary image data
 */
interface StoredImage {
  _id: ID;
  mediaId: ID; // Reference to MediaFile
  imageData: string; // Base64 encoded image
  mimeType: string; // e.g., "image/jpeg"
  size: number; // Size in bytes
  uploadDate: Date;
}

export default class MediaStorageConcept {
  storedImages: Collection<StoredImage>;
  mediaFiles: Collection<any>; // Reference to MediaManagement collection

  constructor(private readonly db: Db) {
    this.storedImages = this.db.collection(PREFIX + "storedImages");
    this.mediaFiles = this.db.collection("MediaManagement.mediaFiles");
  }

  /**
   * storeImage(userId: ID, mediaId: ID, imageData: string, mimeType: string)
   *
   * Stores the actual image data in the database.
   */
  async storeImage({
    userId,
    mediaId,
    imageData,
    mimeType,
  }: {
    userId: ID;
    mediaId: ID;
    imageData: string;
    mimeType: string;
  }): Promise<StoredImage | { error: string }> {
    try {
      // Verify the media file belongs to the user
      const mediaFile = await this.mediaFiles.findOne({
        _id: mediaId,
        owner: userId,
      });

      if (!mediaFile) {
        return { error: "Media file not found or access denied" } as any;
      }

      // Calculate size
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);

      // Check if image already exists (update instead of duplicate)
      const existing = await this.storedImages.findOne({ mediaId });

      if (existing) {
        // Update existing image
        await this.storedImages.updateOne(
          { mediaId },
          {
            $set: {
              imageData: base64Data,
              mimeType,
              size: sizeInBytes,
              uploadDate: new Date(),
            },
          },
        );
        console.log(`✅ Updated stored image for mediaId: ${mediaId}`);
        return {
          ...existing,
          imageData: base64Data,
          mimeType,
          size: sizeInBytes,
        } as StoredImage;
      }

      // Create new stored image
      const newStoredImage: StoredImage = {
        _id: freshID(),
        mediaId,
        imageData: base64Data,
        mimeType,
        size: sizeInBytes,
        uploadDate: new Date(),
      };

      await this.storedImages.insertOne(newStoredImage);
      console.log(
        `✅ Stored image in database: ${mediaId} (${sizeInBytes} bytes)`,
      );

      return newStoredImage;
    } catch (error) {
      console.error("❌ Error storing image:", error);
      return { error: "Error" } as any;
    }
  }

  /**
   * _getImage(userId: ID, mediaId: ID)
   *
   * Retrieves the stored image data from database.
   */
  async _getImage({
    userId,
    mediaId,
  }: {
    userId: ID;
    mediaId: ID;
  }): Promise<StoredImage | { error: string }> {
    try {
      // Verify ownership
      const mediaFile = await this.mediaFiles.findOne({
        _id: mediaId,
        owner: userId,
      });

      if (!mediaFile) {
        return { error: "Media file not found or access denied" } as any;
      }

      // Get stored image
      const storedImage = await this.storedImages.findOne({ mediaId });

      if (!storedImage) {
        return { error: "Image data not found in database" } as any;
      }

      console.log(
        `📥 Retrieved image from database: ${mediaId} (${storedImage.size} bytes)`,
      );
      return storedImage;
    } catch (error) {
      console.error("❌ Error retrieving image:", error);
      return { error: "Error" } as any;
    }
  }

  /**
   * deleteImage(userId: ID, mediaId: ID)
   *
   * Deletes stored image data when media file is deleted.
   */
  async deleteImage({
    userId,
    mediaId,
  }: {
    userId: ID;
    mediaId: ID;
  }): Promise<{ success: boolean } | { error: string }> {
    try {
      // Verify ownership
      const mediaFile = await this.mediaFiles.findOne({
        _id: mediaId,
        owner: userId,
      });

      if (!mediaFile) {
        return { error: "Media file not found or access denied" } as any;
      }

      // Delete stored image
      const result = await this.storedImages.deleteOne({ mediaId });

      if (result.deletedCount === 0) {
        return { error: "No image data found to delete" } as any;
      }

      console.log(`🗑️ Deleted stored image for mediaId: ${mediaId}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Error deleting image:", error);
      return { error: "Error" } as any;
    }
  }

  /**
   * _getImageStats(userId: ID)
   *
   * Get statistics about stored images for a user.
   */
  async _getImageStats({
    userId,
  }: {
    userId: ID;
  }): Promise<{ totalImages: number; totalSize: number } | { error: string }> {
    try {
      // Get all media files for user
      const mediaFiles = await this.mediaFiles.find({ owner: userId })
        .toArray();
      const mediaIds = mediaFiles.map((mf) => mf._id);

      // Get stored images
      const storedImages = await this.storedImages
        .find({ mediaId: { $in: mediaIds } })
        .toArray();

      const totalSize = storedImages.reduce((sum, img) => sum + img.size, 0);

      return {
        totalImages: storedImages.length,
        totalSize,
      };
    } catch (error) {
      console.error("❌ Error getting image stats:", error);
      return { error: "Error" } as any;
    }
  }
}
