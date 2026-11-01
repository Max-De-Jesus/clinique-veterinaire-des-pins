// Serveur de développement local : sert le site statique et les fonctions /api/chat et /api/contact
// comme le ferait Vercel. Usage : GEMINI_API_KEY=... RESEND_API_KEY=... CONTACT_DESTINATAIRE=... node tools/dev-server.mjs
// (port 3000 par défaut ; sans clé, le service concerné répond HTTP 503)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as apiChat from '../api/chat.js';
import * as apiContact from '../api/contact.js';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 3000;
const HOTE_LOCAL = '127.0.0.1'; // le serveur local n'est jamais exposé au réseau
const ROUTES_API = { '/api/chat': apiChat, '/api/contact': apiContact };

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json'
};

/** Transforme la requête Node en Request standard, appelle le handler, renvoie la Response. */
async function servirApi(api, req, res) {
  const handler = api[req.method];
  if (typeof handler !== 'function') {
    res.writeHead(405).end();
    return;
  }
  const morceaux = [];
  for await (const morceau of req) morceaux.push(morceau);
  const requete = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' ? undefined : Buffer.concat(morceaux)
  });
  const reponse = await handler(requete);
  res.writeHead(reponse.status, Object.fromEntries(reponse.headers));
  res.end(Buffer.from(await reponse.arrayBuffer()));
}

/** Sert un fichier du projet en empêchant toute sortie du dossier racine. */
async function servirFichier(req, res) {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const fichier = path.join(racine, chemin === '/' ? 'index.html' : chemin);
  // Ni sortie du dossier racine, ni fichier caché (.env.local, .git, .vercel…)
  const cheminRelatif = path.relative(racine, fichier);
  const estCache = cheminRelatif.split(path.sep).some((segment) => segment.startsWith('.'));
  if (!fichier.startsWith(racine + path.sep) || estCache) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(fichier)).isFile()) throw new Error('pas un fichier');
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream' });
    res.end(contenu);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}

createServer((req, res) => {
  const api = ROUTES_API[new URL(req.url, 'http://x').pathname];
  const traitement = api ? servirApi(api, req, res) : servirFichier(req, res);
  traitement.catch((erreur) => {
    console.error(erreur);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(port, HOTE_LOCAL, () => {
  console.log(`Site disponible sur http://localhost:${port}`);
});
