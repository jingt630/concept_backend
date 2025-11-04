# Demo Video Script - TEP Konjac (3 Minutes)
**Image Translation Platform with AI-Powered Text Extraction**

---

## 🎬 Script Structure

**Total Duration:** ~3 minutes  
**Format:** Screen recording with voiceover narration  
**Journey:** Complete workflow from upload to download

---

## 📝 Narration Script

### **[00:00 - 00:20] Introduction & Login (20 seconds)**

**[Show: Login screen]**

> "Welcome to TEP Konjac, an image translation platform that helps you translate text within images to multiple languages. The system uses AI for automatic text extraction and supports manual editing for precision."

**[Action: Log in as demo user]**

> "Let me log in to demonstrate the workflow. Each user has their own isolated workspace with secure data storage."

---

### **[00:20 - 00:50] Image Upload & Gallery (30 seconds)**

**[Show: Main dashboard with prominent upload button]**

> "Here's the main interface. Notice the large, highlighted upload button - designed based on user testing to ensure discoverability."

**[Action: Click upload button, select an image with text (e.g., movie poster or sign)]**

> "I'll upload an image containing text that needs translation. The system supports PNG and JPEG formats up to 10MB."

**[Show: Image appears in gallery, select it to show details panel]**

> "Once uploaded, the image appears in the gallery. Selecting it shows file details without exposing sensitive internal information like database IDs or server URLs - a privacy-focused design choice."

---

### **[00:50 - 01:30] AI Text Extraction (40 seconds)**

**[Show: Click "Edit Image" button]**

> "Clicking 'Edit Image' opens the extraction editor where we can leverage AI to automatically detect and extract text from the image."

**[Action: Click "Auto Extract Text" button]**

> "The AI analyzes the image and identifies text blocks with their precise coordinates."

**[Show: Extracted text boxes appearing with coordinates]**

> "Here we see the extracted text. Each text box shows the original text, its location coordinates, and pixel dimensions. The compact design allows viewing multiple extractions simultaneously."

**[Action: Briefly show editing text inline]**

> "Text can be edited manually if the AI misread anything - just click the edit button."

---

### **[01:30 - 02:10] Translation Features (40 seconds)**

**[Action: Click "Translate" on an extraction, select language (e.g., Spanish)]**

> "Now let's translate this text. Simply select the target language - we support English, Spanish, Chinese, and Japanese."

**[Show: Translation appearing under the original text]**

> "The AI generates the translation, which appears immediately. Users can manually correct translations if needed - the system saves your edits directly without re-running the AI."

**[Action: Click "Select" button to show multi-select mode]**

> "For efficiency, I've added bulk operations. Clicking 'Select' reveals checkboxes with a pop-in animation, making it obvious you can now select multiple items for deletion."

**[Show: Checkboxes appearing with animation, briefly select a few]**

> "This addresses a common user need - managing large batches of translations quickly."

---

### **[02:10 - 02:50] Rendering & Export (40 seconds)**

**[Action: Click "Render Text" button]**

> "The final step is rendering. This opens the rendering panel where we select which text elements to include and choose the language."

**[Show: Rendering panel with language selection and element checkboxes]**

> "I'll select Spanish and choose which text boxes to render onto the image."

**[Action: Click "Render Selected Text"]**

> "The system generates a preview with the translated text overlaid at the exact coordinates where the original text appeared."

**[Show: Rendered preview appearing]**

> "Notice the preview includes rulers showing pixel coordinates - helpful for precise adjustments. But here's the key feature: while the preview is scaled for display, the actual canvas renders at full original resolution."

**[Action: Click "Download PNG"]**

> "Downloading exports the image at its original quality - no resolution loss - ensuring professional results."

---

### **[02:50 - 03:00] Security & Conclusion (10 seconds)**

**[Show: Backend console with sync traces]**

> "Behind the scenes, the system uses synchronization to authenticate every user action, ensuring complete data isolation between users."

