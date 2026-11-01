// Fonction serveur Vercel : POST /api/contact
// Valide le formulaire de contact puis l'envoie par e-mail grâce à l'API de Resend (voir ADR 0002).
// La clé (RESEND_API_KEY) et le destinataire (CONTACT_DESTINATAIRE) restent côté serveur.

import { json, adresseIP, creerLimiteur } from './_commun.js';

const URL_RESEND = 'https://api.resend.com/emails';
const EXPEDITEUR_PAR_DEFAUT = 'Clinique des Pins <onboarding@resend.dev>';
const TAILLE_CORPS_MAX = 8 * 1024;       // octets acceptés dans la requête
const DELAI_API_MS = 10000;              // délai maximal d'attente de Resend
const ENVOIS_MAX = 5;                    // envois autorisés par IP…
const FENETRE_LIMITE_MS = 10 * 60000;    // …sur cette durée
const TELEPHONE_SECOURS = '05 58 00 12 34';

const NOM_MIN = 2;
const NOM_MAX = 80;
const EMAIL_MAX = 120;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 1500;

// Une seule adresse, sans nom ni séparateur : « Répondre » ne peut viser que le visiteur
const MOTIF_EMAIL = /^[^\s@,;<>"()]+@[^\s@,;<>"()]+\.[^\s@,;<>"()]{2,}$/;
const MOTIF_TELEPHONE = /^(\+33\s?|0)[1-9](\s?\d{2}){4}$/;
const CARACTERES_CONTROLE = /[\u0000-\u001f\u007f]/;

// Valeurs possibles de la liste « Votre animal » et leur libellé dans l'e-mail
const ANIMAUX = {
  chien: 'Chien',
  chat: 'Chat',
  nac: 'NAC',
  oiseau: 'Oiseau',
  cheval: 'Cheval',
  autre: 'Autre'
};

const depasseLimite = creerLimiteur(ENVOIS_MAX, FENETRE_LIMITE_MS);

/** Texte facultatif : nettoyé s'il s'agit d'une chaîne, vide sinon. */
const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '');

/**
 * Valide une soumission : mêmes règles que le navigateur, sans lui faire confiance.
 * @param {unknown} corps
 * @returns {{ donnees: { nom: string, email: string, telephone: string, animal: string, message: string } } | { erreur: string }}
 */
export function validerSoumission(corps) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return { erreur: 'Requête invalide.' };

  const nom = texte(corps.nom);
  const email = texte(corps.email);
  const telephone = texte(corps.telephone);
  const message = texte(corps.message);
  // Un saut de ligne dans un champ d'une seule ligne n'est jamais légitime (injection d'en-têtes)
  const champsLigne = [corps.nom, corps.email, corps.telephone].filter((v) => typeof v === 'string');

  if (champsLigne.some((v) => CARACTERES_CONTROLE.test(v))) return { erreur: 'Caractères non autorisés.' };
  if (nom.length < NOM_MIN || nom.length > NOM_MAX) return { erreur: 'Indiquez votre nom (2 caractères minimum).' };
  if (email.length > EMAIL_MAX || !MOTIF_EMAIL.test(email)) return { erreur: 'Indiquez une adresse e-mail valide.' };
  if (telephone && !MOTIF_TELEPHONE.test(telephone)) return { erreur: 'Numéro de téléphone invalide.' };
  if (!Object.hasOwn(ANIMAUX, corps.animal)) return { erreur: 'Type d\'animal invalide.' };
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return { erreur: `Votre message doit contenir entre ${MESSAGE_MIN} et ${MESSAGE_MAX} caractères.` };
  }
  if (corps.consentement !== true) return { erreur: 'Votre accord est nécessaire pour que nous puissions vous répondre.' };

  return { donnees: { nom, email, telephone, animal: corps.animal, message } };
}

