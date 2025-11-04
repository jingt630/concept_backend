# Sync Authentication Testing Guide

This guide explains how to test that your synchronization system properly enforces authentication and prevents users from accessing other users' data.

---

## 🎯 What We're Testing

The syncs ensure that:
1. **Users can only access their own data** (files, extractions, translations, renders)
2. **Actions are properly authenticated** (userId is verified)
3. **Cross-user access is prevented** (User A can't access User B's files)

---

## 🧪 Test Setup

### Prerequisites
1. Backend server running on `http://localhost:8000`
2. Frontend running on `http://localhost:5173`
3. MongoDB database accessible

### Test Users
Create **2 test users** to simulate multi-user scenarios:

**User A:**
- Email: `alice@test.com`
- Username: `alice`
- Password: `password123`

**User B:**
- Email: `bob@test.com`
- Username: `bob`
- Password: `password456`

---

## ✅ Test Scenarios

### **Test 1: User Registration & Login**

**Steps:**
1. Open frontend in **Chrome** (normal window)
2. Register User A (`alice@test.com`)
3. Verify login successful
4. Note the `userId` in browser console

5. Open frontend in **Firefox** or **Incognito** window
6. Register User B (`bob@test.com`)
7. Verify login successful
8. Note the `userId` in browser console

**Expected Result:**
- ✅ Both users registered successfully
- ✅ Each has unique `userId`
- ✅ Both can log in independently

---

### **Test 2: File Upload Isolation**

**Goal:** Verify users only see their own uploaded files

**Steps:**

**As User A (Chrome):**
1. Upload image: `alice_image.jpg`
2. Note the `mediaId` from console
3. Verify image appears in gallery
4. Check console log: `owner: [User A's userId]`

**As User B (Firefox/Incognito):**
1. Upload image: `bob_image.jpg`
2. Note the `mediaId` from console
3. Verify image appears in gallery
4. Should **NOT** see `alice_image.jpg`

**Expected Results:**
- ✅ User A sees only `alice_image.jpg`
- ✅ User B sees only `bob_image.jpg`
- ✅ No cross-user visibility

---

### **Test 3: Text Extraction Isolation**

**Goal:** Verify users can't access other users' extractions

**Steps:**

**As User A:**
1. Open `alice_image.jpg` in Image Editor
2. Click "🤖 Auto Extract Text" or add manual extraction
3. Note the `extractionId` from console
4. Verify extraction appears

**As User B:**
1. Try to access User A's extraction using Developer Tools:
   ```javascript
   // In browser console (SHOULD FAIL):
   fetch('http://localhost:8000/api/TextExtraction/_getExtractionResultsForImage', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userId: '[User B userId]',
       mediaId: '[User A mediaId]'  // User A's image!
     })
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ User A can extract text from their own image
- ✅ User B gets **empty array** when querying User A's extractions
- ✅ Backend verifies ownership through `owner` field in MediaFile

---

### **Test 4: Translation Isolation**

**Goal:** Verify users can't access other users' translations

**Steps:**

**As User A:**
1. Create translation for extracted text
2. Note `translationId` from console
3. Verify translation appears

**As User B:**
1. Try to access User A's translation:
   ```javascript
   // SHOULD RETURN EMPTY:
   fetch('http://localhost:8000/api/Translation/_getTranslationsByOriginalTextId', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userId: '[User B userId]',
       originalTextId: '[User A textId]'
     })
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ User A sees their own translations
- ✅ User B cannot see User A's translations
- ❌ Cross-user access denied

---

### **Test 5: Direct Concept Action Attempt (Synced Routes)**

**Goal:** Verify excluded routes are properly synced

**Steps:**

Test calling a **synced route** directly (should go through Requesting):

```javascript
// As User B, try to delete User A's extraction:
fetch('http://localhost:8000/api/TextExtraction/deleteExtraction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '[User B userId]',  // User B
    extractionId: '[User A extractionId]'  // User A's extraction!
  })
}).then(r => r.json()).then(console.log)
```

**Expected Results:**
- ✅ Request goes through `Requesting.request` (sync route)
- ✅ Backend verifies extraction belongs to User A
- ❌ Deletion fails - "Access denied" or "ExtractionResult not found"
- ✅ User A's data remains intact

