import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('./', import.meta.url);
const state = JSON.parse(readFileSync(new URL('figma-state.json', root), 'utf8'));
const path = new URL('registry.json', root);
const registry = JSON.parse(readFileSync(path, 'utf8'));
const mappings = new Map(state.atlas.mappings.map(entry => [entry.id, entry.nodeId]));
if (mappings.size !== registry.entries.length) throw new Error('Incomplete Figma catalog mapping');
for (const entry of registry.entries) {
  if (!mappings.has(entry.id)) throw new Error(`Missing catalog ID: ${entry.id}`);
  entry.figmaCatalogNodeId = mappings.get(entry.id);
}
writeFileSync(path, JSON.stringify(registry, null, 2) + '\n');
console.log(`Saved ${mappings.size} Figma card IDs. Symbol verification statuses unchanged.`);
