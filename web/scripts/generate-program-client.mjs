// Regenerates the typed kit-style raffl client from the on-chain IDL.
// Run with: pnpm generate-client
// Output is committed so the build doesn't depend on codegen.

import { readFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { createFromRoot } from "codama";
import { renderVisitor } from "@codama/renderers-js";

const here = dirname(fileURLToPath(import.meta.url));
const idlPath = resolve(here, "..", "lib", "idl", "raffl.json");
const outDir = resolve(here, "..", "lib", "program-client");

const anchorIdl = JSON.parse(readFileSync(idlPath, "utf-8"));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));
await codama.accept(renderVisitor(outDir));

console.log(`✓ Generated raffl client at ${outDir}`);
