# Clinique Vétérinaire des Pins — site web (Projet Hackathon XHTML & CSS)

Site vitrine **responsive** d'une clinique vétérinaire fictive située à Mimizan (Landes), au cœur de la forêt de pins.
Le projet répond au sujet « Projet 1 — Création d'un site web d'entreprise ». Il inclut les deux bonus : JavaScript et chatbot IA.

## Pages

| Page | Fichier | Contenu |
|------|---------|---------|
| Accueil | `index.html` | Hero plein écran (nom, slogan, appels à l'action) sur carrousel photo, résumé des services, « Pourquoi nous », chiffres animés, galerie mosaïque, témoignages |
| À propos | `a-propos.html` | Histoire et chronologie, 4 valeurs, équipe de 4 vétérinaires, visite des installations |
| Services | `services.html` | 12 services en cartes Bootstrap filtrables, déroulement d'une visite, tableau des tarifs, FAQ |
| Contact | `contact.html` | Formulaire validé et envoyé par e-mail (nom, e-mail, message…), coordonnées, horaires, statut d'ouverture en direct, plan OpenStreetMap |

## Correspondance avec le cahier des charges

| Exigence | Où |
|----------|----|
| Navigation responsive | Navbar Bootstrap avec menu hamburger, présente sur toutes les pages |
| Grille en colonnes | Grille Bootstrap, plus une mosaïque en CSS Grid (`.galerie`) |
| Carrousel | `index.html`, `#carrouselAccueil` (Bootstrap Carousel, 4 diapositives) |
| Effets au survol | Zoom et levée des cartes, reflet des boutons, soulignement animé du menu, bandeau défilant (`css/style.css`) |
| Design cohérent | Direction « moderne et chic » en variables CSS : vert nuit, ivoire, or ; polices Instrument Serif et Manrope |
| 100 % responsive | Bootstrap et media queries ; vérifié sans débordement à 320, 375 et 768 px |
| CSS séparé | `css/style.css` uniquement, aucun style en ligne (vérifié par un test) |
| **Bonus 1 — JS** (`js/script.js`) | Validation et envoi du formulaire, titres révélés mot à mot, parallaxe, barre de progression, apparition au défilement, compteurs, visionneuse de galerie, filtres, retour en haut, statut ouvert/fermé |
| **Bonus 2 — Chatbot** | Bulle « Sylva » en bas à droite → `fetch('/api/chat')` → fonction Vercel `api/chat.js` → Gemini. **La clé n'est jamais envoyée au navigateur.** |
| Images libres de droits | 45 photos Unsplash, listées dans `tools/images.txt` |

## Documentation

Site en ligne : https://clinique-veterinaire-des-pins.vercel.app

Pour comprendre le fonctionnement du site et la façon dont HTTPS a été obtenu, lisez le [guide pour développeurs juniors](docs/guide-developpeurs-juniors.pdf).

## Lancer en local

```bash
npm test                         # tests avec garde de comptage (pages, images, contraintes, API du chatbot et du formulaire)
GEMINI_API_KEY=... RESEND_API_KEY=... CONTACT_DESTINATAIRE=... npm run dev   # http://localhost:3000 (sans clé : le site marche, le service concerné affiche un message d'indisponibilité)
```

Sous PowerShell : `$env:GEMINI_API_KEY="..."; npm run dev`.

## Déployer sur Vercel

1. Importer le dépôt sur vercel.com (aucun framework, aucune commande de build).
2. Dans *Settings → Environment Variables*, ajouter `GEMINI_API_KEY` (clé créée sur https://aistudio.google.com/apikey), `RESEND_API_KEY` (clé d'envoi d'un compte gratuit créé sur resend.com avec l'adresse destinataire) et `CONTACT_DESTINATAIRE` (adresse qui reçoit les messages).
3. Déployer. Le dossier `api/` devient automatiquement les fonctions serveur `/api/chat` et `/api/contact`.

## Sécurité du chatbot

- La clé est lue côté serveur (`process.env.GEMINI_API_KEY`) et envoyée à Google dans un en-tête, jamais dans l'URL.
- L'entrée est validée : rôles autorisés, 12 messages au maximum, 500 caractères par message.
- Une limitation de 15 requêtes par minute et par IP est appliquée par instance.
- Les erreurs de Gemini ne sont jamais renvoyées au visiteur.
- Les réponses sont affichées avec `textContent`, ce qui empêche l'injection HTML.
- `vercel.json` envoie une Content-Security-Policy et les en-têtes de sécurité, dont HSTS pour imposer HTTPS.

## Formulaire de contact

Le navigateur appelle `/api/contact`, qui revalide les données et envoie un e-mail en texte brut via Resend (voir `docs/adr/0002-envoi-formulaire-par-resend.md`). La clé et le destinataire restent côté serveur. Le visiteur ne voit un succès que si Resend a accepté l'envoi. Protections : champ piège, contrôle de l'origine, limite de 5 envois par 10 minutes et par IP.

## Structure

```
index.html  a-propos.html  services.html  contact.html
css/style.css      js/script.js      assets/img/ (45 photos)   assets/favicon.svg, favicon.ico, assets/apple-touch-icon.png
api/chat.js        api/contact.js    api/_commun.js    api/_contexte.js (contexte métier envoyé à l'IA)
tests/             tools/ (serveur local, lanceur de tests, téléchargement des images)
docs/              (ADR, passation, registre des intégrations)
```
