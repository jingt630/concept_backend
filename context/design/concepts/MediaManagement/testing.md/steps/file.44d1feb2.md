---
timestamp: 'Thu Oct 16 2025 19:11:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_191136.10f5340d.md]]'
content_id: 44d1feb23f4b50499a1d3fc1624584aa587148805444bdb7a658afba796658da
---

# file: src/MediaManagement/MediaManagementConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import MediaManagementConcept from "@concepts/MediaManagementConcept.ts";
import { ID, User } from "@utils/types.ts";

Deno.test("MediaManagementConcept", async (t) => {
  const [db, client] = await testDb();
  const mediaManagement = new MediaManagementConcept(db);

  const testUser1: User = "user:Alice" as ID;
  const testUser2: User = "user:Bob" as ID;

  t.step("uploadMedia: successfully uploads a media item", async () => {
    const result = await mediaManagement.uploadMedia({
      owner: testUser1,
      filename: "document.pdf",
      contentType: "application/pdf",
    });

    console.log("Trace: uploadMedia - Uploaded a document.");
    assertEquals(result.error, undefined, "uploadMedia should not return an error.");
    assertExists(result.mediaItemId, "mediaItemId should be present.");

    const mediaItemResult = await mediaManagement.retrieveMedia({
      mediaItemId: result.mediaItemId!,
    });
    assertEquals(mediaItemResult.error, undefined, "retrieveMedia should not return an error.");
    assertEquals(mediaItemResult.mediaItem.filename, "document.pdf");
    assertEquals(mediaItemResult.mediaItem.contentType, "application/pdf");
    assertExists(mediaItemResult.mediaItem.uploadDate);
    console.log(`Trace: uploadMedia - Retrieved uploaded item: ${JSON.stringify(mediaItemResult.mediaItem)}`);
  });

  t.step("uploadMedia: handles invalid input gracefully", async () => {
    const result1 = await mediaManagement.uploadMedia({
      owner: "", // Invalid owner
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    assertEquals(result1.error, "Invalid owner ID provided.", "Should return error for invalid owner.");

    const result2 = await mediaManagement.uploadMedia({
      owner: testUser1,
      filename: "", // Invalid filename
      contentType: "image/jpeg",
    });
    assertEquals(result2.error, "Filename cannot be empty.", "Should return error for invalid filename.");

    const result3 = await mediaManagement.uploadMedia({
      owner: testUser1,
      filename: "image.jpg",
      contentType: "", // Invalid contentType
    });
    assertEquals(result3.error, "Content type cannot be empty.", "Should return error for invalid contentType.");
    console.log("Trace: uploadMedia - Handled invalid inputs with appropriate errors.");
  });

  t.step("retrieveMedia: retrieves an existing media item", async () => {
    const uploadResult = await mediaManagement.uploadMedia({
      owner: testUser1,
      filename: "report.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const mediaItemId = uploadResult.mediaItemId!;

    const result = await mediaManagement.retrieveMedia({ mediaItemId });
    assertEquals(result.error, undefined, "retrieveMedia should not return an error.");
    assertEquals(result.mediaItem.filename, "report.docx");
    assertEquals(result.mediaItem.contentType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assertExists(result.mediaItem.uploadDate);
    console.log(`Trace: retrieveMedia - Retrieved media item: ${JSON.stringify(result.mediaItem)}`);
  });

  t.step("retrieveMedia: handles non-existent media item", async () => {
    const nonExistentId: ID = "media:nonexistent" as ID;
    const result = await mediaManagement.retrieveMedia({ mediaItemId: nonExistentId });
    assertEquals(result.error, "Media item not found.", "Should return error for non-existent item.");
    console.log("Trace: retrieveMedia - Attempted to retrieve a non-existent item, received expected error.");
  });

  t.step("retrieveMedia: handles invalid media item ID", async () => {
    const result = await mediaManagement.retrieveMedia({ mediaItemId: "" as ID });
    assertEquals(result.error, "Invalid media item ID provided.", "Should return error for invalid ID.");
    console.log("Trace: retrieveMedia - Attempted to retrieve with an invalid ID, received expected error.");
  });

  t.step("getUserMedia: retrieves all media items for a user", async () => {
    await mediaManagement.uploadMedia({ owner: testUser1, filename: "photo1.png", contentType: "image/png" });
    await mediaManagement.uploadMedia({ owner: testUser1, filename: "photo2.jpg", contentType: "image/jpeg" });
    await mediaManagement.uploadMedia({ owner: testUser2, filename: "document.txt", contentType: "text/plain" });

    const result = await mediaManagement.getUserMedia({ owner: testUser1 });
    assertEquals(result.error, undefined, "getUserMedia should not return an error.");
    assertEquals(result.mediaItems.length, 2, "Should return exactly two media items for user1.");
    console.log(`Trace: getUserMedia - Retrieved ${result.mediaItems.length} media items for user1.`);

    const user2Media = await mediaManagement.getUserMedia({ owner: testUser2 });
    assertEquals(user2Media.error, undefined, "getUserMedia should not return an error for user2.");
    assertEquals(user2Media.mediaItems.length, 1, "Should return one media item for user2.");
    console.log(`Trace: getUserMedia - Retrieved ${user2Media.mediaItems.length} media item for user2.`);
  });

  t.step("getUserMedia: returns an empty array if user has no media", async () => {
    const result = await mediaManagement.getUserMedia({ owner: "user:Charlie" as ID });
    assertEquals(result.error, undefined, "getUserMedia should not return an error for a user with no media.");
    assertEquals(result.mediaItems.length, 0, "Should return an empty array if user has no media.");
    console.log("Trace: getUserMedia - User with no media returned an empty array as expected.");
  });

  t.step("getUserMedia: handles invalid user ID", async () => {
    const result = await mediaManagement.getUserMedia({ owner: "" as ID });
    assertEquals(result.error, "Invalid owner ID provided.", "Should return error for invalid user ID.");
    console.log("Trace: getUserMedia - Attempted to get media with an invalid user ID, received expected error.");
  });

  t.step("deleteMedia: successfully deletes a media item", async () => {
    const uploadResult = await mediaManagement.uploadMedia({ owner: testUser1, filename: "to_delete.gif", contentType: "image/gif" });
    const mediaItemId = uploadResult.mediaItemId!;

    const deleteResult = await mediaManagement.deleteMedia({ mediaItemId });
    assertEquals(deleteResult, {}, "deleteMedia should return an empty object on success.");
    console.log(`Trace: deleteMedia - Deleted media item with ID: ${mediaItemId}`);

    const retrieveResult = await mediaManagement.retrieveMedia({ mediaItemId });
    assertEquals(retrieveResult.error, "Media item not found.", "Media item should not be retrievable after deletion.");
    console.log("Trace: deleteMedia - Verified media item is no longer retrievable.");
  });

  t.step("deleteMedia: handles non-existent media item", async () => {
    const nonExistentId: ID = "media:nonexistent" as ID;
    const result = await mediaManagement.deleteMedia({ mediaItemId: nonExistentId });
    assertEquals(result.error, "Media item not found.", "Should return error for non-existent item.");
    console.log("Trace: deleteMedia - Attempted to delete a non-existent item, received expected error.");
  });

  t.step("deleteMedia: handles invalid media item ID", async () => {
    const result = await mediaManagement.deleteMedia({ mediaItemId: "" as ID });
    assertEquals(result.error, "Invalid media item ID provided.", "Should return error for invalid ID.");
    console.log("Trace: deleteMedia - Attempted to delete with an invalid ID, received expected error.");
  });

  t.step("Principle: manage user-uploaded media files", async () => {
    console.log("\n--- Testing Principle: manage user-uploaded media files ---");

    // Upload a file
    const uploadResult = await mediaManagement.uploadMedia({
      owner: testUser1,
      filename: "profile_pic.jpg",
      contentType: "image/jpeg",
    });
    const uploadedMediaItemId = uploadResult.mediaItemId!;
    console.log(`Trace: Principle - Uploaded media item with ID: ${uploadedMediaItemId}`);
    assertEquals(uploadResult.error, undefined);

    // Retrieve the uploaded file
    const retrieveResult = await mediaManagement.retrieveMedia({ mediaItemId: uploadedMediaItemId });
    assertEquals(retrieveResult.error, undefined);
    assertEquals(retrieveResult.mediaItem.filename, "profile_pic.jpg");
    console.log(`Trace: Principle - Retrieved uploaded media item: ${JSON.stringify(retrieveResult.mediaItem)}`);

    // Upload another file for the same user
    await mediaManagement.uploadMedia({
      owner: testUser1,
      filename: "document_v1.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    // Upload a file for a different user
    await mediaManagement.uploadMedia({
      owner: testUser2,
      filename: "shared_file.pdf",
      contentType: "application/pdf",
    });

    // Get all media for testUser1
    const user1Media = await mediaManagement.getUserMedia({ owner: testUser1 });
    assertEquals(user1Media.error, undefined);
    assertEquals(user1Media.mediaItems.length, 2, "User1 should have 2 media items.");
    console.log(`Trace: Principle - Retrieved ${user1Media.mediaItems.length} media items for User1.`);

    // Delete one of user1's files
    const deleteResult = await mediaManagement.deleteMedia({ mediaItemId: uploadedMediaItemId });
    assertEquals(deleteResult, {}, "Deletion should be successful.");
    console.log(`Trace: Principle - Deleted media item with ID: ${uploadedMediaItemId}`);

    // Verify deletion by trying to retrieve it
    const retrieveAfterDelete = await mediaManagement.retrieveMedia({ mediaItemId: uploadedMediaItemId });
    assertEquals(retrieveAfterDelete.error, "Media item not found.");
    console.log("Trace: Principle - Verified deleted media item is no longer found.");

    // Get user1's media again to confirm deletion
    const user1MediaAfterDelete = await mediaManagement.getUserMedia({ owner: testUser1 });
    assertEquals(user1MediaAfterDelete.error, undefined);
    assertEquals(user1MediaAfterDelete.mediaItems.length, 1, "User1 should now have 1 media item.");
    console.log(`Trace: Principle - User1 now has ${user1MediaAfterDelete.mediaItems.length} media items after deletion.`);

    console.log("--- Principle Test Completed Successfully ---");
  });

  await client.close();
});
```
