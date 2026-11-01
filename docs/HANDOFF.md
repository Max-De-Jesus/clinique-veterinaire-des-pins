# Passation — état du projet

**Dernière mise à jour** : 2026-11-01, par Claude Code (lot 2 : refonte du design, envoi du formulaire, HTTPS).

## Site en ligne
https://clinique-veterinaire-des-pins.vercel.app (déployé depuis la ligne de commande : le dépôt GitHub reste en retard sur le site tant que le propriétaire n'a pas autorisé le push).

## Fait et vérifié
- 4 pages (`index`, `a-propos`, `services`, `contact`), plus `css/style.css` et `js/script.js`. 45 photos Unsplash, listées dans `tools/images.txt`.
- **Design « carnet naturaliste »** : fond papier, vert pin, un seul accent (la résine), titres Newsreader, texte Instrument Sans, filets fins, mises en page asymétriques. La direction a été choisie par défaut, car la question posée au propriétaire est revenue sans réponse : à confirmer.
- **Formulaire de contact** : `POST /api/contact` valide puis envoie via Resend (ADR 0002). **Prouvé en production le 2026-11-01** : deux messages (appel direct de l'API et vrai formulaire dans Chrome, CSP active) retrouvés dans la boîte Gmail destinataire, en boîte de réception, avec tous les champs.
- **HTTPS** : vérifié en ligne. HTTP redirige en 308 vers HTTPS ; en-tête HSTS actif ; 0 requête HTTP sur les 4 pages, à 1280 et 375 px.
- **Contrôle en ligne** (Chrome, 4 pages, 2 largeurs) : console sans erreur avec la CSP active, aucune image cassée, polices, icônes et carte chargées, aucun débordement.
- **Poids** : photos allégées de 7,1 Mo à 2,7 Mo ; l'accueil passe de 5,1 Mo à 2,0 Mo d'images.
- **Déploiement** : `.vercelignore` exclut `Projet 1.pdf`, les tests, les outils et la documentation (HTTP 404 vérifié).
- Chatbot « Sylva » : **prouvé en production le 2026-11-01** : réponse juste sur les horaires et le tarif, renvoi vers le 05 58 00 12 34 pour une urgence, refus du hors sujet.
- `npm test` : **69/69**, avec une garde de comptage (minimum 50). 7 tests couvrent les exigences du sujet (PDF).
- `npm run validate` (html-validate 8.24.1) : aucune erreur sur les 4 pages.
- Contrôle négatif : retirer la vérification du consentement dans `api/contact.js` fait échouer uniquement le test « refuse chaque champ invalide » ; restauration vérifiée par hash.
- Parcours navigateur (Chrome, serveur local, Resend simulé), 8 scénarios, 0 erreur JavaScript : formulaire vide, e-mail sans domaine, échec serveur sans faux succès, double clic, réseau coupé, statut à l'heure de Paris, chatbot au clavier, filtres et carrousel.
- Aucun débordement horizontal à 375 et 1280 px.
- Revue de sécurité : aucun défaut critique ou élevé ; le défaut moyen et les défauts faibles ont été corrigés (limite par bloc IPv6, serveur local limité à `127.0.0.1` et refus des fichiers cachés, taille du corps, Content-Type, adresse unique dans `reply_to`, champ piège renommé).

## À faire
1. **Remplacer `RESEND_API_KEY` et `GEMINI_API_KEY`** : ces deux clés ont été collées dans une conversation et sont à considérer comme exposées. Elles ne figurent pas dans le dépôt. Procédure : créer une nouvelle clé, révoquer l'ancienne, `vercel env rm <NOM> production`, `vercel env add <NOM> production`, redéployer, retester.
2. **Pousser sur GitHub** : en attente de l'accord du propriétaire (le dépôt est en retard sur le site).
3. **Confirmer la direction du design** (« carnet naturaliste », choisie par défaut).
4. **Validation W3C officielle** (validator.w3.org) : pas lancée.
5. **Présentation orale de 7 minutes** : à préparer.

## Limite connue
Sans domaine vérifié, Resend n'envoie qu'à l'adresse de son propre compte et l'expéditeur affiché est `onboarding@resend.dev`. C'est suffisant pour ce projet.

## Incidents de ce lot
- `Projet 1.pdf` a été public quelques minutes sur le premier déploiement : déploiement supprimé, fichier exclu, HTTP 404 vérifié sur l'URL principale et sur l'ancienne.
- Le serveur local écoutait sur toutes les interfaces et servait `.env.local` (jeton OIDC Vercel de courte durée) et `.git/config` pendant la session du 2026-11-01. Corrigé (HTTP 403, écoute sur `127.0.0.1`). Aucune preuve d'accès, aucune preuve du contraire.
- `ERR_INSUFFICIENT_RESOURCES` vu une fois dans Chrome : **cause inconnue**, non reproduit (machine avec de nombreux processus Chrome, connexion à 90–325 Ko/s).

## Vercel
Projet `clinique-veterinaire-des-pins`, équipe `hbdmimi-s-projects`, relié au dépôt GitHub : un `git push` sur `main` déclenche un déploiement. Les conditions de Resend du Marketplace sont acceptées au niveau de l'équipe, sans ressource créée ni facturation. Variables de production : `GEMINI_API_KEY`, `RESEND_API_KEY`, `CONTACT_DESTINATAIRE`. `CONTACT_DESTINATAIRE` est configurée en production et en développement.

## Prochaine action
Remplacer les deux clés exposées, puis pousser sur GitHub avec l'accord du propriétaire.

## Dettes connues
| Id | Problème | Impact | Raison du report | Déclencheur | Statut |
|----|----------|--------|------------------|-------------|--------|
| D1 | Limitation de débit en mémoire, par instance (chatbot et formulaire) | Contournable sous forte charge | Suffisant pour un projet étudiant ; un stockage partagé exigerait un fournisseur externe | Trafic réel / abus constaté | Ouvert |
| D2 | ~~Le formulaire n'envoie rien~~ | — | — | — | Résolu |
| D3 | En-tête et pied de page dupliqués dans 4 fichiers | Risque d'oubli lors d'une modification | Le sujet impose du HTML statique, sans gabarit | Ajout d'une 5ᵉ page | Ouvert |
| D4 | `css/style.css` dépasse le plafond indicatif de 800 lignes | Fichier plus long à parcourir | Le sujet impose un seul fichier `style.css` ; il est découpé en 18 sections par un sommaire | Ajout important de styles | Accepté |
