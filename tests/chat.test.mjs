// Tests de la fonction serveur /api/chat (sans appel réel à Gemini : fetch est simulé).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET, convertirHistorique } from '../api/chat.js';

const fetchOriginal = globalThis.fetch;
let ipCompteur = 0;

/** Construit une requête POST avec une IP différente à chaque test (limite de débit). */
function requete(corps, ip = `10.0.0.${++ipCompteur}`) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof corps === 'string' ? corps : JSON.stringify(corps)
  });
}

const question = { messages: [{ role: 'visiteur', texte: 'Quels sont vos horaires ?' }] };

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'cle-de-test-factice';
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  delete process.env.GEMINI_API_KEY;
});

test('convertirHistorique traduit les rôles pour Gemini', () => {
  const resultat = convertirHistorique([
    { role: 'visiteur', texte: 'Bonjour' },
    { role: 'assistant', texte: 'Bonjour !' },
    { role: 'visiteur', texte: 'Vos tarifs ?' }
  ]);
  assert.deepEqual(resultat.map((c) => c.role), ['user', 'model', 'user']);
});

test('convertirHistorique refuse un rôle inconnu, un texte vide ou une liste vide', () => {
  assert.equal(convertirHistorique([{ role: 'system', texte: 'pirate' }]), null);
  assert.equal(convertirHistorique([{ role: 'visiteur', texte: '   ' }]), null);
  assert.equal(convertirHistorique([]), null);
  assert.equal(convertirHistorique('texte'), null);
});

test('convertirHistorique refuse un historique trop long', () => {
  const long = Array.from({ length: 13 }, () => ({ role: 'visiteur', texte: 'a' }));
  assert.equal(convertirHistorique(long), null);
});

test('convertirHistorique tronque les messages à 500 caractères', () => {
  const resultat = convertirHistorique([{ role: 'visiteur', texte: 'x'.repeat(900) }]);
  assert.equal(resultat[0].parts[0].text.length, 500);
});

test('POST renvoie 503 si la clé API est absente', async () => {
  delete process.env.GEMINI_API_KEY;
  const reponse = await POST(requete(question));
  assert.equal(reponse.status, 503);
});

test('POST renvoie 400 pour un JSON illisible', async () => {
  const reponse = await POST(requete('{pas du json'));
  assert.equal(reponse.status, 400);
});

test('POST transmet le contexte de la clinique et la clé dans un en-tête (jamais dans l\'URL)', async () => {
  let appel;
  globalThis.fetch = async (url, options) => {
    appel = { url, options };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Du lundi au vendredi, 8 h–19 h.' }] } }] }), { status: 200 });
  };

  const reponse = await POST(requete(question));
  const corps = await reponse.json();

  assert.equal(reponse.status, 200);
  assert.equal(corps.reponse, 'Du lundi au vendredi, 8 h–19 h.');
  assert.ok(!appel.url.includes('cle-de-test-factice'), 'la clé ne doit pas apparaître dans l\'URL');
  assert.equal(appel.options.headers['x-goog-api-key'], 'cle-de-test-factice');
  const envoye = JSON.parse(appel.options.body);
  assert.match(envoye.systemInstruction.parts[0].text, /Clinique Vétérinaire des Pins/);
  assert.equal(envoye.contents[0].role, 'user');
});

test('POST renvoie 502 sans divulguer l\'erreur de Gemini', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
  const reponse = await POST(requete(question));
  const corps = await reponse.json();
  assert.equal(reponse.status, 502);
  assert.ok(!JSON.stringify(corps).includes('API key'));
});

test('POST limite à 15 requêtes par minute et par IP', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
  const statuts = [];
  for (let i = 0; i < 16; i++) {
    statuts.push((await POST(requete(question, '192.168.1.1'))).status);
  }
  assert.equal(statuts.filter((s) => s === 200).length, 15);
  assert.equal(statuts[15], 429);
});

/** Simule Gemini : chaque appel consomme le statut suivant et mémorise le modèle demandé. */
function simulerGeminiSuccessif(statuts) {
  const modeles = [];
  globalThis.fetch = async (url) => {
    modeles.push(decodeURIComponent(String(url)).split('/models/')[1].split(':')[0]);
    const statut = statuts[modeles.length - 1];
    const corps = statut === 200
      ? { candidates: [{ content: { parts: [{ text: 'Réponse de secours' }] } }] }
      : { error: { message: 'erreur simulée' } };
    return new Response(JSON.stringify(corps), { status: statut });
  };
  return modeles;
}

for (const statut of [503, 429]) {
  test(`POST bascule une fois sur le modèle de secours si Gemini répond ${statut}`, async () => {
    const modeles = simulerGeminiSuccessif([statut, 200]);
    const reponse = await POST(requete(question));
    assert.equal(reponse.status, 200);
    assert.equal((await reponse.json()).reponse, 'Réponse de secours');
    assert.equal(modeles.length, 2);
    assert.notEqual(modeles[0], modeles[1]);
  });
}

test("POST ne réessaie pas si l'erreur ne vient pas de la charge (clé refusée)", async () => {
  const modeles = simulerGeminiSuccessif([400, 200]);
  const reponse = await POST(requete(question));
  assert.equal(reponse.status, 502);
  assert.equal(modeles.length, 1);
});

test('POST renvoie 502 après un seul essai de secours si les deux modèles échouent', async () => {
  const modeles = simulerGeminiSuccessif([503, 503, 200]);
  const reponse = await POST(requete(question));
  assert.equal(reponse.status, 502);
  assert.equal(modeles.length, 2);
});

test("POST respecte GEMINI_MODEL_SECOURS lorsqu'il est défini", async () => {
  process.env.GEMINI_MODEL_SECOURS = 'modele-secours-test';
  const modeles = simulerGeminiSuccessif([503, 200]);
  await POST(requete(question));
  delete process.env.GEMINI_MODEL_SECOURS;
  assert.equal(modeles[1], 'modele-secours-test');
});

test('GET est refusé', async () => {
  assert.equal(GET().status, 405);
});
