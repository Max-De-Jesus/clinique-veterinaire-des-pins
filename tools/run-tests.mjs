// Lance la suite de tests et échoue si le nombre de tests exécutés est inférieur au minimum attendu
// (une suite à zéro test ou partiellement chargée ne doit jamais passer pour « verte »).
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MINIMUM_ATTENDU = 70;
const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tests');
const fichiers = (await readdir(dossier)).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(dossier, f));

let reussis = 0;
let echoues = 0;
const flux = run({ files: fichiers, concurrency: false });
flux.on('test:pass', (evt) => { if (evt.details?.type !== 'suite') reussis += 1; });
flux.on('test:fail', (evt) => { if (evt.details?.type !== 'suite') echoues += 1; });
flux.compose(spec).pipe(process.stdout);

flux.on('close', () => {
  const total = reussis + echoues;
  console.log(`\nattendu>=${MINIMUM_ATTENDU}, obtenu=${total}, réussis=${reussis}, échoués=${echoues}`);
  if (echoues > 0 || total < MINIMUM_ATTENDU) {
    console.log('RÉSULTAT : ÉCHEC');
    process.exitCode = 1;
  } else {
    console.log('RÉSULTAT : SUCCÈS');
  }
});
