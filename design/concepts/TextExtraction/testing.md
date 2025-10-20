[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)
# test TextExtraction

Testing concepts. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
Saving test execution output. Save the test execution output by copy-pasting from the console to a markdown file.

# response:

# file: src/TextExtraction/TextExtraction.test.ts

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { getDb, closeDb, freshID, ID } from "@utils/database.ts";
import TextExtractionConcept from "./TextExtraction.ts"; // Import the concept

// Mock image paths and content for testing
const IMAGE_PATH_1: ID = "path/to/image1.png" as ID;
const IMAGE_PATH_2: ID = "path/to/image2.jpg" as ID;
const IMAGE_PATH_NON_EXISTENT: ID = "path/to/non_existent.png" as ID;

// Mock LLM responses - these will be stubbed if we were using a real LLM service
// For this implementation, we rely on the GeminiLLM class directly.
// We'll simulate its behavior by directly providing expected LLM responses.

// Helper function to create a fresh instance of the concept for each test
async function createConceptInstance(): Promise<[TextExtractionConcept, Db]> {
  const [db, client] = await getDb();
  // We need an API key for GeminiLLM, even if it's a dummy for test purposes
  // In a real scenario, this would be loaded from env or config.
  const apiKey = Deno.env.get("GEMINI_API_KEY") || "dummy_api_key_for_test";
  const concept = new TextExtractionConcept(db, apiKey);
  return [concept, client];
}

// Helper function to simulate LLM responses by manipulating the concept's internal methods
// This is a simplified approach. A more robust approach would involve mocking the GeminiLLM class itself.
// For this exercise, we'll assume the GeminiLLM will return predictable values based on the prompt.
// Since the GeminiLLM executeLLM is already integrated, we'll test the parsing and state management.

// Mock fs and sizeOf for file operations in tests
// In a real test suite, you might use a mocking library.
// For Deno, we can temporarily override global functions if needed, but direct file creation is cleaner for integration tests.

// --- Test Setup: Ensure test files and directories exist ---
async function setupTestFiles() {
  const dir1 = path.dirname(IMAGE_PATH_1);
  if (!fs.existsSync(dir1)) {
    fs.mkdirSync(dir1, { recursive: true });
  }
  await Deno.writeTextFile(IMAGE_PATH_1, "dummy image content 1"); // Placeholder content

  const dir2 = path.dirname(IMAGE_PATH_2);
  if (!fs.existsSync(dir2)) {
    fs.mkdirSync(dir2, { recursive: true });
  }
  await Deno.writeTextFile(IMAGE_PATH_2, "dummy image content 2"); // Placeholder content
}

async function cleanupTestFiles() {
  await fs.promises.rm("path", { recursive: true, force: true });
}

Deno.test("setup test files", async () => {
  console.log("\n--- Setting up test files ---");
  await setupTestFiles();
  console.log("--- Test files setup complete ---");
});

// --- Operational Principle Test ---
Deno.test("TextExtraction: Operational Principle - Extracting and viewing text", async () => {
  console.log("\n--- Testing Operational Principle ---");
  const [concept, client] = await createConceptInstance();
  const [db] = await getDb(); // Get db instance for potential assertions

  // Mock the LLM response directly for predictable results in testing
  // This is a simplified way to test parsing and state logic without actual LLM calls.
  const mockLLMResponse1 = `
1: Hello World
(from: {x:10, y:20}, to: {x:100, y:40})
2: This is a test image.
(from: {x:10, y:50}, to: {x:200, y:70})
Number of text blocks: 2
  `;
  const mockLLMResponse2 = `
1: Another Image Content
(from: {x:50, y:60}, to: {x:300, y:90})
Number of text blocks: 1
  `;

  // Override the internal method for testing purposes
  const originalGeminiExecuteLLM = concept["geminiLLM"].executeLLM;
  concept["geminiLLM"].executeLLM = async (prompt: string, imagePath?: string) => {
    if (imagePath === IMAGE_PATH_1) return mockLLMResponse1;
    if (imagePath === IMAGE_PATH_2) return mockLLMResponse2;
    return "No text found";
  };

  console.log(`ACTION: Extracting text from ${IMAGE_PATH_1}`);
  const result1 = await concept.extractTextFromMedia({ imagePath: IMAGE_PATH_1 });
  console.log("INPUT:", { imagePath: IMAGE_PATH_1 });
  console.log("OUTPUT:", result1);
  assertEquals(result1.extractedText, "Hello World");
  assertEquals(result1.position.fromCoord, { x: 10, y: 20 });
  assertEquals(result1.position.toCoord, { x: 100, y: 40 });

  console.log(`ACTION: Extracting text from ${IMAGE_PATH_2}`);
  const result2 = await concept.extractTextFromMedia({ imagePath: IMAGE_PATH_2 });
  console.log("INPUT:", { imagePath: IMAGE_PATH_2 });
  console.log("OUTPUT:", result2);
  assertEquals(result2.extractedText, "Another Image Content");
  assertEquals(result2.position.fromCoord, { x: 50, y: 60 });
  assertEquals(result2.position.toCoord, { x: 300, y: 90 });

  // Verify state by querying
  console.log("QUERY: Getting all extractions for image 1");
  const allForImage1 = await concept._getAllExtractionsForImage({
    imagePath: IMAGE_PATH_1,
  });
  console.log("OUTPUT:", allForImage1);
  assertEquals(allForImage1.length, 2);
  assertEquals(allForImage1[0].extractedText, "Hello World");
  assertEquals(allForImage1[1].extractedText, "This is a test image.");

  console.log(`QUERY: Getting all extractions for image 2`);
  const allForImage2 = await concept._getAllExtractionsForImage({
    imagePath: IMAGE_PATH_2,
  });
  console.log("OUTPUT:", allForImage2);
  assertEquals(allForImage2.length, 1);
  assertEquals(allForImage2[0].extractedText, "Another Image Content");

  // Restore original method
  concept["geminiLLM"].executeLLM = originalGeminiExecuteLLM;

  await client.close();
  console.log("--- Operational Principle Test Complete ---");
});

