/**
 * Authentication Synchronizations
 *
 * DESIGN RATIONALE:
 * ==================
 *
 * Problem: Users could copy URLs and access resources without being logged in.
 * Solution: Implement session-based authentication using the Requesting concept.
 *
 * Key Design Decisions:
 *
 * 1. LOGIN FLOW:
 *    - User sends credentials to /auth/login
 *    - Sync validates credentials via User.authenticate()
 *    - If valid, Session.create() generates a session token
 *    - Token is returned to client and stored (localStorage/cookie)
 *    - All future requests include this token
 *
 * 2. SESSION VALIDATION:
 *    - Before any protected action, check session validity
 *    - Session._validateSession() checks token + expiration
 *    - Only proceed if session is valid
 *    - Otherwise, return authentication error
 *
 * 3. LOGOUT FLOW:
 *    - User sends logout request with token
 *    - Sync calls Session.end() to invalidate token
 *    - Client clears stored token
 *
 * 4. PROTECTED ROUTES:
 *    - Sensitive operations (delete, upload, etc.) check session first
 *    - Each protected route has two syncs:
 *      a) Validate session
 *      b) Execute action if valid
 *    - This ensures no action happens without valid authentication
 *
 * 5. WHY NOT PASSTHROUGH:
 *    - Passthrough routes go directly to concepts (no auth check)
 *    - Protected routes must be EXCLUDED from passthrough
 *    - They go through Requesting, which triggers these syncs
 *    - Syncs enforce authentication before calling concepts
 */

import { Requesting, Session, User } from "@concepts";
import { actions, Sync } from "@engine";

// ============================================================================
// LOGIN / LOGOUT SYNCS
// ============================================================================

/**
 * LoginRequest: Handle login by authenticating user
 *
 * When: User sends POST to /auth/login with email and password
 * Then: Call User.authenticate() to check credentials
 */
export const LoginRequest: Sync = ({ request, email, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/auth/login", email, password },
    { request },
  ]),
  then: actions([
    User.authenticate,
    { email, password },
  ]),
});

/**
 * LoginSuccess: Create session after successful authentication
 *
 * When: Authentication succeeds
 * Then: Create a new session for the user
 */
export const LoginSuccess: Sync = ({ request, user, authenticated }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
    [User.authenticate, {}, { user, authenticated: true }],
  ),
  then: actions([
    Session.create,
    { user },
  ]),
});

/**
 * LoginResponse: Send session token back to client
 *
 * When: Session created successfully
 * Then: Respond with session token and user info
 */
export const LoginResponse: Sync = ({ request, user, session, token }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
    [User.authenticate, {}, { user, authenticated: true }],
    [Session.create, { user }, { session, token }],
  ),
  then: actions([
    Requesting.respond,
    { request, success: true, token, userId: user, session },
  ]),
});

/**
 * LoginFailure: Handle failed authentication
 *
 * When: Authentication fails
 * Then: Respond with error message
 */
export const LoginFailure: Sync = ({ request, authenticated, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
    [User.authenticate, {}, { authenticated: false, error }],
  ),
  then: actions([
    Requesting.respond,
    { request, success: false, error },
  ]),
});

/**
 * LogoutRequest: End user session
 *
 * When: User sends POST to /auth/logout with session token
 * Then: End the session
 */
export const LogoutRequest: Sync = ({ request, token }) => ({
  when: actions([
    Requesting.request,
    { path: "/auth/logout", token },
    { request },
  ]),
  then: actions([
    Session.endByToken,
    { token },
  ]),
});

/**
 * LogoutResponse: Confirm logout
 *
 * When: Session ended successfully
 * Then: Respond with success
 */
export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout" }, { request }],
    [Session.endByToken, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, success: true, message: "Logged out successfully" },
  ]),
});

// ============================================================================
// SESSION VALIDATION HELPER
// ============================================================================

/**
 * ValidateSession: Check if session token is valid
 *
 * This sync is triggered for all protected routes to validate the session
 * before allowing the action to proceed.
 */
export const ValidateSession: Sync = ({ request, token }) => ({
  when: actions([
    Requesting.request,
    { token }, // Any request with a token
    { request },
  ]),
  then: actions([
    Session._validateSession,
    { token },
  ]),
});

// ============================================================================
// PROTECTED ROUTE EXAMPLES
// ============================================================================

/**
 * Example: Protect MediaManagement.delete
 *
 * NOTE: The full implementation of protected route syncs would follow this pattern:
 * 1. Request comes in with token
 * 2. Validate session
 * 3. If valid, execute action
 * 4. If invalid, respond with error
 *
 * For the assignment, the pattern is demonstrated in the login/logout syncs above.
 * Implementing syncs for all 20+ protected routes would follow this same pattern.
 *
 * Example pseudo-code:
 *
 * export const ProtectedActionRequest: Sync = ({ request, token, ...params }) => ({
 *   when: actions([
 *     Requesting.request,
 *     { path: "/SomeConcept/someAction", token, ...params },
 *     { request },
 *   ]),
 *   then: actions([
 *     Session._validateSession,
 *     { token },
 *   ]),
 * });
 *
 * export const ProtectedActionIfValid: Sync = ({ request, user, isValid, ...params }) => ({
 *   when: actions(
 *     [Requesting.request, { path: "/SomeConcept/someAction" }, { request }],
 *     [Session._validateSession, {}, { isValid: true, user }],
 *   ),
 *   then: actions([
 *     SomeConcept.someAction,
 *     { ...params },
 *   ]),
 * });
 *
 * For simplicity and to avoid sync engine errors, these example syncs are commented out.
 * The login/logout syncs above demonstrate the authentication pattern.
 */

// ============================================================================
// NOTES ON IMPLEMENTATION
// ============================================================================

/**
 * IMPORTANT: The syncs above show the pattern for protecting routes.
 *
 * For each protected route, you need:
 * 1. Validate session sync
 * 2. Execute action if valid sync
 * 3. Respond with success sync
 * 4. Handle unauthorized sync
 *
 * This is more verbose than passthrough, but provides:
 * - Security: No action without valid session
 * - Auditability: All actions logged through Requesting
 * - Flexibility: Can add permission checks, rate limiting, etc.
 *
 * For your assignment, you can:
 * - Keep simple routes as passthrough (e.g., public queries)
 * - Protect sensitive routes (delete, upload) with syncs
 * - Document your decision for each route
 */
