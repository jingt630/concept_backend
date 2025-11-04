# Sync Security Plan - Route Authorization

This document outlines which API routes should be **included** (passthrough - public access) vs **excluded** (synced - requires authentication/authorization) for security purposes.

---

## 🔓 INCLUSIONS (Passthrough - Public/No Auth Required)

### **User Concept** ✅ Already configured
- ✅ `create` - Anyone can register
- ✅ `_getUserByEmail` - Needed for login verification
- ✅ `_getUserById` - Public profile viewing
- ✅ `_getUserProfilePic` - Public profile pictures
- ✅ `_getUserUsername` - Public usernames
- ✅ `_getUserEmail` - Query (client-side responsibility for now)
- ✅ `_getAllUsers` - Public user directory

### **LikertSurvey Concept** ✅ Already configured (example/demo)
- ✅ All routes (this is a demo concept, not part of your core app)

---

## 🔒 EXCLUSIONS (Require Sync - Authentication/Ownership Required)

### **User Concept** ✅ Already synced
- ✅ `delete` - User can only delete their own account
- ✅ `changeProfilePic` - User can only change their own profile pic

**Sync File:** `src/syncs/user.sync.ts` ✅ Complete

---

### **MediaManagement Concept** 🔴 NEEDS SYNC (Critical - File Ownership)

**ALL actions and queries need sync** - users must only access their own files:

#### Actions:
- ❌ `upload` - Must associate file with authenticated user's ID
- ❌ `delete` - Only owner can delete their files
- ❌ `move` - Only owner can move their files
- ❌ `createFolder` - Must associate folder with authenticated user's ID
- ❌ `updateContext` - Only owner can update their file's context
- ❌ `addTranslatedText` - Only owner can add translations to their file

#### Queries:
- ❌ `_getMediaFile` - Only owner can access their file metadata
- ❌ `_listMediaFiles` - Only owner can list their files
- ❌ `_listFolders` - Only owner can list their folders
- ❌ `_serveImage` - Only owner can view/download their images

**Security Risk:** Without sync, users could access other users' files by guessing/copying URLs or IDs.

**Sync File:** `src/syncs/mediaManagement.sync.ts` ❌ TODO

---

### **TextExtraction Concept** 🔴 NEEDS SYNC (Critical - Content Ownership)

#### Utility Methods (Consider Inclusion as Helper Functions):
These are pure utility functions with no data access. **Recommendation: Include as public**
- `getImageDimensions` - Utility function (could be public)
- `parseNumberedTextList` - Utility function (could be public)
- `parseCoordinatesList` - Utility function (could be public)
- `getImageDimensionsFromBase64` - Utility function (could be public)
- `parsePNGDimensions` - Utility function (could be public)
- `parseJPEGDimensions` - Utility function (could be public)
- `parseWebPDimensions` - Utility function (could be public)
- `getImagePath` - Utility function (could be public)

#### Core Actions (MUST Sync):
- ❌ `extractTextFromMedia` - Extract text from user's uploaded image
- ❌ `editExtractText` - Only owner can edit extracted text
- ❌ `syncTranslationsForText` - Only owner can sync their translations
- ❌ `editLocation` - Only owner can edit text location coordinates
- ❌ `addExtractionTxt` - Only owner can add new text extractions
- ❌ `deleteExtraction` - Only owner can delete their extractions

#### Queries (MUST Sync):
- ❌ `_getExtractionResultsForImage` - Only owner can view extraction results
- ❌ `_getLocationForExtraction` - Only owner can view extraction locations

**Security Risk:** Without sync, users could extract/modify text from other users' images.

**Sync File:** `src/syncs/textExtraction.sync.ts` ❌ TODO

---

### **Translation Concept** 🔴 NEEDS SYNC (Critical - Translation Ownership)

**ALL actions and queries need sync** - translations belong to specific users:

#### Actions:
- ❌ `createTranslation` - Create translation for user's extracted text
- ❌ `editTranslation` - Only owner can edit their translations
- ❌ `deleteTranslation` - Only owner can delete their translations
- ❌ `changeLanguage` - Only owner can change target language

#### Queries:
- ❌ `_getTranslationById` - Only owner can view their translation
- ❌ `_getTranslationsByOriginalTextId` - Only owner can view their translations

**Security Risk:** Without sync, users could view/modify other users' translations.

**Sync File:** `src/syncs/translation.sync.ts` ❌ TODO

---

### **Rendering Concept** 🔴 NEEDS SYNC (Critical - Render Ownership)

**ALL actions and queries need sync** - rendered outputs are user-specific:

#### Actions:
- ❌ `render` - Render user's translated content onto their image
- ❌ `export` - Export user's rendered content

#### Queries:
- ❌ `_getOutputVersionById` - Only owner can view their rendered output
- ❌ `_getAllOutputVersions` - Only owner can list their rendered outputs
- ❌ `_getOutputsByMediaId` - Only owner can view renders of their media
- ❌ `_serveRenderedImage` - Only owner can download their rendered images

**Security Risk:** Without sync, users could access other users' rendered images.

**Sync File:** `src/syncs/rendering.sync.ts` ❌ TODO

---

## 📊 Summary by Priority

### **Priority 1 (Highest Security Risk):**
1. **MediaManagement** - Core file ownership and access control
2. **Translation** - Protects user's translation work

### **Priority 2 (High Security Risk):**
3. **TextExtraction** - Protects extracted content
4. **Rendering** - Protects final rendered outputs

### **Already Complete:**
- ✅ User (delete, changeProfilePic) - `src/syncs/user.sync.ts`

---

## 🤔 Design Decisions

### 1. TextExtraction Utility Methods
**Decision Needed:** Should utility methods be public or require auth?

- **Option A (Recommended):** Public (included) - They're just helper functions with no data access
- **Option B:** Excluded - Keep them behind auth for consistency

**Current Recommendation:** Include them as public utilities (they don't access user data)

### 2. Session/Authentication System
Currently, syncs require the client to send `userId` in every request. Consider implementing:
- Session-based authentication
- JWT tokens
- Cookie-based auth
- Middleware to extract `userId` from session/token automatically

---

## 📝 Implementation Checklist

- [x] User concept syncs (`user.sync.ts`)
- [x] User passthrough configuration
- [ ] MediaManagement concept syncs (`mediaManagement.sync.ts`)
- [ ] MediaManagement passthrough configuration
- [ ] TextExtraction concept syncs (`textExtraction.sync.ts`)
- [ ] TextExtraction passthrough configuration (decide on utilities)
- [ ] Translation concept syncs (`translation.sync.ts`)
- [ ] Translation passthrough configuration
- [ ] Rendering concept syncs (`rendering.sync.ts`)
- [ ] Rendering passthrough configuration
- [ ] Test all synced routes
- [ ] Implement proper authentication/session system

---

## 🔧 Next Steps

1. Implement **MediaManagement** syncs (highest priority)
2. Update `passthrough.ts` with MediaManagement routes
3. Test MediaManagement authentication
4. Proceed to Translation, TextExtraction, and Rendering in order

---

## 📚 References

- **Passthrough Configuration:** `src/concepts/Requesting/passthrough.ts`
- **Sync Examples:** `src/syncs/sample.sync.ts`, `src/syncs/user.sync.ts`
- **Sync Documentation:** Check concept framework documentation for sync patterns
