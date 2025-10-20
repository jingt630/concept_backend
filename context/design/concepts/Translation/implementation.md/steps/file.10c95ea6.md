---
timestamp: 'Sun Oct 19 2025 22:38:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_223823.eb4473c3.md]]'
content_id: 10c95ea657bf29b39e61266a064e6a7e79ef01284ee4fa7f5281f47f8930b04f
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@google/genai": "npm:@google/genai@^1.25.0",
        "@utils/": "./src/utils/",
        "express": "npm:express@^5.1.0",
        "file": "npm:file@^0.2.2",
        "fs": "npm:fs@^0.0.1-security",
        "image-size": "npm:image-size@^2.0.2",
        "path": "npm:path@^0.12.7"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }

}

```