// --- Interesting Scenario 1: Editing extracted text ---
Deno.test("TextExtraction: Scenario 1 - Editing extracted text", async () => {
  console.log("\n--- Testing Scenario 1: Editing extracted text ---");
  const [concept, client] = await createConceptInstance();
  const [db] = await getDb();

  const mockLLMResponse = `
1: Original Text
(from: {x:10, y:20}, to: {x:100, y:40})
Number of text blocks: 1
  `;
  const originalGeminiExecuteLLM = concept["geminiLLM"].executeLLM;
  concept["geminiLLM"].executeLLM = async (prompt: string, imagePath?: string) => {
    if (imagePath === IMAGE_PATH_1) return mockLLMResponse;
    return "No text found";
  };

  console.log(`ACTION: Extracting text from ${IMAGE_PATH_1}`);
  const initialResult = await concept.extractTextFromMedia({
    imagePath: IMAGE_PATH_1,
  });
  console.log("INITIAL OUTPUT:", initialResult);
  assertEquals(initialResult.extractedText, "Original Text");

  const newText = "Edited Text Content";
  console.log(`ACTION: Editing text for textId "${initialResult.textId}" to "${newText}"`);
  const updatedResult = await concept.editExtractText({
    extractedTextId: initialResult.textId,
    newText: newText,
  });
  console.log("UPDATED OUTPUT:", updatedResult);

  assertEquals(updatedResult.extractedText, newText);
  assertEquals(updatedResult.textId, initialResult.textId); // Ensure textId remains the same

  // Verify by fetching again
  console.log(`QUERY: Getting extraction by textId "${initialResult.textId}"`);
  const fetchedResult = await concept._getExtractionById({
    textId: initialResult.textId,
    imagePath: IMAGE_PATH_1,
  });
  console.log("FETCHED OUTPUT:", fetchedResult[0]);
  assertEquals(fetchedResult.length, 1);
  assertEquals(fetchedResult[0].extractedText, newText);

  concept["geminiLLM"].executeLLM = originalGeminiExecuteLLM; // Restore
  await client.close();
  console.log("--- Scenario 1 Test Complete ---");
});