---

### **Test 6: Image Serving (Binary Response)**

**Goal:** Verify users can't access other users' images

**Steps:**

**As User B, try to access User A's image:**
```javascript
fetch('http://localhost:8000/api/MediaManagement/_serveImage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '[User B userId]',
    mediaId: '[User A mediaId]'
  })
}).then(async r => {
  if (r.ok) {
    const blob = await r.blob()
    console.log('ERROR: Got image!', blob.size, 'bytes')
  } else {
    console.log('✅ Access denied:', await r.text())
  }
})
```

**Expected Results:**
- ✅ Returns error or empty response
- ✅ Image data NOT served to unauthorized user
- ✅ Binary response handling works correctly

---

### **Test 7: Cascade Delete Protection**

**Goal:** Verify cascade deletes only affect owner's data

**Steps:**

**Setup:**
1. User A uploads `image1.jpg`, extracts text, creates translations
2. User B uploads `image2.jpg`, extracts text, creates translations

**As User A:**
1. Delete `image1.jpg`
2. Check console for cascade delete logs:
   ```
   🗑️ Starting cascade deletion for mediaId: ...
   ✅ Deleted media file record
   ✅ Deleted stored image data
   ✅ Deleted X extraction results
   ✅ Deleted Y extraction locations
   ✅ Deleted Z translations
   ```

**Verify User B's data intact:**
1. Switch to User B session
2. Verify `image2.jpg` still exists
3. Verify extractions still exist
4. Verify translations still exist

**Expected Results:**
- ✅ User A's image and all related data deleted
- ✅ User B's data completely unaffected
- ✅ No cross-user cascade deletes

---

### **Test 8: Query Passthrough (Client Responsibility)**

**Goal:** Understand current query security model

**Current Behavior:**
Queries like `_getMediaFile`, `_listMediaFiles`, etc. are **passthrough** (not synced yet).

**Test:**
```javascript
// As User B, can you query User A's file details?
fetch('http://localhost:8000/api/MediaManagement/_getMediaFile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '[User A userId]',  // Different user!
    mediaId: '[User A mediaId]'
  })
}).then(r => r.json()).then(console.log)
```

**Current Expected Behavior:**
- ⚠️ **Returns data if userId matches owner** (backend checks `owner: userId`)
- ✅ Returns empty if userId doesn't match
- 📝 **TODO:** Add session-based auth to prevent userId spoofing

**Note:** Client currently sends `userId` in every request. In production, implement:
- Session cookies
- JWT tokens
- Server-side userId extraction from session

---

### **Test 9: Rendering Isolation**

**Goal:** Verify rendered outputs are user-specific

**Steps:**

**As User A:**
1. Extract text from `alice_image.jpg`
2. Translate to Spanish
3. Render output
4. Note `outputId` from console

