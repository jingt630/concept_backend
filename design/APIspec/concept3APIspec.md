[@ConceptCode](../../src/concepts/Translation/Translation.ts)
[@apiFromCode](../tools/api-extraction-from-code.md)

# prompt generate an API spec on my back end concept code

# response:

Based on your `TranslationConcept` backend code, here's a comprehensive API specification using an OpenAPI (Swagger) format. This spec outlines the available endpoints, their functionalities, request/response formats, and potential error scenarios.

---

```yaml
openapi: 3.0.0
info:
  title: Translation Service API
  version: 1.0.0
  description: API for managing text translations, leveraging a Gemini LLM for AI-driven translation.

servers:
  - url: /api/v1 # Assuming a base path for your API
    description: Main API server

tags:
  - name: Translations
    description: Operations related to managing text translations.

components:
  schemas:
    Translation:
      type: object
      description: Represents a single translation entry.
      properties:
        _id:
          type: string
          description: Unique identifier for the translation. Generated in the format `originalTextId:targetLanguage:timestamp`.
          example: "original_abc_123:en:1678886400000"
        imagePath:
          type: string
          description: Path to the image associated with the original text (if applicable).
          example: "/images/document_scan_001.png"
        targetLanguage:
          type: string
          description: The language the text was translated into (e.g., "en", "fr", "es").
          example: "fr"
        originalTextId:
          type: string
          description: The unique identifier of the original text from which this translation was derived.
          example: "original_abc_123"
        translatedText:
          type: string
          description: The actual text translated by the AI into the target language.
          example: "Ceci est un exemple de texte traduit."
      required:
        - _id
        - imagePath
        - targetLanguage
        - originalTextId
        - translatedText

    TranslationCreationRequest:
      type: object
      description: Data required to create a new translation.
      properties:
        imagePath:
          type: string
          description: Path to the image associated with the original text.
          example: "/images/document_scan_001.png"
        targetLanguage:
          type: string
          description: The desired language for the translation (e.g., "en", "fr").
          example: "fr"
        originalText:
          type: string
          description: The original text that needs to be translated.
          example: "This is an example text to be translated."
        originalTextId:
          type: string
          description: A unique identifier for the original text.
          example: "original_abc_123"
      required:
        - imagePath
        - targetLanguage
        - originalText
        - originalTextId

    TranslationIdResponse:
      type: object
      description: Response containing the ID of a translation.
      properties:
        translation:
          type: string
          description: The unique ID of the created or updated translation.
          example: "original_abc_123:fr:1678886400000"
      required:
        - translation

    EditTextRequest:
      type: object
      description: Data required to edit an existing translation's text.
      properties:
        newText:
          type: string
          description: The new translated text to update.
          example: "Le texte a été mis à jour manuellement."
      required:
        - newText

    ChangeLanguageRequest:
      type: object
      description: Data required to change the target language of an existing translation.
      properties:
        newTargetLang:
          type: string
          description: The new target language for the translation (e.g., "es").
          example: "es"
      required:
        - newTargetLang

    ErrorResponse:
      type: object
      description: Standard error response format.
      properties:
        error:
          type: string
          description: A descriptive error message.
          example: "Translation with ID original_abc_123:fr:1678886400000 not found."
      required:
        - error

paths:
  /translations:
    post:
      summary: Create a new translation
      description: |
        Generates a new `Translation` entry using the Gemini LLM by translating the `originalText` into the `targetLanguage`.
        The newly created translation is stored in the database.
      tags:
        - Translations
      requestBody:
        description: Translation details for creation.
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TranslationCreationRequest'
      responses:
        '201':
          description: Translation created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TranslationIdResponse'
        '400':
          description: Bad Request (e.g., invalid input, missing required fields).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal Server Error (e.g., LLM translation failure, database error).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /translations/{translationId}:
    parameters:
      - in: path
        name: translationId
        schema:
          type: string
          description: Unique identifier of the translation (TransTextId).
          example: "original_abc_123:fr:1678886400000"
        required: true
    get:
      summary: Retrieve a translation by ID
      description: Returns a single `Translation` object identified by its unique `translationId`.
      tags:
        - Translations
      responses:
        '200':
          description: Translation found. Returns an array as per the backend method signature, though typically a single object.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Translation'
                maxItems: 1 # Expected to return at most one item for a specific ID
        '404':
          description: Translation not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                NotFound:
                  value:
                    error: "Translation with ID original_abc_123:fr:1678886400000 not found."
        '500':
          description: Internal Server Error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    patch:
      summary: Edit the translated text of an existing translation
      description: Updates only the `translatedText` field of an existing translation.
      tags:
        - Translations
      requestBody:
        description: New translated text.
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EditTextRequest'
      responses:
        '200':
          description: Translation text updated successfully.
          content:
            application/json:
              schema:
                type: object # Represents an empty success response
        '404':
          description: Translation not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal Server Error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /translations/{translationId}/language:
    parameters:
      - in: path
        name: translationId
        schema:
          type: string
          description: Unique identifier of the translation (TransTextId) to modify.
          example: "original_abc_123:fr:1678886400000"
        required: true
    patch:
      summary: Change the target language of a translation
      description: |
        Changes the `targetLanguage` of an existing translation and automatically regenerates the `translatedText`
        in the `newTargetLang` using the AI.
      tags:
        - Translations
      requestBody:
        description: New target language.
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChangeLanguageRequest'
      responses:
        '200':
          description: Language changed and translation re-generated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TranslationIdResponse'
        '404':
          description: Translation not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal Server Error (e.g., LLM translation failure, database error).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /translations/by-original-text/{originalTextId}:
    parameters:
      - in: path
        name: originalTextId
        schema:
          type: string
          description: Unique identifier of the original text (OriginalTextId).
          example: "original_abc_123"
        required: true
    get:
      summary: Retrieve translations by original text ID
      description: Returns all `Translation` objects associated with a given `originalTextId`.
      tags:
        - Translations
      responses:
        '200':
          description: Translations found. Returns an array, potentially empty if no translations exist.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Translation'
        '500':
          description: Internal Server Error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

---

### Key Decisions and Assumptions:

1.  **API Endpoints and HTTP Methods**:
    *   `createTranslation` maps to `POST /translations`.
    *   `editTranslation` maps to `PATCH /translations/{translationId}`. (PATCH is chosen over PUT as it's a partial update of `translatedText`).
    *   `changeLanguage` maps to `PATCH /translations/{translationId}/language`. (Could also be `PATCH /translations/{translationId}` with a different body, but a dedicated endpoint for language change is clearer).
    *   `_getTranslationById` maps to `GET /translations/{translationId}`. (Ignoring the `_` prefix as it implies an internal method, but for API spec, we assume it's exposed).
    *   `_getTranslationsByOriginalTextId` maps to `GET /translations/by-original-text/{originalTextId}`. (Alternatively, `/original-texts/{originalTextId}/translations` could be used if `original-text` is a distinct top-level concept).

2.  **Request and Response Bodies**:
    *   Follows JSON format.
    *   Defined schemas for clarity and consistency.
    *   For `editTranslation` returning `Empty`, the spec shows an empty JSON object `{}`.

3.  **Error Handling**:
    *   The backend code's error handling for `_getTranslationById` and `_getTranslationsByOriginalTextId` (`return [{ error: ... } as any];`) is unconventional for REST APIs. This spec assumes a more standard approach:
        *   `404 Not Found` for resources not found (e.g., `translationId`).
        *   `500 Internal Server Error` for unexpected server-side issues (e.g., database failures, LLM errors).
        *   `400 Bad Request` for client-side validation errors (though the current code mostly catches runtime errors as 500s).
    *   A consistent `ErrorResponse` schema `{ error: string }` is used.

4.  **`ID` and `Empty` Types**:
    *   `ID` (FilePath, OriginalTextId) and `TransTextId` are treated as `string` in the API spec.
    *   `Empty` is represented as an empty object in successful responses.

5.  **`imagePath`**: Included in `createTranslation` request body and `Translation` schema, aligning with your `Translations` interface, even if the current `geminiLLM.executeLLM` doesn't explicitly use it for the prompt.

6.  **`_` prefix for query methods**: The spec assumes `_getTranslationById` and `_getTranslationsByOriginalTextId` are intended to be exposed as public API endpoints, despite their `_` prefix. If they are truly internal, they should not appear in the API spec.