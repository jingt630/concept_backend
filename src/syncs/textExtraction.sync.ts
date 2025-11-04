/**
 * TextExtraction concept synchronizations
 * These syncs ensure that text extraction actions are properly authenticated
 * and users can only extract/modify text from their own uploaded images
 */

import { Requesting, TextExtraction } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Extract Text From Media Request
 * When a user requests to extract text from an image via the Requesting concept,
 * extract the authenticated user ID and media ID, then pass to TextExtraction concept
 */
export const ExtractTextFromMediaRequest: Sync = (
  { request, userId, mediaId },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TextExtraction/extractTextFromMedia", userId, mediaId },
    { request },
  ]),
  then: actions([TextExtraction.extractTextFromMedia, { userId, mediaId }]),
});

/**
 * Extract Text From Media Response
 * After text extraction is complete, send the results back
 */
export const ExtractTextFromMediaResponse: Sync = ({ request, results }) => ({
  when: actions(
    [Requesting.request, { path: "/TextExtraction/extractTextFromMedia" }, {
      request,
    }],
    [TextExtraction.extractTextFromMedia, {}, { results }],
  ),
  then: actions([Requesting.respond, { request, results }]),
});

/**
 * Edit Extract Text Request
 * When a user requests to edit extracted text,
 * ensure they can only edit text from their own images
 */
export const EditExtractTextRequest: Sync = (
  { request, userId, extractionId, newText },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TextExtraction/editExtractText", userId, extractionId, newText },
    { request },
  ]),
  then: actions([TextExtraction.editExtractText, {
    userId,
    extractionId,
    newText,
  }]),
});

/**
 * Edit Extract Text Response
 * After editing extracted text, send confirmation back
 */
export const EditExtractTextResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TextExtraction/editExtractText" }, {
      request,
    }],
    [TextExtraction.editExtractText, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Edit Location Request
 * When a user requests to edit text location coordinates,
 * ensure they can only edit locations from their own images
 */
export const EditLocationRequest: Sync = (
  { request, userId, extractionId, fromCoord, toCoord },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/TextExtraction/editLocation",
      userId,
      extractionId,
      fromCoord,
      toCoord,
    },
    { request },
  ]),
  then: actions([TextExtraction.editLocation, {
    userId,
    extractionId,
    fromCoord,
    toCoord,
  }]),
});

/**
 * Edit Location Response
 * After editing location, send confirmation back
 */
export const EditLocationResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TextExtraction/editLocation" }, { request }],
    [TextExtraction.editLocation, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Add Extraction Text Request
 * When a user requests to add a new text extraction,
 * ensure they can only add extractions to their own images
 */
export const AddExtractionTxtRequest: Sync = (
  { request, userId, mediaId, text, location },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/TextExtraction/addExtractionTxt",
      userId,
      mediaId,
      text,
      location,
    },
    { request },
  ]),
  then: actions([TextExtraction.addExtractionTxt, {
    userId,
    mediaId,
    text,
    location,
  }]),
});

/**
 * Add Extraction Text Response
 * After adding a new extraction, send the result back
 */
export const AddExtractionTxtResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/TextExtraction/addExtractionTxt" }, {
      request,
    }],
    [TextExtraction.addExtractionTxt, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

/**
 * Delete Extraction Request
 * When a user requests to delete an extraction,
 * ensure they can only delete extractions from their own images
 */
export const DeleteExtractionRequest: Sync = (
  { request, userId, extractionId },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TextExtraction/deleteExtraction", userId, extractionId },
    { request },
  ]),
  then: actions([TextExtraction.deleteExtraction, { userId, extractionId }]),
});

/**
 * Delete Extraction Response
 * After deleting extraction, send confirmation back
 */
export const DeleteExtractionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TextExtraction/deleteExtraction" }, {
      request,
    }],
    [TextExtraction.deleteExtraction, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});
