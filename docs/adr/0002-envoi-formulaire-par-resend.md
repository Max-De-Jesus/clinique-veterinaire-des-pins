# ADR 0002 — Envoi du formulaire de contact par Resend vers Gmail

- **Statut** : accepté par le propriétaire le 2026-11-01
- **Date** : 2026-11-01
- **Amende** : ADR 0001, point 5 (« formulaire validé côté client seulement »), désormais remplacé

## Contexte

Le propriétaire demande que chaque soumission du formulaire de contact arrive dans sa boîte Gmail. Un site statique ne peut pas envoyer d'e-mail : il faut une fonction serveur et un secret. Le dépôt GitHub est public : ni la clé ni l'adresse du destinataire ne doivent y figurer.

## Décision

1. Le navigateur appelle `POST /api/contact` sur le même domaine. La fonction `api/contact.js` valide les données, puis appelle l'API HTTP de **Resend** (`POST https://api.resend.com/emails`) avec `fetch`, sans SDK ni dépendance.
2. **Configuration** (Vercel uniquement, jamais dans Git) :
   - `RESEND_API_KEY` : clé limitée à l'envoi, créée dans un compte Resend gratuit (voir « Voie retenue ») ;
   - `CONTACT_DESTINATAIRE` : adresse Gmail qui reçoit les messages ;
   - `CONTACT_EXPEDITEUR` (facultative) : expéditeur, `onboarding@resend.dev` par défaut.
3. **Le destinataire vient uniquement du serveur** : le visiteur ne peut pas le choisir, le point d'API ne peut donc pas servir de relais de spam vers des tiers.
4. L'e-mail est en **texte brut** : pas de HTML à échapper. L'adresse du visiteur va dans `reply_to`, pour répondre directement depuis Gmail.
5. **Garde-fous** :
   - revalidation complète côté serveur (mêmes règles que le navigateur), avec une seule adresse possible dans `reply_to` ;
   - corps limité à 8 Ko et de type JSON ;
   - consentement obligatoire ;
   - champ piège invisible : un robot qui le remplit reçoit un succès, sans envoi ;
   - contrôle de l'en-tête `Origin`, qui arrête le navigateur d'un autre site mais pas un client scripté ;
   - limite de 5 envois par 10 minutes et par IP (par bloc /64 en IPv6), en mémoire et par instance : c'est la vraie barrière contre le spam scripté ;
   - délai maximal de 10 s vers Resend ;
   - erreurs de Resend jamais renvoyées au visiteur, données personnelles jamais journalisées.
6. **Honnêteté envers le visiteur** : le succès n'est affiché que si Resend a accepté l'envoi. En cas d'échec, le message saisi reste dans le formulaire et le numéro de téléphone est proposé.
7. Le formulaire indique que le site est un projet étudiant et que le message est réellement transmis à son équipe.

## Voie retenue (précision du 2026-11-01)

La proposition initiale passait par l'intégration Resend du **Marketplace Vercel**. Vérification faite à l'installation, elle exige un domaine possédé et ne propose que des forfaits payants (Pro 20 $/mois, Scale 90 $/mois). Elle est **écartée** : le sujet demande un hébergement gratuit, le projet n'a pas de domaine et aucune dépense n'est autorisée. Les conditions du Marketplace ont été acceptées sur l'équipe Vercel, mais aucune ressource n'a été créée et rien n'est facturé.

Le code ne change pas : le compte Resend est créé directement sur resend.com, avec l'adresse qui reçoit les messages, et sa clé est ajoutée à la main dans Vercel.

## Alternatives écartées

- **Gmail SMTP avec mot de passe d'application** : il ajoute `nodemailer` et son secret donne accès à toute la boîte Gmail en cas de fuite.
- **Formulaire tiers appelé depuis le navigateur (Formspree, Web3Forms…)** : pas de validation serveur maîtrisée, et un élargissement de la CSP.

## Conséquences

- **Sans domaine vérifié**, Resend n'envoie qu'à l'adresse de son propre compte. Le compte Resend doit donc correspondre à `CONTACT_DESTINATAIRE`. Pour écrire à une autre adresse, il faudra vérifier un domaine et définir `CONTACT_EXPEDITEUR`.
- Sans configuration, le formulaire renvoie HTTP 503 et le visiteur est invité à téléphoner : aucun faux succès.
- La limite de débit en mémoire reste par instance, comme pour le chatbot (dette D1).
- Le service s'ajoute aux sous-traitants du site : voir `docs/integrations/registre.md`.
