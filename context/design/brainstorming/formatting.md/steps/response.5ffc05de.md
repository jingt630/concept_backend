---
timestamp: 'Thu Oct 16 2025 18:03:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_180312.12e51bdb.md]]'
content_id: 5ffc05de8001756952892da3379832b23782f1d4778371537c449fabd094b74a
---

# response:

## Concept: MediaManagement

**Purpose:** Storage and organization of image files for a *single, local user*. This concept manages the lifecycle of uploaded image files, including their metadata and associations with processing results.

**Principle:** User can upload a media file with its type to a filePath in the system. The file can be deleted, moved to other folders. When the file gets translated, the context the AI learned from it will also be associated with the media.

***

### State

**MediaFile**

* `id`: String
* `filename`: String
* `filePath`: String
* `mediaType`: String
* `uploadDate`: Timestamp
* `updateDate`: Timestamp
* `context?`: Optional\[String]  *A reference (dictionary of string:string) to the result of text extraction for this media. It's optional because it's populated *after* upload and extraction.*
* `translatedText?`: Optional\[String] *A rendered translated versions of the context (also dictionary of string:string). It's optional initially and populated as rendering occurs.*

***

### Actions

#### `upload`

* **Signature:** `upload(filePath: String, mediaType: String, filename: String, relativePath: String): MediaFile`
* **Requirements:**
  * `filename` must consist of only alphabets, numbers, and spaces.
  * `filePath` must specify a valid path within the app's managed storage.
  * `relativePath` must be a valid pathway on the user's computer and must include the `mediaType` extension.
* **Effects:**
  * Creates a new `MediaFile` object with a unique `id`.
  * Assigns the provided `filename`, `filePath` (within the app folder on the user's computer), `mediaType`, `uploadDate`, and sets `updateDate` to the same date as `uploadDate`.
  * Initializes `context` to `None`.
  * Initializes `translatedText` to `None`.
  * Returns the newly created `MediaFile`.

#### `delete`

* **Signature:** `delete(mediaId: String)`
* **Requirements:**
  * `mediaId` must correspond to an existing `MediaFile` locally within the app.
* **Effects:**
  * Removes the `MediaFile` object from the app.

#### `move`

* **Signature:** `move(mediaId: String, newFilePath: String)`
* **Requirements:**
  * `mediaId` must exist.
  * `newFilePath` must specify a valid pathway within the app's managed storage.
* **Effects:**
  * Updates the `filePath` of the `MediaFile` object corresponding to `mediaId` to the new location.
  * Physically moves the file data in app storage. (*App storage is within the user's local storage.*)

#### `createFolder`

* **Signature:** `createFolder(filePath: String, name: String)`
* **Requirements:**
  * `filePath` must be valid.
  * `name` must be unique within the folder specified by `filePath`.
* **Effects:**
  * Creates a new folder structure within the app's managed storage.

#### `updateContext`

* **Signature:** `updateContext(mediaId: String, extractionResult: Dictionary[String:String])`
* **Requirements:**
  * `mediaId` must exist.
  * `extractionResult` must be a valid structured dictionary of strings to strings, providing information about the text within the media file identified by `mediaId`. (*This action is intended to be called by the app only; the `extractionResult` will always correspond to the `mediaId`.*)
* **Effects:**
  * Updates the `context` field of the `MediaFile` corresponding to `mediaId` with the provided `extractionResult`.

#### `addTranslatedText`

* **Signature:** `addTranslatedText(mediaId: String, translatedText: Dictionary[String:String])`
* **Requirements:**
  * `mediaId` must exist.
  * `translatedText` must be a valid structured dictionary of strings to strings, providing information about the text within the media file identified by `mediaId`. (*This action is intended to be called by the app only; the `translatedText` will always correspond to the `mediaId`.*)
* **Effects:**
  * Appends the provided `translatedText` to the `translatedText` field of the `MediaFile` corresponding to `mediaId`.
