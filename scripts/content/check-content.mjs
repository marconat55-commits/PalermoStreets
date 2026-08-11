import process from 'node:process';
import { validateRepository } from './lib.mjs';

const result = validateRepository(process.cwd(), { verifyOutputs: true });
for (const warning of result.warnings) console.warn(`CONTENT WARNING - ${warning}`);
if (result.errors.length) {
  console.error(`CONTENT CHECK FAILED (${result.errors.length})`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`CONTENT CHECK PASS - ${result.catalog.entries.length} contenuti registrati; output deterministici aggiornati.`);
