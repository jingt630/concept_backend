import { testDb } from "@utils/database.ts";
import TextExtractionConcept from "./TextExtraction.ts";
import { ObjectId } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { assertEquals, assertFalse } from "jsr:@std/assert";

Deno.test("TextExtractionConcept: extractTextFromMedia", async (t) => {
  const [db, client] = await testDb();
  const textExtraction = new TextExtractionConcept(db);

  await t.step("should extract text and create an extraction result", async () => {
    const imagePath = "path/to/image.png" as ID;
    const result = await textExtraction.extractTextFromMedia({ image: imagePath });

    const extractionResults = await textExtraction.extractionResults
      .find({ imagePath: imagePath })
      .toArray();
    const locations = await textExtraction.locations
      .find({ extractionResultId: result.result })
      .toArray();

    assertEquals(extractionResults.length, 1);
    assertEquals(locations.length, 1);
    assertEquals(extractionResults[0].imagePath, imagePath);
    assertEquals(
      extractionResults[0].extractedText,
      "Placeholder extracted text for path/to/image.png",
    );
    assertEquals(extractionResults[0].textId, "path/to/image.png_0");
    assertEquals(extractionResults[0].position, locations[0]._id);
  });

  await t.step("should handle multiple extractions for the same image", async () => {
    const imagePath = "path/to/another_image.jpg" as ID;
    await textExtraction.extractTextFromMedia({ image: imagePath });
    const result2 = await textExtraction.extractTextFromMedia({ image: imagePath });

    const extractionResults = await textExtraction.extractionResults
      .find({ imagePath: imagePath })
      .toArray();
    const locations = await textExtraction.locations
      .find({ extractionResultId: result2.result })
      .toArray();

    assertEquals(extractionResults.length, 2);
    assertEquals(locations.length, 1);
    assertEquals(extractionResults[1].textId, "path/to/another_image.jpg_1");
  });

  await client.close();
});

Deno.test("TextExtractionConcept: editExtractText", async (t) => {
  const [db, client] = await testDb();
  const textExtraction = new TextExtractionConcept(db);

  const imagePath = "path/to/edit_image.png" as ID;
  const { result: extractionId } = await textExtraction.extractTextFromMedia({
    image: imagePath,
  });
  const newText = "This is the edited text.";

  await t.step("should edit the extracted text successfully", async () => {
    const editResult = await textExtraction.editExtractText({
      extractedText: extractionId,
      newText: newText,
    });
    assertEquals(editResult, {}); // Expect empty object for success

    const updatedExtraction = await textExtraction.extractionResults.findOne({
      _id: extractionId,
    });
    assertEquals(updatedExtraction?.extractedText, newText);
  });

  await t.step("should return an error if extraction result does not exist", async () => {
    const nonExistentId = new ObjectId().toString() as ID;
    const editResult = await textExtraction.editExtractText({
      extractedText: nonExistentId,
      newText: "This should not be applied.",
    });
    assertEquals(editResult, { error: "ExtractionResult not found" });
  });

  await client.close();
});

Deno.test("TextExtractionConcept: editLocation", async (t) => {
  const [db, client] = await testDb();
  const textExtraction = new TextExtractionConcept(db);

  const imagePath = "path/to/location_image.png" as ID;
  const { result: extractionId } = await textExtraction.extractTextFromMedia({
    image: imagePath,
  });
  const fromCoord: [number, number] = [10, 20];
  const toCoord: [number, number] = [110, 120];

  await t.step("should edit the location successfully", async () => {
    const editResult = await textExtraction.editLocation({
      extractedText: extractionId,
      fromCoord: fromCoord,
      toCoord: toCoord,
    });
    assertEquals(editResult, {});

    const extraction = await textExtraction.extractionResults.findOne({
      _id: extractionId,
    });
    const location = await textExtraction.locations.findOne({
      _id: extraction!.position,
    });

    assertEquals(location?.fromCoord, fromCoord);
    assertEquals(location?.toCoord, toCoord);
  });

  await t.step("should return an error if coordinates are negative", async () => {
    const negativeCoord: [number, number] = [-10, 20];
    const editResult = await textExtraction.editLocation({
      extractedText: extractionId,
      fromCoord: negativeCoord,
      toCoord: toCoord,
    });
    assertEquals(editResult, { error: "Coordinates cannot be negative." });
  });

  await t.step("should return an error if extraction result does not exist", async () => {
    const nonExistentId = new ObjectId().toString() as ID;
    const editResult = await textExtraction.editLocation({
      extractedText: nonExistentId,
      fromCoord: fromCoord,
      toCoord: toCoord,
    });
    assertEquals(editResult, { error: "ExtractionResult not found" });
  });

  await client.close();
});

