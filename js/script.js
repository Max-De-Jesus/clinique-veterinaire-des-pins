/* ==========================================================================
   Clinique Vétérinaire des Pins — script du site
   Améliore l'expérience utilisateur (bonus 1) et gère le chatbot (bonus 2).
   Sommaire :
     1. Initialisation
     2. Navigation (barre réduite, menu mobile, retour en haut)
     3. Apparition des éléments au défilement
     4. Compteurs animés
     5. Visionneuse de la galerie
     6. Filtres de la page Services
     7. Formulaire de contact (validation et envoi par e-mail via /api/contact)
     8. Statut d'ouverture en temps réel
     9. Chatbot « Sylva » connecté à l'API IA via /api/chat
   ========================================================================== */

'use strict';

/* 1. Initialisation ------------------------------------------------------- */

// Indique au CSS que JavaScript est actif (sinon tout reste visible).
document.documentElement.classList.add('js');

const reduireAnimations = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  initialiserNavigation();
  initialiserCarrousel();
  initialiserApparitions();
  initialiserCompteurs();
  initialiserGalerie();
  initialiserFiltres();
  initialiserFormulaireContact();
  afficherStatutOuverture();
  initialiserChatbot();
});

/* 2. Navigation ----------------------------------------------------------- */

function initialiserNavigation() {
  const barre = document.querySelector('.navbar-pins');
  const boutonHaut = document.querySelector('.retour-haut');
  const menu = document.getElementById('menuPrincipal');

  // Ombre sous la barre et bouton « haut » selon la position de défilement
  const majSelonDefilement = () => {
    const defile = window.scrollY > 80;
    if (barre) barre.classList.toggle('navbar-reduite', defile);
    if (boutonHaut) boutonHaut.classList.toggle('visible', window.scrollY > 600);
  };
  window.addEventListener('scroll', majSelonDefilement, { passive: true });
  majSelonDefilement();

  if (boutonHaut) {
    boutonHaut.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduireAnimations ? 'auto' : 'smooth' });
    });
  }

  // Sur mobile, le menu hamburger se referme après un clic sur un lien
  if (menu && window.bootstrap) {
    menu.querySelectorAll('a').forEach((lien) => {
      lien.addEventListener('click', () => {
        if (menu.classList.contains('show')) {
          window.bootstrap.Collapse.getOrCreateInstance(menu).hide();
        }
      });
    });
  }
}

// Si le visiteur demande moins d'animations, le carrousel ne défile pas seul.
// Bootstrap ne le lance qu'à l'événement « load », après ce réglage.
function initialiserCarrousel() {
  const carrousel = document.getElementById('carrouselAccueil');
  if (carrousel && reduireAnimations) carrousel.removeAttribute('data-bs-ride');
}

/* 3. Apparition au défilement --------------------------------------------- */

function initialiserApparitions() {
  const elements = document.querySelectorAll('.apparition');
  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target); // une seule animation par élément
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach((el) => observateur.observe(el));
}

/* 4. Compteurs animés ----------------------------------------------------- */

function initialiserCompteurs() {
  const compteurs = document.querySelectorAll('[data-compteur]');
  if (compteurs.length === 0) return;

  const formater = (n) => n.toLocaleString('fr-FR');

  const animer = (el) => {
    const cible = Number(el.dataset.compteur);
    if (reduireAnimations) {
      el.textContent = formater(cible);
      return;
    }
    const duree = 1600;
    const debut = performance.now();
    const etape = (maintenant) => {
      const progression = Math.min((maintenant - debut) / duree, 1);
      const adouci = 1 - Math.pow(1 - progression, 3); // ralentit en fin de course
      el.textContent = formater(Math.round(cible * adouci));
      if (progression < 1) requestAnimationFrame(etape);
    };
    requestAnimationFrame(etape);
  };

  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        animer(entree.target);
        observateur.unobserve(entree.target);
      }
    });
  }, { threshold: 0.6 });

  compteurs.forEach((el) => observateur.observe(el));
}

