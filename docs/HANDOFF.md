# Passation — état du projet

**Dernière mise à jour** : 2026-11-01, par Claude Code (lot 2 : refonte du design, envoi du formulaire, HTTPS).

## Site en ligne
https://clinique-veterinaire-des-pins.vercel.app (déployé depuis la ligne de commande : le dépôt GitHub a deux commits de retard tant que le propriétaire n'a pas autorisé le push).

## Fait et vérifié
- 4 pages (`index`, `a-propos`, `services`, `contact`), plus `css/style.css` et `js/script.js`. 45 photos Unsplash, listées dans `tools/images.txt`.
- **Design « carnet naturaliste »** : fond papier, vert pin, un seul accent (la résine), titres Newsreader, texte Instrument Sans, filets fins, mises en page asymétriques. La direction a été choisie par défaut, car la question posée au propriétaire est revenue sans réponse : à confirmer.
- **Formulaire de contact** : `POST /api/contact` valide puis envoie via Resend (ADR 0002). Code et tests prêts, **activation en attente** (voir ci-dessous).
- **HTTPS** : vérifié en ligne. HTTP redirige en 308 vers HTTPS ; en-tête HSTS actif ; 0 requête HTTP sur les 4 pages, à 1280 et 375 px.
- **Contrôle en ligne** (Chrome, 4 pages, 2 largeurs) : console sans erreur avec la CSP active, aucune image cassée, polices, icônes et carte chargées, aucun débordement.
- **Poids** : photos allégées de 7,1 Mo à 2,7 Mo ; l'accueil passe de 5,1 Mo à 2,0 Mo d'images.
- **Déploiement** : `.vercelignore` exclut `Projet 1.pdf`, les tests, les outils et la documentation (HTTP 404 vérifié).
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

## Incidents de ce lot
- `Projet 1.pdf` a été public quelques minutes sur le premier déploiement : déploiement supprimé, fichier exclu, HTTP 404 vérifié sur l'URL principale et sur l'ancienne.
- Le serveur local écoutait sur toutes les interfaces et servait `.env.local` (jeton OIDC Vercel de courte durée) et `.git/config` pendant la session du 2026-11-01. Corrigé (HTTP 403, écoute sur `127.0.0.1`). Aucune preuve d'accès, aucune preuve du contraire.
- `ERR_INSUFFICIENT_RESOURCES` vu une fois dans Chrome : **cause inconnue**, non reproduit (machine avec de nombreux processus Chrome, connexion à 90–325 Ko/s).

## Vercel
Projet `clinique-veterinaire-des-pins`, équipe `hbdmimi-s-projects`, relié au dépôt GitHub : un `git push` sur `main` déclenche un déploiement. Les conditions de Resend sont acceptées au niveau de l'équipe, sans ressource créée ni facturation. `CONTACT_DESTINATAIRE` est configurée en production et en développement.

## Prochaine action
Activer Resend et Gemini (points 1 et 2), prouver la réception dans Gmail, puis préparer la présentation orale de 7 minutes.

## Dettes connues
| Id | Problème | Impact | Raison du report | Déclencheur | Statut |
|----|----------|--------|------------------|-------------|--------|
| D1 | Limitation de débit en mémoire, par instance (chatbot et formulaire) | Contournable sous forte charge | Suffisant pour un projet étudiant ; un stockage partagé exigerait un fournisseur externe | Trafic réel / abus constaté | Ouvert |
| D2 | ~~Le formulaire n'envoie rien~~ | — | — | — | Code livré ; activation au point 1 ci-dessus |
| D3 | En-tête et pied de page dupliqués dans 4 fichiers | Risque d'oubli lors d'une modification | Le sujet impose du HTML statique, sans gabarit | Ajout d'une 5ᵉ page | Ouvert |
| D4 | `css/style.css` dépasse le plafond indicatif de 800 lignes | Fichier plus long à parcourir | Le sujet impose un seul fichier `style.css` ; il est découpé en 18 sections par un sommaire | Ajout important de styles | Accepté |
