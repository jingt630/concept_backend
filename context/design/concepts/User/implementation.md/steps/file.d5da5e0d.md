---
timestamp: 'Sat Oct 18 2025 22:50:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_225016.8de9fcc0.md]]'
content_id: d5da5e0d90daf701390b0eed4c1d9c67586851457ab76a5401e1e41c3d26bae7
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}
```
