// Tests statiques du site : contraintes du cahier des charges et intégrité des pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'a-propos.html', 'services.html', 'contact.html'];
const lire = (fichier) => readFile(path.join(racine, fichier), 'utf8');

test('les 4 pages obligatoires existent', () => {
  PAGES.forEach((page) => assert.ok(existsSync(path.join(racine, page)), `${page} manquante`));
});

for (const page of PAGES) {
  test(`${page} : DOCTYPE, langue, style.css, script.js, Bootstrap`, async () => {
    const html = await lire(page);
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<html lang="fr">/);
    assert.match(html, /href="css\/style\.css"/);
    assert.match(html, /src="js\/script\.js"/);
    assert.match(html, /bootstrap@5\.3\.3/);
  });

  test(`${page} : aucun style ni script en ligne`, async () => {
    const html = await lire(page);
    assert.doesNotMatch(html, /\sstyle="/, 'attribut style interdit');
    assert.doesNotMatch(html, /<style[\s>]/, 'balise <style> interdite');
    assert.doesNotMatch(html, /<script>(?!<\/script>)/, 'script en ligne interdit');
    assert.doesNotMatch(html, /\son[a-z]+="/, 'gestionnaire d\'événement en ligne interdit');
  });

  test(`${page} : toutes les images locales existent et ont un attribut alt`, async () => {
    const html = await lire(page);
    const images = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    assert.ok(images.length > 0);
    for (const balise of images) {
      assert.match(balise, /\salt="/, `alt manquant : ${balise}`);
      const src = balise.match(/src="([^"]+)"/)[1];
      assert.ok(existsSync(path.join(racine, src)), `image introuvable : ${src}`);
    }
  });

  test(`${page} : liens internes valides et id uniques`, async () => {
    const html = await lire(page);
    const liens = [...html.matchAll(/href="([a-z-]+\.html)(#[\w-]+)?"/g)];
    for (const [, cible] of liens) {
      assert.ok(PAGES.includes(cible), `lien cassé : ${cible}`);
    }
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'id dupliqué');
  });
}

test('chaque ancre inter-page pointe vers un id existant', async () => {
  const contenus = Object.fromEntries(await Promise.all(PAGES.map(async (p) => [p, await lire(p)])));
  for (const html of Object.values(contenus)) {
    for (const [, cible, ancre] of html.matchAll(/href="([a-z-]+\.html)#([\w-]+)"/g)) {
      assert.match(contenus[cible], new RegExp(`id="${ancre}"`), `${cible}#${ancre} introuvable`);
    }
  }
});

test('le site contient beaucoup d\'images (au moins 40 fichiers)', async () => {
  const fichiers = (await readdir(path.join(racine, 'assets', 'img'))).filter((f) => f.endsWith('.jpg'));
  assert.ok(fichiers.length >= 40, `seulement ${fichiers.length} images`);
});

test('les images référencées en CSS existent', async () => {
  const css = await lire('css/style.css');
  for (const [, url] of css.matchAll(/url\("\.\.\/([^"]+)"\)/g)) {
    assert.ok(existsSync(path.join(racine, url)), `image CSS introuvable : ${url}`);
  }
});

test('page d\'accueil : carrousel Bootstrap, slogan et appel à l\'action', async () => {
  const html = await lire('index.html');
  assert.match(html, /class="carousel slide/);
  assert.match(html, /Clinique Vétérinaire des Pins<\/h1>/);
  assert.match(html, /Prendre rendez-vous/);
});

test('page contact : formulaire nom, email, message', async () => {
  const html = await lire('contact.html');
  ['nom', 'email', 'message'].forEach((champ) => assert.match(html, new RegExp(`name="${champ}"`)));
});

test('aucune clé API dans le code côté client', async () => {
  const fichiers = [...PAGES, 'js/script.js', 'css/style.css'];
  for (const fichier of fichiers) {
    const contenu = await lire(fichier);
    assert.doesNotMatch(contenu, /AIza[0-9A-Za-z_-]{20,}/, `clé Google détectée dans ${fichier}`);
    assert.doesNotMatch(contenu, /generativelanguage\.googleapis/, `appel direct à Gemini dans ${fichier}`);
  }
});

/** Lit largeur et hauteur réelles d'un JPEG (marqueur SOF), sans dépendance. */
function dimensionsJpeg(octets) {
  let position = 2;
  while (position < octets.length) {
    const marqueur = octets[position + 1];
    const estSof = marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur);
    if (estSof) return { hauteur: octets.readUInt16BE(position + 5), largeur: octets.readUInt16BE(position + 7) };
    position += 2 + octets.readUInt16BE(position + 2);
  }
  throw new Error('JPEG sans dimensions');
}

test('les attributs width et height des images correspondent aux fichiers réels', async () => {
  let controlees = 0;
  for (const page of PAGES) {
    const html = await lire(page);
    for (const [balise] of html.matchAll(/<img\b[^>]*>/g)) {
      const src = balise.match(/src="([^"]+)"/)[1];
      const octets = await readFile(path.join(racine, src));
      const { largeur, hauteur } = dimensionsJpeg(octets);
      assert.match(balise, new RegExp(`width="${largeur}" height="${hauteur}"`), `${page} : ${src} mesure ${largeur}×${hauteur}`);
      controlees += 1;
    }
  }
  assert.ok(controlees >= 40, `seulement ${controlees} images contrôlées`);
});

