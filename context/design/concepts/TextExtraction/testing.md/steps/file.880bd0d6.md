---
timestamp: 'Sun Oct 19 2025 22:18:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_221845.c46ac474.md]]'
content_id: 880bd0d6617b2969cc91b3518ef75b1b8db5e306727acdf279bd0c490cc0f00d
---

# file: src/concepts/TextExtraction/TextExtractionConcept.test.ts

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { testDb, closeDb, freshID } from "@utils/database.ts"; // Assuming testDb is available for setup/teardown
import { ID } from "@utils/types.ts";
import TextExtractionConcept, {
  ExtractionResult,
} from "./TextExtraction.ts"; // Correct import path
import fs from "fs";
import path from "path";

// Helper function to get a testable instance of TextExtractionConcept
async function createConceptInstance(): Promise<{
  concept: TextExtractionConcept;
  db: any; // Use 'any' or specific Db type if available
  client: any; // Use 'any' or specific MongoClient type if available
  imagePath: ID;
}> {
  const [db, client] = await testDb();
  const imagePath = "data/test_image.png" as ID; // Path to a dummy image file

  // Ensure dummy image exists for testing
  if (!fs.existsSync("data")) {
    fs.mkdirSync("data", { recursive: true });
  }
  // Create a minimal dummy image file if it doesn't exist.
  // For actual AI interaction, a real image with text is needed.
  if (!fs.existsSync(imagePath)) {
    // Create a placeholder file. For AI interaction, this would need to be a real image.
    // For now, we'll create an empty file, assuming the GeminiLLM mock or actual API will handle it.
    // If using a real API, this placeholder won't work, and you'd need a valid image.
    const placeholderImageContent = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]); // Minimal valid PNG data
    fs.writeFileSync(imagePath, placeholderImageContent);
    console.log(`Created dummy image: ${imagePath}`);
  }

  // Mocking the LLM API key for the concept's constructor
  const mockApiKey = "dummy-api-key";
  const concept = new TextExtractionConcept(db, mockApiKey);
  return { concept, db, client, imagePath };
}

