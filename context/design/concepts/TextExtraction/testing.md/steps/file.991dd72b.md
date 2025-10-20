---
timestamp: 'Sun Oct 19 2025 22:20:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_222032.9903341b.md]]'
content_id: 991dd72bff79d60bdca47db47c49d61a22c99a8a7cd568c93e801455410d22f6
---

# file: src/concepts/TextExtraction/TextExtractionConcept.test.ts

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { testDb, closeDb } from "@utils/database.ts"; // Assuming testDb returns [Db, MongoClient]
import TextExtractionConcept from "./TextExtraction.ts"; // Assuming TextExtraction is the default export
import { ID } from "@utils/types.ts";
import { GeminiLLM } from "../gemini-llm.ts"; // Assuming gemini-llm.ts is in the same directory
import fs from "fs"; // For file operations
import path from "path"; // For path operations

// Mocking the GeminiLLM for predictable test results
class MockGeminiLLM extends GeminiLLM {
  async executeLLM(prompt: string, imagePath?: string): Promise<string> {
    console.log(`\n🧠 Mock Gemini LLM called with image: ${imagePath || 'no image'}`);
    console.log(`   Prompt starts with: ${prompt.substring(0, 100)}...`);

    // Simulate responses based on known test inputs or generic success/failure
    if (imagePath?.includes("test_image_with_text.png")) {
      return `
1: Hello World (from: {x:10, y:20}, to: {x:100, y:50})
2: This is a test. (from: {x:10, y:60}, to: {x:150, y:90})
Number of text blocks: 2
      `;
    } else if (imagePath?.includes("image_with_no_text.png")) {
      return "No text found";
    } else if (imagePath?.includes("image_with_overlap_test.png")) {
        return `
1: Overlapping Area (from: {x:50, y:50}, to: {x:150, y:100})
2: Another Block (from: {x:70, y:70}, to: {x:170, y:120})
Number of text blocks: 2
        `;
    }
     else if (imagePath?.includes("image_with_complex_text.png")) {
      return `
1: Document Title (from: {x:50, y:20}, to: {x:250, y:40})
2: Section 1.1 (from: {x:50, y:60}, to: {x:150, y:75})
3: Some important data 12345 (from: {x:50, y:80}, to: {x:250, y:100})
4: More details here. (from: {x:50, y:110}, to: {x:200, y:125})
Number of text blocks: 4
      `;
    }
    // Default or error case
    console.warn("Mock Gemini LLM received an unhandled image path. Returning default response.");
    return "Mock response for unhandled image.";
  }
}

// Helper to get a dummy image file path
const getDummyImagePath = (filename: string): ID => {
  // Ensure the dummy image file exists for testing
  // For actual execution, this file needs to be present.
  // If running in a CI environment, you might need to mock fs.existsSync and fs.promises.readFile as well.
  const dummyPath = path.resolve(filename);
  if (!fs.existsSync(dummyPath)) {
      // Create a placeholder if it doesn't exist for test to pass compilation
      // In a real test setup, you'd ensure this file is present.
      fs.writeFileSync(dummyPath, Buffer.from("dummy image content"));
      console.warn(`Created placeholder file: ${dummyPath}. For accurate results, replace with a real image containing text.`);
  }
  return dummyPath as ID;
};

// Helper to generate a fresh ID (mocked for tests if needed, but freshID from utils is preferred)
const freshID = async (): Promise<ID> => {
    // Use the utility function if available, otherwise mock it
    try {
        const { freshID: utilFreshID } = await import("@utils/database.ts");
        return utilFreshID();
    } catch (e) {
        console.warn("Could not import freshID from @utils/database.ts. Using a simple mock.");
        return Math.random().toString(36).substring(2, 15) as ID;
    }
};


