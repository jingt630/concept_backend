---
timestamp: 'Sun Oct 19 2025 05:31:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_053121.aa51b606.md]]'
content_id: abbe46ade5c08167bdec77793c78b5c1aecf31342720a4bb41c1bcab57bf102a
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/",
        "npm:google-generative-ai": "npm:google-generative-ai"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}

```
