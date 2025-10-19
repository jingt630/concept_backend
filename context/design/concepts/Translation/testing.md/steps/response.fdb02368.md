---
timestamp: 'Sun Oct 19 2025 05:13:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_051315.d7feef21.md]]'
content_id: fdb02368ec378a96783a8915deb96f6d973e76d0dd6f264a83cfcf7b6302fc78
---

# response:

```typescript
import { MongoClient } from "npm:mongodb";
import TranslationConcept from "@concepts/Translation/Translation.ts";
import { getDb } from "@utils/database.ts";
import { assert, assertEquals } from "https://deno.land/std@0.219.0/assert/mod.ts";

Deno.test("TranslationConcept - createTranslation", async () => {
  const [db, client] = await getDb();
  const translationConcept = new TranslationConcept(db);

  const imagePath = "path/to/image.png" as ID;
  const targetLanguage = "fr";
  const originalText = "Hello world";
  const originalTextId = "text:123" as ID;

  const result = await translationConcept.createTranslation({
    imagePath,
    targetLanguage,
    originalText,
    originalTextId,
  });

  assert(result.translation !== undefined, "Should return a translation ID");
  assertEquals(typeof result.translation, "string", "Translation ID should be a string");

  // Verify creation in the database
  const createdTranslation = await translationConcept.translations.findOne({
    _id: result.translation,
  });
  assert(createdTranslation !== null, "Translation should be found in the database");
  assertEquals(createdTranslation.imagePath, imagePath);
  assertEquals(createdTranslation.targetLanguage, targetLanguage);
  assertEquals(createdTranslation.originalTextId, originalTextId);
  assertEquals(createdTranslation.translatedText.startsWith("AI translated:"), true); // Check for simulated translation

  await client.close();
});

Deno.test("TranslationConcept - editTranslation", async () => {
  const [db, client] = await getDb();
  const translationConcept = new TranslationConcept(db);

  // First, create a translation to edit
  const imagePath = "path/to/image.png" as ID;
  const targetLanguage = "fr";
  const originalText = "Hello world";
  const originalTextId = "text:123" as ID;

  const { translation: translationId } = await translationConcept.createTranslation({
    imagePath,
    targetLanguage,
    originalText,
    originalTextId,
  });

  const newText = "Bonjour le monde";
  const editResult = await translationConcept.editTranslation({
    translation: translationId,
    newText,
  });

  assertEquals(editResult, {}, "Edit should succeed");

  // Verify the text has been updated
  const updatedTranslation = await translationConcept.translations.findOne({
    _id: translationId,
  });
  assert(updatedTranslation !== null, "Translation should still exist after edit");
  assertEquals(updatedTranslation.translatedText, newText);

  // Test editing a non-existent translation
  const nonExistentId = "translation:nonexistent" as ID;
  const editNonExistentResult = await translationConcept.editTranslation({
    translation: nonExistentId,
    newText: "Some text",
  });

  assertEquals(editNonExistentResult, { error: "Translation not found" }, "Editing non-existent translation should return an error");

  await client.close();
});

Deno.test("TranslationConcept - changeLanguage", async () => {
  const [db, client] = await getDb();
  const translationConcept = new TranslationConcept(db);

  // First, create a translation
  const imagePath = "path/to/image.png" as ID;
  const targetLanguage = "fr";
  const originalText = "Hello world";
  const originalTextId = "text:123" as ID;

  const { translation: translationId } = await translationConcept.createTranslation({
    imagePath,
    targetLanguage,
    originalText,
    originalTextId,
  });

  const newTargetLang = "es";
  const changeLangResult = await translationConcept.changeLanguage({
    translation: translationId,
    newTargetLang,
  });

  assertEquals(changeLangResult, {}, "Changing language should succeed");

  // Verify the language and text have been updated
  const updatedTranslation = await translationConcept.translations.findOne({
    _id: translationId,
  });
  assert(updatedTranslation !== null, "Translation should still exist after language change");
  assertEquals(updatedTranslation.targetLanguage, newTargetLang);
  assertEquals(updatedTranslation.translatedText.startsWith("AI re-translated"), true); // Check for simulated re-translation

  // Test changing language for a non-existent translation
  const nonExistentId = "translation:nonexistent" as ID;
  const changeLangNonExistentResult = await translationConcept.changeLanguage({
    translation: nonExistentId,
    newTargetLang: "de",
  });

  assertEquals(changeLangNonExistentResult, { error: "Translation not found" }, "Changing language for non-existent translation should return an error");

  await client.close();
});

Deno.test("TranslationConcept - _getTranslation", async () => {
  const [db, client] = await getDb();
  const translationConcept = new TranslationConcept(db);

  // First, create a translation
  const imagePath = "path/to/image.png" as ID;
  const targetLanguage = "fr";
  const originalText = "Hello world";
  const originalTextId = "text:123" as ID;

  const { translation: translationId } = await translationConcept.createTranslation({
    imagePath,
    targetLanguage,
    originalText,
    originalTextId,
  });

  // Retrieve the translation
  const queryResult = await translationConcept._getTranslation({
    translationId,
  });

  assert(Array.isArray(queryResult), "Query should return an array");
  assertEquals(queryResult.length, 1, "Query should return one result");
  assert(queryResult[0] && 'translation' in queryResult[0], "Result should contain translation data");

  const translationData = queryResult[0].translation;
  assertEquals(translationData._id, translationId);
  assertEquals(translationData.imagePath, imagePath);
  assertEquals(translationData.targetLanguage, targetLanguage);
  assertEquals(translationData.originalTextId, originalTextId);

  // Test retrieving a non-existent translation
  const nonExistentId = "translation:nonexistent" as ID;
  const queryNonExistentResult = await translationConcept._getTranslation({
    translationId: nonExistentId,
  });

  assert(Array.isArray(queryNonExistentResult), "Query for non-existent should return an array");
  assertEquals(queryNonExistentResult.length, 1, "Query for non-existent should return one result");
  assert(queryNonExistentResult[0] && 'error' in queryNonExistentResult[0], "Result for non-existent should contain an error");
  assertEquals(queryNonExistentResult[0].error, "Translation not found");

  await client.close();
});
```
