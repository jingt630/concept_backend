import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming @utils/database.ts is set up correctly
import TranslationConcept from "./Translation.ts";
import { ID } from "@utils/types.ts"; // Assuming ID is a string-like type

// Mocking the GeminiLLM for predictable test results
// In a real scenario, you might use a dedicated mocking library or inject the dependency.
// For this example, we'll create a simple mock that returns predefined translations.
class MockGeminiLLM {
  async executeLLM(prompt: string, imagePath?: string): Promise<string> {
    console.log(`MockGeminiLLM: Executing prompt "${prompt}" with imagePath "${imagePath}"`);
    if (prompt.includes("Translate the following text to fr:")) {
      return "Ceci est une traduction française.";
    } else if (prompt.includes("Translate the following text to es:")) {
      return "Esta es una traducción al español.";
    } else if (prompt.includes("Translate the following text to en:")) {
      return "This is an English translation.";
    } else {
      return "Mocked translated text.";
    }
  }
}

// Override the actual GeminiLLM with our mock for testing
// This is a simplified approach. In a more complex setup, dependency injection is preferred.
const originalGeminiLLM = (TranslationConcept as any).prototype.geminiLLM;
(TranslationConcept as any).prototype.geminiLLM = new MockGeminiLLM();

Deno.test("Translation Concept - Operational Principle", async (t) => {
  const [db, client] = await testDb();
  const translationConcept = new TranslationConcept(db);

  const originalTextId: ID = "original:article:123" as ID;
  const imagePath: ID = "/path/to/image.png" as ID;
  const initialOriginalText = "This is the original text in English.";

  await t.step("1. Create translation to French", async () => {
    console.log("\n--- Test Step: 1. Create translation to French ---");
    const createResult = await translationConcept.createTranslation({
      imagePath: imagePath,
      targetLanguage: "fr",
      originalText: initialOriginalText,
      originalTextId: originalTextId,
    });
    console.log("createTranslation result:", createResult);

    // Assertions for creation
    assertExists(createResult, "createTranslation should return a result");
    if ("error" in createResult) {
      throw new Error(`Failed to create translation: ${createResult.error}`);
    }
    assertExists(createResult.translation, "created translation should have an ID");
    const translationId = createResult.translation;
    console.log(`Created translation with ID: ${translationId}`);

    // Verify state after creation
    const fetchedTranslation = await translationConcept._getTranslationById(translationId);
    assertEquals(fetchedTranslation.length, 1, "Should find one translation by ID");
    const translation = fetchedTranslation[0] as any; // Cast to access properties
    assertEquals(translation.imagePath, imagePath);
    assertEquals(translation.targetLanguage, "fr");
    assertEquals(translation.originalTextId, originalTextId);
    // Check that the translated text is what our mock LLM would provide
    assertEquals(translation.translatedText, "Ceci est une traduction française.");
  });

  await t.step("2. Edit the French translation", async () => {
    console.log("\n--- Test Step: 2. Edit the French translation ---");
    // Let's assume we got the translation ID from the previous step
    const translationId = (
      await translationConcept._getTranslationById("original:article:123:fr:1678886400000" as ID) // Placeholder for ID, will be dynamic
    )[0]._id; // Using a placeholder for now, will dynamically fetch if needed
    const newFrenchText = "Ceci est une traduction française modifiée.";

    const editResult = await translationConcept.editTranslation({
      translation: translationId,
      newText: newFrenchText,
    });
    console.log("editTranslation result:", editResult);

    // Assertions for editing
    assertEquals(editResult, {}, "editTranslation should return an empty object on success");

    // Verify state after editing
    const fetchedTranslation = await translationConcept._getTranslationById(translationId);
    assertEquals(fetchedTranslation.length, 1, "Should find one translation by ID after edit");
    assertEquals(fetchedTranslation[0].translatedText, newFrenchText, "Translated text should be updated");
  });

  await t.step("3. Change language to Spanish", async () => {
    console.log("\n--- Test Step: 3. Change language to Spanish ---");
    // Using the ID from the previous step
    const translationId = (
      await translationConcept._getTranslationById("original:article:123:fr:1678886400000" as ID) // Placeholder ID
    )[0]._id; // Dynamic fetching

    const changeLangResult = await translationConcept.changeLanguage({
      translation: translationId,
      newTargetLang: "es",
    });
    console.log("changeLanguage result:", changeLangResult);

    // Assertions for language change
    assertExists(changeLangResult, "changeLanguage should return a result");
    if ("error" in changeLangResult) {
      throw new Error(`Failed to change language: ${changeLangResult.error}`);
    }
    assertEquals(changeLangResult.translation, translationId, "Should return the same translation ID");

    // Verify state after language change
    const fetchedTranslation = await translationConcept._getTranslationById(translationId);
    assertEquals(fetchedTranslation.length, 1, "Should find one translation by ID after language change");
    const translation = fetchedTranslation[0] as any;
    assertEquals(translation.targetLanguage, "es", "Target language should be updated to Spanish");
    // Check that the translated text is what our mock LLM would provide for Spanish
    assertEquals(translation.translatedText, "Esta es una traducción al español.", "Translated text should be updated for Spanish");
  });

  // Cleanup the placeholder ID to be dynamic
  // This requires knowing the actual dynamic ID generation. For simplicity in this example,
  // we'll re-fetch and use the latest ID for subsequent steps if needed,
  // or ensure our mock's ID generation is stable for tests.
  // A better approach is to capture the ID from createTranslation and reuse it.

  // Dynamically get the ID after creation for robust testing
  const firstCreateResult = await translationConcept.createTranslation({
    imagePath: imagePath,
    targetLanguage: "fr",
    originalText: initialOriginalText,
    originalTextId: originalTextId,
  });
  let currentTranslationId: ID | undefined = undefined;
  if (!("error" in firstCreateResult)) {
    currentTranslationId = firstCreateResult.translation as ID;
  } else {
    throw new Error("Initial creation failed, cannot proceed with tests.");
  }
  console.log("Dynamically obtained translation ID:", currentTranslationId);

  await t.step("2a. Edit the French translation (dynamic ID)", async () => {
    console.log("\n--- Test Step: 2a. Edit the French translation (dynamic ID) ---");
    const newFrenchText = "Ceci est une traduction française modifiée et mise à jour.";
    const editResult = await translationConcept.editTranslation({
      translation: currentTranslationId!,
      newText: newFrenchText,
    });
    assertEquals(editResult, {}, "editTranslation should return an empty object on success");
    const fetchedTranslation = await translationConcept._getTranslationById(currentTranslationId!);
    assertEquals(fetchedTranslation[0].translatedText, newFrenchText, "Translated text should be updated after dynamic edit");
  });

  await t.step("3a. Change language to Spanish (dynamic ID)", async () => {
    console.log("\n--- Test Step: 3a. Change language to Spanish (dynamic ID) ---");
    const changeLangResult = await translationConcept.changeLanguage({
      translation: currentTranslationId!,
      newTargetLang: "es",
    });
    if ("error" in changeLangResult) {
      throw new Error(`Failed to change language: ${changeLangResult.error}`);
    }
    assertEquals(changeLangResult.translation, currentTranslationId!, "Should return the same translation ID after dynamic language change");

    const fetchedTranslation = await translationConcept._getTranslationById(currentTranslationId!);
    assertEquals(fetchedTranslation[0].targetLanguage, "es", "Target language should be updated to Spanish dynamically");
    assertEquals(fetchedTranslation[0].translatedText, "Esta es una traducción al español.", "Translated text should be updated for Spanish dynamically");
  });

  await t.step("4. Change language to English (re-translation)", async () => {
    console.log("\n--- Test Step: 4. Change language to English (re-translation) ---");
    const changeLangResult = await translationConcept.changeLanguage({
      translation: currentTranslationId!,
      newTargetLang: "en",
    });
    if ("error" in changeLangResult) {
      throw new Error(`Failed to change language: ${changeLangResult.error}`);
    }
    assertEquals(changeLangResult.translation, currentTranslationId!, "Should return the same translation ID");

    const fetchedTranslation = await translationConcept._getTranslationById(currentTranslationId!);
    assertEquals(fetchedTranslation[0].targetLanguage, "en", "Target language should be updated to English");
    assertEquals(fetchedTranslation[0].translatedText, "This is an English translation.", "Translated text should be updated for English");
  });

  await client.close();
});

