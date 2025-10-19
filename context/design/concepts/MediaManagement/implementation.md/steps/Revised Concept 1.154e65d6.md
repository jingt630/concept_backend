---
timestamp: 'Sat Oct 18 2025 21:24:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_212421.46f0c611.md]]'
content_id: 154e65d619418ffd6fb03ef04da4978ff1486fd59e4a3046c33a84ba58b8063b
---

# Revised Concept 1: MediaManagement (Focusing on Clarity and Addressing Feedback)

**Concept:** MediaManagement\[Users]

**Purpose:** Cloud storage and organization of image files for a *single user*. \[^3] This concept manages the lifecycle of uploaded image files, including their metadata and associations with processing results.

**Principle:** User can upload a media file with its type to a filePath in the system. The file can be deleted, moved to other folders only by the owner. When the file gets translated, the context the AI learned from it will also be associated with the media.

**State**

A set of `MediaFile` with:

* `id` (String): A unique identifier for the media file.
* `filename` (String): The original name of the uploaded file.
* `filePath` (String): The path within local storage where the file is located.
* `mediaType` (String): e.g., "png", "jpg", "webp".
* `cloudURL` (String): The path in the cloud storage that represents this MediaFile.
* `uploadDate` (Timestamp): When the file was uploaded.
* `updateDate` (Timestamp): The last time this `MediaFile`'s metadata was updated.
* `context?` (Optional\[String]): A reference (dictionary of string:string) to the result of text extraction for this media. It's optional because it's populated *after* upload and extraction.
* `translatedText?` (Optional\[String]): A rendered translated versions of the context (also dictionary of string:string). It's optional initially and populated as rendering occurs.

**Actions**

* `upload( filePath: String, mediaType: String, filename: String, relativePath: String): MediaFile`
  * **Require:** `filename` is alphabets and numbers and space only. `filePath` specifies a valid path within the app's managed storage. `relativePath` is a valid pathway on the user's computer and has the `mediaType`.
  * **Effect:**
    * Creates a new `MediaFile` object with a unique `id`, the provided `filename`, `filePath` (inside the app folder in the user's computer), `mediaType`, `uploadDate`, and initiate `updateDate` as the same date the file is uploaded.
    * Initializes `context` to `None` and `translatedVersions` to `None`.
    * The owner of the MedialFile is user.
    * Returns the newly created `MediaFile`.

* `delete(mediaId: String)`
  * **Require:** `mediaId` corresponds to an existing `MediaFile`
  * **Effect:**
    * Removes the `MediaFile` object from system and so user is not the owner of it anymore.

* `move(mediaId: String, newFilePath: String)`
  * **Require:** `mediaId` exists. `newRelativePath` specifies a valid pathway within the storage workspace for the user.
  * **Effect:**
    * Updates the `filePath` of the `MediaFile` object corresponding to `mediaId` to reflect the new location.Physically moves the file data in app storage.\[^1]

\[^1:] App storage is within the user's local storage. The cloudURL doesn't change, so still same spot in the cloud. User is not allowed to touch the cloud anyway.

* `createFolder(filePath: String, name: String)`
  * **Require:** `filePath` is valid. `name` is unique within the folder the `filePath`.
  * **Effect:** Creates a new folder structure within the app's managed storage.

* `updateContext(mediaId: String, extractionResult: Dictionary[String:String])`
  * **Require:** `mediaId` exists. `extractionResult` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId. \[^2]
  * **Effect:** Updates the `context` field of the `MediaFile` corresponding to `mediaId` with the provided `extractionResult`.
    If context field doesn't exist, create one and updates with extractionResult.

* `addTranslatedText(mediaId: String, translatedText: Dictionary[String:String])`
  * **Require:** `mediaId` exists. `translatedText` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId.\[^2]
  * **Effect:** Appends the `outputVersion` to the `translatedVersions` list of the `MediaFile` corresponding to `mediaId`.
    \[^2:] These two actions aren't accessible by users, they are meant to be called by the app only, and so the translatedText or extractionResult given always corresponds to the media identified by mediaId.

\[^3:] It's never possible for the user have any interaction with other users of the application. The database only stores the most recent version of an editable MediaFile through a cloudURL. The computer can only access the MediaFile stored
in the cloudURL. No worry of other computers accessing the same MediaFile.
