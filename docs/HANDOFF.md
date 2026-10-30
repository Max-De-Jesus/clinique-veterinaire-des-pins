# Passation — état du projet

**Dernière mise à jour** : 2026-10-30, par Claude Code (lot 1).

## Fait et vérifié
- 4 pages complètes (`index`, `a-propos`, `services`, `contact`), plus `css/style.css` et `js/script.js`.
- 45 photos Unsplash dans `assets/img/`, vérifiées visuellement sur une planche-contact. Les identifiants sont dans `tools/images.txt`.
- Chatbot « Sylva » : bulle flottante, suggestions, historique de session et proxy serveur `api/chat.js` vers Gemini.
- `npm test` : **33/33 tests réussis**, avec une garde de comptage (minimum 30).
- Contrôle négatif : un `style=""` injecté dans `contact.html` fait échouer **uniquement** le test « aucun style ni script en ligne ». La restauration a été vérifiée par hash.
- Contrôles en navigateur (Chrome, serveur local) :
  - aucune erreur console ;
  - aucun débordement horizontal à 320, 375 et 768 px (un défaut dû à la gouttière `g-5` a été corrigé) ;
  - toutes les images se chargent ;
  - le formulaire refuse les champs invalides et confirme un envoi valide ;
  - le chatbot sans clé affiche un message d'indisponibilité propre (HTTP 503).

## Non prouvé (à faire)
1. ~~Appel réel à Gemini~~ **Prouvé le 2026-10-30** en local : réponses justes sur les horaires et le tarif, redirection vers le 05 58 00 12 34 en cas d'urgence, refus du hors sujet. La clé reste à ajouter dans Vercel. Ancienne procédure de test :
   - créer une clé sur https://aistudio.google.com/apikey ;
   - lancer `$env:GEMINI_API_KEY="..."; npm run dev` ;
   - poser une question au chatbot.

   Si le modèle `gemini-2.5-flash` est refusé, définir `GEMINI_MODEL` avec un modèle disponible.
2. **Déploiement Vercel** : pas encore fait. La CLI Vercel n'est pas installée. Le propriétaire doit :
   - importer le dépôt sur vercel.com, ou lancer `npm i -g vercel` puis `vercel` ;
   - ajouter `GEMINI_API_KEY` dans les variables d'environnement.
3. **CSP de `vercel.json`** : elle n'est appliquée qu'une fois le site déployé. Après le déploiement, vérifier la console du site : polices, icônes Bootstrap, carte OpenStreetMap et chatbot.
4. **Validation W3C officielle** (validator.w3.org) : pas lancée. En revanche, `npm run validate` (html-validate 8.24.1, plus strict sur l'accessibilité) passe **sans erreur** sur les 4 pages.
5. ~~Dépôt GitHub~~ **Fait le 2026-10-30** à la demande du propriétaire : dépôt public https://github.com/Max-De-Jesus/clinique-veterinaire-des-pins (branche `main`). Pour Vercel : importer ce dépôt.

## Prochaine action
Obtenir du propriétaire une clé Gemini, puis lancer le déploiement Vercel (points 1 et 2 ci-dessus). Ensuite, préparer la présentation orale de 7 minutes : choix de l'entreprise et décisions de conception.

## Dettes connues
| Id | Problème | Impact | Raison du report | Déclencheur | Statut |
|----|----------|--------|------------------|-------------|--------|
| D1 | Limitation de débit du chatbot en mémoire, par instance | Contournable sous forte charge | Suffisant pour un projet étudiant ; Redis nécessiterait un fournisseur externe | Trafic réel / mise en production | Ouvert |
| D2 | Le formulaire de contact n'envoie rien (démonstration, et c'est indiqué au visiteur) | Aucun message reçu | Un service d'e-mail exige un compte tiers : décision du propriétaire | Demande d'envoi réel | Ouvert |
| D3 | En-tête et pied de page dupliqués dans 4 fichiers | Risque d'oubli lors d'une modification | Le sujet impose du HTML statique, sans gabarit | Ajout d'une 5ᵉ page | Ouvert |
