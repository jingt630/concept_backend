[@ConceptCode](../../src/concepts/TextExtraction/TextExtraction.ts)
[@apiFromCode](../tools/api-extraction-from-code.md)

# prompt generate an API spec on my back end concept code

# response:

Here's an API specification generated from your `TextExtractionConcept` backend code. This specification assumes a RESTful API design.

---

## API Specification: Text Extraction Concept

This API allows for the management of text extractions from media files, including automated extraction, manual editing of extracted text and its location, and adding/deleting manual extractions.

### Base Path

`/api/text-extraction` (or similar, depending on your application's routing)

---

### Endpoints

---

#### 1. Extract Text from Media

Extracts text from a given image file path using an AI service (simulated).

-   **HTTP Method:** `POST`
-   **Path:** `/api/text-extraction/extract`
-   **Description:** Initiates an automated text extraction process for a specified image.
-   **Requires:** The `image` must exist and be accessible within the application's context.

##### Request

-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "image": "FilePath" // e.g., "uploads/image123.jpg"
    }
    ```

##### Response

-   **Status:** `201 Created`
-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "result": "ExtractionResult" // The ID of the newly created extraction result
    }
    ```

---

#### 2. Edit Extracted Text

Modifies the `extractedText` for an existing `ExtractionResult`.

-   **HTTP Method:** `PUT`
-   **Path:** `/api/text-extraction/edit-text`
-   **Description:** Updates the textual content of a specific extraction.
-   **Requires:** `extractedText` (ID) must correspond to an existing extraction record.

##### Request

-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "extractedText": "ExtractionResult", // The ID of the extraction to modify
      "newText": "string"                // The new text content
    }
    ```

##### Response

-   **Status:**
    -   `200 OK`
        -   **Content-Type:** `application/json`
        -   **Body:** `{}` (Empty success object)
    -   `404 Not Found`
        -   **Content-Type:** `application/json`
        -   **Body:**
            ```json
            {
              "error": "ExtractionResult not found"
            }
            ```

---

#### 3. Edit Location of Extracted Text

Updates the positional coordinates of an existing `ExtractionResult`.

-   **HTTP Method:** `PUT`
-   **Path:** `/api/text-extraction/edit-location`
-   **Description:** Adjusts the bounding box (position) of a specific text extraction.
-   **Requires:**
    -   `extractedText` (ID) must correspond to an existing extraction record.
    -   `fromCoord` and `toCoord` must be non-negative numbers.

##### Request

-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "extractedText": "ExtractionResult", // The ID of the extraction whose location is to be modified
      "fromCoord": [Coordinate, Coordinate], // e.g., [10, 20] (x1, y1)
      "toCoord": [Coordinate, Coordinate]    // e.g., [100, 120] (x2, y2)
    }
    ```

##### Response

-   **Status:**
    -   `200 OK`
        -   **Content-Type:** `application/json`
        -   **Body:** `{}` (Empty success object)
    -   `400 Bad Request`
        -   **Content-Type:** `application/json`
        -   **Body:**
            ```json
            {
              "error": "Coordinates cannot be negative."
            }
            ```
    -   `404 Not Found`
        -   **Content-Type:** `application/json`
        -   **Body:**
            ```json
            {
              "error": "ExtractionResult not found"
            }
            ```

---

#### 4. Add Manual Extraction Text

Creates a new `ExtractionResult` manually for a given media file and coordinates, with an empty initial text.

-   **HTTP Method:** `POST`
-   **Path:** `/api/text-extraction/add-manual`
-   **Description:** Allows for the manual addition of a new text extraction area on an image, for later population of text.
-   **Requires:**
    -   `media` must exist.
    -   `fromCoord` and `toCoord` must be non-negative numbers.

##### Request

-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "media": "FilePath", // e.g., "uploads/document.png"
      "fromCoord": [Coordinate, Coordinate], // e.g., [50, 60] (x1, y1)
      "toCoord": [Coordinate, Coordinate]    // e.g., [150, 160] (x2, y2)
    }
    ```

##### Response

-   **Status:**
    -   `201 Created`
        -   **Content-Type:** `application/json`
        -   **Body:**
            ```json
            {
              "result": "ExtractionResult" // The ID of the newly created extraction result
            }
            ```
    -   `400 Bad Request`
        -   **Content-Type:** `application/json`
        -   **Body:**
            ```json
            {
              "error": "Coordinates cannot be negative."
            }
            ```

---

#### 5. Delete Extraction

Removes a specific `ExtractionResult` and its associated `Location`.

-   **HTTP Method:** `DELETE`
-   **Path:** `/api/text-extraction/delete`
-   **Description:** Deletes a text extraction identified by its `textId` and `imagePath`.
-   **Requires:** `textId` must exist within the specified `imagePath`.

##### Request

-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "textId": "TextId",       // e.g., "uploads/image123.jpg_0"
      "imagePath": "FilePath"   // e.g., "uploads/image123.jpg"
    }
    ```

##### Response

-   **Status:**
    -   `200 OK`
        -   **Content-Type:** `application/json`
        -   **Body:** `{}` (Empty success object)
    -   `404 Not Found`
        -   **Content-Type:** `application/json`
        -   **Body:**
            ```json
            {
              "error": "ExtractionResult not found with the given textId and imagePath."
            }
            ```

---

### Helper/Internal Endpoints (for Testing/Verification)

These endpoints might not be exposed directly in a production API or might require elevated permissions.

---

#### 6. Get All Extractions for an Image

Retrieves all `ExtractionResult` records associated with a given `imagePath`.

-   **HTTP Method:** `GET`
-   **Path:** `/api/text-extraction/image-extractions`
-   **Description:** Fetches all text extraction results for a specific image.

##### Request

-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "imagePath": "FilePath" // e.g., "uploads/another_image.png"
    }
    ```

##### Response

-   **Status:** `200 OK`
-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "results": [
        {
          "_id": "ExtractionResult",
          "imagePath": "FilePath",
          "extractedText": "string",
          "position": "Location",
          "textId": "TextId"
        }
        // ... more ExtractionResult objects
      ]
    }
    ```

---

#### 7. Get Location for a Specific Extraction

Retrieves the `Location` details for a given `ExtractionResult` ID.

-   **HTTP Method:** `GET`
-   **Path:** `/api/text-extraction/extraction-location`
-   **Description:** Provides the spatial coordinates for a particular text extraction.

##### Request

-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "extractionResultId": "ExtractionResult" // The ID of the extraction result
    }
    ```

##### Response

-   **Status:** `200 OK`
-   **Content-Type:** `application/json`
-   **Body:**
    ```json
    {
      "location": [
        {
          "_id": "Location",
          "extractionResultId": "ExtractionResult",
          "fromCoord": [Coordinate, Coordinate],
          "toCoord": [Coordinate, Coordinate]
        }
        // Note: The code returns an array, though it's likely a 1:1 relationship in practice.
      ]
    }
    ```

---

### Data Types

-   **ID:** Represents a unique identifier, typically a string representation of an `ObjectId` (e.g., `"65b5d1a8e7b9c0d1e2f3a4b5"`).
-   **FilePath:** An `ID` type representing the path or identifier of an image/media file.
-   **ExtractionResult:** An `ID` type representing a unique text extraction event.
-   **Location:** An `ID` type representing a unique spatial position on an image.
-   **Coordinate:** A `number` representing a single dimension of a point (e.g., x or y).
-   **TextId:** A `string` designed to uniquely identify extracted text within a specific `imagePath` (e.g., `"image.jpg_0"`).
-   **Empty:** An empty JSON object `{}`.

---