test('formulaire de contact : champ piège, zones de résultat et envoi réel vers /api/contact', async () => {
  const html = await lire('contact.html');
  assert.match(html, /name="confirmation_interne"[^>]*tabindex="-1"/);
  assert.match(html, /id="confirmationContact"[^>]*role="status"/);
  assert.match(html, /id="erreurContact"[^>]*role="alert"/);
  const script = await lire('js/script.js');
  assert.match(script, /point_api: '\/api\/contact'/);
  assert.doesNotMatch(script, /Site de démonstration/, 'ancien faux message de confirmation');
});

test('le dépôt public ne contient ni clé Resend ni adresse Gmail de destinataire', async () => {
  const fichiers = [...PAGES, 'js/script.js', 'css/style.css', 'api/contact.js', 'api/_commun.js', 'vercel.json', '.env.example', 'README.md', 'docs/HANDOFF.md', 'docs/integrations/registre.md', 'docs/adr/0002-envoi-formulaire-par-resend.md'];
  for (const fichier of fichiers) {
    const contenu = await lire(fichier);
    assert.doesNotMatch(contenu, /\bre_[A-Za-z0-9_]{16,}/, `clé Resend détectée dans ${fichier}`);
    assert.doesNotMatch(contenu, /[\w.+-]+@gmail\.com/i, `adresse Gmail détectée dans ${fichier}`);
  }
});

test('page services : le catalogue compte 12 cartes Bootstrap et chaque rangée est complète', async () => {
  const html = await lire('services.html');
  assert.equal([...html.matchAll(/class="card carte-service/g)].length, 12);
  const colonnes = [...html.matchAll(/class="col-md-6 col-lg-(\d+) apparition" data-categorie/g)].map((m) => Number(m[1]));
  assert.equal(colonnes.reduce((somme, c) => somme + c, 0) % 12, 0, 'dernière rangée incomplète');
});

test('HTTPS : en-tête HSTS configuré et aucune ressource chargée en HTTP', async () => {
  const config = JSON.parse(await lire('vercel.json'));
  const entetes = config.headers.find((regle) => regle.source === '/(.*)').headers;
  const hsts = entetes.find((e) => e.key === 'Strict-Transport-Security');
  assert.ok(hsts, 'en-tête HSTS absent');
  assert.match(hsts.value, /max-age=31536000/);
  for (const fichier of [...PAGES, 'css/style.css', 'js/script.js', 'api/contact.js', 'api/chat.js']) {
    const contenu = await lire(fichier);
    assert.doesNotMatch(contenu, /http:\/\/(?!www\.w3\.org)/, `URL en HTTP dans ${fichier}`);
  }
});

// Exigences du sujet « Projet 1 » : elles ne doivent jamais régresser, même après une refonte visuelle
test('sujet : accueil avec nom, slogan, résumé des services et appel à l\'action', async () => {
  const html = await lire('index.html');
  assert.match(html, /<h1[^>]*>Clinique Vétérinaire des Pins<\/h1>/);
  assert.match(html, /Soigner avec science, accueillir avec cœur/);
  assert.match(html, /class="card carte-service/);
  assert.match(html, /class="btn btn-resine" href="contact\.html#formulaire"/);
});

test('sujet : à propos présente l\'histoire, les valeurs et l\'équipe', async () => {
  const html = await lire('a-propos.html');
  ['titre-histoire', 'titre-valeurs', 'titre-equipe'].forEach((id) => assert.match(html, new RegExp('id="' + id + '"')));
});

test('sujet : contact donne l\'adresse, le téléphone et l\'e-mail de l\'entreprise', async () => {
  const html = await lire('contact.html');
  assert.match(html, /12 allée des Pins/);
  assert.match(html, /href="tel:\+33558001234"/);
  assert.match(html, /href="mailto:contact@clinique-des-pins\.fr"/);
});

test('sujet : navbar Bootstrap responsive, code commenté et un seul script local sur chaque page', async () => {
  for (const page of PAGES) {
    const html = await lire(page);
    assert.match(html, /navbar navbar-expand-lg/, page + ' : navbar');
    assert.match(html, /navbar-toggler/, page + ' : menu hamburger');
    assert.ok([...html.matchAll(/<!--/g)].length >= 5, page + ' : commentaires insuffisants');
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(scripts.filter((s) => !s.startsWith('https://cdn.jsdelivr.net/')), ['js/script.js'], page + ' : scripts');
  }
});

test('sujet : le CSS contient media queries, effets au survol, animations et commentaires', async () => {
  const css = await lire('css/style.css');
  assert.ok([...css.matchAll(/@media \((max|min)-width/g)].length >= 3, 'media queries');
  assert.ok([...css.matchAll(/:hover/g)].length >= 10, 'effets au survol');
  assert.match(css, /transition/);
  assert.ok([...css.matchAll(/\/\*/g)].length >= 18, 'commentaires');
});

test('sujet : chatbot en bulle, connecté par fetch à l\'API serveur, sans clé côté client', async () => {
  const script = await lire('js/script.js');
  assert.match(script, /point_api: '\/api\/chat'/);
  assert.match(script, /await fetch\(CHATBOT\.point_api/);
  assert.match(script, /je suis Sylva/);
  assert.match(await lire('css/style.css'), /\.chatbot-bouton \{\s+position: fixed;\s+right: 1\.25rem;\s+bottom: 1\.25rem;/);
});

test('sujet : toutes les photos du site sont listées dans le manifeste Unsplash', async () => {
  const manifeste = await lire('tools/images.txt');
  const fichiers = (await readdir(path.join(racine, 'assets', 'img'))).filter((f) => f.endsWith('.jpg'));
  assert.ok(fichiers.length >= 40);
  for (const fichier of fichiers) {
    assert.match(manifeste, new RegExp('^' + fichier.replace('.', '\\.') + ' \\| photo-', 'm'), fichier + ' sans source Unsplash');
  }
});
