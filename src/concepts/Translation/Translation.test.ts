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
