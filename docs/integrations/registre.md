# Registre des intégrations

Ce registre ne contient **jamais** la valeur d'un secret.

| Service | Variable | Emplacement sécurisé | Date | Validation | Statut |
|---------|----------|----------------------|------|------------|--------|
| Google Gemini (API IA du chatbot) | `GEMINI_API_KEY` (et `GEMINI_MODEL`, facultative) | Vercel → Settings → Environment Variables ; en local, variable du shell | 2026-10-30 | Tests unitaires avec `fetch` simulé : OK. Appel réel : **OK le 2026-10-30** en local (horaires, tarif, urgence, hors sujet) | Actif en local ; à ajouter dans Vercel |
| Unsplash (photos) | — (aucune clé, téléchargement direct depuis le CDN) | — | 2026-10-30 | 45/45 images téléchargées, vérifiées visuellement | Actif |
| jsDelivr (Bootstrap 5.3.3, Bootstrap Icons 1.11.3) | — | — | 2026-10-30 | Empreintes SRI calculées sur les fichiers réels | Actif |
| Google Fonts (Fraunces, Nunito Sans) | — | — | 2026-10-30 | Chargement vérifié en local | Actif |
| OpenStreetMap (carte intégrée) | — | — | 2026-10-30 | iframe autorisée dans la CSP (`frame-src`) | Actif |