**[Show: Quick glimpse of different user's isolated workspace or just the main screen]**

> "TEP Konjac - making image translation efficient, secure, and accessible. Thank you."

---

## 🎥 Visual Demonstration Tips

### **Key Features to Highlight**
1. ✅ **Prominent upload button** (yellow-green gradient, impossible to miss)
2. ✅ **AI text extraction** (automatic detection with coordinates)
3. ✅ **Compact text boxes** (view original + translations simultaneously)
4. ✅ **Multi-select animations** (checkboxes pop in with pulse effect)
5. ✅ **Full-resolution export** (mention in narration, show console log)
6. ✅ **Sync traces** (show backend console briefly)

### **Timing Allocation**
- Introduction & Login: 20s
- Upload & Gallery: 30s
- Text Extraction: 40s (most complex feature)
- Translation: 40s (core functionality)
- Rendering & Export: 40s (final output)
- Security & Conclusion: 10s

### **Technical Details to Mention Briefly**
- "AI-powered" text extraction
- "Coordinate-based" text positioning
- "Full-resolution" rendering
- "Synchronization" for security
- "Isolated workspaces" for users

### **Details to Skip** (too technical for 3 min)
- Database structure
- Sync implementation details
- Concept architecture
- API endpoints
- Code specifics

---

## 📹 Recording Checklist

**Before Recording:**
- [ ] Backend server running (`deno run start`)
- [ ] Frontend server running (Vite dev server)
- [ ] Test user account created
- [ ] Test image prepared (with clear, readable text)
- [ ] Browser window sized appropriately (1920×1080 recommended)
- [ ] Close unnecessary tabs/windows
- [ ] Clear browser console for clean logs

**During Recording:**
- [ ] Speak clearly and at moderate pace
- [ ] Pause briefly between major sections
- [ ] Keep cursor visible when clicking
- [ ] Show backend console briefly for sync traces
- [ ] Demonstrate smooth, confident workflow
- [ ] Highlight animated features (checkboxes, buttons)

**After Recording:**
- [ ] Save backend console output to file (trace of incoming actions)
- [ ] Verify audio is clear
- [ ] Check video length (under 3 minutes)
- [ ] Export in high quality (1080p recommended)

---

## 💾 Capturing Backend Trace

**Save Console Output:**
After recording, copy the backend console output showing sync traces:

```
Example trace to save:
[Requesting] Received request for path: /MediaManagement/upload
MediaManagement.upload { userId: '...', filename: 'poster.jpg', ... } => { _id: '...' }

[Requesting] Received request for path: /TextExtraction/extractTextFromMedia
TextExtraction.extractTextFromMedia { userId: '...', mediaId: '...' } => { results: [...] }

[Requesting] Received request for path: /Translation/createTranslation
Translation.createTranslation { userId: '...', targetLanguage: 'es', ... } => { translation: '...', translatedText: '...' }

[Requesting] Received request for path: /Rendering/render
Rendering.render { userId: '...', imagePath: '...', contentToRender: {...} } => { output: {...} }
```

Save this to: `BACKEND_CONSOLE_TRACE.txt`

---

## 🎯 Demo Flow Diagram

```
Login → Upload Image → Extract Text (AI) → Translate (AI/Manual) → Render → Download
  ↓         ↓              ↓                    ↓                    ↓         ↓
Auth    Gallery       Editor View        Translation Dialog   Render Panel  Export
```

---

## ✨ Key Talking Points

**What makes TEP Konjac special:**
1. **AI-powered automation** - Detects text automatically with coordinates
2. **Manual precision** - Full editing control over extractions and translations
3. **Quality preservation** - Full-resolution output maintains original image quality
4. **Efficiency features** - Multi-select, auto-render, bulk operations
5. **Security-first** - Complete data isolation between users via synchronization
6. **User-tested design** - Interface refined through iterative playtesting

---

## 📋 Backup Points (If Time Allows)

If you finish early and have 10-15 seconds remaining:
- Show coordinate editing in rendering panel
- Demonstrate auto-render when location changes
- Show the compact extraction view with multiple translations visible
- Mention responsive design for different screen sizes

---

*Total word count: ~350 words (approximately 3 minutes at moderate speaking pace)*

