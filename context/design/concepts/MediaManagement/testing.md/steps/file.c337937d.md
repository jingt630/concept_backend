---
timestamp: 'Sun Oct 19 2025 22:05:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_220535.11e035a7.md]]'
content_id: c337937d12978a653222c5a4d11a7feee7f41756380685c6b3ad4d3463fa8354
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
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