Deno.test("TextExtraction - Operational Principle", async () => {
  console.log("\n--- Testing TextExtraction: Operational Principle ---");
  const { concept, db, client, imagePath } = await createConceptInstance();

  try {
    // Principle: Given an image from imagePath, the AI would run extraction to recognize text within the media,
    // and produce a transcript with metadata for the image. One image can have many ExtractionResults.

    console.log(`1. Extracting text from: ${imagePath}`);
    const result1 = await concept.extractTextFromMedia({ imagePath });
    console.log(`   Output: ${JSON.stringify(result1, null, 2)}`);
    assertEquals(result1.imagePath, imagePath);
    // We expect some text, even if it's "No text found" from a dummy image.
    // If using a real image, assert on expected text.
    // For this test, we'll check if extraction was attempted and some data is returned.
    console.log("   Verification: Text extraction process initiated. Result contains imagePath.");

    // Simulate fetching extracted results for verification
    const allExtractions = await concept._getAllExtractionsForImage({ imagePath });
    console.log(`   All extractions for ${imagePath}:`, JSON.stringify(allExtractions, null, 2));
    assertEquals(allExtractions.length > 0, true, "Expected at least one extraction result after processing.");
    assertEquals(allExtractions.every(r => r.imagePath === imagePath), true, "All extracted results should reference the correct imagePath.");

    // Test editing extracted text
    console.log(`2. Editing extracted text for result with textId: ${allExtractions[0].textId}`);
    const newText = "Updated text from image";
    const updatedResultText = await concept.editExtractText({
      extractedTextId: allExtractions[0].textId,
      newText: newText,
    });
    console.log(`   Updated text: ${updatedResultText.extractedText}`);
    assertEquals(updatedResultText.extractedText, newText, "Extracted text should be updated.");
    console.log("   Verification: Extracted text successfully updated.");

    // Test editing location
    console.log(`3. Editing location for result with textId: ${allExtractions[0].textId}`);
    const newFromCoord = { x: 100, y: 100 };
    const newToCoord = { x: 200, y: 200 };
    const updatedResultLocation = await concept.editLocation({
      extractedTextId: allExtractions[0].textId,
      fromCoord: newFromCoord,
      toCoord: newToCoord,
    });
    console.log(`   Updated location: from ${JSON.stringify(updatedResultLocation.position.fromCoord)}, to ${JSON.stringify(updatedResultLocation.position.toCoord)}`);
    assertEquals(updatedResultLocation.position.fromCoord, newFromCoord, "From coordinate should be updated.");
    assertEquals(updatedResultLocation.position.toCoord, newToCoord, "To coordinate should be updated.");
    console.log("   Verification: Location successfully updated.");

    // Test adding a new extraction
    console.log(`4. Adding a new manual extraction to ${imagePath}`);
    const manualFromCoord = { x: 50, y: 50 };
    const manualToCoord = { x: 150, y: 150 };
    const addedResult = await concept.addExtractionTxt({
      imagePath: imagePath,
      fromCoord: manualFromCoord,
      toCoord: manualToCoord,
    });
    console.log(`   Added result: ${JSON.stringify(addedResult, null, 2)}`);
    assertEquals(addedResult.imagePath, imagePath, "Added result should have the correct imagePath.");
    assertEquals(addedResult.extractedText, "", "Added result should have empty extractedText.");
    assertEquals(addedResult.position.fromCoord, manualFromCoord, "Added result should have correct fromCoord.");
    assertEquals(addedResult.position.toCoord, manualToCoord, "Added result should have correct toCoord.");
    console.log("   Verification: New extraction successfully added.");

    const allExtractionsAfterAdd = await concept._getAllExtractionsForImage({ imagePath });
    assertEquals(allExtractionsAfterAdd.length, allExtractions.length + 1, "Should have one more extraction after adding.");

    // Test deleting an extraction
    console.log(`5. Deleting extraction with textId: ${allExtractionsAfterAdd[0].textId}`);
    await concept.deleteExtraction({
      textId: allExtractionsAfterAdd[0].textId,
      imagePath: imagePath,
    });
    console.log("   Verification: Deletion initiated.");

    const allExtractionsAfterDelete = await concept._getAllExtractionsForImage({ imagePath });
    assertEquals(allExtractionsAfterDelete.length, allExtractions.length, "Should have one less extraction after deletion.");
    console.log("   Verification: Extraction successfully deleted.");

  } finally {
    await client.close();
    // Clean up dummy image
    if (fs.existsSync("data/test_image.png")) {
      fs.unlinkSync("data/test_image.png");
    }
    if (fs.existsSync("data") && fs.readdirSync("data").length === 0) {
        fs.rmdirSync("data");
    }
  }
});