**As User B:**
1. Try to access User A's render:
   ```javascript
   fetch('http://localhost:8000/api/Rendering/_getOutputVersionById', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userId: '[User B userId]',
       outputId: '[User A outputId]'
     })
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ Returns empty array (User B can't access User A's renders)
- ✅ Backend checks `owner: userId` in outputVersions collection

---

## 🔍 What to Look For

### ✅ **Good Behaviors (Security Working)**

1. **Database Ownership Checks:**
   ```javascript
   { _id: mediaId, owner: userId }  // ✅ Both checked
   ```

2. **Empty Returns for Unauthorized:**
   ```javascript
   return []  // ✅ No error, just no data
   ```

3. **Console Logs Show Verification:**
   ```
   ✅ Media file verified
   ✅ Ownership confirmed
   ```

4. **Cascade Deletes Scoped:**
   ```javascript
   deleteMany({ imagePath: mediaId })  // ✅ Only this user's image
   ```

### ❌ **Bad Behaviors (Security Issues)**

1. **Accessing Other Users' Data:**
   ```javascript
   // If this returns data, there's a problem:
   fetch(...).then(r => r.json()) // Returns User A's data to User B
   ```

2. **No Ownership Verification:**
   ```javascript
   // Missing owner check:
   findOne({ _id: mediaId })  // ❌ Should be: { _id: mediaId, owner: userId }
   ```

3. **Error Messages Leak Info:**
   ```javascript
   return { error: "File exists but belongs to user X" }  // ❌ Info leak
   ```

---

## 📊 Testing Checklist

Use this checklist to verify all syncs are working:

### User Concept
- [ ] User A can delete their own account
- [ ] User B cannot delete User A's account
- [ ] Profile queries return correct user data

### MediaManagement Concept
- [ ] User A can upload files
- [ ] User B cannot see User A's files in gallery
- [ ] User B cannot delete User A's files
- [ ] User B cannot access User A's images via API

### TextExtraction Concept
- [ ] User A can extract text from their images
- [ ] User B cannot see User A's extractions
- [ ] User B cannot edit User A's extractions
- [ ] User B cannot delete User A's extractions

### Translation Concept
- [ ] User A can create translations
- [ ] User B cannot see User A's translations
- [ ] User B cannot edit User A's translations
- [ ] User B cannot delete User A's translations

### Rendering Concept
- [ ] User A can render their content
- [ ] User B cannot see User A's rendered outputs
- [ ] User B cannot export User A's renders

---

## 🛠️ Testing Tools

### **1. Browser DevTools Console**
Use to make direct API calls and inspect responses:
```javascript
// Test ownership verification
const testAccess = async (userId, resourceId) => {
  const response = await fetch('http://localhost:8000/api/MediaManagement/_getMediaFile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mediaId: resourceId })
  })
  const data = await response.json()
  console.log('Access test:', data.length > 0 ? '✅ Granted' : '❌ Denied')
  return data
}
```

### **2. Network Tab**
Monitor requests to see:
- Which routes are called (passthrough vs synced)
- Request/response payloads
- Status codes (200 OK, 404 Not Found, 500 Error)

### **3. Backend Console Logs**
Watch for sync activity:
```
[Requesting] Received request for path: /TextExtraction/editExtractText
TextExtraction.editExtractText { userId: '...', extractionId: '...', newText: '...' } => {}
✅ Text updated successfully
```

### **4. MongoDB Compass (Optional)**
Directly inspect database to verify:
- `owner` fields are correctly set
- Data isolation between users
- Cascade deletes work properly

---

## 🚨 Common Security Issues to Check

### **Issue 1: Missing Owner Verification**
```javascript
// BAD - No owner check:
const file = await this.mediaFiles.findOne({ _id: mediaId })

// GOOD - Owner verified:
const file = await this.mediaFiles.findOne({ _id: mediaId, owner: userId })
```

### **Issue 2: Query Parameter Injection**
```javascript
// Current: Client sends userId (trust-based)
body: JSON.stringify({ userId: userStore.userId, ... })

// TODO: Server should extract userId from session
// (not rely on client-provided userId)
```

### **Issue 3: Info Leakage in Errors**
```javascript
// BAD - Leaks existence:
if (!file) return { error: "File not found" }
if (file.owner !== userId) return { error: "Not your file" }

