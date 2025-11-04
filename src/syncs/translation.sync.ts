/**
 * Translation concept synchronizations
 * These syncs ensure that translation actions are properly authenticated
 * and users can only create/modify translations for their own content
 */

import { Requesting, Translation } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Create Translation Request
 * When a user requests to create a translation,
 * ensure they can only translate their own content
 */
export const CreateTranslationRequest: Sync = (
  { request, userId, imagePath, targetLanguage, originalText, originalTextId },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Translation/createTranslation",
      userId,
      imagePath,
      targetLanguage,
      originalText,
      originalTextId,
    },
    { request },
  ]),
  then: actions([
    Translation.createTranslation,
    { userId, imagePath, targetLanguage, originalText, originalTextId },
  ]),
});

/**
 * Create Translation Response
 * After creating translation, send the result back
 */
export const CreateTranslationResponse: Sync = (
  {
    request,
    userId,
    imagePath,
    targetLanguage,
    originalText,
    originalTextId,
    translation,
    translatedText,
  },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Translation/createTranslation" },
      { request },
    ],
    [
      Translation.createTranslation,
      { userId, imagePath, targetLanguage, originalText, originalTextId },
      { translation, translatedText },
    ],
  ),
  then: actions([
    Requesting.respond,
    { request, translation, translatedText },
  ]),
});

/**
 * Edit Translation Request
 * When a user requests to edit a translation,
 * ensure they can only edit their own translations
 */
export const EditTranslationRequest: Sync = (
  { request, translation, newText },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Translation/editTranslation", translation, newText },
    { request },
  ]),
  then: actions([Translation.editTranslation, { translation, newText }]),
});

/**
 * Edit Translation Response
 * After editing translation, send confirmation back
 * Note: editTranslation returns Empty {}, so we need to specify {} as output pattern
 */
export const EditTranslationResponse: Sync = (
  { request, translation, newText },
) => ({
  when: actions(
    [Requesting.request, { path: "/Translation/editTranslation" }, { request }],
    [Translation.editTranslation, { translation, newText }, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Delete Translation Request
 * When a user requests to delete a translation,
 * ensure they can only delete their own translations
 */
export const DeleteTranslationRequest: Sync = (
  { request, userId, translationId },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Translation/deleteTranslation", userId, translationId },
    { request },
  ]),
  then: actions([Translation.deleteTranslation, { userId, translationId }]),
});

/**
 * Delete Translation Response
 * After deleting translation, send confirmation back
 * Note: deleteTranslation returns Empty {}, so we need to specify {} as output pattern
 */
export const DeleteTranslationResponse: Sync = (
  { request, userId, translationId },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Translation/deleteTranslation" },
      { request },
    ],
    [Translation.deleteTranslation, { userId, translationId }, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Change Language Request
 * When a user requests to change translation language,
 * ensure they can only change their own translations
 */
export const ChangeLanguageRequest: Sync = (
  { request, translation, newTargetLang },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Translation/changeLanguage", translation, newTargetLang },
    { request },
  ]),
  then: actions([
    Translation.changeLanguage,
    { translation, newTargetLang },
  ]),
});

/**
 * Change Language Response
 * After changing language, send the result back
 */
export const ChangeLanguageResponse: Sync = (
  { request, translation, newTargetLang },
) => ({
  when: actions(
    [Requesting.request, { path: "/Translation/changeLanguage" }, { request }],
    [
      Translation.changeLanguage,
      { translation, newTargetLang },
      { translation },
    ],
  ),
  then: actions([Requesting.respond, { request, translation }]),
});