// --- Interesting Scenario 2: Editing location and adding a new extraction ---
Deno.test("TextExtraction: Scenario 2 - Editing location and adding a new extraction", async () => {
  console.log("\n--- Testing Scenario 2: Editing location and adding a new extraction ---");
  const [concept, client] = await createConceptInstance();
  const [db] = await getDb();

  const mockLLMResponse = `
1: Initial Content
(from: {x:10, y:20}, to: {x:100, y:40})
Number of text blocks: 1
  `;
  const originalGeminiExecuteLLM = concept["geminiLLM"].executeLLM;
  concept["geminiLLM"].executeLLM = async (prompt: string, imagePath?: string) => {
    if (imagePath === IMAGE_PATH_1) return mockLLMResponse;
    return "No text found";
  };

  console.log(`ACTION: Extracting text from ${IMAGE_PATH_1}`);
  const initialExtraction = await concept.extractTextFromMedia({
    imagePath: IMAGE_PATH_1,
  });
  console.log("INITIAL EXTRACTION:", initialExtraction);
  assertEquals(initialExtraction.extractedText, "Initial Content");
  assertEquals(initialExtraction.position.fromCoord, { x: 10, y: 20 });

  const newFromCoord = { x: 15, y: 25 };
  const newToCoord = { x: 110, y: 45 };
  console.log(`ACTION: Editing location for textId "${initialExtraction.textId}"`);
  const updatedLocationResult = await concept.editLocation({
    extractedTextId: initialExtraction.textId,
    fromCoord: newFromCoord,
    toCoord: newToCoord,
  });
  console.log("UPDATED LOCATION OUTPUT:", updatedLocationResult);
  assertEquals(updatedLocationResult.position.fromCoord, newFromCoord);
  assertEquals(updatedLocationResult.position.toCoord, newToCoord);

  // Add a new extraction
  const newFromCoordAdd = { x: 150, y: 100 };
  const newToCoordAdd = { x: 250, y: 120 };
  console.log(
    `ACTION: Adding new extraction for ${IMAGE_PATH_1} with coords ${JSON.stringify(newFromCoordAdd)}-${JSON.stringify(newToCoordAdd)}`,
  );
  const addedExtraction = await concept.addExtractionTxt({
    imagePath: IMAGE_PATH_1,
    fromCoord: newFromCoordAdd,
    toCoord: newToCoordAdd,
  });
  console.log("ADDED EXTRACTION OUTPUT:", addedExtraction);
  assertEquals(addedExtraction.extractedText, ""); // Should be empty initially
  assertEquals(addedExtraction.imagePath, IMAGE_PATH_1);
  assertEquals(addedExtraction.position.fromCoord, newFromCoordAdd);

  // Verify total count
  console.log(`QUERY: Getting all extractions for ${IMAGE_PATH_1}`);
  const allExtractions = await concept._getAllExtractionsForImage({
    imagePath: IMAGE_PATH_1,
  });
  console.log("ALL EXTRACTIONS:", allExtractions);
  assertEquals(allExtractions.length, 2);

  concept["geminiLLM"].executeLLM = originalGeminiExecuteLLM; // Restore
  await client.close();
  console.log("--- Scenario 2 Test Complete ---");
});

// --- Interesting Scenario 3: Deleting an extraction ---
Deno.test("TextExtraction: Scenario 3 - Deleting an extraction", async () => {
  console.log("\n--- Testing Scenario 3: Deleting an extraction ---");
  const [concept, client] = await createConceptInstance();
  const [db] = await getDb();

  const mockLLMResponse = `
1: Text to Delete
(from: {x:10, y:20}, to: {x:100, y:40})
2: Text to Keep
(from: {x:10, y:50}, to: {x:100, y:70})
Number of text blocks: 2
  `;
  const originalGeminiExecuteLLM = concept["geminiLLM"].executeLLM;
  concept["geminiLLM"].executeLLM = async (prompt: string, imagePath?: string) => {
    if (imagePath === IMAGE_PATH_1) return mockLLMResponse;
    return "No text found";
  };

  console.log(`ACTION: Extracting text from ${IMAGE_PATH_1}`);
  const extractionToDelete = await concept.extractTextFromMedia({
    imagePath: IMAGE_PATH_1,
  });
  console.log("INITIAL EXTRACTIONS:", await concept._getAllExtractionsForImage({ imagePath: IMAGE_PATH_1 }));

  console.log(`ACTION: Deleting extraction with textId "${extractionToDelete.textId}" from ${IMAGE_PATH_1}`);
  const deleteResult = await concept.deleteExtraction({
    textId: extractionToDelete.textId,
    imagePath: IMAGE_PATH_1,
  });
  console.log("DELETE OUTPUT:", deleteResult);
  assertEquals(deleteResult, {}); // Should return empty object

  // Verify that it's deleted
  console.log(`QUERY: Getting extraction by textId "${extractionToDelete.textId}"`);
  const fetchedAfterDelete = await concept._getExtractionById({
    textId: extractionToDelete.textId,
    imagePath: IMAGE_PATH_1,
  });
  console.log("FETCHED AFTER DELETE:", fetchedAfterDelete);
  assertEquals(fetchedAfterDelete.length, 0);

  console.log(`QUERY: Getting all extractions for ${IMAGE_PATH_1}`);
  const remainingExtractions = await concept._getAllExtractionsForImage({
    imagePath: IMAGE_PATH_1,
  });
  console.log("REMAINING EXTRACTIONS:", remainingExtractions);
  assertEquals(remainingExtractions.length, 1);
  assertEquals(remainingExtractions[0].extractedText, "Text to Keep");

  concept["geminiLLM"].executeLLM = originalGeminiExecuteLLM; // Restore
  await client.close();
  console.log("--- Scenario 3 Test Complete ---");
});

// --- Interesting Scenario 4: Error case - extracting from non-existent image ---
Deno.test("TextExtraction: Scenario 4 - Error: extracting from non-existent image", async () => {
  console.log("\n--- Testing Scenario 4: Error - extracting from non-existent image ---");
  const [concept, client] = await createConceptInstance();

  console.log(`ACTION: Attempting to extract from non-existent image ${IMAGE_PATH_NON_EXISTENT}`);
  await assertThrows(
    async () => {
      await concept.extractTextFromMedia({
        imagePath: IMAGE_PATH_NON_EXISTENT,
      });
    },
    Error,
    "Image file not found",
  );
  console.log("Successfully caught expected error.");

  await client.close();
  console.log("--- Scenario 4 Test Complete ---");
});

