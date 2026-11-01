# Passation — état du projet

**Dernière mise à jour** : 2026-11-01, par Claude Code (lot 2 : refonte du design, envoi du formulaire, HTTPS).

## Fait et vérifié
- 4 pages (`index`, `a-propos`, `services`, `contact`), plus `css/style.css` et `js/script.js`. 45 photos Unsplash, listées dans `tools/images.txt`.
- **Design « carnet naturaliste »** : fond papier, vert pin, un seul accent (la résine), titres Newsreader, texte Instrument Sans, filets fins, mises en page asymétriques. La direction a été choisie par défaut, car la question posée au propriétaire est revenue sans réponse : à confirmer.
- **Formulaire de contact** : `POST /api/contact` valide puis envoie via Resend (ADR 0002). Code et tests prêts, **activation en attente** (voir ci-dessous).
- **HTTPS** : fourni par Vercel ; en-tête HSTS ajouté dans `vercel.json` ; aucune ressource en HTTP (vérifié par un test).
- Chatbot « Sylva » : appel réel à Gemini prouvé en local le 2026-10-30.
- `npm test` : **69/69**, avec une garde de comptage (minimum 50). 7 tests couvrent les exigences du sujet (PDF).
- `npm run validate` (html-validate 8.24.1) : aucune erreur sur les 4 pages.
- Contrôle négatif : retirer la vérification du consentement dans `api/contact.js` fait échouer uniquement le test « refuse chaque champ invalide » ; restauration vérifiée par hash.
- Parcours navigateur (Chrome, serveur local, Resend simulé), 8 scénarios, 0 erreur JavaScript : formulaire vide, e-mail sans domaine, échec serveur sans faux succès, double clic, réseau coupé, statut à l'heure de Paris, chatbot au clavier, filtres et carrousel.
- Aucun débordement horizontal à 375 et 1280 px.
- Revue de sécurité : aucun défaut critique ou élevé ; le défaut moyen et les défauts faibles ont été corrigés (limite par bloc IPv6, serveur local limité à `127.0.0.1` et refus des fichiers cachés, taille du corps, Content-Type, adresse unique dans `reply_to`, champ piège renommé).

## Non prouvé (à faire)
1. **Arrivée réelle d'un e-mail dans Gmail : NON PROUVÉE.** Il manque `RESEND_API_KEY`. Sans elle, le formulaire répond HTTP 503 et invite à téléphoner.
   - La voie Marketplace Vercel est écartée (domaine exigé, forfaits à partir de 20 $/mois). Voir ADR 0002.
   - Procédure : créer un compte gratuit sur https://resend.com avec l'adresse destinataire ; créer une clé « Sending access » ; lancer `vercel env add RESEND_API_KEY production` ; redéployer ; envoyer un message de test ; vérifier sa réception dans Gmail.
2. **Chatbot en production** : `GEMINI_API_KEY` n'est pas encore dans Vercel. Sans elle, Sylva affiche un message d'indisponibilité (HTTP 503). Cela touche le bonus 2 du sujet.
3. **Validation W3C officielle** (validator.w3.org) : pas lancée.

## Vercel
Projet `clinique-veterinaire-des-pins`, équipe `hbdmimi-s-projects`, relié au dépôt GitHub : un `git push` sur `main` déclenche un déploiement. `CONTACT_DESTINATAIRE` est configurée en production et en développement.

## Prochaine action
Activer Resend et Gemini (points 1 et 2), prouver la réception dans Gmail, puis préparer la présentation orale de 7 minutes.

## Dettes connues
| Id | Problème | Impact | Raison du report | Déclencheur | Statut |
|----|----------|--------|------------------|-------------|--------|
| D1 | Limitation de débit en mémoire, par instance (chatbot et formulaire) | Contournable sous forte charge | Suffisant pour un projet étudiant ; un stockage partagé exigerait un fournisseur externe | Trafic réel / abus constaté | Ouvert |
| D2 | ~~Le formulaire n'envoie rien~~ | — | — | — | Code livré ; activation au point 1 ci-dessus |
| D3 | En-tête et pied de page dupliqués dans 4 fichiers | Risque d'oubli lors d'une modification | Le sujet impose du HTML statique, sans gabarit | Ajout d'une 5ᵉ page | Ouvert |
| D4 | `css/style.css` dépasse le plafond indicatif de 800 lignes | Fichier plus long à parcourir | Le sujet impose un seul fichier `style.css` ; il est découpé en 18 sections par un sommaire | Ajout important de styles | Accepté |
