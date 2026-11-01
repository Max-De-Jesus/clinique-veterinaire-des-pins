# ADR 0001 — Site statique Bootstrap + fonction serveur Vercel pour le chatbot

- **Statut** : accepté ; point 5 remplacé par l'ADR 0002 le 2026-11-01
- **Date** : 2026-10-30

## Contexte

Le sujet impose HTML et CSS, avec Bootstrap 5 encouragé. Le CSS doit être dans `style.css` et le JS dans `script.js`. Le site est hébergé gratuitement sur Vercel. Le bonus 2 exige un chatbot connecté à une API IA via `fetch()`, **sans exposer la clé API côté client**.

## Décision

1. **Site 100 % statique** : 4 pages HTML, Bootstrap 5.3.3 et Bootstrap Icons 1.11.3 servis par jsDelivr avec SRI. Pas de framework ni d'étape de build, pour respecter l'esprit du cours.
2. **Chatbot** : le navigateur appelle `POST /api/chat` sur le même domaine. La fonction Vercel `api/chat.js` (handler Web standard `POST(request)`) ajoute le contexte métier (`api/_contexte.js`) et appelle **Google Gemini** (`generateContent`). Le modèle par défaut est `gemini-2.5-flash` ; il peut être remplacé par la variable `GEMINI_MODEL`.
3. **Secret** : `GEMINI_API_KEY` est stockée uniquement dans les variables d'environnement Vercel, ou dans le shell en local. Elle ne figure jamais dans le dépôt.
4. **Garde-fous** :
   - validation stricte de l'historique (12 messages, 500 caractères) ;
   - limitation par IP en mémoire ;
   - délai maximal de 20 s ;
   - erreurs de Gemini masquées ;
   - CSP dans `vercel.json`.
5. ~~**Formulaire de contact** : il est seulement validé côté client, car aucun service d'envoi d'e-mail n'est branché. Le message de confirmation le dit honnêtement.~~ Remplacé : le formulaire envoie un e-mail réel via `/api/contact` (ADR 0002).

## Alternatives écartées

- **Appel direct à Gemini depuis le navigateur** : la clé serait exposée, ce que le sujet interdit.
- **Next.js ou un autre framework** : hors du périmètre pédagogique (HTML/CSS).
- **Service d'e-mail (Resend, Formspree…)** : écarté à l'origine, faute de décision du propriétaire. Il a depuis choisi Resend (ADR 0002).

## Conséquences

- La limitation de débit en mémoire n'est valable que par instance. Elle suffit pour un projet étudiant, mais pas pour une production à fort trafic : il faudrait alors un stockage partagé (Redis).
- Sans clé configurée, le site reste fonctionnel et le chatbot affiche un message d'indisponibilité (HTTP 503).
