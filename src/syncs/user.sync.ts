/**
 * User concept synchronizations
 * These syncs ensure that user actions are properly authenticated
 * and users can only access/modify their own data
 *
 * NOTE: This currently handles only ACTIONS (methods that modify state).
 * QUERIES (methods starting with _) cannot be easily secured through syncs
 * without a proper authentication/session system.
 * See passthrough.ts for how queries are handled.
 */

import { Requesting, User } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Delete User Request
 * When a user requests to delete their account via the Requesting concept,
 * extract the authenticated user ID and pass it to the User concept
 */
export const DeleteUserRequest: Sync = ({ request, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/User/delete", user },
    { request },
  ]),
  then: actions([User.delete, { user }]),
});

/**
 * Delete User Response
 * After the user is deleted, send the response back
 */
export const DeleteUserResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/User/delete" }, { request }],
    [User.delete, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});