Deno.test("TextExtraction - Interesting Scenarios", async () => {
  console.log("\n--- Testing TextExtraction: Interesting Scenarios ---");
  const { concept, db, client, imagePath } = await createConceptInstance();

  try {
    // Scenario 1: Extracting from an image with no text
    // This relies on the LLM returning "No text found" or similar.
    console.log("\n1. Scenario: Extracting from an image expected to have no text.");
    // Create a different dummy image file that is likely to have no readable text.
    const noTextImagePath = "data/no_text_image.png" as ID;
    const noTextImageContent = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]); // Minimal valid PNG data
    fs.writeFileSync(noTextImagePath, noTextImageContent);

    console.log(`   Attempting to extract text from: ${noTextImagePath}`);
    const noTextResult = await concept.extractTextFromMedia({
      imagePath: noTextImagePath,
    });
    console.log(`   Output: ${JSON.stringify(noTextResult, null, 2)}`);
    assertEquals(noTextResult.extractedText.toLowerCase(), "no text found", "Expected 'No text found' when image has no text.");
    console.log("   Verification: Correctly handled image with no readable text.");

    // Scenario 2: Adding extraction with overlapping coordinates (should throw error)
    console.log("\n2. Scenario: Adding extraction with overlapping coordinates.");
    const initialExtraction = await concept.addExtractionTxt({
        imagePath: imagePath,
        fromCoord: { x: 10, y: 10 },
        toCoord: { x: 50, y: 50 }
    });
    console.log(`   Added initial extraction: ${JSON.stringify(initialExtraction, null, 2)}`);

    const overlappingFromCoord = { x: 30, y: 30 };
    const overlappingToCoord = { x: 70, y: 70 };
    console.log(`   Attempting to add extraction with coordinates overlapping ${JSON.stringify(initialExtraction.position)}: from ${JSON.stringify(overlappingFromCoord)}, to ${JSON.stringify(overlappingToCoord)}`);
    assertThrows(
      async () => {
        await concept.addExtractionTxt({
          imagePath: imagePath,
          fromCoord: overlappingFromCoord,
          toCoord: overlappingToCoord,
        });
      },
      Error,
      "New extraction area overlaps with existing extraction",
      "Expected error when adding overlapping extraction.",
    );
    console.log("   Verification: Correctly prevented adding overlapping extraction.");

    // Scenario 3: Attempting to delete a non-existent extraction
    console.log("\n3. Scenario: Deleting a non-existent extraction.");
    const nonExistentTextId = "non-existent-id-123" as string;
    const nonExistentImagePath = "data/another_image.png" as ID;
    console.log(`   Attempting to delete textId: "${nonExistentTextId}" from image: "${nonExistentImagePath}"`);
    assertThrows(
      async () => {
        await concept.deleteExtraction({
          textId: nonExistentTextId,
          imagePath: nonExistentImagePath,
        });
      },
      Error,
      `ExtractionResult with textId "${nonExistentTextId}" for image "${nonExistentImagePath}" not found.`,
      "Expected error when deleting non-existent extraction.",
    );
    console.log("   Verification: Correctly handled deletion of non-existent extraction.");

    // Scenario 4: Editing with invalid coordinates
    console.log("\n4. Scenario: Editing location with negative coordinates.");
    const resultToEdit = await concept.addExtractionTxt({
      imagePath: imagePath,
      fromCoord: { x: 10, y: 10 },
      toCoord: { x: 20, y: 20 },
    });
    console.log(`   Added extraction for editing: ${JSON.stringify(resultToEdit, null, 2)}`);

    const negativeFromCoord = { x: -10, y: 10 };
    const negativeToCoord = { x: 20, y: 20 };
    console.log(`   Attempting to edit location with negative coordinates: from ${JSON.stringify(negativeFromCoord)}, to ${JSON.stringify(negativeToCoord)}`);
    assertThrows(
      async () => {
        await concept.editLocation({
          extractedTextId: resultToEdit.textId,
          fromCoord: negativeFromCoord,
          toCoord: negativeToCoord,
        });
      },
      Error,
      "Coordinates must be non-negative.",
      "Expected error when editing location with negative coordinates.",
    );
    console.log("   Verification: Correctly handled editing location with negative coordinates.");

    // Scenario 5: Adding extraction with negative coordinates
    console.log("\n5. Scenario: Adding extraction with negative coordinates.");
    const addNegativeFromCoord = { x: 10, y: -10 };
    const addNegativeToCoord = { x: 20, y: 20 };
    console.log(`   Attempting to add extraction with negative coordinates: from ${JSON.stringify(addNegativeFromCoord)}, to ${JSON.stringify(addNegativeToCoord)}`);
    assertThrows(
      async () => {
        await concept.addExtractionTxt({
          imagePath: imagePath,
          fromCoord: addNegativeFromCoord,
          toCoord: addNegativeToCoord,
        });
      },
      Error,
      "Invalid coordinates: Coordinates must be non-negative.",
      "Expected error when adding extraction with negative coordinates.",
    );
    console.log("   Verification: Correctly handled adding extraction with negative coordinates.");

    // Scenario 6: Multiple extractions for the same image and unique textIds
    console.log("\n6. Scenario: Multiple extractions for the same image and unique textIds.");
    // Add two more extractions to the original imagePath
    const result2 = await concept.addExtractionTxt({
      imagePath: imagePath,
      fromCoord: { x: 200, y: 200 },
      toCoord: { x: 300, y: 300 },
    });
    const result3 = await concept.addExtractionTxt({
      imagePath: imagePath,
      fromCoord: { x: 400, y: 400 },
      toCoord: { x: 500, y: 500 },
    });
    const allExtractionsMulti = await concept._getAllExtractionsForImage({ imagePath });
    console.log(`   Total extractions for ${imagePath}: ${allExtractionsMulti.length}`);
    assertEquals(allExtractionsMulti.length, 3, "Expected 3 extractions after adding two more.");

    const textIds = allExtractionsMulti.map(r => r.textId);
    const uniqueTextIds = new Set(textIds);
    assertEquals(textIds.length, uniqueTextIds.size, "All textIds should be unique for the same image.");

    // Check if textIds follow the expected pattern (imageName-number)
    allExtractionsMulti.forEach(res => {
        const parts = res.textId.split('-');
        assertEquals(parts.length > 1, true, `textId ${res.textId} should have a number suffix.`);
        const suffix = parseInt(parts[parts.length - 1], 10);
        assertEquals(isNaN(suffix), false, `textId suffix for ${res.textId} should be a number.`);
        assertEquals(parts[0], path.basename(imagePath).split('.')[0], `textId prefix should match image name for ${res.textId}.`);
    });
    console.log("   Verification: Multiple extractions added successfully with unique textIds.");


  } finally {
    await client.close();
    // Clean up dummy image files
    if (fs.existsSync("data/test_image.png")) {
      fs.unlinkSync("data/test_image.png");
    }
    if (fs.existsSync("data/no_text_image.png")) {
      fs.unlinkSync("data/no_text_image.png");
    }
     if (fs.existsSync("data") && fs.readdirSync("data").length === 0) {
        fs.rmdirSync("data");
    }
  }
});
```

***

### Explanation of the Test Cases:

1. **`TextExtraction - Operational Principle`**:
   * **Trace**: This test mimics the core usage flow.
     1. It calls `extractTextFromMedia` on a dummy image.
     2. It then fetches all extractions using `_getAllExtractionsForImage` to verify the initial extraction.
     3. It tests `editExtractText` to change the `extractedText` of one of the results.
     4. It tests `editLocation` to modify the `position` of a result.
     5. It tests `addExtractionTxt` to manually add a new, empty extraction area.
     6. Finally, it tests `deleteExtraction` to remove one of the added extractions.
   * **Verification**: Assertions check that the correct data is returned, that edits are reflected, that new items are added, and that deletions work.

2. **`TextExtraction - Interesting Scenarios`**:
   * **Scenario 1: Extracting from an image with no text**:
     * **Trace**: Uses a separate dummy image file (conceptually one that the AI would likely deem "no text") and calls `extractTextFromMedia`.
     * **Verification**: Asserts that the `extractedText` is `"No text found"` (or the equivalent that the `GeminiLLM` would return for empty results).
   * **Scenario 2: Adding extraction with overlapping coordinates**:
     * **Trace**: Adds one extraction, then attempts to add a second one with coordinates that overlap the first.
     * **Verification**: Uses `assertThrows` to confirm that an `Error` is thrown, specifically checking for the overlap error message.
   * **Scenario 3: Attempting to delete a non-existent extraction**:
     * **Trace**: Calls `deleteExtraction` with `textId` and `imagePath` values that do not exist in the database.
     * **Verification**: Uses `assertThrows` to confirm that an `Error` is thrown, checking for the "not found" error message.
   * **Scenario 4: Editing location with negative coordinates**:
     * **Trace**: Adds an extraction, then calls `editLocation` with negative coordinate values.
     * **Verification**: Uses `assertThrows` to confirm the "Coordinates must be non-negative." error.
   * **Scenario 5: Adding extraction with negative coordinates**:
     * **Trace**: Calls `addExtractionTxt` with negative coordinate values.
     * **Verification**: Uses `assertThrows` to confirm the "Invalid coordinates: Coordinates must be non-negative." error.
   * **Scenario 6: Multiple extractions for the same image and unique textIds**:
     * **Trace**: Adds several extractions to the same `imagePath`. Then, it fetches all extractions for that image and verifies that each `textId` is unique and follows the expected naming convention (e.g., `imageName-number`).
     * **Verification**: Asserts that the count of extractions is correct, that all `textId`s are unique, and that their format is as expected.

**To run these tests:**

1. Make sure you have a `data` directory with a `test_image.png` file. For a real test of the AI interaction, this file should contain actual text. The provided placeholder PNG is minimal and might not yield meaningful text from an actual AI call.
2. Ensure your `.env` file has `MONGO_URL` and `GEMINI_API_KEY` and `GEMINI_MODEL` set.
3. Run Deno test: `deno test --allow-net --allow-read --allow-env src/concepts/TextExtraction/TextExtractionConcept.test.ts`