// --- Interesting Scenario 5: Error case - adding extraction with overlapping area ---
Deno.test("TextExtraction: Scenario 5 - Error: adding extraction with overlapping area", async () => {
  console.log("\n--- Testing Scenario 5: Error - adding extraction with overlapping area ---");
  const [concept, client] = await createConceptInstance();
  const [db] = await getDb();

  const mockLLMResponse = `
1: Existing Text
(from: {x:10, y:20}, to: {x:100, y:40})
Number of text blocks: 1
  `;
  const originalGeminiExecuteLLM = concept["geminiLLM"].executeLLM;
  concept["geminiLLM"].executeLLM = async (prompt: string, imagePath?: string) => {
    if (imagePath === IMAGE_PATH_1) return mockLLMResponse;
    return "No text found";
  };

  console.log(`ACTION: Extracting text from ${IMAGE_PATH_1}`);
  await concept.extractTextFromMedia({ imagePath: IMAGE_PATH_1 });

  const overlappingFromCoord = { x: 50, y: 30 }; // Overlaps with first extraction
  const overlappingToCoord = { x: 150, y: 50 };

  console.log(
    `ACTION: Attempting to add overlapping extraction for ${IMAGE_PATH_1}`,
  );
  await assertThrows(
    async () => {
      await concept.addExtractionTxt({
        imagePath: IMAGE_PATH_1,
        fromCoord: overlappingFromCoord,
        toCoord: overlappingToCoord,
      });
    },
    Error,
    "New extraction area overlaps",
  );
  console.log("Successfully caught expected error.");

  concept["geminiLLM"].executeLLM = originalGeminiExecuteLLM; // Restore
  await client.close();
  console.log("--- Scenario 5 Test Complete ---");
});

// --- Interesting Scenario 6: Adding an extraction with valid non-negative coordinates ---
Deno.test("TextExtraction: Scenario 6 - Adding a valid new extraction", async () => {
    console.log("\n--- Testing Scenario 6: Adding a valid new extraction ---");
    const [concept, client] = await createConceptInstance();

    const initialFromCoord = { x: 100, y: 100 };
    const initialToCoord = { x: 200, y: 120 };

    console.log(`ACTION: Adding a new extraction to ${IMAGE_PATH_1} with valid coords`);
    const newExtraction = await concept.addExtractionTxt({
        imagePath: IMAGE_PATH_1,
        fromCoord: initialFromCoord,
        toCoord: initialToCoord,
    });
    console.log("ADDED EXTRACTION:", newExtraction);

    assertEquals(newExtraction.extractedText, "");
    assertEquals(newExtraction.imagePath, IMAGE_PATH_1);
    assertEquals(newExtraction.position.fromCoord, initialFromCoord);
    assertEquals(newExtraction.position.toCoord, initialToCoord);
    assertEquals(typeof newExtraction.textId, 'string');
    assertEquals(newExtraction.textId.startsWith("image1.png-"), true); // Check for expected textId format

    // Verify by fetching
    const fetched = await concept._getExtractionById({
        textId: newExtraction.textId,
        imagePath: IMAGE_PATH_1
    });
    assertEquals(fetched.length, 1);
    assertEquals(fetched[0].textId, newExtraction.textId);

    await client.close();
    console.log("--- Scenario 6 Test Complete ---");
});


// --- Interesting Scenario 7: Error case - adding extraction with negative coordinates ---
Deno.test("TextExtraction: Scenario 7 - Error: adding extraction with negative coordinates", async () => {
    console.log("\n--- Testing Scenario 7: Error - adding extraction with negative coordinates ---");
    const [concept, client] = await createConceptInstance();

    const negativeFromCoord = { x: -10, y: 20 };
    const validToCoord = { x: 100, y: 40 };

    console.log(`ACTION: Attempting to add extraction with negative coordinates`);
    await assertThrows(
        async () => {
            await concept.addExtractionTxt({
                imagePath: IMAGE_PATH_1,
                fromCoord: negativeFromCoord,
                toCoord: validToCoord,
            });
        },
        Error,
        "Invalid coordinates: Coordinates must be non-negative."
    );
    console.log("Successfully caught expected error.");

    await client.close();
    console.log("--- Scenario 7 Test Complete ---");
});

// --- Cleanup Test Files ---
Deno.test("cleanup test files", async () => {
  console.log("\n--- Cleaning up test files ---");
  await cleanupTestFiles();
  console.log("--- Test files cleanup complete ---");
});
```