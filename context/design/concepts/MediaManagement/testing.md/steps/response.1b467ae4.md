---
timestamp: 'Thu Oct 16 2025 19:11:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_191129.e1662758.md]]'
content_id: 1b467ae4d97739ae8968b040f810e0c474b06c9ffb8289ab15614c6f87e6773a
---

# response:

```typescript
// # concept: MediaManagement
// **concept**: MediaManagement [User]
// **purpose**: manage user-uploaded media files, including storage and retrieval.
// **principle**: when a user uploads a media file, it is stored and can later be retrieved by that user.
// **state**:
//   a set of MediaItems with
//     a owner User
//     a filename String
//     a contentType String
//     a uploadDate Date

import { Collection, Db } from "npm:mongodb";
import { Empty, ID, User } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "MediaManagement" + ".";

// Generic types of this concept
// type User = ID; // Provided by @utils/types.ts

/**
 * a set of MediaItems with
 *   a owner User
 *   a filename String
 *   a contentType String
 *   a uploadDate Date
 */
interface MediaItem {
  _id: ID;
  owner: User;
  filename: string;
  contentType: string;
  uploadDate: Date;
}

export default class MediaManagementConcept {
  mediaItems: Collection<MediaItem>;
  constructor(private readonly db: Db) {
    this.mediaItems = this.db.collection(PREFIX + "mediaItems");
  }

  /**
   * uploadMedia (owner: User, filename: String, contentType: String): (mediaItemId: ID)
   *
   * **requires** `owner` is a valid User ID.
   * **requires** `filename` and `contentType` are non-empty strings.
   *
   * **effects** Creates a new MediaItem. Sets its `owner` to `owner`, `filename` to `filename`,
   * `contentType` to `contentType`, and `uploadDate` to the current date and time.
   * Returns the ID of the newly created MediaItem as `mediaItemId`.
   */
  async uploadMedia({
    owner,
    filename,
    contentType,
  }: {
    owner: User;
    filename: string;
    contentType: string;
  }): Promise<{ mediaItemId: ID } | { error: string }> {
    if (!owner || typeof owner !== "string") {
      return { error: "Invalid owner ID provided." };
    }
    if (!filename || filename.length === 0) {
      return { error: "Filename cannot be empty." };
    }
    if (!contentType || contentType.length === 0) {
      return { error: "Content type cannot be empty." };
    }

    const newMediaItem: MediaItem = {
      _id: freshID(),
      owner: owner,
      filename: filename,
      contentType: contentType,
      uploadDate: new Date(),
    };

    try {
      await this.mediaItems.insertOne(newMediaItem);
      return { mediaItemId: newMediaItem._id };
    } catch (e) {
      console.error("Error uploading media:", e);
      return { error: "Failed to upload media." };
    }
  }

  /**
   * retrieveMedia (mediaItemId: ID): (mediaItem: {filename: String, contentType: String, uploadDate: Date}) | (error: String)
   *
   * **requires** `mediaItemId` is the ID of an existing MediaItem.
   *
   * **effects** Retrieves the specified MediaItem. Returns an object containing the `filename`,
   * `contentType`, and `uploadDate` of the MediaItem as `mediaItem`. If the MediaItem
   * does not exist, returns an error.
   */
  async retrieveMedia({
    mediaItemId,
  }: {
    mediaItemId: ID;
  }): Promise<
    | { mediaItem: { filename: string; contentType: string; uploadDate: Date } }
    | { error: string }
  > {
    if (!mediaItemId || typeof mediaItemId !== "string") {
      return { error: "Invalid media item ID provided." };
    }

    try {
      const mediaItem = await this.mediaItems.findOne(
        { _id: mediaItemId },
        { projection: { filename: 1, contentType: 1, uploadDate: 1 } },
      );

      if (!mediaItem) {
        return { error: "Media item not found." };
      }

      // MongoDB's _id is ObjectId, we are using string IDs.
      // Ensure the structure matches the expected output without _id
      return {
        mediaItem: {
          filename: mediaItem.filename,
          contentType: mediaItem.contentType,
          uploadDate: mediaItem.uploadDate,
        },
      };
    } catch (e) {
      console.error("Error retrieving media:", e);
      return { error: "Failed to retrieve media." };
    }
  }

  /**
   * getUserMedia (owner: User): (mediaItems: Array<{mediaItemId: ID, filename: String, contentType: String, uploadDate: Date}>) | (error: String)
   *
   * **requires** `owner` is a valid User ID.
   *
   * **effects** Retrieves all MediaItems owned by the specified `owner`. Returns an array of
   * objects, each containing the `mediaItemId`, `filename`, `contentType`, and `uploadDate`
   * for each media item. If no media items are found for the owner, returns an empty array.
   */
  async getUserMedia({ owner }: { owner: User }): Promise<
    | {
        mediaItems: Array<{
          mediaItemId: ID;
          filename: string;
          contentType: string;
          uploadDate: Date;
        }>;
      }
    | { error: string }
  > {
    if (!owner || typeof owner !== "string") {
      return { error: "Invalid owner ID provided." };
    }

    try {
      const mediaItems = await this.mediaItems
        .find({ owner: owner })
        .project({
          _id: 1,
          filename: 1,
          contentType: 1,
          uploadDate: 1,
        })
        .toArray();

      return {
        mediaItems: mediaItems.map((item) => ({
          mediaItemId: item._id,
          filename: item.filename,
          contentType: item.contentType,
          uploadDate: item.uploadDate,
        })),
      };
    } catch (e) {
      console.error("Error retrieving user media:", e);
      return { error: "Failed to retrieve user media." };
    }
  }

  /**
   * deleteMedia (mediaItemId: ID): Empty | { error: String }
   *
   * **requires** `mediaItemId` is the ID of an existing MediaItem.
   *
   * **effects** Deletes the specified MediaItem from storage. Returns an empty object on success.
   * If the MediaItem does not exist or an error occurs during deletion, returns an error.
   */
  async deleteMedia({
    mediaItemId,
  }: {
    mediaItemId: ID;
  }): Promise<Empty | { error: string }> {
    if (!mediaItemId || typeof mediaItemId !== "string") {
      return { error: "Invalid media item ID provided." };
    }

    try {
      const result = await this.mediaItems.deleteOne({ _id: mediaItemId });
      if (result.deletedCount === 0) {
        return { error: "Media item not found." };
      }
      return {};
    } catch (e) {
      console.error("Error deleting media:", e);
      return { error: "Failed to delete media." };
    }
  }
}
```