// --- Test Setup ---
Deno.test("TextExtraction Concept Tests", async (t) => {
  const [db, client] = await testDb(); // Initializes DB and returns [Db, MongoClient]

  // Instantiate the concept with a mock LLM and dummy API key
  const textExtraction = new TextExtractionConcept(db, "dummy_api_key");
  // Replace the actual LLM with our mock
  (textExtraction as any).geminiLLM = new MockGeminiLLM();

  // --- Helper to verify state using queries ---
  const getExtractionsForImage = async (imagePath: ID): Promise<any[]> => {
    const results = await (textExtraction as any)._getAllExtractionsForImage({ imagePath });
    // Sort by textId to ensure consistent order for comparisons
    return results.sort((a: any, b: any) => a.textId.localeCompare(b.textId));
  };

  // --- Test for Operational Principle ---
  await t.step("Operational Principle: Extract text from an image", async () => {
    console.log("\n--- Testing Operational Principle ---");
    const testImagePath = getDummyImagePath("test_image_with_text.png");
    console.log(`Action: extractTextFromMedia(imagePath: "${testImagePath}")`);

    const result = await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
    console.log("Output:", JSON.stringify(result, null, 2));

    // Verify the result structure and extracted text
    assertEquals(result.extractedText, "Hello World");
    assertEquals(result.position.fromCoord, { x: 10, y: 20 });
    assertEquals(result.position.toCoord, { x: 100, y: 50 });
    assertEquals(result.imagePath, testImagePath);
    // textId is generated dynamically, we can check if it's a string and has the expected format
    assertEquals(typeof result.textId, "string");
    assertEquals(result.textId.startsWith(path.basename(testImagePath)), true);

    // Verify state persisted in DB
    const savedResults = await getExtractionsForImage(testImagePath);
    assertEquals(savedResults.length, 2); // Mocked to return 2 blocks

    // Check the first block specifically
    const firstSavedResult = savedResults.find(r => r.textId === result.textId);
    assertEquals(firstSavedResult?.extractedText, "Hello World");
    assertEquals(firstSavedResult?.position.fromCoord, { x: 10, y: 20 });
  });

  // --- Interesting Scenario 1: Image with no text ---
  await t.step("Interesting Scenario 1: Image with no text", async () => {
    console.log("\n--- Testing Scenario 1: Image with no text ---");
    const testImagePath = getDummyImagePath("image_with_no_text.png");
    console.log(`Action: extractTextFromMedia(imagePath: "${testImagePath}")`);

    // Mock LLM response for this path will be "No text found"
    const result = await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
    console.log("Output:", JSON.stringify(result, null, 2));

    // Verify that the output reflects no text found
    assertEquals(result.extractedText, "No text found");
    assertEquals(result.textId, ""); // Or whatever default empty textId is set
    assertEquals(result.position, { fromCoord: { x: 0, y: 0 }, toCoord: { x: 0, y: 0 } });

    const savedResults = await getExtractionsForImage(testImagePath);
    assertEquals(savedResults.length, 0); // No results should be saved if 'No text found'
  });

  // --- Interesting Scenario 2: Editing existing text and location ---
  await t.step("Interesting Scenario 2: Editing existing text and location", async () => {
    console.log("\n--- Testing Scenario 2: Editing existing text and location ---");
    const testImagePath = getDummyImagePath("test_image_with_text.png");

    // First, extract text to have something to edit
    await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
    const initialResults = await getExtractionsForImage(testImagePath);
    assertEquals(initialResults.length, 2);
    const firstExtractionId = initialResults[0].textId;

    // Edit extracted text
    const newText = "Hello Deno World!";
    console.log(`Action: editExtractText(extractedTextId: "${firstExtractionId}", newText: "${newText}")`);
    const updatedTextResult = await textExtraction.editExtractText({
      extractedTextId: firstExtractionId,
      newText: newText,
    });
    console.log("Edited Text Output:", JSON.stringify(updatedTextResult, null, 2));
    assertEquals(updatedTextResult.extractedText, newText);

    // Edit location
    const newFromCoord = { x: 15, y: 25 };
    const newToCoord = { x: 120, y: 55 };
    console.log(`Action: editLocation(extractedTextId: "${firstExtractionId}", fromCoord: ${JSON.stringify(newFromCoord)}, toCoord: ${JSON.stringify(newToCoord)})`);
    const updatedLocationResult = await textExtraction.editLocation({
      extractedTextId: firstExtractionId,
      fromCoord: newFromCoord,
      toCoord: newToCoord,
    });
    console.log("Edited Location Output:", JSON.stringify(updatedLocationResult, null, 2));
    assertEquals(updatedLocationResult.position.fromCoord, newFromCoord);
    assertEquals(updatedLocationResult.position.toCoord, newToCoord);

    // Verify state persistence
    const savedResults = await getExtractionsForImage(testImagePath);
    const editedResult = savedResults.find(r => r.textId === firstExtractionId);
    assertEquals(editedResult?.extractedText, newText);
    assertEquals(editedResult?.position.fromCoord, newFromCoord);
  });

  // --- Interesting Scenario 3: Adding a new extraction and deleting it ---
  await t.step("Interesting Scenario 3: Adding a new extraction and deleting it", async () => {
    console.log("\n--- Testing Scenario 3: Adding a new extraction and deleting it ---");
    const testImagePath = getDummyImagePath("test_image_with_text.png");

    // Add an initial extraction manually to ensure unique ID generation works correctly
    await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
    let currentResults = await getExtractionsForImage(testImagePath);
    assertEquals(currentResults.length, 2); // From initial operational principle test

    const newFromCoord = { x: 200, y: 200 };
    const newToCoord = { x: 300, y: 250 };
    const newExtractionText = "Manually Added";

    console.log(`Action: addExtractionTxt(imagePath: "${testImagePath}", fromCoord: ${JSON.stringify(newFromCoord)}, toCoord: ${JSON.stringify(newToCoord)})`);
    const addedResult = await textExtraction.addExtractionTxt({
      imagePath: testImagePath,
      fromCoord: newFromCoord,
      toCoord: newToCoord,
    });
    console.log("Added Extraction Output:", JSON.stringify(addedResult, null, 2));

    assertEquals(addedResult.extractedText, ""); // Initially empty
    assertEquals(addedResult.position.fromCoord, newFromCoord);
    assertEquals(addedResult.imagePath, testImagePath);
    assertEquals(typeof addedResult.textId, "string");
    assertEquals(addedResult.textId.startsWith(path.basename(testImagePath)), true);

    // Verify state persistence after adding
    currentResults = await getExtractionsForImage(testImagePath);
    assertEquals(currentResults.length, 3); // 2 from initial + 1 added

    // Now, edit the text of the added extraction
    console.log(`Action: editExtractText(extractedTextId: "${addedResult.textId}", newText: "${newExtractionText}")`);
    const updatedAddedResult = await textExtraction.editExtractText({
        extractedTextId: addedResult.textId,
        newText: newExtractionText,
    });
    assertEquals(updatedAddedResult.extractedText, newExtractionText);

    // Delete the added extraction
    console.log(`Action: deleteExtraction(textId: "${addedResult.textId}", imagePath: "${testImagePath}")`);
    const deleteOutput = await textExtraction.deleteExtraction({
      textId: addedResult.textId,
      imagePath: testImagePath,
    });
    console.log("Delete Output:", JSON.stringify(deleteOutput));
    assertEquals(deleteOutput, {}); // Should return Empty object

    // Verify state persistence after deletion
    currentResults = await getExtractionsForImage(testImagePath);
    assertEquals(currentResults.length, 2); // Back to original 2
    const deletedResultFound = currentResults.some(r => r.textId === addedResult.textId);
    assertEquals(deletedResultFound, false);
  });

  // --- Interesting Scenario 4: Adding an extraction that overlaps ---
  await t.step("Interesting Scenario 4: Adding an extraction that overlaps", async () => {
    console.log("\n--- Testing Scenario 4: Adding an extraction that overlaps ---");
    const testImagePath = getDummyImagePath("image_with_overlap_test.png");

    // Ensure the mock LLM handles this image
    await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
    let currentResults = await getExtractionsForImage(testImagePath);
    assertEquals(currentResults.length, 2); // From mock response

    const overlappingFromCoord = { x: 80, y: 80 }; // This overlaps with the second block from the mock
    const overlappingToCoord = { x: 180, y: 130 };

    console.log(`Action: addExtractionTxt(imagePath: "${testImagePath}", fromCoord: ${JSON.stringify(overlappingFromCoord)}, toCoord: ${JSON.stringify(overlappingToCoord)})`);
    // Expect an error to be thrown
    await assertThrows(
      async () => {
        await textExtraction.addExtractionTxt({
          imagePath: testImagePath,
          fromCoord: overlappingFromCoord,
          toCoord: overlappingToCoord,
        });
      },
      Error,
      "New extraction area overlaps with existing extraction",
    );

    // Verify state did not change
    currentResults = await getExtractionsForImage(testImagePath);
    assertEquals(currentResults.length, 2); // Should still be 2
  });

  // --- Interesting Scenario 5: Handling invalid coordinates ---
  await t.step("Interesting Scenario 5: Handling invalid coordinates", async () => {
    console.log("\n--- Testing Scenario 5: Handling invalid coordinates ---");
    const testImagePath = getDummyImagePath("test_image_with_text.png");

    // Test addExtractionTxt with negative coordinates
    console.log(`Action: addExtractionTxt(imagePath: "${testImagePath}", fromCoord: {x:-10, y:10}, toCoord: {x:50, y:50})`);
    await assertThrows(
      async () => {
        await textExtraction.addExtractionTxt({
          imagePath: testImagePath,
          fromCoord: { x: -10, y: 10 },
          toCoord: { x: 50, y: 50 },
        });
      },
      Error,
      "Invalid coordinates: Coordinates must be non-negative.",
    );

    // Test editLocation with negative coordinates
    // Need to add an initial extraction to edit it
    await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
    const initialResults = await getExtractionsForImage(testImagePath);
    const firstExtractionId = initialResults[0].textId;

    console.log(`Action: editLocation(extractedTextId: "${firstExtractionId}", fromCoord: {x:10, y:-5}, toCoord: {x:50, y:50})`);
    await assertThrows(
      async () => {
        await textExtraction.editLocation({
          extractedTextId: firstExtractionId,
          fromCoord: { x: 10, y: -5 },
          toCoord: { x: 50, y: 50 },
        });
      },
      Error,
      "Coordinates must be non-negative.",
    );
  });

  // --- Interesting Scenario 6: Testing deleteExtraction with non-existent ID ---
  await t.step("Interesting Scenario 6: Deleting non-existent extraction", async () => {
    console.log("\n--- Testing Scenario 6: Deleting non-existent extraction ---");
    const testImagePath = getDummyImagePath("test_image_with_text.png");

    // Ensure some data exists for the image first
    await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
    let currentResults = await getExtractionsForImage(testImagePath);
    assertEquals(currentResults.length, 2);

    const nonExistentTextId = "non_existent_id-999";
    console.log(`Action: deleteExtraction(textId: "${nonExistentTextId}", imagePath: "${testImagePath}")`);
    await assertThrows(
      async () => {
        await textExtraction.deleteExtraction({
          textId: nonExistentTextId,
          imagePath: testImagePath,
        });
      },
      Error,
      `ExtractionResult with textId "${nonExistentTextId}" for image "${testImagePath}" not found.`,
    );

    // Verify state did not change
    currentResults = await getExtractionsForImage(testImagePath);
    assertEquals(currentResults.length, 2);
  });

    // --- Interesting Scenario 7: Test with complex image text and multiple edits ---
    await t.step("Interesting Scenario 7: Complex image text and multiple edits", async () => {
        console.log("\n--- Testing Scenario 7: Complex image text and multiple edits ---");
        const testImagePath = getDummyImagePath("image_with_complex_text.png");

        // Extract text from complex image
        console.log(`Action: extractTextFromMedia(imagePath: "${testImagePath}")`);
        const initialResult = await textExtraction.extractTextFromMedia({ imagePath: testImagePath });
        console.log("Initial Extraction Output:", JSON.stringify(initialResult, null, 2));

        const initialResults = await getExtractionsForImage(testImagePath);
        assertEquals(initialResults.length, 4); // Mocked to return 4 blocks

        // Get the ID of the third block to edit
        const thirdBlockId = initialResults.find(r => r.extractedText.includes("Some important data"))?.textId;
        if (!thirdBlockId) throw new Error("Could not find the third text block ID.");
        console.log(`Found textId for 'Some important data 12345': ${thirdBlockId}`);

        // Edit text of the third block
        const updatedImportantData = "Crucial Data: 67890";
        console.log(`Action: editExtractText(extractedTextId: "${thirdBlockId}", newText: "${updatedImportantData}")`);
        const updatedTextResult = await textExtraction.editExtractText({
            extractedTextId: thirdBlockId,
            newText: updatedImportantData,
        });
        assertEquals(updatedTextResult.extractedText, updatedImportantData);

        // Edit location of the fourth block
        const fourthBlock = initialResults.find(r => r.extractedText.includes("More details here."));
        if (!fourthBlock) throw new Error("Could not find the fourth text block.");
        const fourthBlockId = fourthBlock.textId;

        const newFourthFromCoord = { x: 60, y: 115 };
        const newFourthToCoord = { x: 210, y: 130 };
        console.log(`Action: editLocation(extractedTextId: "${fourthBlockId}", fromCoord: ${JSON.stringify(newFourthFromCoord)}, toCoord: ${JSON.stringify(newFourthToCoord)})`);
        const updatedLocationResult = await textExtraction.editLocation({
            extractedTextId: fourthBlockId,
            fromCoord: newFourthFromCoord,
            toCoord: newFourthToCoord,
        });
        assertEquals(updatedLocationResult.position.fromCoord, newFourthFromCoord);
        assertEquals(updatedLocationResult.position.toCoord, newFourthToCoord);

        // Verify state persistence
        const finalResults = await getExtractionsForImage(testImagePath);
        const updatedThirdBlock = finalResults.find(r => r.textId === thirdBlockId);
        assertEquals(updatedThirdBlock?.extractedText, updatedImportantData);

        const updatedFourthBlock = finalResults.find(r => r.textId === fourthBlockId);
        assertEquals(updatedFourthBlock?.position.fromCoord, newFourthFromCoord);
        assertEquals(updatedFourthBlock?.position.toCoord, newFourthToCoord);
    });


  await client.close(); // Close the database connection
});