/** Compose l'e-mail en texte brut : le destinataire ne vient jamais du visiteur. */
export function composerEmail(donnees, destinataire, expediteur) {
  const libelleAnimal = ANIMAUX[donnees.animal];
  return {
    from: expediteur,
    to: [destinataire],
    reply_to: donnees.email,
    subject: `[Clinique des Pins] Message de ${donnees.nom} (${libelleAnimal})`,
    text: [
      'Nouveau message reçu depuis le formulaire de contact du site.',
      '',
      `Nom : ${donnees.nom}`,
      `E-mail : ${donnees.email}`,
      `Téléphone : ${donnees.telephone || 'non renseigné'}`,
      `Animal : ${libelleAnimal}`,
      '',
      'Message :',
      donnees.message,
      '',
      '— Pour répondre au visiteur, utilisez simplement « Répondre ».'
    ].join('\n')
  };
}

/**
 * Refuse les requêtes envoyées par le navigateur d'un autre site.
 * Un client scripté peut omettre Origin : contre lui, la vraie barrière est la limite de débit.
 */
function origineAutorisee(request) {
  const origine = request.headers.get('origin');
  if (!origine) return true;
  const hote = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try {
    return new URL(origine).host === hote;
  } catch {
    return false;
  }
}

export async function POST(request) {
  const cleApi = process.env.RESEND_API_KEY;
  const destinataire = process.env.CONTACT_DESTINATAIRE;
  if (!cleApi || !destinataire) {
    console.error('[contact] RESEND_API_KEY ou CONTACT_DESTINATAIRE absente de l\'environnement');
    return json(503, { erreur: `L'envoi de messages n'est pas encore activé. Appelez-nous au ${TELEPHONE_SECOURS}.` });
  }

  if (!origineAutorisee(request)) return json(403, { erreur: 'Origine non autorisée.' });
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return json(415, { erreur: 'Format de requête non pris en charge.' });
  }
  if (depasseLimite(adresseIP(request))) {
    return json(429, { erreur: `Vous avez envoyé plusieurs messages : patientez quelques minutes ou appelez le ${TELEPHONE_SECOURS}.` });
  }

  // La taille annoncée évite de lire un corps trop gros ; la taille réelle reste vérifiée ensuite
  if (Number(request.headers.get('content-length')) > TAILLE_CORPS_MAX) {
    return json(413, { erreur: 'Message trop volumineux.' });
  }
  const brut = await request.text();
  if (Buffer.byteLength(brut) > TAILLE_CORPS_MAX) return json(413, { erreur: 'Message trop volumineux.' });

  let corps;
  try {
    corps = JSON.parse(brut);
  } catch {
    return json(400, { erreur: 'Requête illisible.' });
  }

  // Champ piège invisible : seul un robot le remplit. Il croit avoir réussi, rien n'est envoyé.
  if (corps && typeof corps === 'object' && texte(corps.confirmation_interne)) return json(200, { envoye: true });

  const resultat = validerSoumission(corps);
  if (resultat.erreur) return json(400, { erreur: resultat.erreur });

  const expediteur = process.env.CONTACT_EXPEDITEUR || EXPEDITEUR_PAR_DEFAUT;
  try {
    const reponse = await fetch(URL_RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cleApi}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(DELAI_API_MS),
      body: JSON.stringify(composerEmail(resultat.donnees, destinataire, expediteur))
    });

    if (!reponse.ok) {
      // On journalise le type d'erreur, jamais les données du visiteur
      const details = await reponse.json().catch(() => ({}));
      console.error('[contact] Erreur Resend', reponse.status, details?.name);
      return json(502, { erreur: `Votre message n'a pas pu être envoyé. Réessayez ou appelez le ${TELEPHONE_SECOURS}.` });
    }
    return json(200, { envoye: true });
  } catch (erreur) {
    console.error('[contact] Appel Resend échoué :', erreur instanceof Error ? erreur.name : 'inconnue');
    return json(504, { erreur: `Le service d'envoi ne répond pas. Réessayez ou appelez le ${TELEPHONE_SECOURS}.` });
  }
}

// Toute autre méthode HTTP est refusée
export function GET() {
  return json(405, { erreur: 'Méthode non autorisée.' });
}
