import process from 'node:process';
import { writeBuildOutputs } from './lib.mjs';

const result = writeBuildOutputs(process.cwd());
for (const warning of result.warnings) console.warn(`CONTENT WARNING - ${warning}`);
if (result.errors.length) {
  console.error(`CONTENT BUILD FAILED (${result.errors.length})`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('CONTENT BUILD PASS - catalogo, registry, walk mask e tre camere M02 rigenerati.');
