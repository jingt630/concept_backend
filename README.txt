# Update Patch: Synchronization Engine and Requesting Server

This branch supplies the minimum files necessary to deploy a concept backend with an automatic http server in the form of the Requesting concept, and the engine itself.

Directly copy the contents of this branch on top of your existing directory structure - it should place the files it needs in the right places.

Note: you may accept all overrides aside from "deno.json". For this file, if you have manually edited it before or added your own configuration, just add the new "tasks" and "imports" from the "deno.json" in this repository.

What this patch has:

- design/: 2 new tool prompt templates (general concept/sync backgrounds), 1 implementing synchronizations prompt
- src/:
    - engine/: the synchronization engine (ignore)
    - utils/: updated utility functions (ignore)
    - main.ts: your app entrypoint (can configure logging)
- src/concepts/:
    -Requesting/: the Requesting concept (encapsulates HTTP server)
- .gitignore: updated ignores for generated import files
- Dockerfile: a dockerfile build for deploying your app