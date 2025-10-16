---
timestamp: 'Thu Oct 16 2025 18:30:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_183014.b55d0eb6.md]]'
content_id: 9110a1f82c8361ac32ebfa7258609efce1a43152ad9ce43eeb7a502e2ece4c7a
---

# Revised Concept 1: MediaManagement (Focusing on Clarity and Addressing Feedback)

**Concept:** MediaManagement

**Purpose:** Storage and organization of image files for a *single, local user*. This concept manages the lifecycle of uploaded image files, including their metadata and associations with processing results.

**Principle:** User can upload a media file with its type to a filePath in the system. The file can be deleted, moved to other folders. When the file gets translated, the context the AI learned from it will also be associated with the media.

**State**

A set of `MediaFile` with:

* `id` (String): A unique identifier for the media file.
* `filename` (String): The original name of the uploaded file.
* `filePath` (String): The path within the application's managed storage where the file is located.
* `mediaType` (String): e.g., "png", "jpg", "webp".
* `uploadDate` (Timestamp): When the file was uploaded.
* `updateDate` (Timestamp): The last time this `MediaFile`'s metadata was updated.
* `context?` (Optional\[String]): A reference (dictionary of string:string) to the result of text extraction for this media. It's optional because it's populated *after* upload and extraction.
* `translatedText?` (Optional\[String]): A rendered translated versions of the context (also dictionary of string:string). It's optional initially and populated as rendering occurs.

**Actions**

* `upload(filePath: String, mediaType: String, filename: String, relativePath: String): MediaFile`
  * **Require:** `filename` is alphabets and numbers and space only. `filePath` specifies a valid path within the app's managed storage. `relativePath` is a valid pathway on the user's computer and has the `mediaType`.
  * **Effect:**
    * Creates a new `MediaFile` object with a unique `id`, the provided `filename`, `filePath` (inside the app folder in the user's computer), `mediaType`, `uploadDate`, and initiate `updateDate` as the same date the file is uploaded.
    * Initializes `context` to `None` and `translatedVersions` to `None`.
    * Returns the newly created `MediaFile`.

* `delete(mediaId: String)`
  * **Require:** `mediaId` corresponds to an existing `MediaFile` in the app locally.
  * **Effect:**
    * Removes the `MediaFile` object from the app.

* `move(mediaId: String, newFilePath: String)`
  * **Require:** `mediaId` exists. `newRelativePath` specifies a valid pathway within the app.
  * **Effect:**
    * Updates the `filePath` of the `MediaFile` object corresponding to `mediaId` to reflect the new location.Physically moves the file data in app storage.\[^1]

\[^1:] App storage is within the user's local storage.

* `createFolder(filePath: String, name: String)`
  * **Require:** `filePath` is valid. `name` is unique within the folder the `filePath`.
  * **Effect:** Creates a new folder structure within the app's managed storage.

* `updateContext(mediaId: String, extractionResult: Dictionary[String:String])`
  * **Require:** `mediaId` exists. `extractionResult` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId.\[^2]
  * **Effect:** Updates the `context` field of the `MediaFile` corresponding to `mediaId` with the provided `extractionResult`.

* `addTranslatedText(mediaId: String, translatedText: Dictionary[String:String])`
  * **Require:** `mediaId` exists. `translatedText` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId.\[^2]
  * **Effect:** Appends the `outputVersion` to the `translatedVersions` list of the `MediaFile` corresponding to `mediaId`.
    \[^2:] These two actions aren't accessible by users, they are meant to be called by the app only, and so the translatedText or extractionResult given always corresponds to the media identified by mediaId.

Given the concept design, implement the code for it and make sure it's preserving modularity.
