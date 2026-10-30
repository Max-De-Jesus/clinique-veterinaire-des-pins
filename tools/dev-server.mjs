// Serveur de développement local : sert le site statique et la fonction /api/chat
// comme le ferait Vercel. Usage : GEMINI_API_KEY=... node tools/dev-server.mjs  (port 3000 par défaut)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as apiChat from '../api/chat.js';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 3000;

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
async function servirApi(req, res) {
  const handler = apiChat[req.method];
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
  if (!fichier.startsWith(racine + path.sep)) {
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
  const traitement = req.url.startsWith('/api/chat') ? servirApi(req, res) : servirFichier(req, res);
  traitement.catch((erreur) => {
    console.error(erreur);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(port, () => {
  console.log(`Site disponible sur http://localhost:${port}`);
});
