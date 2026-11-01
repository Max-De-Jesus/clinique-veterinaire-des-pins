# Registre des intégrations

Ce registre ne contient **jamais** la valeur d'un secret.

| Service | Variable | Emplacement sécurisé | Date | Validation | Statut |
|---------|----------|----------------------|------|------------|--------|
| Google Gemini (API IA du chatbot) | `GEMINI_API_KEY` (et `GEMINI_MODEL`, facultative) | Vercel → Settings → Environment Variables ; en local, variable du shell | 2026-10-30 | Tests unitaires avec `fetch` simulé : OK. Appel réel : **OK le 2026-10-30** en local (horaires, tarif, urgence, hors sujet) | Actif en production (vérifié le 2026-11-01) ; clé conservée par décision du propriétaire (dette D5) |
| Resend (envoi du formulaire de contact), compte gratuit direct, pas le Marketplace payant | `RESEND_API_KEY`, `CONTACT_DESTINATAIRE`, `CONTACT_EXPEDITEUR` (facultative) | Vercel → Settings → Environment Variables | 2026-11-01 | Tests avec `fetch` simulé : OK. Envoi réel : **OK le 2026-11-01** (reçu dans Gmail) | Actif en production ; clé conservée par décision du propriétaire (dette D5) |
| Unsplash (photos) | — (aucune clé, téléchargement direct depuis le CDN) | — | 2026-10-30 | 45/45 images téléchargées, vérifiées visuellement | Actif |
| jsDelivr (Bootstrap 5.3.3, Bootstrap Icons 1.11.3) | — | — | 2026-10-30 | Empreintes SRI calculées sur les fichiers réels | Actif |
| Google Fonts (Instrument Serif, Manrope) | — | — | 2026-11-01 | Chargement vérifié en local | Actif |
| OpenStreetMap (carte intégrée) | — | — | 2026-10-30 | iframe autorisée dans la CSP (`frame-src`) | Actif |
