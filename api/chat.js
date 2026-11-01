// Fonction serveur Vercel : POST /api/chat
// Reçoit l'historique de la discussion, ajoute le contexte de la clinique et interroge Gemini.
// La clé API est lue dans la variable d'environnement GEMINI_API_KEY : elle n'est jamais envoyée au navigateur.

import { CONTEXTE_CLINIQUE } from './_contexte.js';
import { json, adresseIP, creerLimiteur } from './_commun.js';

const MODELE_PAR_DEFAUT = 'gemini-2.5-flash';
const MESSAGES_MAX = 12;           // nombre de messages d'historique acceptés
const LONGUEUR_MESSAGE_MAX = 500;  // caractères par message
const DELAI_API_MS = 20000;        // délai maximal d'attente de Gemini
const REQUETES_PAR_MINUTE = 15;    // limite par adresse IP (au mieux, par instance)

const depasseLimite = creerLimiteur(REQUETES_PAR_MINUTE, 60000);

/**
 * Valide et convertit l'historique reçu au format attendu par Gemini.
 * @param {unknown} messages
 * @returns {{ role: 'user' | 'model', parts: { text: string }[] }[] | null}
 */
export function convertirHistorique(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MESSAGES_MAX) return null;

  const contenus = [];
  for (const message of messages) {
    if (!message || typeof message.texte !== 'string') return null;
    if (message.role !== 'visiteur' && message.role !== 'assistant') return null;
    const texte = message.texte.trim().slice(0, LONGUEUR_MESSAGE_MAX);
    if (!texte) return null;
    contenus.push({ role: message.role === 'visiteur' ? 'user' : 'model', parts: [{ text: texte }] });
  }

  // Gemini exige que la conversation commence et se termine par l'utilisateur
  while (contenus.length > 0 && contenus[0].role !== 'user') contenus.shift();
  if (contenus.length === 0 || contenus[contenus.length - 1].role !== 'user') return null;
  return contenus;
}

export async function POST(request) {
  const cleApi = process.env.GEMINI_API_KEY;
  if (!cleApi) {
    console.error('[chat] GEMINI_API_KEY absente de l\'environnement');
    return json(503, { erreur: 'L\'assistante n\'est pas encore configurée. Appelez-nous au 05 58 00 12 34.' });
  }

  if (depasseLimite(adresseIP(request))) {
    return json(429, { erreur: 'Vous envoyez beaucoup de messages : patientez une minute, puis réessayez.' });
  }

  let corps;
  try {
    corps = await request.json();
  } catch {
    return json(400, { erreur: 'Requête illisible.' });
  }

  const contenus = convertirHistorique(corps && corps.messages);
  if (!contenus) {
    return json(400, { erreur: 'Message invalide (vide ou trop long).' });
  }

  const modele = process.env.GEMINI_MODEL || MODELE_PAR_DEFAUT;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`;

  try {
    const reponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleApi },
      signal: AbortSignal.timeout(DELAI_API_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CONTEXTE_CLINIQUE }] },
        contents: contenus,
        generationConfig: { temperature: 0.5, maxOutputTokens: 600 }
      })
    });

    const donnees = await reponse.json().catch(() => ({}));
    if (!reponse.ok) {
      console.error('[chat] Erreur Gemini', reponse.status, donnees?.error?.message);
      return json(502, { erreur: 'Sylva est momentanément indisponible. Réessayez dans un instant.' });
    }

    const texte = (donnees.candidates?.[0]?.content?.parts || [])
      .map((partie) => partie.text || '')
      .join('')
      .trim();

    if (!texte) {
      return json(502, { erreur: 'Sylva n\'a pas pu formuler de réponse. Pouvez-vous reformuler ?' });
    }
    return json(200, { reponse: texte });
  } catch (erreur) {
    console.error('[chat] Appel Gemini échoué :', erreur instanceof Error ? erreur.name : 'inconnue');
    return json(504, { erreur: 'La réponse a pris trop de temps. Réessayez dans un instant.' });
  }
}

// Toute autre méthode HTTP est refusée
export function GET() {
  return json(405, { erreur: 'Méthode non autorisée.' });
}
