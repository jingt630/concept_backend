---
timestamp: 'Sun Oct 19 2025 00:31:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_003137.bc39859c.md]]'
content_id: 8f73830fd63069ee796e02886ca24890cdcb5b25337359ecad3f62e0de655a30
---

# response:

Okay, let's refactor the `TextExtraction` class to integrate with MongoDB and utilize the provided `GeminiLLM` for text extraction.

Here's the breakdown of the changes:

1. **MongoDB Integration**:
   * The `TextExtraction` class will now have a constructor that accepts a `Db` instance from MongoDB.
   * It will define MongoDB collections for `ExtractionResults` and `Locations`.
   * Actions will interact with these MongoDB collections for persistence.
   * We'll use the `ID` type for our MongoDB `_id` fields and manage IDs as strings as per the instructions.

2. **GeminiLLM Integration**:
   * The `extractTextFromMedia` action will now instantiate and use the `GeminiLLM` class.
   * The LLM prompt will be dynamically constructed with image dimensions.

3. **State Management**:
   * The `results` array in the `TextExtraction` class will be removed. All state will be managed in MongoDB.
   * The `ExtractionResult` and `Location` interfaces will be adapted to match the MongoDB schema.

4. **Error Handling**:
   * Errors will be returned as `{ error: "message" }` for recoverable errors, and thrown for exceptional cases.

5. **Helper Queries**:
   * Added helper queries to fetch data from MongoDB, useful for testing and verification.

Here's the updated code:
