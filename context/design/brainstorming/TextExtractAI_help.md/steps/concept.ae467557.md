---
timestamp: 'Sat Oct 18 2025 23:17:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_231721.2431c05b.md]]'
content_id: ae4675570f105b584724091deb0baaaa43999287d55a9a366295416397310797
---

# concept: TextExtraction

* **concept**: TextExtraction
* **purpose**: Extract text from uploaded media for the AI to learn and translate.
* **principle**: Given a image from imagePath, the AI would run extraction to recognize text within the media, and produce a transcript with metadata for the image. One image can have many `ExtractionResult`s.
* **state**:
  * A set of `ExtractionResults` with
    * `imagePath` of type `FilePath`
    * `extractedText` of type `String`
    * `position` of type `Location`
    * `textId` of type `String`
  * A set of `Location` with
    * an `ExtractionResult`
    * two `Coordinate` (Number, Number)
* **actions**:
  * `extractTextFromMedia (image: FilePath): (result: ExtractionResult)`
    * **requires**: `image` exists in application and accessible.
    * **effects**: Creates a new `ExtractionResult` associated with the `image`, with the same `imagePath` string stored. `extractedText` will be the text the AI recognizes at `position`, and an unique `textId` is assigned out of all `ExtractionResult`s with the same `imagePath` because the same image can have many same words at different locations.
  * `editExtractText (extractedText: ExtractionResult, newText: String)`
    * **requires**: `extractedText` exists.
    * **effects**: Modifies `extractedText` in the `ExtractionResult` to `newText`.
  * `editLocation (extractedText: ExtractionResult, fromCoord: Coordinate, toCoord: Coordinate)`
    * **requires**: `extractedText` exists. The coordinates do not include negative numbers.
    * **effects**: Changes the `position` of `extractedText` to a new `Location` defined by `fromCoord` and `toCoord`, which specifies the area of the image that the `extractedText` occupies if a rectangle is drawn from `fromCoord` to `toCoord`.
  * `addExtractionTxt (media: FilePath, fromCoord: Coordinate, toCoord: Coordinate): (result: ExtractionResult)`
    * **requires**: `media` exists. Numbers are non-negative.
    * **effects**: Creates a new `ExtractionResult` with the same `media`, initializes `extractedText` as empty, assigns an unique `textId` based on the `filePath`, and sets the `position` created from the two given coordinates.
  * `deleteExtraction (textId: String, imagePath: FilePath)`
    * **requires**: `textId` exists in the `imagePath`.
    * **effects**: Removes the `ExtractionResult` with the specified `textId`.
