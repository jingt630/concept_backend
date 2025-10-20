---
timestamp: 'Mon Oct 20 2025 01:18:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_011859.9a809d37.md]]'
content_id: b6bf4498aec12873f4a8b8279b6f4b2cc5c2b6c92095724b16c0c927b68d7615
---

# file: src/utils/types.ts

```typescript
// Utility types

// Type for generic IDs, which are just strings but allow for type branding
export type ID = string & { __brand: "ID" };

// Type for actions that return nothing
export type Empty = Record<PropertyKey, never>;

// Mock for File type, replace with actual type if needed
export interface File {
  name: string;
  content: string;
  destination: string;
}
```
