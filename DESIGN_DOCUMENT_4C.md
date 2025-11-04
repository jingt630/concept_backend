# Design Document - Assignment 4C
**TEP Konjac: Image Translation Platform**

This document summarizes key design changes from Assignment 2 (concept design) and Assignment 4B (visual design) to the final implementation in Assignment 4C.

---

## 🔒 Major Addition: Synchronization & Authentication System

### **What Changed**
Implemented comprehensive **request synchronization** for all user actions to enforce data isolation and security.

### **Why This Matters**
Without synchronization, users could potentially access other users' uploaded images, translations, and rendered outputs by copying URLs or manipulating request parameters.

### **Implementation Details**

**Synced Concepts (All Actions Authenticated):**
- **User:** Account deletion (2 syncs)
- **MediaManagement:** File upload, delete, move, folder creation, context updates (12 syncs)
- **TextExtraction:** Text extraction, editing, location updates, deletion (10 syncs)
- **Translation:** Creation, editing, deletion, language changes (8 syncs)
- **Rendering:** Render and export operations (4 syncs)

**Total: 36 synchronizations** securing 19 user actions across 5 concepts.

**How It Works:**
1. Protected routes are **excluded** from direct passthrough
2. Requests trigger `Requesting.request` action
3. Syncs intercept and verify `userId` ownership
4. Concepts check database `owner` field matches `userId`
5. Access denied if ownership doesn't match

**Documentation:** See [SYNC_AUTHENTICATION_TESTING_GUIDE.md](SYNC_AUTHENTICATION_TESTING_GUIDE.md) for comprehensive testing procedures.

**Security Configuration:** All routes categorized in [passthrough.ts](src/concepts/Requesting/passthrough.ts)

---

## 📐 Concept Design Changes from Assignment 2

### **1. MediaManagement Concept**
**Removed:** Cross-image context awareness where AI could reference information from multiple images simultaneously.

**Rationale:**
- Significant implementation complexity
- Performance concerns with processing multiple images
- Focus on core single-image translation workflow

**Current Implementation:** Each image is processed independently with isolated context.