Deno.test("TextExtractionConcept: addExtractionTxt", async (t) => {
  const [db, client] = await testDb();
  const textExtraction = new TextExtractionConcept(db);

  const imagePath = "path/to/add_image.png" as ID;
  const fromCoord: [number, number] = [5, 15];
  const toCoord: [number, number] = [105, 115];

  await t.step("should add a new extraction with empty text", async () => {
    const result = await textExtraction.addExtractionTxt({
      media: imagePath,
      fromCoord: fromCoord,
      toCoord: toCoord,
    });

    const extractionResults = await textExtraction.extractionResults
      .find({ imagePath: imagePath })
      .toArray();

    assertEquals(extractionResults.length, 1);
    assertEquals(extractionResults[0].imagePath, imagePath);
    assertEquals(extractionResults[0].extractedText, "");
    assertEquals(extractionResults[0].textId, `${imagePath}_0`);
  });

  await t.step("should return an error if coordinates are negative", async () => {
    const negativeCoord: [number, number] = [5, -15];
    const addResult = await textExtraction.addExtractionTxt({
      media: imagePath,
      fromCoord: fromCoord,
      toCoord: negativeCoord,
    });
    assertEquals(addResult, { error: "Coordinates cannot be negative." });
  });

  await client.close();
});

Deno.test("TextExtractionConcept: deleteExtraction", async (t) => {
  const [db, client] = await testDb();
  const textExtraction = new TextExtractionConcept(db);

  const imagePath = "path/to/delete_image.png" as ID;
  const fromCoord: [number, number] = [5, 15];
  const toCoord: [number, number] = [105, 115];
  const textIdToDelete = "delete_this_text";

  // Add an extraction to be deleted
  await textExtraction.extractionResults.insertOne({
    _id: new ObjectId().toString() as ID,
    imagePath: imagePath,
    extractedText: "This text will be deleted.",
    position: new ObjectId().toString() as ID, // Placeholder, will be updated or handled by addExtractionTxt
    textId: textIdToDelete,
  });
  // Need to also add a corresponding location for the delete logic to work correctly
  const addedExtraction = await textExtraction.extractionResults.findOne({ textId: textIdToDelete, imagePath: imagePath });
  await textExtraction.locations.insertOne({
    _id: new ObjectId().toString() as ID,
    extractionResultId: addedExtraction!._id,
    fromCoord: fromCoord,
    toCoord: toCoord,
  });


  await t.step("should delete the extraction and its location", async () => {
    const deleteResult = await textExtraction.deleteExtraction({
      textId: textIdToDelete,
      imagePath: imagePath,
    });
    assertEquals(deleteResult, {});

    const extraction = await textExtraction.extractionResults.findOne({
      textId: textIdToDelete,
      imagePath: imagePath,
    });
    assertEquals(extraction, null); // Should be null if deleted

    const location = await textExtraction.locations.findOne({
      extractionResultId: addedExtraction!._id,
    });
    assertEquals(location, null); // Should be null if deleted
  });

  await t.step("should return an error if extraction does not exist", async () => {
    const deleteResult = await textExtraction.deleteExtraction({
      textId: "non_existent_id",
      imagePath: imagePath,
    });
    assertEquals(
      deleteResult,
      { error: "ExtractionResult not found with the given textId and imagePath." },
    );
  });

  await client.close();
});

