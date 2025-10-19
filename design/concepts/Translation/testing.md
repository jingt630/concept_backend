[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@TranslationCode](../../concepts/Translation/implementation.md)

# test Translation

# response:

```typescript
import { assertEquals, assertThrows } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { getDb } from "@utils/database.ts";
import TranslationConcept from "@concepts/TranslationConcept.ts";

Deno.test("TranslationConcept: createTranslation", async () => {
  const [db] = await getDb();
  const translationConcept = new TranslationConcept(db);

  const imagePath = "path/to/image.jpg" as any; // Assuming filePath is an ID
  const targetLanguage = "es";
  const originalText = "Hello, world!";
  const originalTextId = "text:123" as any; // Assuming OriginalTextID is an ID

  const result = await translationConcept.createTranslation({
    imagePath,
    targetLanguage,
    originalText,
    originalTextId,
  });

  // Check if a translation ID was returned
  assertEquals(typeof result.translation, "string");

  // Verify the created translation in the database
  const createdTranslation = await db
    .collection("Translation.translations")
    .findOne({ _id: result.translation });
  assertEquals(createdTranslation?.imagePath, imagePath);
  assertEquals(createdTranslation?.targetLanguage, targetLanguage);
  assertEquals(createdTranslation?.originalTextId, originalTextId);
  assertEquals(
    createdTranslation?.translatedText,
    `AI translated: "${originalText}" to ${targetLanguage}`,
  );
});

Deno.test("TranslationConcept: editTranslation", async () => {
  const [db] = await getDb();
  const translationConcept = new TranslationConcept(db);

  // Create a translation first
  const imagePath = "path/to/image.jpg" as any;
  const targetLanguage = "fr";
  const originalText = "Bonjour le monde!";
  const originalTextId = "text:456" as any;

  const { translation: translationId } =
    await translationConcept.createTranslation({
      imagePath,
      targetLanguage,
      originalText,
      originalTextId,
    });

  // Edit the translation
  const newText = "Bonjour, le monde!";
  const editResult = await translationConcept.editTranslation({
    translation: translationId,
    newText,
  });

  // Check if the edit was successful (returned empty object)
  assertEquals(editResult, {});

  // Verify the updated translation in the database
  const updatedTranslation = await db
    .collection("Translation.translations")
    .findOne({ _id: translationId });
  assertEquals(updatedTranslation?.translatedText, newText);
});

Deno.test("TranslationConcept: editTranslation - not found", async () => {
  const [db] = await getDb();
  const translationConcept = new TranslationConcept(db);

  const nonExistentId = "nonexistent:id" as any;
  const newText = "This should not be applied";

  const result = await translationConcept.editTranslation({
    translation: nonExistentId,
    newText,
  });

  // Check if an error was returned
  assertEquals(result, { error: "Translation not found" });
});

Deno.test("TranslationConcept: changeLanguage", async () => {
  const [db] = await getDb();
  const translationConcept = new TranslationConcept(db);

  // Create a translation first
  const imagePath = "path/to/image.jpg" as any;
  const targetLanguage = "de";
  const originalText = "Hallo Welt!";
  const originalTextId = "text:789" as any;

  const { translation: translationId } =
    await translationConcept.createTranslation({
      imagePath,
      targetLanguage,
      originalText,
      originalTextId,
    });

  // Change the language
  const newTargetLang = "it";
  const changeLangResult = await translationConcept.changeLanguage({
    translation: translationId,
    newTargetLang,
  });

  // Check if the language change was successful (returned empty object)
  assertEquals(changeLangResult, {});

  // Verify the updated translation in the database
  const updatedTranslation = await db
    .collection("Translation.translations")
    .findOne({ _id: translationId });
  assertEquals(updatedTranslation?.targetLanguage, newTargetLang);
  assertEquals(
    updatedTranslation?.translatedText,
    `AI re-translated "${originalTextId}" to ${newTargetLang}`,
  );
});

Deno.test("TranslationConcept: changeLanguage - not found", async () => {
  const [db] = await getDb();
  const translationConcept = new TranslationConcept(db);

  const nonExistentId = "nonexistent:id" as any;
  const newTargetLang = "fr";

  const result = await translationConcept.changeLanguage({
    translation: nonExistentId,
    newTargetLang,
  });

  // Check if an error was returned
  assertEquals(result, { error: "Translation not found" });
});

Deno.test("TranslationConcept: _getTranslation", async () => {
  const [db] = await getDb();
  const translationConcept = new TranslationConcept(db);

  // Create a translation first
  const imagePath = "path/to/image.jpg" as any;
  const targetLanguage = "ja";
  const originalText = "こんにちは世界";
  const originalTextId = "text:101" as any;

  const { translation: translationId } =
    await translationConcept.createTranslation({
      imagePath,
      targetLanguage,
      originalText,
      originalTextId,
    });

  // Retrieve the translation
  const getResult = await (translationConcept as any)._getTranslation({
    translationId,
  });

  // Check if the result is an array and contains the translation
  assertEquals(Array.isArray(getResult), true);
  assertEquals(getResult.length, 1);

  const fetchedTranslation = getResult[0].translation;
  assertEquals(fetchedTranslation._id, translationId);
  assertEquals(fetchedTranslation.imagePath, imagePath);
  assertEquals(fetchedTranslation.targetLanguage, targetLanguage);
  assertEquals(fetchedTranslation.originalTextId, originalTextId);
  assertEquals(
    fetchedTranslation.translatedText,
    `AI translated: "${originalText}" to ${targetLanguage}`,
  );
});

Deno.test("TranslationConcept: _getTranslation - not found", async () => {
  const [db] = await getDb();
  const translationConcept = new TranslationConcept(db);

  const nonExistentId = "nonexistent:id" as any;

  const getResult = await (translationConcept as any)._getTranslation({
    translationId: nonExistentId,
  });

  // Check if the result is an array and contains an error
  assertEquals(Array.isArray(getResult), true);
  assertEquals(getResult.length, 1);
  assertEquals(getResult[0], { error: "Translation not found" });
});
```