**Reference:** See [README.md line 13](README.md#changed-from-assignment-2-concepts) for detailed concept differences.

### **2. User Concept**
**Removed:** Profile picture functionality (`changeProfilePic` action and related queries).

**Rationale:**
- Not essential for core translation workflow
- Reduced surface area for potential security issues
- Simplified user management

### **3. TextExtraction Concept**
**Simplified:** Removed complex multi-image text correlation features.

**Enhanced:**
- Improved AI prompt engineering for better OCR accuracy
- Added coordinate validation and normalization
- Implemented automatic translation sync when text is edited

---

## 🎨 Visual Design & UX Enhancements from Assignment 4B

### **1. Multi-Select Functionality**
**New Feature:** Bulk operations for efficiency

- **Extraction Multi-Select:** Select multiple text extractions for bulk deletion
- **Translation Multi-Select:** Select multiple translations across different extractions
- **Visual Feedback:** Checkboxes appear in top-right corner with eye-catching animations
  - Pop-in animation with rotation and scale
  - Pulse animation (2 cycles) with yellow glow
  - Yellow-green gradient background on selection indicators

**User Benefit:** Manage large batches of content efficiently instead of one-by-one deletions.

### **2. Responsive Layout Optimization**
**Enhanced:** Interface adapts gracefully to different screen sizes

- **Text Box Compaction:** Reduced extraction item size by ~40% to show more content simultaneously
- **Smart Spacing:** Optimized padding, margins, and font sizes for density
- **Scroll Management:** Added horizontal scrolling for large images to prevent overflow
- **Rounded Corner Consistency:** Ensured all modals have matching rounded borders on scrollable content

**User Benefit:** Can view original text and all translations simultaneously without excessive scrolling.

### **3. Image Quality Preservation**
**Fixed:** Full-resolution rendering and export

**Problem Identified:** Canvas was rendering at scaled-down preview dimensions (800×600px), causing quality loss on download.

**Solution:**
- Render canvas at **original image dimensions** (e.g., 3000×2000px)
- CSS scales display for preview only
- Downloads export at full resolution with lossless PNG format

**Code Changes:**
```javascript
// Before: :width="displayDimensions.width" (scaled)
// After:  :width="imageDimensions.width" (original)
```

**User Benefit:** Downloaded rendered images maintain original quality.

### **4. Privacy & Information Security**
**Removed:** Sensitive information from user interface

**Hidden Elements:**
- Internal database IDs (mediaId, extractionId, translationId)
- Backend API URLs (localhost:8000)
- Cloud storage URLs (gs://bucket/...)
- Internal file paths (/uploads/userId/...)

**Visible Elements (Safe):**
- Filename, file type, upload dates
- User-facing content only
- No technical implementation details

**User Benefit:** Cleaner interface, reduced information overload, enhanced privacy.

### **5. Discoverability Improvements**
**Based On:** User playtesting and observation

**Changes Made:**

- **Upload Button Enhancement:**
  - Increased size by 40%
  - Yellow-green gradient with prominent glow effect
  - Impossible to miss in the interface

- **Visual Hierarchy:**
  - Primary actions (Upload, Extract, Render) use high-contrast colors
  - Destructive actions (Delete) in red with warnings
  - Secondary actions (Edit, Translate) in blue

- **Auto-Render Feature:**
  - When user edits text box locations, image automatically re-renders if rendering panel is open
  - Reduces manual steps and improves workflow

**User Benefit:** New users can immediately identify key actions without hunting through menus.

### **6. UI Consistency & Polish**

**Border Radius Fixes:**
- Modal headers match container rounded corners (no sharp edges)
- Scrollbars styled to respect rounded borders
- All containers have consistent 12-20px border radius

**Button Styling:**
- All buttons pill-shaped (border-radius: 50px)
- Consistent hover animations (lift + glow)
- Clear visual states (enabled, disabled, hover, active)

**Color Palette Adherence:**
- Minimalist blue & white theme maintained
- Accent colors (yellow, green, pink, red) used consistently
- High contrast for accessibility

---

## 🔄 Architecture Improvements

### **Binary Response Handling**
**Added:** Proper image serving for passthrough routes

**Problem:** Image serving queries (`_serveImage`) return binary data (Uint8Array), but passthrough routes only handled JSON.

**Solution:** Updated `RequestingConcept.ts` to detect binary responses and return appropriate Content-Type headers.

```typescript
if (result && result.data instanceof Uint8Array && result.contentType) {
  return new Response(result.data, {
    headers: { "Content-Type": result.contentType, ... }
  });
}
```

**Impact:** Users can now preview images correctly in the interface.

### **Manual Translation Editing**
**Changed:** `editTranslation` no longer calls AI

**Rationale:** When users manually correct a translation, they want to save their exact text, not have AI re-translate it.

**Flow:**
- `createTranslation` → Uses AI for initial translation ✓
- `editTranslation` → Saves user's manual correction (no AI) ✓
- `changeLanguage` → Uses AI to translate to new language ✓

**User Benefit:** Full control over final translation text.

---

## 📊 Implementation Summary

### **Backend Changes**
- ✅ 5 sync files created (36 total syncs)
- ✅ Route security configuration (137-line passthrough.ts)
- ✅ All concept files renamed to follow naming convention (*Concept.ts)
- ✅ Binary response handling added
- ✅ Ownership verification in all data access queries

### **Frontend Changes**
- ✅ Multi-select UI with bulk operations
- ✅ Compact extraction/translation displays
- ✅ Full-resolution canvas rendering
- ✅ Privacy-focused information hiding
- ✅ Enhanced discoverability (upload button, animations)
- ✅ Auto-render on coordinate changes
- ✅ Consistent rounded corners and styling

### **Testing & Documentation**
- ✅ Comprehensive sync testing guide created
- ✅ Security plan documented
- ✅ All concepts tested with proper ownership isolation

---

## 🎯 Design Goals Achieved

| Goal | Status | Implementation |
|------|--------|----------------|
| **Data Isolation** | ✅ Complete | All actions synced with userId verification |
| **Quality Preservation** | ✅ Complete | Full-resolution rendering maintained |
| **User Privacy** | ✅ Complete | Sensitive data hidden from UI |
| **Discoverability** | ✅ Complete | Enhanced buttons, animations, visual hierarchy |
| **Efficiency** | ✅ Complete | Multi-select, auto-render, compact layouts |
| **Consistency** | ✅ Complete | Unified styling, rounded corners, color scheme |

---

## 🔮 Future Enhancements

While the current implementation provides robust data isolation through syncs, production deployment should include:

1. **Session-based Authentication:** Server-side userId extraction from JWT/session tokens instead of client-provided userId
2. **Query Route Protection:** Move sensitive query routes to exclusions once session auth is implemented
3. **Rate Limiting:** Prevent brute-force access attempts
4. **Audit Logging:** Track all data access for security monitoring

**Current Status:** All user actions are authenticated and isolated. Query routes rely on client sending correct userId (documented with TODO notes in code).

---

*For detailed security testing procedures, see [SYNC_AUTHENTICATION_TESTING_GUIDE.md](SYNC_AUTHENTICATION_TESTING_GUIDE.md)*

*For original concept differences from Assignment 2, see [README.md](README.md) lines 12-17*
