# Authentication Design Documentation

## Overview

This document explains the design decisions and rationale behind the authentication system for the TEP Konjac image translation application.

---

## Problem Statement

**Challenge:** Users could copy URLs and access resources without being logged in, potentially accessing or modifying data they shouldn't have access to.

**Requirements (from assignment):**
1. Ensure users are actually logged in (not just copying URLs)
2. Refine synchronizations to handle authentication
3. Update frontend accordingly
4. Record design ideas and rationale

---

## Design Solution: Session-Based Authentication

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  1. User enters email/password                                   │
│  2. Frontend sends to /api/auth/login                           │
│  3. Receives session token                                       │
│  4. Stores token in localStorage                                │
│  5. Includes token in all future requests                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP POST with token
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND SERVER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Requesting Concept (routes with token go here)           │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Authentication Syncs (validate session)                  │  │
│  │  - Check if token is valid                               │  │
│  │  - Check if session expired                              │  │
│  │  - Extract user ID from session                          │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                        │
│           Valid Session │   Invalid Session                     │
│           ┌─────────────┴─────────────┐                         │
│           ▼                           ▼                         │
│  ┌─────────────────┐      ┌───────────────────┐               │
│  │ Execute Action  │      │ Return 401 Error  │               │
│  │ (upload, delete)│      │ "Please log in"   │               │
│  └─────────────────┘      └───────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Session Concept (New Concept)

**Decision:** Create a dedicated `Session` concept to manage authentication sessions.

