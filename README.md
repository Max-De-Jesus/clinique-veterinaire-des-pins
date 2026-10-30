# Clinique Vétérinaire des Pins — site web (Projet Hackathon XHTML & CSS)

Site vitrine **responsive** d'une clinique vétérinaire fictive située à Mimizan (Landes), au cœur de la forêt de pins.
Le projet répond au sujet « Projet 1 — Création d'un site web d'entreprise ». Il inclut les deux bonus : JavaScript et chatbot IA.

## Pages

| Page | Fichier | Contenu |
|------|---------|---------|
| Accueil | `index.html` | Carrousel hero (nom, slogan, appels à l'action), résumé des services, « Pourquoi nous », chiffres animés, galerie mosaïque, témoignages |
| À propos | `a-propos.html` | Histoire et chronologie, 4 valeurs, équipe de 4 vétérinaires, visite des installations |
| Services | `services.html` | 12 services en cartes Bootstrap filtrables, déroulement d'une visite, tableau des tarifs, FAQ |
| Contact | `contact.html` | Formulaire validé (nom, e-mail, message…), coordonnées, horaires, statut d'ouverture en direct, plan OpenStreetMap |

## Correspondance avec le cahier des charges

| Exigence | Où |
|----------|----|
| Navigation responsive | Navbar Bootstrap avec menu hamburger, présente sur toutes les pages |
| Grille en colonnes | Grille Bootstrap, plus une mosaïque en CSS Grid (`.galerie`) |
| Carrousel | `index.html`, `#carrouselAccueil` (Bootstrap Carousel, 4 diapositives) |
| Effets au survol | Cartes qui se soulèvent, zoom des images, soulignement animé du menu (`css/style.css`) |
| Design cohérent | Variables CSS : vert pin, sauge, sable, ambre ; polices Fraunces et Nunito Sans |
| 100 % responsive | Bootstrap et media queries ; vérifié sans débordement à 320, 375 et 768 px |
| CSS séparé | `css/style.css` uniquement, aucun style en ligne (vérifié par un test) |
| **Bonus 1 — JS** (`js/script.js`) | Validation du formulaire, apparition au défilement, compteurs, visionneuse de galerie, filtres, retour en haut, statut ouvert/fermé |
| **Bonus 2 — Chatbot** | Bulle « Sylva » en bas à droite → `fetch('/api/chat')` → fonction Vercel `api/chat.js` → Gemini. **La clé n'est jamais envoyée au navigateur.** |
| Images libres de droits | 45 photos Unsplash, listées dans `tools/images.txt` |

## Lancer en local

```bash
npm test                         # 33 tests (pages, images, contraintes, API du chatbot)
GEMINI_API_KEY=... npm run dev   # http://localhost:3000 (sans clé : le site marche, le chatbot affiche un message d'indisponibilité)
```

Sous PowerShell : `$env:GEMINI_API_KEY="..."; npm run dev`.

## Déployer sur Vercel

1. Importer le dépôt sur vercel.com (aucun framework, aucune commande de build).
2. Dans *Settings → Environment Variables*, ajouter `GEMINI_API_KEY`, avec une clé créée sur https://aistudio.google.com/apikey.
3. Déployer. Le dossier `api/` devient automatiquement la fonction serveur `/api/chat`.

## Sécurité du chatbot

- La clé est lue côté serveur (`process.env.GEMINI_API_KEY`) et envoyée à Google dans un en-tête, jamais dans l'URL.
- L'entrée est validée : rôles autorisés, 12 messages au maximum, 500 caractères par message.
- Une limitation de 15 requêtes par minute et par IP est appliquée par instance.
- Les erreurs de Gemini ne sont jamais renvoyées au visiteur.
- Les réponses sont affichées avec `textContent`, ce qui empêche l'injection HTML.
- `vercel.json` envoie une Content-Security-Policy et les en-têtes de sécurité.

## Structure

```
index.html  a-propos.html  services.html  contact.html
css/style.css      js/script.js      assets/img/ (45 photos)   assets/favicon.svg
api/chat.js        api/_contexte.js (contexte métier envoyé à l'IA)
tests/             tools/ (serveur local, lanceur de tests, téléchargement des images)
docs/              (ADR, passation, registre des intégrations)
```
