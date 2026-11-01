// Outils partagés par les fonctions serveur.
// Les fichiers commençant par « _ » dans /api ne sont pas exposés comme routes par Vercel.

const ENTREES_MAX = 5000; // borne la mémoire de chaque limiteur
const GROUPES_RESEAU_IPV6 = 4; // un abonné dispose d'un bloc /64 : c'est lui qu'on compte

/** Réponse JSON avec les en-têtes de sécurité de base. */
export function json(statut, corps) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/**
 * Clé de limitation du visiteur, d'après l'adresse transmise par l'hébergeur.
 * En IPv6, seul le réseau /64 est retenu : changer d'adresse dans son bloc ne contourne pas la limite.
 */
export function adresseIP(request) {
  const adresse = (request.headers.get('x-forwarded-for') || 'inconnue').split(',')[0].trim();
  if (!adresse.includes(':')) return adresse;

  // Développe l'abréviation « :: » pour compter les vrais groupes
  const [debut, fin = ''] = adresse.toLowerCase().split('::');
  const groupesDebut = debut ? debut.split(':') : [];
  const groupesFin = fin ? fin.split(':') : [];
  const manquants = Array(Math.max(0, 8 - groupesDebut.length - groupesFin.length)).fill('0');
  return [...groupesDebut, ...manquants, ...groupesFin].slice(0, GROUPES_RESEAU_IPV6).join(':');
}

/**
 * Crée une limitation de débit simple en mémoire (réinitialisée à chaque démarrage d'instance).
 * @param {number} maximum nombre de requêtes autorisées dans la fenêtre
 * @param {number} fenetreMs durée de la fenêtre en millisecondes
 * @returns {(cle: string) => boolean} vrai si la limite est dépassée
 */
export function creerLimiteur(maximum, fenetreMs) {
  const compteurs = new Map();
  return (cle) => {
    const maintenant = Date.now();
    const recentes = (compteurs.get(cle) || []).filter((t) => maintenant - t < fenetreMs);
    compteurs.delete(cle); // remet la clé en dernière position : la plus ancienne reste en tête
    compteurs.set(cle, [...recentes, maintenant]);
    if (compteurs.size > ENTREES_MAX) compteurs.delete(compteurs.keys().next().value);
    return recentes.length >= maximum;
  };
}