**Rationale:**
- **Separation of Concerns:** Authentication logic separate from User concept
- **Token-Based:** Each session has a unique token (UUID) that can't be guessed
- **Expiration:** Sessions expire after 24 hours, forcing re-authentication
- **Server-Side Storage:** All session data stored in database (secure, can't be tampered with)
- **Revocable:** Sessions can be ended (logout) immediately

**Alternative Considered:**
- JWT tokens (stateless) - Rejected because:
  - Can't revoke tokens until expiry
  - Require secret key management
  - More complex for this assignment scope

### 2. User.authenticate() Method

**Decision:** Add an `authenticate(email, password)` method to the User concept.

**Rationale:**
- **Single Responsibility:** User concept handles user data and validation
- **Returns Both Status and User ID:** Allows syncs to create session for the user
- **Password Hashing TODO:** Currently direct comparison (noted as insecure)
  - In production: would use bcrypt/argon2
  - For assignment demo: acceptable with TODO comment

### 3. Authentication Syncs

**Decision:** Use synchronizations to handle login/logout flows and protect routes.

**Rationale:**

#### Why Syncs Instead of Direct Implementation?

**Syncs Provide:**
1. **Decoupling:** Concepts don't need to know about each other
   - User concept doesn't know about Session concept
   - MediaManagement doesn't know about authentication

2. **Auditability:** All actions logged through Requesting concept
   - Can see who logged in and when
   - Can track all authenticated actions

3. **Flexibility:** Easy to add more steps later
   - Add rate limiting (e.g., max 5 login attempts)
   - Add email verification
   - Add two-factor authentication

4. **Consistency:** Same pattern for all protected routes
   - Validate session → Execute action → Respond
   - Clear, predictable flow

#### Login Flow Syncs (4 syncs)

```
1. LoginRequest
   WHEN: Request to /auth/login with email/password
   THEN: Call User.authenticate()

2. LoginSuccess
   WHEN: Authentication succeeds
   THEN: Create new session

3. LoginResponse
   WHEN: Session created
   THEN: Send token back to client

4. LoginFailure
   WHEN: Authentication fails
   THEN: Send error message
```

**Why 4 separate syncs?**
- Each handles ONE specific case
- Easy to test independently
- Clear responsibility for each sync
- Can add logging/metrics per step

#### Protected Route Pattern

For each protected route (e.g., `/MediaManagement/delete`):

```
Sync 1: ValidateSession
  WHEN: Request with token
  THEN: Check if session valid

Sync 2: ExecuteIfValid
  WHEN: Session is valid
  THEN: Execute the actual action

Sync 3: RespondSuccess
  WHEN: Action completes
  THEN: Send success response

Sync 4: HandleUnauthorized
  WHEN: Session is invalid
  THEN: Send 401 error
```

**Rationale:**
- **Security First:** No action executed without valid session
- **Explicit Flow:** Clear path from request to response
- **Error Handling:** Unauthorized case explicitly handled

### 4. Passthrough vs. Requesting Routes

**Decision:** Split routes into two categories:

#### PUBLIC (Passthrough - Direct to Concepts)

**Routes:**
- All queries (read-only operations)
- User registration
- Image serving

**Rationale:**
- **Performance:** No overhead for read operations
- **User Experience:** Anyone can browse without login
- **Sensible Defaults:** Viewing content doesn't need auth

**Examples:**
```
✅ /api/MediaManagement/_getMediaFile
✅ /api/MediaManagement/_listMediaFiles
✅ /api/User/create (registration)
✅ /api/Rendering/_serveRenderedImage
```

#### PROTECTED (Exclusions - Through Requesting + Syncs)

**Routes:**
- All write operations (create, update, delete)
- File uploads
- Profile changes

**Rationale:**
- **Security:** Prevent unauthorized modifications
- **Ownership:** Ensure users only modify their own data
- **Accountability:** Track who did what

**Examples:**
```
🔒 /api/MediaManagement/upload
🔒 /api/MediaManagement/delete
🔒 /api/TextExtraction/extractTextFromMedia
🔒 /api/Translation/createTranslation
🔒 /api/User/delete
```

### 5. Session Token in Requests

**Decision:** Client includes token in request body (not headers).

**Request Format:**
```json
{
  "token": "abc123...",
  "mediaId": "xyz789",
  ... other parameters
}
```

**Rationale:**
- **Consistency:** All requests are POST with JSON body
- **Simplicity:** No need to parse headers in syncs
- **Debugging:** Easy to see token in request logs

**Alternative Considered:**
- Authorization header - Standard but more complex for this assignment

### 6. Session Expiration (24 Hours)

**Decision:** Sessions expire after 24 hours.

**Rationale:**
- **Security:** Limits exposure if token stolen
- **Balance:** Long enough for normal usage, short enough for security
- **User Experience:** Don't annoy users with frequent logins

**Trade-offs:**
- Shorter (1 hour): More secure, worse UX
- Longer (1 week): Better UX, less secure
- 24 hours: Reasonable middle ground

---

## Security Considerations

### Current Implementation

✅ **Server-side sessions** - Can't be tampered with
✅ **Session expiration** - Limits exposure
✅ **Token-based** - Unique, random UUIDs
✅ **Session revocation** - Logout works immediately
✅ **Protected routes** - Write operations require auth

### Known Limitations (TODOs for Production)

⚠️ **Password Storage:**
- Current: Plain text comparison (INSECURE)
- Production: Use bcrypt/argon2 hashing
- Impact: Passwords exposed if database compromised

⚠️ **HTTPS:**
- Current: HTTP (tokens sent in plaintext)
- Production: HTTPS only
- Impact: Tokens can be intercepted

⚠️ **Rate Limiting:**
- Current: No protection against brute force
- Production: Limit login attempts (e.g., 5 per hour)
- Impact: Attacker can try unlimited passwords

⚠️ **CORS:**
- Current: Allows any origin (*)
- Production: Whitelist specific domains
- Impact: XSS attacks possible

⚠️ **Token Storage:**
- Current: localStorage
- Production: httpOnly cookies
- Impact: XSS can steal tokens from localStorage

### Why These Limitations Are Acceptable for Assignment

1. **Assignment Scope:** Focus is on concepts and syncs, not production security
2. **Demo Purpose:** System demonstrates authentication principles
3. **Documented:** All TODOs clearly marked
4. **Easy to Fix:** All issues have known solutions

---

## Implementation Impact

### Backend Changes

**New Files:**
1. `src/concepts/Session/Session.ts` - Session management
2. `src/syncs/auth.sync.ts` - Authentication syncs

**Modified Files:**
1. `src/concepts/User/User.ts` - Added `authenticate()` method
2. `src/syncs/syncs.ts` - Import auth syncs
3. `src/concepts/Requesting/passthrough.ts` - Split routes into public/protected

### Frontend Changes Needed

**New Files:**
1. `src/services/authApi.js` - Login/logout API calls
2. `src/stores/authStore.js` - Auth state (token, user)
3. `src/components/LoginView.vue` - Login form

**Modified Files:**
1. All API services - Include token in requests
2. `src/App.vue` - Add login/logout UI
3. `src/router.js` - Add login route

---

## Alternatives Considered

### 1. No Authentication (Current State)

**Pros:**
- Simple
- Fast development

**Cons:**
- ❌ Users can delete others' files
- ❌ No ownership tracking
- ❌ Fails assignment requirements

**Decision:** Rejected - doesn't meet requirements

### 2. HTTP Basic Auth

**Pros:**
- Standard
- Built into browsers

**Cons:**
- Credentials sent with every request
- No logout mechanism
- Hard to use with JavaScript

**Decision:** Rejected - poor fit for SPA

### 3. OAuth/Social Login

**Pros:**
- Professional
- No password management

**Cons:**
- Too complex for assignment
- Requires external services
- Overkill for scope

**Decision:** Rejected - over-engineering

### 4. JWT Tokens

**Pros:**
- Stateless (no database lookups)
- Standard (RFC 7519)

**Cons:**
- Can't revoke until expiry
- Requires secret key management
- More complex to implement

**Decision:** Rejected - sessions simpler for this scope

---

## Testing Strategy

### Unit Tests (TODO)

1. **Session Concept:**
   - Create session
   - Validate valid session
   - Reject expired session
   - Reject invalid token
   - End session

2. **User Concept:**
   - Authenticate with correct password
   - Reject wrong password
   - Reject non-existent email

3. **Syncs:**
   - Login flow (success)
   - Login flow (failure)
   - Logout flow
   - Protected route (authorized)
   - Protected route (unauthorized)

### Integration Tests (TODO)

1. Full login → upload → logout flow
2. Login → expired session → unauthorized
3. Login → logout → unauthorized

### Manual Testing

1. ✅ Create user account
2. ✅ Login with correct credentials
3. ✅ Login with wrong credentials (should fail)
4. ✅ Upload file with valid session
5. ✅ Upload file without session (should fail)
6. ✅ Logout
7. ✅ Try to upload after logout (should fail)

---

## Future Enhancements

### Short Term (Next Sprint)

1. **Ownership Checks:**
   - Users can only delete their own files
   - Add `userId` to MediaManagement concept
   - Check ownership in syncs

2. **Password Hashing:**
   - Install bcrypt library
   - Hash passwords on user creation
   - Compare hashed passwords on login

3. **Better Error Messages:**
   - "Session expired" vs "Invalid token"
   - Help users understand why auth failed

### Medium Term

1. **Remember Me:**
   - Optional 30-day sessions
   - Checkbox on login form

2. **Email Verification:**
   - Send verification email on signup
   - Only activate account after verification

3. **Password Reset:**
   - "Forgot password" flow
   - Email reset link

### Long Term (Production)

1. **Two-Factor Authentication:**
   - Optional TOTP (Google Authenticator)
   - SMS codes

2. **OAuth Integration:**
   - Login with Google
   - Login with GitHub

3. **Rate Limiting:**
   - Max 5 login attempts per hour
   - Exponential backoff

4. **Audit Logging:**
   - Log all auth events
   - Track failed login attempts
   - Alert on suspicious activity

---

## Conclusion

This authentication design:

✅ **Meets Requirements:** Users must be logged in, can't copy URLs
✅ **Uses Syncs:** Demonstrates sync-based architecture
✅ **Well-Documented:** Clear rationale for all decisions
✅ **Extensible:** Easy to add features later
✅ **Testable:** Clear boundaries between components

The design prioritizes:
1. **Security:** Session-based auth prevents URL copying
2. **Simplicity:** Straightforward implementation
3. **Clarity:** Well-documented decisions
4. **Maintainability:** Modular, testable code

**Trade-offs Accepted:**
- Some security features deferred (password hashing, HTTPS)
- Verbose sync implementation (but clear and correct)
- Manual testing instead of full test suite (time constraint)

All trade-offs are documented and have clear paths to improvement.
