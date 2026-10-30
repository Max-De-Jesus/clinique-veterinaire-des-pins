# AGENTS.md — instructions pour tout agent (Claude Code, Antigravity, Gemini…)

**Lire d'abord `docs/HANDOFF.md`** : il décrit l'état exact du projet et la prochaine action.

## Projet
Site vitrine de la **Clinique Vétérinaire des Pins**, une entreprise fictive à Mimizan (Landes). C'est un projet étudiant « Hackathon XHTML & CSS ».
Le sujet complet est dans `Projet 1.pdf` (non versionné). Le propriétaire veut **beaucoup d'images** sur le site.

## Contraintes du sujet (à ne jamais enfreindre)
- HTML5 valide, `<!DOCTYPE html>` sur chaque page ; Bootstrap 5 autorisé.
- CSS personnalisé **uniquement** dans `css/style.css` : aucun attribut `style=""` ni balise `<style>`.
- JS **uniquement** dans `js/script.js` : aucun script en ligne ni `onclick=""`. Exception : la fonction serveur `api/`.
- Code indenté et **commenté en français**.
- Images libres de droits uniquement (Unsplash). Pour en ajouter : compléter `tools/images.txt`, puis lancer `npm run images`.
- La clé API du chatbot ne doit **jamais** apparaître côté client ni dans Git. Elle vit dans `GEMINI_API_KEY` (Vercel).

## Conventions
- Langue : français, pour l'interface, les commentaires, les noms de classes CSS (`carte-service`, `bandeau-page`…) et les noms de fonctions JS.
- Les couleurs et les polices passent par les variables `:root` de `style.css`.
- Toute nouvelle image a un `alt` descriptif, des attributs `width`/`height` et `loading="lazy"` (sauf la première du hero).
- L'en-tête et le pied de page sont dupliqués dans les 4 pages : toute modification doit être reportée dans les 4.

## Vérifications obligatoires avant de conclure
```bash
npm test          # doit afficher « obtenu=33 » (ou plus) et « RÉSULTAT : SUCCÈS »
npm run validate  # html-validate : aucune erreur attendue
npm run dev  # contrôle visuel sur http://localhost:3000 à 375 px et 1280 px
```
Après chaque étape : mettre à jour `docs/HANDOFF.md` et faire un commit local. Pas de push sans l'accord du propriétaire.