Deno.test("TextExtractionConcept: principle test", async (t) => {
  const [db, client] = await testDb();
  const textExtraction = new TextExtractionConcept(db);

  const imagePath = "principle_image.jpg" as ID;

  await t.step("Principle: Given an image, AI extracts text and produces a transcript with metadata.", async () => {
    // Action: Call extractTextFromMedia
    const extractionResult = await textExtraction.extractTextFromMedia({
      image: imagePath,
    });
    const extractionId = extractionResult.result;

    // Verification: Check that an ExtractionResult was created
    const createdExtraction = await textExtraction.extractionResults.findOne({
      _id: extractionId,
    });
    assertEquals(createdExtraction?.imagePath, imagePath);
    assertEquals(createdExtraction?.extractedText, `Placeholder extracted text for ${imagePath}`);
    assertEquals(createdExtraction?.textId, `${imagePath}_0`);

    // Verification: Check that a Location was created and is associated
    const location = await textExtraction.locations.findOne({
      extractionResultId: extractionId,
    });
    assertEquals(location?._id, createdExtraction?.position);
    assertEquals(location?.fromCoord, [0, 0]);
    assertEquals(location?.toCoord, [100, 100]);

    // Simulating AI editing and adding more text
    const newText = "This is the recognized text.";
    await textExtraction.editExtractText({
      extractedText: extractionId,
      newText: newText,
    });

    const editedExtraction = await textExtraction.extractionResults.findOne({
      _id: extractionId,
    });
    assertEquals(editedExtraction?.extractedText, newText);

    // Simulating adding another piece of text in a different location
    const secondFromCoord: [number, number] = [200, 200];
    const secondToCoord: [number, number] = [300, 300];
    const secondExtractionResult = await textExtraction.addExtractionTxt({
      media: imagePath,
      fromCoord: secondFromCoord,
      toCoord: secondToCoord,
    });
    if ("result" in secondExtractionResult){
      const secondExtractionId = secondExtractionResult.result;
      const secondCreatedExtraction = await textExtraction.extractionResults.findOne({
      _id: secondExtractionId,
    });
    assertEquals(secondCreatedExtraction?.imagePath, imagePath);
    assertEquals(secondCreatedExtraction?.extractedText, "");
    assertEquals(secondCreatedExtraction?.textId, `${imagePath}_1`); // second extraction for the same image

    const secondLocation = await textExtraction.locations.findOne({
      extractionResultId: secondExtractionId,
    });
    assertEquals(secondLocation?._id, secondCreatedExtraction?.position);
    assertEquals(secondLocation?.fromCoord, secondFromCoord);
    assertEquals(secondLocation?.toCoord, secondToCoord);
    }
    else{
    assertFalse;
    }

  });



  await client.close();
});

Deno.test("TextExtractionConcept: error handling for non-existent IDs", async (t) => {
    const [db, client] = await testDb();
    const textExtraction = new TextExtractionConcept(db);

    const nonExistentExtractionId = new ObjectId().toString() as ID;
    const imagePath = "some_image.png" as ID;
    const nonExistentTextId = "non_existent_text_id";

    await t.step("editExtractText should return error for non-existent ID", async () => {
        const result = await textExtraction.editExtractText({
            extractedText: nonExistentExtractionId,
            newText: "This should fail."
        });
        assertEquals(result, { error: "ExtractionResult not found" });
    });

    await t.step("editLocation should return error for non-existent ID", async () => {
        const result = await textExtraction.editLocation({
            extractedText: nonExistentExtractionId,
            fromCoord: [0, 0],
            toCoord: [10, 10]
        });
        assertEquals(result, { error: "ExtractionResult not found" });
    });

    await t.step("deleteExtraction should return error for non-existent textId/imagePath", async () => {
        const result = await textExtraction.deleteExtraction({
            textId: nonExistentTextId,
            imagePath: imagePath
        });
        assertEquals(result, { error: "ExtractionResult not found with the given textId and imagePath." });
    });

    await client.close();
});
