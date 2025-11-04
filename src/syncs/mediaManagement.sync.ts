/**
 * MediaManagement concept synchronizations
 * These syncs ensure that media management actions are properly authenticated
 * and users can only manage their own files and folders
 *
 * This is CRITICAL for security - prevents users from accessing/modifying
 * other users' uploaded files
 */

import { MediaManagement, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Upload Media Request
 * When a user requests to upload a file,
 * associate it with their authenticated user ID
 */
export const UploadMediaRequest: Sync = (
  { request, userId, filePath, mediaType, filename, relativePath, fileData },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/MediaManagement/upload",
      userId,
      filePath,
      mediaType,
      filename,
      relativePath,
      fileData,
    },
    { request },
  ]),
  then: actions([
    MediaManagement.upload,
    { userId, filePath, mediaType, filename, relativePath, fileData },
  ]),
});

/**
 * Upload Media Response
 * After uploading, return the created MediaFile object
 * Note: upload returns a MediaFile object (with _id, filename, filePath, etc.)
 */
export const UploadMediaResponse: Sync = (
  { request, userId, filePath, mediaType, filename, relativePath, fileData },
) => ({
  when: actions(
    [Requesting.request, { path: "/MediaManagement/upload" }, { request }],
    [
      MediaManagement.upload,
      { userId, filePath, mediaType, filename, relativePath, fileData },
      {},
    ],
  ),
  then: actions([Requesting.respond, { request }]),
});

/**
 * Delete Media Request
 * When a user requests to delete a file,
 * ensure they can only delete their own files
 */
export const DeleteMediaRequest: Sync = ({ request, userId, mediaId }) => ({
  when: actions([
    Requesting.request,
    { path: "/MediaManagement/delete", userId, mediaId },
    { request },
  ]),
  then: actions([MediaManagement.delete, { userId, mediaId }]),
});

/**
 * Delete Media Response
 * After deleting, send confirmation back
 * Note: delete returns Empty {}, so we need to specify {} as output pattern
 */
export const DeleteMediaResponse: Sync = ({ request, userId, mediaId }) => ({
  when: actions(
    [Requesting.request, { path: "/MediaManagement/delete" }, { request }],
    [MediaManagement.delete, { userId, mediaId }, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Move Media Request
 * When a user requests to move a file,
 * ensure they can only move their own files
 */
export const MoveMediaRequest: Sync = (
  { request, userId, mediaId, newFilePath },
) => ({
  when: actions([
    Requesting.request,
    { path: "/MediaManagement/move", userId, mediaId, newFilePath },
    { request },
  ]),
  then: actions([MediaManagement.move, { userId, mediaId, newFilePath }]),
});

/**
 * Move Media Response
 * After moving, send confirmation back
 * Note: move returns Empty {}, so we need to specify {} as output pattern
 */
export const MoveMediaResponse: Sync = (
  { request, userId, mediaId, newFilePath },
) => ({
  when: actions(
    [Requesting.request, { path: "/MediaManagement/move" }, { request }],
    [MediaManagement.move, { userId, mediaId, newFilePath }, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Create Folder Request
 * When a user requests to create a folder,
 * associate it with their authenticated user ID
 */
export const CreateFolderRequest: Sync = (
  { request, userId, filePath, name },
) => ({
  when: actions([
    Requesting.request,
    { path: "/MediaManagement/createFolder", userId, filePath, name },
    { request },
  ]),
  then: actions([MediaManagement.createFolder, { userId, filePath, name }]),
});

/**
 * Create Folder Response
 * After creating folder, return the created Folder object
 * Note: createFolder returns a Folder object (with _id, filePath, name, owner)
 */
export const CreateFolderResponse: Sync = (
  { request, userId, filePath, name },
) => ({
  when: actions(
    [Requesting.request, { path: "/MediaManagement/createFolder" }, {
      request,
    }],
    [MediaManagement.createFolder, { userId, filePath, name }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

/**
 * Update Context Request
 * When a user requests to update media context,
 * ensure they can only update their own files
 */
export const UpdateContextRequest: Sync = (
  { request, userId, mediaId, extractionResult },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/MediaManagement/updateContext",
      userId,
      mediaId,
      extractionResult,
    },
    { request },
  ]),
  then: actions([
    MediaManagement.updateContext,
    { userId, mediaId, extractionResult },
  ]),
});

/**
 * Update Context Response
 * After updating context, send confirmation back
 * Note: updateContext returns Empty {}, so we need to specify {} as output pattern
 */
export const UpdateContextResponse: Sync = (
  { request, userId, mediaId, extractionResult },
) => ({
  when: actions(
    [Requesting.request, { path: "/MediaManagement/updateContext" }, {
      request,
    }],
    [MediaManagement.updateContext, { userId, mediaId, extractionResult }, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Add Translated Text Request
 * When a user requests to add translated text to media,
 * ensure they can only update their own files
 */
export const AddTranslatedTextRequest: Sync = (
  { request, userId, mediaId, translatedText },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/MediaManagement/addTranslatedText",
      userId,
      mediaId,
      translatedText,
    },
    { request },
  ]),
  then: actions([
    MediaManagement.addTranslatedText,
    { userId, mediaId, translatedText },
  ]),
});

/**
 * Add Translated Text Response
 * After adding translated text, send confirmation back
 * Note: addTranslatedText returns Empty {}, so we need to specify {} as output pattern
 */
export const AddTranslatedTextResponse: Sync = (
  { request, userId, mediaId, translatedText },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/MediaManagement/addTranslatedText" },
      { request },
    ],
    [
      MediaManagement.addTranslatedText,
      { userId, mediaId, translatedText },
      {},
    ],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});