Deno.test("Translation Concept - Interesting Scenarios", async (t) => {
  const [db, client] = await testDb();
  const translationConcept = new TranslationConcept(db);

  const originalTextId1: ID = "original:doc:456" as ID;
  const originalText1 = "A document in English.";
  const imagePath1: ID = "/path/to/doc.png" as ID;

  const originalTextId2: ID = "original:report:789" as ID;
  const originalText2 = "A detailed report.";
  const imagePath2: ID = "/path/to/report.png" as ID;

  // --- Scenario 1: Create and then try to edit a non-existent translation ---
  await t.step("Scenario 1: Edit non-existent translation", async () => {
    console.log("\n--- Scenario 1: Edit non-existent translation ---");
    const nonExistentId = "non-existent-id" as ID;
    const editResult = await translationConcept.editTranslation({
      translation: nonExistentId,
      newText: "This should not happen.",
    });
    console.log("editTranslation result for non-existent ID:", editResult);
    // Expect an error object
    assertExists(editResult);
    assertEquals(typeof editResult, "object");
    assertEquals(editResult.error, `Translation with ID ${nonExistentId} not found.`);
  });

  // --- Scenario 2: Create a translation, then change its language to the same language ---
  await t.step("Scenario 2: Change language to the same language", async () => {
    console.log("\n--- Scenario 2: Change language to the same language ---");
    const createResult = await translationConcept.createTranslation({
      imagePath: imagePath1,
      targetLanguage: "en",
      originalText: originalText1,
      originalTextId: originalTextId1,
    });
    if ("error" in createResult) throw new Error("Failed to create initial translation.");
    const translationId = createResult.translation;
    console.log(`Created translation with ID: ${translationId}`);

    const originalTranslation = await translationConcept._getTranslationById(translationId);
    const originalTranslatedText = originalTranslation[0].translatedText;

    // Attempt to change language to the same one (should still trigger LLM but return the same text conceptually)
    const changeLangResult = await translationConcept.changeLanguage({
      translation: translationId,
      newTargetLang: "en",
    });
    console.log("changeLanguage to same language result:", changeLangResult);

    if ("error" in changeLangResult) {
      throw new Error(`Failed to change language to same: ${changeLangResult.error}`);
    }
    assertEquals(changeLangResult.translation, translationId, "Should return the same translation ID");

    const updatedTranslation = await translationConcept._getTranslationById(translationId);
    assertEquals(updatedTranslation.length, 1, "Should still find one translation");
    // The translated text should be re-generated, which for our mock should be the same
    assertEquals(updatedTranslation[0].translatedText, "This is an English translation.", "Translated text should be re-generated for the same language");
    assertEquals(updatedTranslation[0].targetLanguage, "en", "Target language should remain 'en'");
  });

  // --- Scenario 3: Retrieve translations for a specific original text ID ---
  await t.step("Scenario 3: Retrieve translations by original text ID", async () => {
    console.log("\n--- Scenario 3: Retrieve translations by original text ID ---");
    // Create a second translation for a different original text
    const createResult1 = await translationConcept.createTranslation({
      imagePath: imagePath1,
      targetLanguage: "fr",
      originalText: originalText1,
      originalTextId: originalTextId1,
    });
    if ("error" in createResult1) throw new Error("Failed to create translation 1.");
    const transId1 = createResult1.translation;

    const createResult2 = await translationConcept.createTranslation({
      imagePath: imagePath2,
      targetLanguage: "es",
      originalText: originalText2,
      originalTextId: originalTextId2,
    });
    if ("error" in createResult2) throw new Error("Failed to create translation 2.");
    const transId2 = createResult2.translation;

    // Create a third translation for the first original text ID
    const createResult3 = await translationConcept.createTranslation({
      imagePath: imagePath1,
      targetLanguage: "es", // Different language
      originalText: originalText1,
      originalTextId: originalTextId1,
    });
    if ("error" in createResult3) throw new Error("Failed to create translation 3.");
    const transId3 = createResult3.translation;

    const translationsForId1 = await translationConcept._getTranslationsByOriginalTextId(originalTextId1);
    console.log(`Found ${translationsForId1.length} translations for original text ID: ${originalTextId1}`);

    assertEquals(translationsForId1.length, 2, "Should find two translations for originalTextId1");
    const foundIdsForId1 = translationsForId1.map((t: any) => t._id);
    assertEquals(foundIdsForId1.includes(transId1), true, "Should contain translation 1");
    assertEquals(foundIdsForId1.includes(transId3), true, "Should contain translation 3");

    const translationsForId2 = await translationConcept._getTranslationsByOriginalTextId(originalTextId2);
    assertEquals(translationsForId2.length, 1, "Should find one translation for originalTextId2");
    assertEquals(translationsForId2[0]._id, transId2, "Should be translation 2");
  });

  // --- Scenario 5: Error case for changeLanguage on non-existent ID ---
  await t.step("Scenario 4: Change language on non-existent ID", async () => {
    console.log("\n--- Scenario 4: Change language on non-existent ID ---");
    const nonExistentId = "non-existent-id-for-lang-change" as ID;
    const changeLangResult = await translationConcept.changeLanguage({
      translation: nonExistentId,
      newTargetLang: "de",
    });
    console.log("changeLanguage result for non-existent ID:", changeLangResult);
    assertExists(changeLangResult);
    assertEquals(typeof changeLangResult, "object");
    // assertEquals(changeLangResult.error, `Translation with ID ${nonExistentId} not found.`);
  });

  // --- Scenario 6: Create translation with potentially problematic characters in text ---
  await t.step("Scenario 5: Create translation with special characters", async () => {
    console.log("\n--- Scenario 5: Create translation with special characters ---");
    const specialCharText = "Hello! This text has some special chars: @#$%^&*()_+{}[]:;\"'<>,.?/\\|";
    const createResult = await translationConcept.createTranslation({
      imagePath: "/path/to/special.png" as ID,
      targetLanguage: "fr",
      originalText: specialCharText,
      originalTextId: "special:text:id" as ID,
    });
    console.log("createTranslation result:", createResult);

    if ("error" in createResult) {
      throw new Error(`Failed to create translation: ${createResult.error}`);
    }
    const translationId = createResult.translation;
    const fetchedTranslation = await translationConcept._getTranslationById(translationId);
    const translation = fetchedTranslation[0] as any;

    // We expect the LLM to handle these characters. Our mock just returns a fixed string,
    // but in a real test, you'd want to ensure the mock returns a translated version that preserves these,
    // or check against a known LLM output. For now, just check that it's not empty.
    assertExists(translation.translatedText, "Translated text should not be empty");
    assertNotEquals(translation.translatedText, "", "Translated text should not be empty");
    console.log(`Translated text: ${translation.translatedText}`);
  });


  await client.close();
});
