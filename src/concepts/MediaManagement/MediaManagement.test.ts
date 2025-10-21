import { testDb } from "@utils/database.ts";
import { assertEquals, assertExists } from "jsr:@std/assert";
import MediaManagementConcept from "./MediaManagement.ts";
import { ID } from "@utils/types.ts";

// Helper function to create a mock user ID
const mockUser = "user:testuser" as ID;

Deno.test("MediaManagement Concept Tests", async (t) => {
  const [db, client] = await testDb();

  // Instantiate the concept (userId will be passed per request)
  const mediaManagement = new MediaManagementConcept(db);

  // --- Test Cases for Actions ---

  await t.step("upload action: successful upload", async () => {
    console.log("--- Testing upload: successful upload ---");
    const uploadResult = await mediaManagement.upload({
      userId: mockUser,
      filePath: "/photos",
      mediaType: "png",
      filename: "holidayPhoto",
      relativePath: "local/path/to/holiday_photo.png",
    });

    console.log("Upload Result:", JSON.stringify(uploadResult));

    // Assertions for successful upload
    if ("error" in uploadResult) {
      return assertEquals(true, false, "Upload should not have an error.");
    }
    assertEquals(typeof uploadResult._id, "string");
    assertEquals(uploadResult.filename, "holidayPhoto");
    assertEquals(uploadResult.mediaType, "png");
    assertEquals(uploadResult.filePath, "/photos");
    assertEquals(uploadResult.owner, mockUser);
    assertExists(uploadResult.uploadDate);
    assertExists(uploadResult.updateDate);
    assertEquals(uploadResult.context, undefined);
    assertEquals(uploadResult.translatedText, undefined);

    // Verify state change using queries
    const retrievedMedia = await mediaManagement._getMediaFile({
      userId: mockUser,
      mediaId: uploadResult._id,
    });
    assertEquals(retrievedMedia.length, 1);
    assertEquals(retrievedMedia[0]._id, uploadResult._id);
    assertEquals(retrievedMedia[0].filename, "holidayPhoto");
  });

  await t.step("upload action: invalid filename", async () => {
    console.log("--- Testing upload: invalid filename ---");
    const uploadResult = await mediaManagement.upload({
      userId: mockUser,
      filePath: "/documents",
      mediaType: "txt",
      filename: "invalid@file#name", // Contains invalid characters @ and #
      relativePath: "local/path/to/invalid@file.txt",
    });

    console.log(
      "Upload Result (invalid filename):",
      JSON.stringify(uploadResult),
    );

    // Assertions for invalid filename
    assertEquals(
      "error" in uploadResult,
      true,
      "Filename can only contain alphabets, numbers, spaces, dots, hyphens, and underscores.",
    );
  });

  await t.step("createFolder action: successful creation", async () => {
    console.log("--- Testing createFolder: successful creation ---");
    const createFolderResult = await mediaManagement.createFolder({
      userId: mockUser,
      filePath: "/documents",
      name: "reports",
    });

    console.log("Create Folder Result:", JSON.stringify(createFolderResult));

    if ("error" in createFolderResult) {
      return assertEquals(
        true,
        false,
        "Folder creation should not have an error.",
      );
    }
    assertEquals(typeof createFolderResult._id, "string");
    assertEquals(createFolderResult.name, "reports");
    assertEquals(createFolderResult.filePath, "/documents");
    assertEquals(createFolderResult.owner, mockUser);

    // Verify state change
    const folders = await mediaManagement._listFolders({ userId: mockUser, filePath: "/documents" });
    assertEquals(folders.length, 1);
    assertEquals(folders[0]._id, createFolderResult._id);
  });

  await t.step("createFolder action: duplicate folder name", async () => {
    console.log("--- Testing createFolder: duplicate folder name ---");
    // First, create a folder
    await mediaManagement.createFolder({ userId: mockUser, filePath: "/images", name: "nature" });

    // Attempt to create another folder with the same name in the same path
    const duplicateFolderResult = await mediaManagement.createFolder({
      userId: mockUser,
      filePath: "/images",
      name: "nature",
    });

    console.log(
      "Create Folder Result (duplicate):",
      JSON.stringify(duplicateFolderResult),
    );
    assertEquals(
      "error" in duplicateFolderResult,
      true,
      "A folder with this name already exists at this location.",
    );
  });

  await t.step("move action: successful move", async () => {
    console.log("--- Testing move: successful move ---");
    // First, upload a file
    const uploadedFile = await mediaManagement.upload({
      userId: mockUser,
      filePath: "/staging",
      mediaType: "jpg",
      filename: "sunset",
      relativePath: "local/path/to/sunset.jpg",
    });
    if ("error" in uploadedFile) {
      throw new Error("Setup failed: " + uploadedFile.error);
    }

    // Then, move the file
    const moveResult = await mediaManagement.move({
      userId: mockUser,
      mediaId: uploadedFile._id,
      newFilePath: "/archive",
    });

    console.log("Move Result:", JSON.stringify(moveResult));
    assertEquals(moveResult, {}); // Expect an empty object for success

    // Verify state change
    const retrievedMedia = await mediaManagement._getMediaFile({
      userId: mockUser,
      mediaId: uploadedFile._id,
    });
    assertEquals(retrievedMedia.length, 1);
    assertEquals(retrievedMedia[0].filePath, "/archive");
    assertExists(retrievedMedia[0].updateDate); // updateDate should have been updated
  });

  await t.step("move action: media not found or not owned", async () => {
    console.log("--- Testing move: media not found or not owned ---");
    const nonExistentMediaId = "non-existent-id" as ID;
    const moveResult = await mediaManagement.move({
      userId: mockUser,
      mediaId: nonExistentMediaId,
      newFilePath: "/archive",
    });
    console.log("Move Result (non-existent):", JSON.stringify(moveResult));
    assertEquals(
      moveResult.error,
      "Media file not found or not owned by the current user.",
    );

    // Test with another user's media (requires setting up another user or mocking)
    // For simplicity here, we assume tests run in isolation and don't need cross-user interaction.
  });

  await t.step("delete action: successful delete", async () => {
    console.log("--- Testing delete: successful delete ---");
    // First, upload a file
    const uploadedFile = await mediaManagement.upload({
      userId: mockUser,
      filePath: "/temp",
      mediaType: "gif",
      filename: "animation",
      relativePath: "local/path/to/animation.gif",
    });
    if ("error" in uploadedFile) {
      throw new Error("Setup failed: " + uploadedFile.error);
    }

    // Then, delete the file
    const deleteResult = await mediaManagement.delete({
      userId: mockUser,
      mediaId: uploadedFile._id,
    });
    console.log("Delete Result:", JSON.stringify(deleteResult));
    assertEquals(deleteResult, {}); // Expect an empty object for success

    // Verify state change
    const retrievedMedia = await mediaManagement._getMediaFile({
      userId: mockUser,
      mediaId: uploadedFile._id,
    });
    assertEquals(retrievedMedia.length, 0); // Should be empty
  });

  await t.step("delete action: media not found or not owned", async () => {
    console.log("--- Testing delete: media not found or not owned ---");
    const nonExistentMediaId = "non-existent-id" as ID;
    const deleteResult = await mediaManagement.delete({
      userId: mockUser,
      mediaId: nonExistentMediaId,
    });
    console.log("Delete Result (non-existent):", JSON.stringify(deleteResult));
    assertEquals(
      deleteResult.error,
      "Media file not found or not owned by the current user.",
    );
  });

  await t.step("updateContext action: successful update", async () => {
    console.log("--- Testing updateContext: successful update ---");
    // Upload a file first
    const uploadedFile = await mediaManagement.upload({
      userId: mockUser,
      filePath: "/images",
      mediaType: "jpg",
      filename: "scan",
      relativePath: "local/path/to/scan.jpg",
    });
    if ("error" in uploadedFile) {
      throw new Error("Setup failed: " + uploadedFile.error);
    }

    // Define extraction result
    const extractionData = { text: "This is a scanned document.", page: "1" };

    // Update context
    const updateContextResult = await mediaManagement.updateContext({
      userId: mockUser,
      mediaId: uploadedFile._id,
      extractionResult: extractionData,
    });
    console.log("Update Context Result:", JSON.stringify(updateContextResult));
    assertEquals(updateContextResult, {}); // Expect an empty object for success

    // Verify state change
    const retrievedMedia = await mediaManagement._getMediaFile({
      userId: mockUser,
      mediaId: uploadedFile._id,
    });
    assertEquals(retrievedMedia.length, 1);
    assertEquals(retrievedMedia[0].context, extractionData);
    assertExists(retrievedMedia[0].updateDate); // updateDate should have been updated
  });

  await t.step(
    "updateContext action: media not found or not owned",
    async () => {
      console.log(
        "--- Testing updateContext: media not found or not owned ---",
      );
      const nonExistentMediaId = "non-existent-id" as ID;
      const extractionData = { text: "This is a scanned document." };
      const updateContextResult = await mediaManagement.updateContext({
        userId: mockUser,
        mediaId: nonExistentMediaId,
        extractionResult: extractionData,
      });
      console.log(
        "Update Context Result (non-existent):",
        JSON.stringify(updateContextResult),
      );
      assertEquals(
        updateContextResult.error,
        "Media file not found or not owned by the current user.",
      );
    },
  );

  await t.step("addTranslatedText action: successful add", async () => {
    console.log("--- Testing addTranslatedText: successful add ---");
    // Upload a file first
    const uploadedFile = await mediaManagement.upload({
      userId: mockUser,
      filePath: "/images",
      mediaType: "jpg",
      filename: "document",
      relativePath: "local/path/to/document.jpg",
    });
    if ("error" in uploadedFile) {
      throw new Error("Setup failed: " + uploadedFile.error);
    }

    // Add context first as translatedText depends on context (implicitly by the principle)
    const extractionData = { text: "Hello world." };
    await mediaManagement.updateContext({
      userId: mockUser,
      mediaId: uploadedFile._id,
      extractionResult: extractionData,
    });

    // Define translated text
    const translatedData = { en: "Hello world.", es: "Hola mundo." };

    // Add translated text
    const addTranslatedTextResult = await mediaManagement.addTranslatedText({
      userId: mockUser,
      mediaId: uploadedFile._id,
      translatedText: translatedData,
    });
    console.log(
      "Add Translated Text Result:",
      JSON.stringify(addTranslatedTextResult),
    );
    assertEquals(addTranslatedTextResult, {}); // Expect an empty object for success

    // Verify state change
    const retrievedMedia = await mediaManagement._getMediaFile({
      userId: mockUser,
      mediaId: uploadedFile._id,
    });
    assertEquals(retrievedMedia.length, 1);
    assertEquals(retrievedMedia[0].translatedText, translatedData);
    assertExists(retrievedMedia[0].updateDate); // updateDate should have been updated
  });

  await t.step(
    "addTranslatedText action: media not found or not owned",
    async () => {
      console.log(
        "--- Testing addTranslatedText: media not found or not owned ---",
      );
      const nonExistentMediaId = "non-existent-id" as ID;
      const translatedData = { en: "Hello." };
      const addTranslatedTextResult = await mediaManagement.addTranslatedText({
        userId: mockUser,
        mediaId: nonExistentMediaId,
        translatedText: translatedData,
      });
      console.log(
        "Add Translated Text Result (non-existent):",
        JSON.stringify(addTranslatedTextResult),
      );
      assertEquals(
        addTranslatedTextResult.error,
        "Media file not found or not owned by the current user.",
      );
    },
  );

  // --- Test Cases for Principle ---

  await t.step(
    "Principle: User uploads, moves, and processes media",
    async () => {
      console.log(
        "--- Testing Principle: User uploads, moves, and processes media ---",
      );

      // 1. User uploads a media file
      const uploadResponse1 = await mediaManagement.upload({
        userId: mockUser,
        filePath: "/user_files/images",
        mediaType: "jpg",
        filename: "vacation pic",
        relativePath: "local/path/to/vacation pic.jpg",
      });
      if ("error" in uploadResponse1) {
        throw new Error(`Upload failed: ${uploadResponse1.error}`);
      }
      const uploadedFileId1 = uploadResponse1._id;
      console.log(
        `Uploaded file: ${uploadResponse1.filename} (ID: ${uploadedFileId1})`,
      );

      // 2. User uploads another media file
      const uploadResponse2 = await mediaManagement.upload({
        userId: mockUser,
        filePath: "/user_files/documents",
        mediaType: "pdf",
        filename: "report",
        relativePath: "local/path/to/report.pdf",
      });
      if ("error" in uploadResponse2) {
        throw new Error(`Upload failed: ${uploadResponse2.error}`);
      }
      const uploadedFileId2 = uploadResponse2._id;
      console.log(
        `Uploaded file: ${uploadResponse2.filename} (ID: ${uploadedFileId2})`,
      );

      // 3. User moves the first file to a different folder
      const moveResponse = await mediaManagement.move({
        userId: mockUser,
        mediaId: uploadedFileId1,
        newFilePath: "/user_files/archive/photos",
      });
      if ("error" in moveResponse) {
        throw new Error(`Move failed: ${moveResponse.error}`);
      }
      console.log(
        `Moved file ${uploadedFileId1} to /user_files/archive/photos`,
      );

      // Verify the move
      const movedFile = await mediaManagement._getMediaFile({ userId: mockUser, mediaId: uploadedFileId1 });
      assertEquals(movedFile.length, 1);
      assertEquals(movedFile[0].filePath, "/user_files/archive/photos");
      console.log("Move verified.");

      // 4. User updates the context of the first file (simulating AI extraction)
      const contextData = {
        description: "A beautiful beach sunset.",
        location: "Malibu",
      };
      const updateContextResponse = await mediaManagement.updateContext({
        userId: mockUser,
        mediaId: uploadedFileId1,
        extractionResult: contextData,
      });
      if ("error" in updateContextResponse) {
        throw new Error(
          `Update context failed: ${updateContextResponse.error}`,
        );
      }
      console.log(`Updated context for file ${uploadedFileId1}`);

      // Verify context update
      const fileWithContext = await mediaManagement._getMediaFile({
        userId: mockUser,
        mediaId: uploadedFileId1,
      });
      assertEquals(fileWithContext.length, 1);
      assertEquals(fileWithContext[0].context, contextData);
      console.log("Context update verified.");

      // 5. User adds translated text for the first file
      const translatedData = {
        en: "A beautiful beach sunset.",
        es: "Un hermoso atardecer en la playa.",
      };
      const addTranslatedTextResponse = await mediaManagement.addTranslatedText(
        {
          userId: mockUser,
          mediaId: uploadedFileId1,
          translatedText: translatedData,
        },
      );
      if ("error" in addTranslatedTextResponse) {
        throw new Error(
          `Add translated text failed: ${addTranslatedTextResponse.error}`,
        );
      }
      console.log(`Added translated text for file ${uploadedFileId1}`);

      // Verify translated text addition
      const fileWithTranslation = await mediaManagement._getMediaFile({
        userId: mockUser,
        mediaId: uploadedFileId1,
      });
      assertEquals(fileWithTranslation.length, 1);
      assertEquals(fileWithTranslation[0].translatedText, translatedData);
      console.log("Translated text addition verified.");

      // 6. Verify the second file remains untouched and in its original location
      const retrievedFile2 = await mediaManagement._getMediaFile({
        userId: mockUser,
        mediaId: uploadedFileId2,
      });
      assertEquals(retrievedFile2.length, 1);
      assertEquals(retrievedFile2[0].filePath, "/user_files/documents");
      assertEquals(retrievedFile2[0].context, undefined);
      console.log("Second file status verified.");

      console.log(
        "Principle: User uploads, moves, and processes media - successfully demonstrated.",
      );
    },
  );

  await client.close();
});
