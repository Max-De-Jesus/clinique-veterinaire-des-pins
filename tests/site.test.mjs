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
