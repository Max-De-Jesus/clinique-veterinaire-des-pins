// Tests de la fonction serveur /api/contact (sans appel réel à Resend : fetch est simulé).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET, validerSoumission, composerEmail } from '../api/contact.js';
import { adresseIP, creerLimiteur } from '../api/_commun.js';

const fetchOriginal = globalThis.fetch;
const DESTINATAIRE = 'destinataire@example.test';
let ipCompteur = 0;
let appels = [];

const valide = {
  nom: 'Camille Roux',
  email: 'camille@example.test',
  telephone: '06 12 34 56 78',
  animal: 'chat',
  message: 'Bonjour, je souhaite un rendez-vous pour Neige.',
  consentement: true,
  confirmation_interne: ''
};

/** Construit une requête POST avec une IP différente à chaque test (limite de débit). */
function requete(corps, { ip = `10.1.0.${++ipCompteur}`, entetes = {} } = {}) {
  return new Request('http://clinique.test/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip, host: 'clinique.test', ...entetes },
    body: typeof corps === 'string' ? corps : JSON.stringify(corps)
  });
}

/** Remplace fetch par une réponse Resend simulée et mémorise les appels. */
function simulerResend(statut = 200, corps = { id: 'id-factice' }) {
  globalThis.fetch = async (url, options) => {
    appels.push({ url, options });
    return new Response(JSON.stringify(corps), { status: statut });
  };
}

beforeEach(() => {
  appels = [];
  process.env.RESEND_API_KEY = 'cle-de-test-factice';
  process.env.CONTACT_DESTINATAIRE = DESTINATAIRE;
  delete process.env.CONTACT_EXPEDITEUR;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_DESTINATAIRE;
});

test('validerSoumission accepte une soumission complète et nettoie les espaces', () => {
  const resultat = validerSoumission({ ...valide, nom: '  Camille Roux  ' });
  assert.equal(resultat.erreur, undefined);
  assert.equal(resultat.donnees.nom, 'Camille Roux');
});

test('validerSoumission accepte un téléphone absent', () => {
  const { telephone, ...sansTelephone } = valide;
  assert.equal(validerSoumission(sansTelephone).donnees.telephone, '');
});

test('validerSoumission refuse chaque champ invalide', () => {
  const cas = [
    { nom: ' a ' },
    { nom: 'x'.repeat(81) },
    { email: 'a@b' },
    { email: 'a b@exemple.fr' },
    { email: 'a@exemple.fr,victime@exemple.fr' },
    { email: 'a@exemple.fr;victime@exemple.fr' },
    { email: '"x y" <a@exemple.fr>' },
    { email: `${'a'.repeat(120)}@exemple.fr` },
    { telephone: '123' },
    { animal: 'dragon' },
    { message: 'court' },
    { message: '                    ' },
    { message: 'x'.repeat(1501) },
    { consentement: false },
    { consentement: 'true' },
    { nom: 42 }
  ];
  for (const modification of cas) {
    const resultat = validerSoumission({ ...valide, ...modification });
    assert.ok(resultat.erreur, `aurait dû refuser ${JSON.stringify(modification).slice(0, 60)}`);
  }
});

test('validerSoumission refuse les sauts de ligne dans le nom et l\'e-mail (injection d\'en-têtes)', () => {
  assert.ok(validerSoumission({ ...valide, nom: 'Camille\r\nBcc: pirate@example.test' }).erreur);
  assert.ok(validerSoumission({ ...valide, email: 'a@exemple.fr\nBcc: pirate@example.test' }).erreur);
});

test('validerSoumission refuse un corps qui n\'est pas un objet', () => {
  assert.ok(validerSoumission(null).erreur);
  assert.ok(validerSoumission('texte').erreur);
  assert.ok(validerSoumission([]).erreur);
});

test('composerEmail : destinataire serveur, réponse au visiteur, texte brut complet', () => {
  const email = composerEmail(validerSoumission(valide).donnees, DESTINATAIRE, 'Clinique <exp@example.test>');
  assert.deepEqual(email.to, [DESTINATAIRE]);
  assert.equal(email.reply_to, valide.email);
  assert.equal(email.from, 'Clinique <exp@example.test>');
  assert.match(email.subject, /Camille Roux/);
  assert.equal(email.html, undefined);
  for (const attendu of ['Camille Roux', valide.email, valide.telephone, 'Chat', valide.message]) {
    assert.ok(email.text.includes(attendu), `manque dans le texte : ${attendu}`);
  }
});

test('POST envoie à Resend avec la clé en en-tête et confirme', async () => {
  simulerResend();
  const reponse = await POST(requete(valide));
  assert.equal(reponse.status, 200);
  assert.equal((await reponse.json()).envoye, true);
  assert.equal(appels.length, 1);
  assert.equal(appels[0].url, 'https://api.resend.com/emails');
  assert.equal(appels[0].options.headers.Authorization, 'Bearer cle-de-test-factice');
  const corps = JSON.parse(appels[0].options.body);
  assert.deepEqual(corps.to, [DESTINATAIRE]);
  assert.equal(corps.reply_to, valide.email);
});

test('POST ignore tout destinataire fourni par le visiteur', async () => {
  simulerResend();
  await POST(requete({ ...valide, to: 'victime@example.test', destinataire: 'victime@example.test' }));
  assert.deepEqual(JSON.parse(appels[0].options.body).to, [DESTINATAIRE]);
});

