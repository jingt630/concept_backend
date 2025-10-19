---
timestamp: 'Sun Oct 19 2025 00:31:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_003137.bc39859c.md]]'
content_id: bc661c4df2c86146b0b5f4eefd9eea951bf0e8e62c1baab97ba85c6b2fbb61df
---

# file: src/utils/types.ts

```typescript
import { ObjectId } from "npm:mongodb";

export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;

export function freshID(): ID {
  return new ObjectId().toString() as ID;
}
```
