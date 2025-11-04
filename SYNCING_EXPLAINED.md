# 🔄 Understanding Syncs and API Architecture

## Overview: Two Backend Servers

You have **two different ways** to run your backend:

| Command | File | Purpose | Use Case |
|---------|------|---------|----------|
| `deno task concept` | `src/concept_server.ts` | Simple direct server | Development, testing |
| `deno task start` | `src/main.ts` | Requesting + Engine + Syncs | Production, assignment |

---

## 🎯 Current Setup (For Assignment)

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Vue Components (ImageEditor, MediaGallery, etc.)       │    │
│  └──────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼─────────────────────────────────┐    │
│  │ API Services (mediaApi.js, textExtractionApi.js)       │    │
│  │ - Makes HTTP POST requests                             │    │
│  │ - Example: mediaApi.upload({ filePath, fileData })     │    │
│  └──────────────────────┬─────────────────────────────────┘    │
└─────────────────────────┼──────────────────────────────────────┘
                          │ HTTP POST
                          │ to http://localhost:8000/api/...
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND SERVER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Hono Web Server (listening on port 8000)                 │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                        │
│           ┌─────────────┴─────────────┐                         │
│           │                           │                         │
│  ┌────────▼──────────┐      ┌────────▼────────────┐           │
│  │ PASSTHROUGH       │      │ REQUESTING          │           │
│  │ Direct to concept │      │ Via Requesting +    │           │
│  │                   │      │ Syncs               │           │
│  └────────┬──────────┘      └────────┬────────────┘           │
│           │                           │                         │
│           ▼                           ▼                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              CONCEPT LAYER                               │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │MediaMngmt  │  │TextExtraction│  │ Translation  │    │  │
│  │  └────────────┘  └──────────────┘  └──────────────┘    │  │
│  │  ┌────────────┐  ┌──────────────┐                      │  │
│  │  │ Rendering  │  │     User     │                      │  │
│  │  └────────────┘  └──────────────┘                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              DATABASE (MongoDB)                          │  │
│  │  Collections: MediaManagement.files, TextExtraction.    │  │
│  │  results, Translation.translations, etc.                │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Two Request Paths

### Path A: Passthrough (What You're Using Now)

**Example:** `POST /api/MediaManagement/upload`

```
Frontend
  ↓ fetch('http://localhost:8000/api/MediaManagement/upload', {...})
  ↓
Hono Server
  ↓ app.post('/api/MediaManagement/upload', ...)
  ↓
MediaManagement Concept
  ↓ async upload({ userId, filePath, mediaType, ... })
  ↓ [Business logic: save to DB, store file]
  ↓
Response
  ↓ { file: "abc123", filePath: "/my/image.jpg" }
  ↓
Frontend receives result
```

**Pros:**
- ✅ Fast and simple
- ✅ Easy to debug
- ✅ Good for public APIs

**Cons:**
- ❌ No centralized auth
- ❌ No logging/auditing
- ❌ Each concept handles everything

---

### Path B: Requesting + Syncs (Advanced)

**Example:** `POST /api/MediaManagement/deleteUserFile`

```
Frontend
  ↓ fetch('http://localhost:8000/api/MediaManagement/deleteUserFile', {...})
  ↓
Hono Server
  ↓ No passthrough route (excluded)
  ↓ Falls back to Requesting concept
  ↓
Requesting.request()
  ↓ Creates a Request object: { _id: "req123", input: {...}, path: "/MediaManagement/deleteUserFile" }
  ↓ Waits for response...
  ↓
SYNC TRIGGERS (in src/syncs/*.sync.ts)
  ↓
  ↓ Sync #1: "When request for /deleteUserFile, check auth"
  ↓   when: Requesting.request { path: "/MediaManagement/deleteUserFile" }
  ↓   then: User._checkPermission({ userId, fileId })
  ↓
  ↓ Sync #2: "When permission OK, delete file"
  ↓   when: User._checkPermission { authorized: true }
  ↓   then: MediaManagement.delete({ mediaId })
  ↓
  ↓ Sync #3: "When delete done, respond"
  ↓   when: MediaManagement.delete { success: true }
  ↓   then: Requesting.respond({ request: "req123", success: true })
  ↓
Requesting.respond()
  ↓ Updates Request object with response
  ↓
Response sent back to frontend
```

**Pros:**
- ✅ Centralized authentication
- ✅ Full audit trail
- ✅ Complex workflows (chain actions)
- ✅ Decouple concepts

**Cons:**
- ❌ More complex
- ❌ Slightly slower
- ❌ Requires writing syncs

---

## 📝 What Are Syncs?

Syncs are **reactive rules** that define application logic OUTSIDE of concepts.