test('POST utilise CONTACT_EXPEDITEUR lorsqu\'il est défini', async () => {
  process.env.CONTACT_EXPEDITEUR = 'Clinique <contact@example.test>';
  simulerResend();
  await POST(requete(valide));
  assert.equal(JSON.parse(appels[0].options.body).from, 'Clinique <contact@example.test>');
});

test('POST renvoie 503 sans clé ou sans destinataire, sans appel externe', async () => {
  simulerResend();
  delete process.env.RESEND_API_KEY;
  assert.equal((await POST(requete(valide))).status, 503);
  process.env.RESEND_API_KEY = 'cle-de-test-factice';
  delete process.env.CONTACT_DESTINATAIRE;
  assert.equal((await POST(requete(valide))).status, 503);
  assert.equal(appels.length, 0);
});

test('POST renvoie 400 pour un JSON illisible ou un champ invalide, sans appel externe', async () => {
  simulerResend();
  assert.equal((await POST(requete('{pas du json'))).status, 400);
  assert.equal((await POST(requete({ ...valide, email: 'invalide' }))).status, 400);
  assert.equal(appels.length, 0);
});

test('POST renvoie 415 si le corps n\'est pas du JSON', async () => {
  simulerResend();
  const reponse = await POST(requete(valide, { entetes: { 'Content-Type': 'text/plain' } }));
  assert.equal(reponse.status, 415);
  assert.equal(appels.length, 0);
});

test('POST renvoie 413 pour un corps trop volumineux', async () => {
  simulerResend();
  const reponse = await POST(requete({ ...valide, message: 'x'.repeat(9000) }));
  assert.equal(reponse.status, 413);
  assert.equal(appels.length, 0);
});

test('POST refuse une origine étrangère et accepte la même origine', async () => {
  simulerResend();
  const etrangere = await POST(requete(valide, { entetes: { Origin: 'https://pirate.example' } }));
  assert.equal(etrangere.status, 403);
  assert.equal(appels.length, 0);
  const meme = await POST(requete(valide, { entetes: { Origin: 'http://clinique.test' } }));
  assert.equal(meme.status, 200);
  assert.equal(appels.length, 1);
});

test('POST : un robot qui remplit le champ piège reçoit un succès, sans envoi', async () => {
  simulerResend();
  const reponse = await POST(requete({ ...valide, confirmation_interne: 'https://spam.example' }));
  assert.equal(reponse.status, 200);
  assert.equal(appels.length, 0);
});

test('POST renvoie 502 sans divulguer l\'erreur de Resend', async () => {
  simulerResend(403, { name: 'validation_error', message: 'SECRET-INTERNE' });
  const reponse = await POST(requete(valide));
  assert.equal(reponse.status, 502);
  const texte = await reponse.text();
  assert.doesNotMatch(texte, /SECRET-INTERNE|validation_error/);
  assert.match(texte, /05 58 00 12 34/);
});

test('POST renvoie 504 si Resend ne répond pas', async () => {
  globalThis.fetch = async () => { throw new DOMException('délai', 'TimeoutError'); };
  const reponse = await POST(requete(valide));
  assert.equal(reponse.status, 504);
});

test('POST applique une limite de 5 envois par IP', async () => {
  simulerResend();
  const statuts = [];
  for (let i = 0; i < 6; i += 1) {
    statuts.push((await POST(requete(valide, { ip: '10.2.0.1' }))).status);
  }
  assert.deepEqual(statuts, [200, 200, 200, 200, 200, 429]);
  assert.equal(appels.length, 5);
});

test('POST refuse un corps annoncé trop gros sans le lire', async () => {
  simulerResend();
  const reponse = await POST(requete(valide, { entetes: { 'Content-Length': '999999' } }));
  assert.equal(reponse.status, 413);
  assert.equal(appels.length, 0);
});

test('POST refuse un Content-Type qui contient seulement « application/json »', async () => {
  simulerResend();
  const reponse = await POST(requete(valide, { entetes: { 'Content-Type': 'text/plain; x=application/json' } }));
  assert.equal(reponse.status, 415);
  assert.equal(appels.length, 0);
});

test('adresseIP regroupe un bloc IPv6 /64 et conserve une adresse IPv4', () => {
  const ip = (valeur) => adresseIP(new Request('http://x/', { headers: { 'x-forwarded-for': valeur } }));
  assert.equal(ip('2001:db8:1:2:aaaa::1'), ip('2001:db8:1:2:bbbb::2'));
  assert.equal(ip('2001:db8::1'), '2001:db8:0:0');
  assert.notEqual(ip('2001:db8:1:2::1'), ip('2001:db8:1:3::1'));
  assert.equal(ip('203.0.113.7, 10.0.0.1'), '203.0.113.7');
});

test('POST : changer d\'adresse dans un même bloc IPv6 ne contourne pas la limite', async () => {
  simulerResend();
  const statuts = [];
  for (let i = 1; i <= 6; i += 1) {
    statuts.push((await POST(requete(valide, { ip: `2001:db8:9:9::${i}` }))).status);
  }
  assert.equal(statuts[5], 429);
  assert.equal(appels.length, 5);
});

test('le limiteur borne sa mémoire sans oublier les visiteurs récents', () => {
  const depasse = creerLimiteur(1, 60000);
  depasse('recent');
  for (let i = 0; i < 5001; i += 1) depasse(`autre-${i}`);
  depasse('recent-2');
  assert.equal(depasse('recent-2'), true);
});

test('GET renvoie 405', () => {
  assert.equal(GET().status, 405);
});
