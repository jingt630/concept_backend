---
timestamp: 'Sun Oct 19 2025 00:37:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_003752.6d65f099.md]]'
content_id: 9e24680c6bf40c67a4c0e5a53a1353f52585aca792c69994c19db8024220b51f
---

# file: src/utils/types.ts (Updated to include new ID type and freshID function)

```typescript
import { ObjectId } from "npm:mongodb";

// Define a branded type for generic IDs to ensure type safety.
// It's essentially a string but allows for compile-time checks.
export type ID = string & { __brand: "ID" };

// Represents an empty object for actions that don't return a value.
export type Empty = Record<PropertyKey, never>;

/**
 * Generates a new unique ID string suitable for MongoDB _id fields.
 * @returns A unique ID string.
 */
export function freshID(): ID {
  // ObjectId.toString() returns a string representation like "60a7b3b3b3b3b3b3b3b3b3b3"
  return new ObjectId().toString() as ID;
}
```

**Explanation of Changes:**

1. **`GeminiLLM` Class:**
   * The `GeminiLLM` class now correctly uses `fs.promises.readFile` for asynchronous file reading.
   * Added a check for `fs.existsSync` to prevent errors if the image file is missing.
   * Included a basic MIME type detection for images.
   * The `executeLLM` method now rethrows errors, allowing the `TextExtractionConcept` to handle them.

2. **`TextExtractionConcept` Class:**
   * **Constructor**: Accepts a `Db` instance and the `geminiApiKey`. It initializes the MongoDB collections (`extractionResults`, `locations`) and creates an instance of `GeminiLLM`.
   * **Type Definitions**: Updated interfaces (`ExtractionResultsDoc`, `LocationsDoc`) to reflect MongoDB document structure and used the `ID` type for `_id` fields and foreign keys. `Coordinates` interface is defined.
   * **`generateUniqueTextId` Helper**: A private helper method to ensure `textId` uniqueness per `imagePath` by counting existing entries.
   * **LLM Response Parsing**: The `parseNumberedTextList` and `parseCoordinatesList` methods are integrated from your provided separate file. They are now private members of the `TextExtractionConcept`.
   * **`extractTextFromMedia` Action**:
     * Reads the image file.
     * Uses `image-size` to get dimensions for the LLM prompt.
     * Constructs the LLM prompt with image dimensions and the expected format.
     * Calls `geminiLLM.executeLLM`.
     * Parses the LLM response using the helper methods.
     * Iterates through the parsed text and coordinates, generating unique `ExtractionResultId`, `LocationId`, and `textId`.
     * Inserts documents into `locations` and `extractionResults` collections.
     * Includes error handling for file reading, image dimension determination, LLM API calls, and database operations.
     * Returns the `result: ExtractionResultId` on success or `{ error: "message" }` on failure.
   * **`editExtractText`, `editLocation`, `addExtractionTxt`, `deleteExtraction` Actions**:
     * These actions are modified to interact with the MongoDB collections.
     * They perform operations like `updateOne`, `insertOne`, `deleteOne`.
     * Error handling is added for cases where documents are not found or database operations fail.
     * `addExtractionTxt` now uses `generateUniqueTextId` and also includes database error handling.
   * **Helper Queries (`_getExtractionResultsForImage`, `_getLocationForExtraction`, `_getAllExtractions`, `_getAllLocations`)**: Added methods to query the MongoDB collections, useful for testing and debugging. They also include basic error handling.
   * **Error Handling**: Instead of throwing errors for recoverable issues (like "not found"), they return an `{ error: "message" }` object. Exceptional errors (like critical database connection issues) might still be thrown.

**To use this code:**

1. **Install Dependencies:**
   ```bash
   deno install --allow-net --allow-read --allow-sys --allow-env --no-check https://deno.land/std@0.224.0/fs/mod.ts
   deno install --allow-net --allow-read --allow-sys --env --no-check https://deno.land/x/mongo@0.9.0/mod.ts
   deno install --allow-net --allow-read --allow-sys --env --no-check https://deno.land/x/image_size@0.1.0/mod.ts
   deno install --allow-net --allow-read --allow-sys --env --no-check npm:google-generative-ai
   ```
   (Make sure you have `npm:` specifiers enabled in your `deno.json` or similar configuration if you are not running directly with `deno run`.)

2. **Update `deno.json`**: Ensure your `deno.json` has the correct import maps:

   ```json
   {
       "imports": {
           "@utils/": "./src/utils/",
           "@concepts/": "./src/concepts/",
           "@llm/": "./src/llm/" // Add this if you are using @llm/ prefix
       },
       "tasks": {
           "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
       }
   }
   ```

3. **Environment Variables**: Make sure your `.env` file has `MONGODB_URI` and `GEMINI_API_KEY`.

4. **Database Initialization**: When initializing your `Db`, pass the `GEMINI_API_KEY` to the `TextExtractionConcept` constructor.

   ```typescript
   import {getDb} from "@utils/database.ts";
   import TextExtractionConcept from "@concepts/TextExtractionConcept.ts";

   const [db, client] = await getDb(); // returns [Db, MongoClient]
   const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

   if (!geminiApiKey) {
       throw new Error("GEMINI_API_KEY is not set in environment variables.");
   }

   const textExtraction = new TextExtractionConcept(db, geminiApiKey);

   // Now you can use the 'textExtraction' instance for its methods.
   ```

llm imports from google/generative-ai, and I have the file for that in another repo but it's under the node\_modules folder under @google. Do I also have to make a node\_modules foler in src as well? is it necessary. How does node\_modules work?