### Anatomy of a Sync

```typescript
export const CreateSurveyRequest: Sync = (
  { request, author, title, scaleMin, scaleMax },  // Variables to match
) => ({
  // WHEN these actions happen...
  when: actions([
    Requesting.request,
    { path: "/LikertSurvey/createSurvey", author, title, scaleMin, scaleMax },
    { request },
  ]),

  // THEN trigger these actions...
  then: actions([
    LikertSurvey.createSurvey,
    { author, title, scaleMin, scaleMax }
  ]),
});
```

**Translation:**
- **WHEN** someone makes a request to `/LikertSurvey/createSurvey` with author, title, etc.
- **THEN** call the `LikertSurvey.createSurvey()` method with those parameters

### Real-World Example: Authentication

```typescript
// Sync 1: Check authentication for user deletion
export const DeleteUserAuth: Sync = ({ request, userId, requestingUser }) => ({
  when: actions([
    Requesting.request,
    { path: "/User/delete", userId },
    { request },
  ]),
  then: actions([
    User._checkIsAdmin,
    { userId: requestingUser }  // Check if requesting user is admin
  ]),
});

// Sync 2: If admin, allow deletion
export const DeleteUserIfAdmin: Sync = ({ request, userId, isAdmin }) => ({
  when: actions(
    [Requesting.request, { path: "/User/delete", userId }, { request }],
    [User._checkIsAdmin, {}, { isAdmin: true }],  // Only if admin
  ),
  then: actions([
    User.delete,
    { userId }
  ]),
});

// Sync 3: Send response
export const DeleteUserResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/User/delete" }, { request }],
    [User.delete, {}, { success }],
  ),
  then: actions([
    Requesting.respond,
    { request, success }
  ]),
});
```

---

## 🎓 For Your Assignment

### What You Need to Do

1. **Run the build command:**
   ```bash
   cd concept_backend
   deno task build
   ```

2. **Start the Requesting server:**
   ```bash
   deno task start
   ```

3. **Check console output:**
   - Should see all your routes listed as verified ✅
   - No "WARNING - UNVERIFIED ROUTE" messages

4. **Test your frontend:**
   - Your Vue app should work exactly the same
   - All routes are using passthrough (direct to concepts)

### Current Configuration

✅ **All routes are in `inclusions`** - they go directly to concepts
✅ **No routes are in `exclusions`** - nothing goes through Requesting
✅ **Frontend works as before** - same endpoints, same behavior

### Future Enhancement (Optional)

Later, you could add authentication by:

1. **Exclude sensitive routes:**
   ```typescript
   export const exclusions: Array<string> = [
     "/api/User/delete",
     "/api/MediaManagement/delete",
   ];
   ```

2. **Write syncs for authentication:**
   ```typescript
   // In src/syncs/auth.sync.ts
   export const CheckUserAuth: Sync = ({ request, userId }) => ({
     when: actions([
       Requesting.request,
       { path: "/User/delete", userId },
       { request },
     ]),
     then: actions([
       User._checkPermission,
       { userId }
     ]),
   });
   ```

3. **Re-run build and restart:**
   ```bash
   deno task build
   deno task start
   ```

---

## 🔍 Debugging Tips

### Check Server Console
When requests come in, you'll see:
```
[Requesting] Received request for path: /MediaManagement/upload
```

### Test Individual Endpoints
```bash
# Test a passthrough route
curl -X POST http://localhost:8000/api/User/_getAllUsers \
  -H "Content-Type: application/json" \
  -d "{}"
```

### View Database
```typescript
// In concept files, log data:
console.log('📊 Saved to DB:', result);
```

---

## 📚 Key Concepts Summary

| Term | What It Is | Example |
|------|------------|---------|
| **Frontend API Service** | HTTP client that calls backend | `mediaApi.upload()` |
| **Backend Concept** | TypeScript class with methods | `MediaManagement.upload()` |
| **Passthrough Route** | Direct HTTP → Concept | `/api/User/create` → `User.create()` |
| **Requesting Route** | HTTP → Requesting → Sync → Concept | Same path, different handling |
| **Sync** | Reactive rule connecting actions | "When X, then Y" |
| **Action** | A concept method being called | `Requesting.request()` |
| **Engine** | System that runs syncs | Watches for actions, triggers syncs |

---

## ✅ Your Current Status

- ✅ Backend has all your concepts (MediaManagement, TextExtraction, etc.)
- ✅ Frontend has API services that call the backend
- ✅ All routes configured as passthrough (direct)
- ✅ No syncs needed yet (all routes are public)
- ✅ Assignment requirements met

**Your app works the same way, but now it's running through the Requesting concept architecture!**