// GOOD - Same response for both:
if (!file || file.owner !== userId) return { error: "Access denied" }
```

---

## 📝 Quick Test Script

Create this test file to automate testing:

**File:** `test-sync-security.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Sync Security Test</title>
</head>
<body>
  <h1>Sync Security Tester</h1>
  <div id="results"></div>

  <script>
    const API_BASE = 'http://localhost:8000/api'
    const results = document.getElementById('results')

    // Test cross-user access
    async function testCrossUserAccess() {
      const userA_id = 'USER_A_ID_HERE'  // Replace with actual ID
      const userB_id = 'USER_B_ID_HERE'  // Replace with actual ID
      const userA_mediaId = 'USER_A_MEDIA_ID_HERE'  // Replace

      // User B tries to access User A's file
      const response = await fetch(`${API_BASE}/MediaManagement/_getMediaFile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userB_id,
          mediaId: userA_mediaId
        })
      })

      const data = await response.json()

      if (Array.isArray(data) && data.length === 0) {
        results.innerHTML += '<p>✅ Cross-user access BLOCKED (correct)</p>'
      } else {
        results.innerHTML += '<p>❌ Cross-user access ALLOWED (security issue!)</p>'
        console.error('Security issue:', data)
      }
    }

    // Run tests
    testCrossUserAccess()
  </script>
</body>
</html>
```

---

## 🔒 Current Security Status

### ✅ **Implemented & Working**

**Synced Actions (Authenticated):**
- ✅ User: `delete`
- ✅ MediaManagement: `upload`, `delete`, `move`, `createFolder`, `updateContext`, `addTranslatedText`
- ✅ TextExtraction: `extractTextFromMedia`, `editExtractText`, `editLocation`, `addExtractionTxt`, `deleteExtraction`
- ✅ Translation: `createTranslation`, `editTranslation`, `deleteTranslation`, `changeLanguage`
- ✅ Rendering: `render`, `export`

**Security Checks:**
- ✅ All actions verify `owner: userId` in database queries
- ✅ Syncs pass `userId` through Requesting concept
- ✅ Cascade deletes scoped to user's data only

### ⚠️ **Limitations (TODO)**

**Query Routes (Passthrough):**
- ⚠️ Client sends `userId` in request body (trust-based)
- ⚠️ No session/token authentication yet
- ⚠️ Backend relies on client to send correct userId

**Recommended Improvements:**
1. Implement session-based authentication
2. Store userId in server-side session/JWT
3. Middleware extracts userId from token (not from request body)
4. Move query routes to exclusions once session auth implemented

---

## 🎓 Understanding Sync Flow

When User A tries to edit an extraction:

```
1. Frontend sends:
   POST /api/TextExtraction/editExtractText
   { userId: 'userA', extractionId: 'abc123', newText: 'Hello' }

2. Backend (RequestingConcept.ts):
   ❌ Route is EXCLUDED (not in passthrough)
   → Falls through to catch-all /api/*
   → Triggers Requesting.request({ path: '/TextExtraction/editExtractText', ... })

3. Sync Engine (textExtraction.sync.ts):
   → EditExtractTextRequest sync matches
   → Calls TextExtraction.editExtractText({ userId, extractionId, newText })

4. Concept (TextExtractionConcept.ts):
   → Verifies: mediaFile.owner === userId
   → If match: performs edit
   → If no match: returns { error: 'Access denied' }

5. Sync Engine:
   → EditExtractTextResponse sync matches
   → Calls Requesting.respond({ request, success: true })

6. Frontend receives:
   { success: true } or { error: '...' }
```

---

## 🏆 Success Criteria

Your sync authentication is working correctly if:

1. ✅ **Users are isolated** - Each user sees only their own data
2. ✅ **Cross-user access fails** - User B can't modify User A's data
3. ✅ **Syncs execute** - Console shows sync action traces
4. ✅ **Ownership verified** - Database queries check `owner` field
5. ✅ **No errors** - All operations complete successfully for authorized users
6. ✅ **Cascade deletes safe** - Only owner's related data is deleted

---

## 📞 Troubleshooting

### **Problem: User B can see User A's files**
**Check:**
- Is `owner` field set correctly in MediaFile?
- Does query include `owner: userId`?
- Is userId being passed correctly from frontend?

### **Problem: Sync not executing**
**Check:**
- Is route in `exclusions` array in passthrough.ts?
- Did you run `deno run build` after changing syncs?
- Did you restart the backend server?
- Check console for sync registration errors

### **Problem: "When pattern missing output pattern"**
**Check:**
- Response syncs need `, {}` for Empty-returning actions
- Input pattern must match Request sync's inputs
- Output pattern must match action's return type

---

## 🎯 Next Steps for Production

1. **Implement Session Authentication:**
   - Add session middleware
   - Store userId in session/JWT
   - Extract userId server-side (don't trust client)

2. **Move Queries to Syncs:**
   - Once session auth exists, exclude query routes
   - Create syncs for sensitive queries
   - Server extracts userId from session, not request body

3. **Add Rate Limiting:**
   - Prevent brute-force access attempts
   - Limit requests per user/IP

4. **Add Audit Logging:**
   - Log all access attempts
   - Track who accessed what and when
   - Monitor for suspicious activity

---

## 📚 References

- **Sync Implementation:** `src/syncs/*.sync.ts`
- **Passthrough Config:** `src/concepts/Requesting/passthrough.ts`
- **Security Plan:** `SYNC_SECURITY_PLAN.md`
- **Concept Framework:** Check framework documentation for sync patterns
