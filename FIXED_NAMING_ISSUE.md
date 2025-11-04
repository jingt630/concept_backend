# 🔧 Fixed: Concept Naming Issue

## Problem

Server failed to start with error:
```
error: Module not found "file:///C:/Users/jingy/Downloads/concept_backend/src/concepts/".
    at file:///C:/Users/jingy/Downloads/concept_backend/src/syncs/auth.sync.ts:44:43
```

## Root Cause

The build script (`generate_imports.ts`) expects concepts to follow the naming pattern:
```
src/concepts/{ConceptName}/{ConceptName}Concept.ts
```

But your concepts were named:
```
❌ src/concepts/User/User.ts
❌ src/concepts/MediaManagement/MediaManagement.ts
❌ src/concepts/TextExtraction/TextExtraction.ts
❌ src/concepts/Translation/Translation.ts
❌ src/concepts/Rendering/Rendering.ts
```

The build script only found 3 concepts (LikertSurvey, Requesting, Session) and missed the others, so the `@concepts` import didn't include User, MediaManagement, etc.

## Solution

Renamed all concept files to follow the convention:
```
✅ src/concepts/User/UserConcept.ts
✅ src/concepts/MediaManagement/MediaManagementConcept.ts
✅ src/concepts/TextExtraction/TextExtractionConcept.ts
✅ src/concepts/Translation/TranslationConcept.ts
✅ src/concepts/Rendering/RenderingConcept.ts
```

## Files Renamed

1. `MediaManagement/MediaManagement.ts` → `MediaManagement/MediaManagementConcept.ts`
2. `TextExtraction/TextExtraction.ts` → `TextExtraction/TextExtractionConcept.ts`
3. `Translation/Translation.ts` → `Translation/TranslationConcept.ts`
4. `User/User.ts` → `User/UserConcept.ts`
5. `Rendering/Rendering.ts` → `Rendering/RenderingConcept.ts`

## After Rebuild

```
Scanning for concepts in 'src/concepts'...
  -> Found concept: LikertSurvey
  -> Found concept: MediaManagement     ✅ Now found!
  -> Found concept: Rendering           ✅ Now found!
  -> Found concept: Requesting
  -> Found concept: Session
  -> Found concept: TextExtraction      ✅ Now found!
  -> Found concept: Translation         ✅ Now found!
  -> Found concept: User                ✅ Now found!
```

All 8 concepts are now properly included in the generated `concepts.ts` file.

## Result

✅ Server starts successfully
✅ All concepts available for import
✅ Authentication syncs can import User and Session
✅ Ready to test authentication system

## Note for Future

When creating new concepts, always follow the naming convention:
- Directory: `src/concepts/ConceptName/`
- File: `src/concepts/ConceptName/ConceptNameConcept.ts`
- Class: `export default class ConceptNameConcept`

Then run `deno task build` to regenerate the barrel files.
