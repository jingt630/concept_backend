---
timestamp: 'Sun Oct 19 2025 22:05:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_220543.d0b008e0.md]]'
content_id: bb507106ff571ab69c32147d57457983ae271935d18db8e23f2eb9b28f2609bc
---

# file: src/MediaManagement/MediaManagementConcept.test.ts

```typescript
import { testDb } from "@utils/database.ts";
import MediaManagementConcept from "./MediaManagementConcept.ts";
import { assertEquals } from "jsr:@std/assert";
import { ID } from "@utils/types.ts";

Deno.test("MediaManagementConcept - Operational Principle", async () => {
  const [db, client] = await testDb();
  const userId = "user:Alice" as ID;
  const mediaManagement = new MediaManagementConcept(db, userId);

  console.log("--- Testing Operational Principle ---");

  // 1. User uploads a media file
  const uploadResult = await mediaManagement.upload({
    filePath: "/documents",
    mediaType: "png",
    filename: "vacation_photo.png",
    relativePath: "/Users/Alice/Pictures/vacation_photo.png",
  });
  console.log("Action: upload", {
    filePath: "/documents",
    mediaType: "png",
    filename: "vacation_photo.png",
    relativePath: "/Users/Alice/Pictures/vacation_photo.png",
  });
  console.log("Result:", uploadResult);
  assertEquals(typeof uploadResult, "object");
  assertEquals(uploadResult._id.startsWith("MediaManagement.mediaFiles:"), true);
  assertEquals(uploadResult.filename, "vacation_photo.png");
  assertEquals(uploadResult.filePath, "/documents");
  assertEquals(uploadResult.owner, userId);

  const mediaFileId = uploadResult._id;

  // 2. User creates a folder
  const createFolderResult = await mediaManagement.createFolder({
    filePath: "/documents",
    name: "Vacation",
  });
  console.log("Action: createFolder", { filePath: "/documents", name: "Vacation" });
  console.log("Result:", createFolderResult);
  assertEquals(typeof createFolderResult, "object");
  assertEquals(createFolderResult._id.startsWith("MediaManagement.folders:"), true);
  assertEquals(createFolderResult.filePath, "/documents");
  assertEquals(createFolderResult.name, "Vacation");
  assertEquals(createFolderResult.owner, userId);

  // 3. User moves the media file to the new folder
  const moveResult = await mediaManagement.move({
    mediaId: mediaFileId,
    newFilePath: "/documents/Vacation",
  });
  console.log("Action: move", { mediaId: mediaFileId, newFilePath: "/documents/Vacation" });
  console.log("Result:", moveResult);
  assertEquals(moveResult, {});

  // Verify the move
  const movedMediaFile = await mediaManagement._getMediaFile(mediaFileId);
  assertEquals(movedMediaFile.length, 1);
  assertEquals(movedMediaFile[0].filePath, "/documents/Vacation");

  // 4. AI processes the file and updates context
  const extractionResult = {
    "text_content": "A beautiful beach with palm trees.",
    "language": "English",
  };
  const updateContextResult = await mediaManagement.updateContext({
    mediaId: mediaFileId,
    extractionResult: extractionResult,
  });
  console.log("Action: updateContext", { mediaId: mediaFileId, extractionResult });
  console.log("Result:", updateContextResult);
  assertEquals(updateContextResult, {});

  // Verify context update
  const mediaFileWithContext = await mediaManagement._getMediaFile(mediaFileId);
  assertEquals(mediaFileWithContext.length, 1);
  assertEquals(mediaFileWithContext[0].context, extractionResult);

  // 5. AI translates the context
  const translatedTextResult = {
    "Spanish": "Una hermosa playa con palmeras.",
    "French": "Une belle plage avec des palmiers.",
  };
  const addTranslatedTextResult = await mediaManagement.addTranslatedText({
    mediaId: mediaFileId,
    translatedText: translatedTextResult,
  });
  console.log("Action: addTranslatedText", { mediaId: mediaFileId, translatedText: translatedTextResult });
  console.log("Result:", addTranslatedTextResult);
  assertEquals(addTranslatedTextResult, {});

  // Verify translated text update
  const mediaFileWithTranslation = await mediaManagement._getMediaFile(mediaFileId);
  assertEquals(mediaFileWithTranslation.length, 1);
  assertEquals(mediaFileWithTranslation[0].translatedText, translatedTextResult);

  await client.close();
});

Deno.test("MediaManagementConcept - Delete Media File", async () => {
  const [db, client] = await testDb();
  const userId = "user:Alice" as ID;
  const mediaManagement = new MediaManagementConcept(db, userId);

  console.log("--- Testing Delete Media File ---");

  // Upload a file first
  const uploadResult = await mediaManagement.upload({
    filePath: "/documents",
    mediaType: "jpg",
    filename: "delete_me.jpg",
    relativePath: "/Users/Alice/Pictures/delete_me.jpg",
  });
  console.log("Action: upload", {
    filePath: "/documents",
    mediaType: "jpg",
    filename: "delete_me.jpg",
    relativePath: "/Users/Alice/Pictures/delete_me.jpg",
  });
  console.log("Result:", uploadResult);
  const mediaFileId = uploadResult._id;

  // Delete the file
  const deleteResult = await mediaManagement.delete({ mediaId: mediaFileId });
  console.log("Action: delete", { mediaId: mediaFileId });
  console.log("Result:", deleteResult);
  assertEquals(deleteResult, {});

  // Verify deletion
  const deletedMediaFile = await mediaManagement._getMediaFile(mediaFileId);
  assertEquals(deletedMediaFile.length, 0);

  await client.close();
});

Deno.test("MediaManagementConcept - Create Folder with existing name", async () => {
  const [db, client] = await testDb();
  const userId = "user:Alice" as ID;
  const mediaManagement = new MediaManagementConcept(db, userId);

  console.log("--- Testing Create Folder with existing name ---");

  // Create a folder
  await mediaManagement.createFolder({ filePath: "/documents", name: "ExistingFolder" });
  console.log("Action: createFolder", { filePath: "/documents", name: "ExistingFolder" });

  // Attempt to create another folder with the same name
  const createFolderResult = await mediaManagement.createFolder({
    filePath: "/documents",
    name: "ExistingFolder",
  });
  console.log("Action: createFolder", { filePath: "/documents", name: "ExistingFolder" });
  console.log("Result:", createFolderResult);
  assertEquals(createFolderResult.error, "A folder with this name already exists at this location.");

  await client.close();
});

Deno.test("MediaManagementConcept - Upload with invalid filename", async () => {
  const [db, client] = await testDb();
  const userId = "user:Alice" as ID;
  const mediaManagement = new MediaManagementConcept(db, userId);

  console.log("--- Testing Upload with invalid filename ---");

  const uploadResult = await mediaManagement.upload({
    filePath: "/documents",
    mediaType: "png",
    filename: "invalid*filename.png",
    relativePath: "/Users/Alice/Pictures/invalid*filename.png",
  });
  console.log("Action: upload", {
    filePath: "/documents",
    mediaType: "png",
    filename: "invalid*filename.png",
    relativePath: "/Users/Alice/Pictures/invalid*filename.png",
  });
  console.log("Result:", uploadResult);
  assertEquals(uploadResult.error, "Filename can only contain alphabets, numbers, and spaces.");

  await client.close();
});

Deno.test("MediaManagementConcept - List Media Files and Folders", async () => {
  const [db, client] = await testDb();
  const userId = "user:Alice" as ID;
  const mediaManagement = new MediaManagementConcept(db, userId);

  console.log("--- Testing List Media Files and Folders ---");

  // Create folders
  await mediaManagement.createFolder({ filePath: "/", name: "Photos" });
  await mediaManagement.createFolder({ filePath: "/", name: "Documents" });
  await mediaManagement.createFolder({ filePath: "/Photos", name: "Vacation" });
  console.log("Actions: createFolder (multiple)");

  // Upload media files
  const photo1 = await mediaManagement.upload({
    filePath: "/Photos",
    mediaType: "jpg",
    filename: "sunset.jpg",
    relativePath: "/Users/Alice/Pictures/sunset.jpg",
  });
  const photo2 = await mediaManagement.upload({
    filePath: "/Photos/Vacation",
    mediaType: "png",
    filename: "beach.png",
    relativePath: "/Users/Alice/Pictures/Vacation/beach.png",
  });
  const doc1 = await mediaManagement.upload({
    filePath: "/Documents",
    mediaType: "pdf",
    filename: "report.pdf",
    relativePath: "/Users/Alice/Documents/report.pdf",
  });
  console.log("Actions: upload (multiple)");

  // List folders in root
  const rootFolders = await mediaManagement._listFolders("/");
  console.log("Action: _listFolders('/')", {});
  console.log("Result:", rootFolders);
  assertEquals(rootFolders.length, 2);
  assertEquals(rootFolders.some((f) => f.name === "Photos"), true);
  assertEquals(rootFolders.some((f) => f.name === "Documents"), true);

  // List folders in Photos
  const photosFolders = await mediaManagement._listFolders("/Photos");
  console.log("Action: _listFolders('/Photos')", {});
  console.log("Result:", photosFolders);
  assertEquals(photosFolders.length, 1);
  assertEquals(photosFolders[0].name, "Vacation");

  // List media files in Photos
  const photosMedia = await mediaManagement._listMediaFiles("/Photos");
  console.log("Action: _listMediaFiles('/Photos')", {});
  console.log("Result:", photosMedia);
  assertEquals(photosMedia.length, 1);
  assertEquals(photosMedia[0].filename, "sunset.jpg");

  // List media files in Vacation
  const vacationMedia = await mediaManagement._listMediaFiles("/Photos/Vacation");
  console.log("Action: _listMediaFiles('/Photos/Vacation')", {});
  console.log("Result:", vacationMedia);
  assertEquals(vacationMedia.length, 1);
  assertEquals(vacationMedia[0].filename, "beach.png");

  await client.close();
});

Deno.test("MediaManagementConcept - Update context and translated text", async () => {
  const [db, client] = await testDb();
  const userId = "user:Alice" as ID;
  const mediaManagement = new MediaManagementConcept(db, userId);

  console.log("--- Testing Update Context and Translated Text ---");

  // Upload a file
  const uploadResult = await mediaManagement.upload({
    filePath: "/images",
    mediaType: "png",
    filename: "text_image.png",
    relativePath: "/Users/Alice/Pictures/text_image.png",
  });
  console.log("Action: upload", {
    filePath: "/images",
    mediaType: "png",
    filename: "text_image.png",
    relativePath: "/Users/Alice/Pictures/text_image.png",
  });
  const mediaFileId = uploadResult._id;

  // Update context
  const extractionResult = {
    "text": "Hello World!",
    "confidence": "0.95",
  };
  const updateContextResult = await mediaManagement.updateContext({
    mediaId: mediaFileId,
    extractionResult: extractionResult,
  });
  console.log("Action: updateContext", { mediaId: mediaFileId, extractionResult });
  console.log("Result:", updateContextResult);
  assertEquals(updateContextResult, {});

  // Verify context
  let updatedMedia = await mediaManagement._getMediaFile(mediaFileId);
  assertEquals(updatedMedia.length, 1);
  assertEquals(updatedMedia[0].context, extractionResult);

  // Add translated text
  const translatedTextResult = {
    "Spanish": "¡Hola Mundo!",
    "French": "Bonjour le monde!",
  };
  const addTranslatedTextResult = await mediaManagement.addTranslatedText({
    mediaId: mediaFileId,
    translatedText: translatedTextResult,
  });
  console.log("Action: addTranslatedText", { mediaId: mediaFileId, translatedText: translatedTextResult });
  console.log("Result:", addTranslatedTextResult);
  assertEquals(addTranslatedTextResult, {});

  // Verify translated text
  updatedMedia = await mediaManagement._getMediaFile(mediaFileId);
  assertEquals(updatedMedia.length, 1);
  assertEquals(updatedMedia[0].translatedText, translatedTextResult);

  await client.close();
});

Deno.test("MediaManagementConcept - Move non-existent media file", async () => {
  const [db, client] = await testDb();
  const userId = "user:Alice" as ID;
  const mediaManagement = new MediaManagementConcept(db, userId);

  console.log("--- Testing Move non-existent media file ---");

  const nonExistentMediaId = "MediaManagement.mediaFiles:nonexistent" as ID;
  const moveResult = await mediaManagement.move({
    mediaId: nonExistentMediaId,
    newFilePath: "/new/path",
  });
  console.log("Action: move", { mediaId: nonExistentMediaId, newFilePath: "/new/path" });
  console.log("Result:", moveResult);
  assertEquals(moveResult.error, "Media file not found or not owned by the current user.");

  await client.close();
});
```