/* 5. Visionneuse de la galerie -------------------------------------------- */

function initialiserGalerie() {
  const figures = document.querySelectorAll('.galerie figure');
  if (figures.length === 0 || !window.bootstrap) return;

  // Fenêtre modale Bootstrap créée une seule fois puis réutilisée
  const modale = document.createElement('div');
  modale.className = 'modal fade visionneuse';
  modale.tabIndex = -1;
  modale.setAttribute('aria-label', 'Photo agrandie');
  modale.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <div class="text-end mb-2">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
        </div>
        <img alt="">
        <p class="text-white text-center fw-bold mt-3 mb-0"></p>
      </div>
    </div>`;
  document.body.appendChild(modale);

  const image = modale.querySelector('img');
  const legende = modale.querySelector('p');
  const instance = window.bootstrap.Modal.getOrCreateInstance(modale);

  const ouvrir = (figure) => {
    const source = figure.querySelector('img');
    const texte = figure.querySelector('figcaption');
    image.src = source.src;
    image.alt = source.alt;
    legende.textContent = texte ? texte.textContent : '';
    instance.show();
  };

  figures.forEach((figure) => {
    figure.setAttribute('role', 'button');
    figure.addEventListener('click', () => ouvrir(figure));
    figure.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        ouvrir(figure);
      }
    });
  });
}

/* 6. Filtres de la page Services ------------------------------------------ */

function initialiserFiltres() {
  const boutons = document.querySelectorAll('[data-filtre]');
  const cartes = document.querySelectorAll('[data-categorie]');
  if (boutons.length === 0) return;

  boutons.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const filtre = bouton.dataset.filtre;

      boutons.forEach((b) => {
        const actif = b === bouton;
        b.classList.toggle('active', actif);
        b.setAttribute('aria-pressed', String(actif));
      });

      cartes.forEach((carte) => {
        const afficher = filtre === 'tous' || carte.dataset.categorie === filtre;
        carte.classList.toggle('d-none', !afficher);
        if (afficher) carte.classList.add('visible');
      });
    });
  });
}

/* 7. Formulaire de contact ------------------------------------------------ */

const CONTACT = {
  point_api: '/api/contact',   // fonction serveur Vercel : la clé d'envoi reste côté serveur
  erreur_reseau: 'Connexion impossible : votre message n\'est pas parti. Vérifiez votre réseau, réessayez, ou appelez le 05 58 00 12 34.',
  erreur_inconnue: 'Votre message n\'a pas pu être envoyé. Réessayez, ou appelez le 05 58 00 12 34.'
};

function initialiserFormulaireContact() {
  const formulaire = document.getElementById('formContact');
  if (!formulaire) return;

  const message = document.getElementById('message');
  const compteur = document.getElementById('compteurMessage');
  const confirmation = document.getElementById('confirmationContact');
  const zoneErreur = document.getElementById('erreurContact');
  const bouton = document.getElementById('boutonEnvoi');
  const libelleBouton = bouton.textContent;
  const motifEmail = /^[^\s@,;<>"()]+@[^\s@,;<>"()]+\.[^\s@,;<>"()]{2,}$/;

  // Compteur de caractères du message
  const majCompteur = () => {
    compteur.textContent = message.value.length + ' / ' + message.maxLength;
  };
  message.addEventListener('input', majCompteur);
  majCompteur();

  // Règles que le navigateur ne vérifie pas : un vrai domaine (il accepte « a@b »),
  // et des espaces seuls ne comptent pas comme un nom ou un message.
  const appliquerReglesSupplementaires = () => {
    const email = formulaire.email.value.trim();
    formulaire.email.setCustomValidity(email && !motifEmail.test(email) ? 'E-mail invalide' : '');
    [formulaire.nom, message].forEach((champ) => {
      const tropCourt = champ.value.length > 0 && champ.value.trim().length < champ.minLength;
      champ.setCustomValidity(tropCourt ? 'Trop court' : '');
    });
  };

  // Validation en direct : l'erreur disparaît dès que le champ est corrigé
  formulaire.addEventListener('input', appliquerReglesSupplementaires);

  // Affiche le résultat d'un envoi dans une seule zone à la fois
  const afficherResultat = (zone, texte) => {
    [confirmation, zoneErreur].forEach((z) => z.classList.toggle('d-none', z !== zone));
    zone.textContent = texte;
    zone.focus();
  };

  formulaire.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    if (bouton.disabled) return; // évite un double envoi

    appliquerReglesSupplementaires();
    formulaire.classList.add('was-validated');
    if (!formulaire.checkValidity()) {
      const premierInvalide = formulaire.querySelector(':invalid');
      if (premierInvalide) premierInvalide.focus();
      return;
    }

    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';
    const prenom = formulaire.nom.value.trim().split(/\s+/)[0];

    try {
      await envoyerFormulaire(formulaire);
      afficherResultat(confirmation, 'Merci ' + prenom + ', votre message est bien parti. Nous vous répondons sous 24 heures ouvrées.');
      formulaire.reset();
      formulaire.classList.remove('was-validated');
      majCompteur();
    } catch (erreur) {
      // Le formulaire reste rempli : le visiteur ne perd pas ce qu'il a écrit
      afficherResultat(zoneErreur, erreur.message);
    } finally {
      bouton.disabled = false;
      bouton.textContent = libelleBouton;
    }
  });
}

// Appel de la fonction serveur : le succès n'est annoncé que si l'e-mail est réellement accepté
async function envoyerFormulaire(formulaire) {
  const champs = {
    nom: formulaire.nom.value.trim(),
    email: formulaire.email.value.trim(),
    telephone: formulaire.telephone.value.trim(),
    animal: formulaire.animal.value,
    message: formulaire.message.value.trim(),
    consentement: formulaire.consentement.checked,
    confirmation_interne: formulaire.confirmation_interne.value
  };

  let reponse;
  try {
    reponse = await fetch(CONTACT.point_api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(champs)
    });
  } catch (erreurReseau) {
    throw new Error(CONTACT.erreur_reseau);
  }

  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok || donnees.envoye !== true) {
    throw new Error(donnees.erreur || CONTACT.erreur_inconnue);
  }
}

/* 8. Statut d'ouverture --------------------------------------------------- */

// Heure et jour à la clinique, quel que soit le fuseau horaire du visiteur
function heureClinique(date = new Date()) {
  const morceaux = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(date);
  const valeur = (type) => morceaux.find((m) => m.type === type).value;
  return {
    jour: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(valeur('weekday')),
    heure: Number(valeur('hour')) + Number(valeur('minute')) / 60
  };
}

function afficherStatutOuverture() {
  const badge = document.getElementById('statutOuverture');
  if (!badge) return;

  // Horaires : [jour (0 = dimanche)] => [ouverture, fermeture] en heures décimales
  const horaires = { 1: [8, 19], 2: [8, 19], 3: [8, 19], 4: [8, 19], 5: [8, 19], 6: [9, 17] };
  const { jour, heure } = heureClinique();
  const plage = horaires[jour];
  const ouvert = Boolean(plage) && heure >= plage[0] && heure < plage[1];

  badge.textContent = ouvert ? 'Ouvert en ce moment' : 'Fermé — urgences au 05 58 00 12 34';
  badge.classList.toggle('est-ouvert', ouvert);
}

/* 9. Chatbot « Sylva » ---------------------------------------------------- */

const CHATBOT = {
  point_api: '/api/chat',            // fonction serveur Vercel : la clé API reste côté serveur
  cle_stockage: 'pins-chat-historique',
  messages_max: 12,                  // historique envoyé à l'API (limite les coûts)
  longueur_max: 500,                 // caractères par question
  accueil: 'Bonjour, je suis Sylva, l\'assistante de la Clinique Vétérinaire des Pins ! 🌲 Horaires, services, tarifs, préparation d\'une visite… comment puis-je vous aider ?',
  suggestions: ['Quels sont vos horaires ?', 'Combien coûte une consultation ?', 'Soignez-vous les lapins ?', 'C\'est une urgence, que faire ?']
};

const BULLE_APPARITION_MS = 3500;
const BULLE_DISPARITION_MS = 12000;

function initialiserChatbot() {
  const elements = construireChatbot();
  let historique = chargerHistorique();
  let enAttente = false;

  // Réaffiche la conversation de la session (ou le message d'accueil)
  if (historique.length === 0) {
    ajouterMessage(elements.zone, 'assistant', CHATBOT.accueil);
  } else {
    historique.forEach((m) => ajouterMessage(elements.zone, m.role, m.texte));
    elements.suggestions.classList.add('d-none');
  }

  const ouvrir = () => {
    elements.fenetre.classList.add('ouverte');
    elements.fenetre.setAttribute('aria-hidden', 'false');
    elements.bouton.setAttribute('aria-expanded', 'true');
    elements.bulle.remove();
    elements.champ.focus();
  };

  const fermer = () => {
    elements.fenetre.classList.remove('ouverte');
    elements.fenetre.setAttribute('aria-hidden', 'true');
    elements.bouton.setAttribute('aria-expanded', 'false');
    elements.bouton.focus();
  };

  elements.bouton.addEventListener('click', () => {
    if (elements.fenetre.classList.contains('ouverte')) fermer();
    else ouvrir();
  });
  elements.fermer.addEventListener('click', fermer);
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape' && elements.fenetre.classList.contains('ouverte')) fermer();
  });
  document.querySelectorAll('[data-ouvrir-chatbot]').forEach((b) => b.addEventListener('click', ouvrir));

  // Bulle d'accueil affichée quelques secondes, puis retirée pour ne pas masquer le contenu
  setTimeout(() => elements.bulle.classList.remove('d-none'), BULLE_APPARITION_MS);
  setTimeout(() => elements.bulle.classList.add('d-none'), BULLE_DISPARITION_MS);
  elements.bulle.addEventListener('click', ouvrir);
  elements.bulle.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      ouvrir();
    }
  });

  // Envoi d'une question
  const envoyer = async (texte) => {
    const question = texte.trim().slice(0, CHATBOT.longueur_max);
    if (!question || enAttente) return;

    enAttente = true;
    elements.champ.value = '';
    elements.suggestions.classList.add('d-none');
    ajouterMessage(elements.zone, 'visiteur', question);
    historique = [...historique, { role: 'visiteur', texte: question }];

    const indicateur = ajouterIndicateurSaisie(elements.zone);
    try {
      const reponse = await interrogerAPI(historique.slice(-CHATBOT.messages_max));
      historique = [...historique, { role: 'assistant', texte: reponse }];
      ajouterMessage(elements.zone, 'assistant', reponse);
      sauverHistorique(historique);
    } catch (erreur) {
      // On retire la question sans réponse pour garder un historique cohérent
      historique = historique.slice(0, -1);
      ajouterMessage(elements.zone, 'erreur', erreur.message);
    } finally {
      indicateur.remove();
      enAttente = false;
      elements.champ.focus();
    }
  };

  elements.formulaire.addEventListener('submit', (evt) => {
    evt.preventDefault();
    envoyer(elements.champ.value);
  });
  elements.suggestions.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => envoyer(b.textContent));
  });
}

// Crée la bulle flottante et la fenêtre de discussion (présentes sur toutes les pages)
function construireChatbot() {
  const conteneur = document.createElement('div');
  conteneur.innerHTML = `
    <div class="chatbot-bulle-accueil d-none" role="button" tabindex="0">👋 Une question ? Je suis Sylva, l'assistante de la clinique.</div>
    <button class="chatbot-bouton" type="button" aria-controls="chatbotFenetre" aria-expanded="false" aria-label="Ouvrir l'assistante Sylva">
      <i class="bi bi-chat-heart-fill" aria-hidden="true"></i>
    </button>
    <section class="chatbot-fenetre" id="chatbotFenetre" aria-hidden="true" aria-label="Discussion avec Sylva">
      <header class="chatbot-entete">
        <img src="assets/img/chiot-golden.jpg" alt="" width="44" height="44">
        <div class="flex-grow-1">
          <strong>Sylva</strong><br>
          <span class="statut">Assistante de la clinique · IA</span>
        </div>
        <button type="button" class="btn-close btn-close-white" aria-label="Fermer la discussion"></button>
      </header>
      <div class="chatbot-messages" aria-live="polite"></div>
      <div class="chatbot-suggestions"></div>
      <form class="chatbot-formulaire">
        <label class="visually-hidden" for="chatbotChamp">Votre question</label>
        <input class="form-control" id="chatbotChamp" type="text" autocomplete="off" maxlength="${CHATBOT.longueur_max}" placeholder="Écrivez votre question…" required>
        <button class="btn btn-resine" type="submit" aria-label="Envoyer"><i class="bi bi-send-fill" aria-hidden="true"></i></button>
      </form>
      <p class="chatbot-mention">Sylva est une IA : elle ne remplace pas un avis vétérinaire. Urgence : 05 58 00 12 34.</p>
    </section>`;
  document.body.appendChild(conteneur);

  const suggestions = conteneur.querySelector('.chatbot-suggestions');
  CHATBOT.suggestions.forEach((texte) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = texte;
    suggestions.appendChild(bouton);
  });

  return {
    bulle: conteneur.querySelector('.chatbot-bulle-accueil'),
    bouton: conteneur.querySelector('.chatbot-bouton'),
    fenetre: conteneur.querySelector('.chatbot-fenetre'),
    fermer: conteneur.querySelector('.btn-close'),
    zone: conteneur.querySelector('.chatbot-messages'),
    suggestions,
    formulaire: conteneur.querySelector('.chatbot-formulaire'),
    champ: conteneur.querySelector('#chatbotChamp')
  };
}

// Affiche un message ; textContent empêche toute injection de HTML (XSS)
function ajouterMessage(zone, role, texte) {
  const bulle = document.createElement('div');
  bulle.className = `message message-${role}`;
  bulle.textContent = texte;
  zone.appendChild(bulle);
  zone.scrollTop = zone.scrollHeight;
  return bulle;
}

function ajouterIndicateurSaisie(zone) {
  const bulle = document.createElement('div');
  bulle.className = 'message message-assistant message-saisie';
  bulle.setAttribute('aria-label', 'Sylva écrit…');
  bulle.innerHTML = '<span></span><span></span><span></span>';
  zone.appendChild(bulle);
  zone.scrollTop = zone.scrollHeight;
  return bulle;
}

// Appel de la fonction serveur : le navigateur ne voit jamais la clé API
async function interrogerAPI(messages) {
  let reponse;
  try {
    reponse = await fetch(CHATBOT.point_api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
  } catch (erreurReseau) {
    throw new Error('Connexion impossible. Vérifiez votre réseau, ou appelez-nous au 05 58 00 12 34.');
  }

  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok || typeof donnees.reponse !== 'string') {
    throw new Error(donnees.erreur || 'Sylva est momentanément indisponible. Réessayez dans un instant ou appelez le 05 58 00 12 34.');
  }
  return donnees.reponse;
}

// Historique conservé pendant la session (le stockage peut être indisponible)
function chargerHistorique() {
  try {
    const brut = sessionStorage.getItem(CHATBOT.cle_stockage);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste.filter((m) => m && typeof m.texte === 'string') : [];
  } catch (erreur) {
    return [];
  }
}

function sauverHistorique(historique) {
  try {
    sessionStorage.setItem(CHATBOT.cle_stockage, JSON.stringify(historique.slice(-30)));
  } catch (erreur) {
    // Stockage indisponible (navigation privée) : la discussion reste en mémoire seulement
  }
}
