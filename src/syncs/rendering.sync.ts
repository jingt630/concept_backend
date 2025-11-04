/**
 * Rendering concept synchronizations
 * These syncs ensure that rendering actions are properly authenticated
 * and users can only render their own content
 */

import { Rendering, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Render Request
 * When a user requests to render translated content onto an image,
 * ensure they can only render their own content
 */
export const RenderRequest: Sync = (
  { request, userId, imagePath, contentToRender },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Rendering/render", userId, imagePath, contentToRender },
    { request },
  ]),
  then: actions([Rendering.render, { userId, imagePath, contentToRender }]),
});

/**
 * Render Response
 * After rendering, send the output back
 */
export const RenderResponse: Sync = (
  { request, userId, imagePath, contentToRender, output },
) => ({
  when: actions(
    [Requesting.request, { path: "/Rendering/render" }, { request }],
    [Rendering.render, { userId, imagePath, contentToRender }, { output }],
  ),
  then: actions([Requesting.respond, { request, output }]),
});

/**
 * Export Request
 * When a user requests to export rendered content,
 * ensure they can only export their own renders
 */
export const ExportRequest: Sync = (
  { request, outputId, destination, type },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Rendering/export", outputId, destination, type },
    { request },
  ]),
  then: actions([Rendering.export, { outputId, destination, type }]),
});

/**
 * Export Response
 * After exporting, send the file back
 */
export const ExportResponse: Sync = (
  { request, outputId, destination, type, file },
) => ({
  when: actions(
    [Requesting.request, { path: "/Rendering/export" }, { request }],
    [Rendering.export, { outputId, destination, type }, { file }],
  ),
  then: actions([Requesting.respond, { request, file }]),
});