// Ensure the dummy images exist before running tests if they are not mocked
// For this setup, we will create placeholder files if they don't exist.
Deno.test("Ensure dummy images exist", () => {
    const filenames = [
        "test_image_with_text.png",
        "image_with_no_text.png",
        "image_with_overlap_test.png",
        "image_with_complex_text.png",
    ];
    for (const filename of filenames) {
        const filepath = path.resolve(filename);
        if (!fs.existsSync(filepath)) {
            console.warn(`Creating placeholder file for testing: ${filepath}`);
            // Create a minimal PNG that might be readable or at least not cause fs errors
            // A truly minimal valid PNG is complex, this is a basic placeholder.
            // For real testing, replace these with actual images.
            const placeholderData = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length and type
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // Width=1, Height=1
                0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // Bit depth, color type, compression, filter, interlace
                0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk length and type (empty IDAT for simplicity)
                0x54, 0x74, 0x45, 0x85, 0x64, 0x2A, 0x00, 0x00, // ...
                0x03, 0x02, 0x01, 0x00, 0x00, 0x00, 0x22, 0x44, // ...
                0x8C, 0x4F, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk and CRC
                0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // ...
            ]);
            fs.writeFileSync(filepath, placeholderData);
        }
    }
});
```

**Explanation of the Test File and Cases:**

1. **`MockGeminiLLM`**:
   * We've created a `MockGeminiLLM` class that extends the original `GeminiLLM`.
   * Its `executeLLM` method is overridden to return predefined JSON strings that simulate the AI's response for specific image filenames. This makes tests deterministic and avoids actual AI API calls.
   * The mock responses include text blocks, coordinates, and the "Number of text blocks" summary, matching the expected format from the `TextExtractionConcept`.
   * It handles different scenarios like "no text found" and specific images for overlap tests.

2. **`getDummyImagePath` Helper**:
   * This function ensures that dummy image files are present for testing. If they don't exist, it creates a basic placeholder file. **For truly accurate testing, you should replace these placeholder files with actual images containing text.**

3. **Test Structure**:
   * Tests use `Deno.test` with `t.step` for organizing different scenarios.
   * `testDb()` is used to get a database connection, and `client.close()` is called at the end to clean up.
   * The `TextExtractionConcept` is instantiated, and its `geminiLLM` property is replaced with an instance of `MockGeminiLLM`.

4. **Operational Principle Test**:
   * **Scenario**: Calls `extractTextFromMedia` with `test_image_with_text.png`.
   * **Verification**:
     * Checks the returned `ExtractionResult` for the correct `extractedText`, `position`, `imagePath`, and `textId` format.
     * Verifies that the data was persisted by querying all extractions for that image using `_getAllExtractionsForImage` and checking the count and content of the first saved result.

5. **Interesting Scenario 1: Image with no text**:
   * **Scenario**: Calls `extractTextFromMedia` with `image_with_no_text.png`.
   * **Verification**: Asserts that the returned result indicates "No text found" and that no `ExtractionResult` was saved to the database.

6. **Interesting Scenario 2: Editing existing text and location**:
   * **Scenario**:
     * First, it calls `extractTextFromMedia` to populate some initial data.
     * Then, it calls `editExtractText` to change the text of the first extracted block.
     * Next, it calls `editLocation` to modify the coordinates of the same block.
   * **Verification**: Checks that the returned results from the edit actions reflect the changes, and then verifies that these changes are persisted in the database.

7. **Interesting Scenario 3: Adding a new extraction and deleting it**:
   * **Scenario**:
     * Adds a new extraction area using `addExtractionTxt`.
     * Edits the text of this newly added extraction.
     * Deletes the added extraction using `deleteExtraction`.
   * **Verification**: Checks that the added extraction is present in the database with the correct initial state, that edits are applied, and that it is successfully removed, leaving the original extractions intact.

8. **Interesting Scenario 4: Adding an extraction that overlaps**:
   * **Scenario**: Uses `image_with_overlap_test.png` (where the mock LLM provides overlapping text blocks). It then attempts to `addExtractionTxt` with coordinates that are known to overlap with an existing one.
   * **Verification**: Uses `assertThrows` to confirm that an `Error` is thrown, specifically checking for the expected overlap error message. It also verifies that the state remains unchanged.

9. **Interesting Scenario 5: Handling invalid coordinates**:
   * **Scenario**: Tests both `addExtractionTxt` and `editLocation` with negative coordinate values.
   * **Verification**: Uses `assertThrows` to confirm that an `Error` is thrown with the appropriate "Coordinates must be non-negative" message.

10. **Interesting Scenario 6: Deleting non-existent extraction**:
    * **Scenario**: Attempts to `deleteExtraction` using a `textId` and `imagePath` that do not exist in the database.
    * **Verification**: Uses `assertThrows` to confirm that an `Error` is thrown, checking for the "not found" error message.

11. **Interesting Scenario 7: Complex image text and multiple edits**:
    * **Scenario**: Uses `image_with_complex_text.png` (with multiple text blocks and numbers). It extracts text, then edits the text of one block and the location of another.
    * **Verification**: Checks that the edits are applied correctly to the specific blocks and that the changes are persisted. This tests more granular editing on complex outputs.

12. **Dummy Image Creation**:
    * A final `Deno.test` block is included to create placeholder dummy image files if they don't exist. This is to ensure the `fs.existsSync` calls in the tests don't immediately fail, although for accurate results, real images are recommended.

To run these tests:

1. Make sure you have a `dummy_image.png` (or specific test image names) in your project root, ideally containing some text.
2. Ensure your `.env` file is set up for `MONGO_URL` and `GEMINI_API_KEY` (even though the latter is mocked, the `GeminiLLM` class might still try to read it if not perfectly mocked).
3. Run `deno test --allow-net --allow-read --allow-env src/concepts/TextExtraction/TextExtractionConcept.test.ts`. You might need to adjust `--allow-read` paths depending on your project structure.

This comprehensive set of tests covers the core functionality, edge cases, and error conditions of the `TextExtraction` concept.
