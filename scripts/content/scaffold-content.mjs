import process from 'node:process';
import { scaffoldContent } from './lib.mjs';

const [, , kind, id, ...nameParts] = process.argv;
if (!kind || !id) {
  console.error('Uso: npm run content:scaffold -- <player|enemy|stage|object|ambient> <id> [Nome visibile]');
  process.exit(1);
}
try {
  const destination = scaffoldContent(process.cwd(), kind, id, nameParts.join(' ') || id.toUpperCase());
  console.log(`Bozza creata: ${destination}`);
  console.log('Prossimo passo: completa la bozza, crea il profilo runtime e registrala in content-src/catalog.json solo quando approvata.');
} catch (error) {
  console.error(`SCAFFOLD FAILED - ${error.message}`);
  process.exit(1);
}
