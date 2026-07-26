<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Language

- **Primary language:** TypeScript (see [tsconfig.json](tsconfig.json#L1)).
- **Framework:** Next.js (app directory) with React 19 (see [package.json](package.json#L1)).
- **Tooling:** `eslint` is configured (run via `npm run lint`). Type definitions are provided by `@types/*` devDependencies.
- **Conventions:** prefer typed React components, prefer server components inside `app/` when possible, and mark client components with `use client` at the top of the file. Keep components small and focused.
- **Dependencies:** avoid adding large new runtime dependencies without justification; add matching `@types/` packages when introducing untyped JS libraries.
- **Agent behavior:**
	- Link to existing docs instead of copying large sections (use the project's `README.md` and `node_modules/next/dist/docs/` where relevant).
	- Run type checks and lint locally before proposing changes (`npm run build` / `npm run lint`).
	- When modifying architecture (routes, middleware, API), explain the rationale and potential migration impacts.
	- Do not assume standard Next.js conventions; consult the top-of-file note and the linked Next.js docs.

See [README.md](README.md) and [package.json](package.json#L1) for start/build commands.
