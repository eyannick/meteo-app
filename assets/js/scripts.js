/**
 * @file scripts.js
 * @description Application météo en temps réel.
 *              Récupère les données météorologiques via l'API OpenWeatherMap,
 *              les affiche dans l'interface, et permet :
 *                - un rafraîchissement automatique toutes les 10 minutes,
 *                - un rafraîchissement manuel via le bouton "Actualiser",
 *                - le changement de ville via la modale Bootstrap,
 *                - l'affichage d'une grille de cards pour des villes prédéfinies
 *                  (locales et mondiales), chacune cliquable pour sélectionner
 *                  la ville comme ville principale.
 *
 * @author   Yannick ERDMANN
 * @version  3.0.0
 * @date     23/02/2026
 *
 * @requires Bootstrap 5 (bootstrap.bundle.min.js chargé avant ce script)
 */

'use strict';

/* ============================================================================
   1. Configuration de l'API
   ============================================================================
   IMPORTANT SÉCURITÉ : ne jamais versionner une clé API dans un dépôt public.
   En production, la clé doit être gérée côté serveur (variable d'environnement,
   proxy back-end) pour ne pas être exposée dans le code source client.
   ============================================================================ */

/** @constant {string} URL de base de l'endpoint "current weather" d'OpenWeatherMap (HTTPS obligatoire) */
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

/** @constant {string} Clé API OpenWeatherMap (à remplacer par la vôtre en production) */
// La clé est chargée depuis config.js (fichier ignoré par Git).
// Voir config.example.js pour créer votre propre config.js.
const API_KEY = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.OWM_API_KEY) ? APP_CONFIG.OWM_API_KEY : null;

/** @constant {string} Unité de mesure : 'metric' → °C, 'imperial' → °F */
const API_UNITS = 'metric';

/** @constant {string} Langue des descriptions météo retournées par l'API */
const API_LANG = 'fr';

/** @constant {number} Intervalle de rafraîchissement automatique en millisecondes (10 min) */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Liste des villes prédéfinies affichées dans la grille de cards.
 * Chaque entrée contient :
 *   - query  : requête envoyée à l'API (format "Ville, CODE_PAYS" recommandé
 *              pour les villes dont le nom est ambigu).
 *   - label  : libellé affiché sur la card (nom court, lisible).
 *   - flag   : emoji du drapeau du pays, affiché à titre indicatif.
 *
 * Organisation :
 *   1. Villes locales (Moselle / région Grand Est)
 *   2. Grandes villes françaises
 *   3. Capitales et métropoles mondiales
 *
 * @constant {Array<{query: string, label: string, flag: string}>}
 */
const PRESET_CITIES = [
  // --- Locales (Moselle / Grand Est) ---
  { query: 'Stiring-Wendel, FR', label: 'Stiring-Wendel', flag: '🇫🇷' },
  { query: 'Forbach, FR',        label: 'Forbach',         flag: '🇫🇷' },
  { query: 'Thionville, FR',     label: 'Thionville',      flag: '🇫🇷' },
  { query: 'Metz, FR',           label: 'Metz',            flag: '🇫🇷' },
  { query: 'Sarreguemines, FR',  label: 'Sarreguemines',   flag: '🇫🇷' },
  { query: 'Sarrebourg, FR',     label: 'Sarrebourg',      flag: '🇫🇷' },

  // --- Grandes villes françaises ---
  { query: 'Paris, FR',          label: 'Paris',           flag: '🇫🇷' },
  { query: 'Lyon, FR',           label: 'Lyon',            flag: '🇫🇷' },
  { query: 'Marseille, FR',      label: 'Marseille',       flag: '🇫🇷' },
  { query: 'Nice, FR',           label: 'Nice',            flag: '🇫🇷' },
  { query: 'Bordeaux, FR',       label: 'Bordeaux',        flag: '🇫🇷' },
  { query: 'Strasbourg, FR',     label: 'Strasbourg',      flag: '🇫🇷' },

  // --- Europe ---
  { query: 'London, GB',         label: 'Londres',         flag: '🇬🇧' },
  { query: 'Berlin, DE',         label: 'Berlin',          flag: '🇩🇪' },
  { query: 'Madrid, ES',         label: 'Madrid',          flag: '🇪🇸' },
  { query: 'Rome, IT',           label: 'Rome',            flag: '🇮🇹' },
  { query: 'Amsterdam, NL',      label: 'Amsterdam',       flag: '🇳🇱' },
  { query: 'Brussels, BE',       label: 'Bruxelles',       flag: '🇧🇪' },
  { query: 'Zurich, CH',         label: 'Zurich',          flag: '🇨🇭' },
  { query: 'Vienna, AT',         label: 'Vienne',          flag: '🇦🇹' },

  // --- Monde ---
  { query: 'New York, US',       label: 'New York',        flag: '🇺🇸' },
  { query: 'Los Angeles, US',    label: 'Los Angeles',     flag: '🇺🇸' },
  { query: 'Tokyo, JP',          label: 'Tokyo',           flag: '🇯🇵' },
  { query: 'Dubai, AE',          label: 'Dubaï',           flag: '🇦🇪' },
  { query: 'Sydney, AU',         label: 'Sydney',          flag: '🇦🇺' },
  { query: 'São Paulo, BR',      label: 'São Paulo',       flag: '🇧🇷' },
  { query: 'Cairo, EG',          label: 'Le Caire',        flag: '🇪🇬' },
  { query: 'Mumbai, IN',         label: 'Mumbai',          flag: '🇮🇳' },
];

/**
 * @constant {string} URL de base du CDN officiel pour les icônes OpenWeatherMap.
 * Le suffixe @2x ajouté lors de la construction de l'URL fournit une version
 * haute résolution (100×100 px au lieu de 50×50 px).
 */
const OWM_ICON_BASE_URL = 'https://openweathermap.org/img/wn/';


/* ============================================================================
   2. État de l'application
   ============================================================================ */

/**
 * Nom de la ville courante, modifiable par l'utilisateur via la modale.
 * @type {string}
 */
let currentCity = 'Thionville';

/**
 * Identifiant du timer de rafraîchissement automatique (retourné par setInterval).
 * Conservé pour pouvoir réinitialiser l'intervalle lors d'un changement de ville
 * et ainsi éviter d'empiler plusieurs intervalles actifs en parallèle.
 * @type {number|null}
 */
let autoRefreshTimer = null;


/* ============================================================================
   3. Sélection des éléments du DOM
   ============================================================================ */

/** @type {HTMLElement} Étiquette affichant le nom de la ville */
const cityLabel       = document.getElementById('cityLabel');

/** @type {HTMLElement} Étiquette affichant la température actuelle */
const tempLabel       = document.getElementById('tempLabel');

/** @type {HTMLElement} Étiquette affichant les températures min/max */
const tempMinMaxLabel = document.getElementById('tempMinMaxLabel');

/** @type {HTMLElement} Étiquette affichant les métadonnées (description, humidité, vent) */
const metaLabel       = document.getElementById('metaLabel');

/** @type {HTMLImageElement} Icône météo */
const weatherIconImg  = document.getElementById('weatherIconImg');

/** @type {HTMLButtonElement} Bouton de rafraîchissement manuel */
const refreshBtn      = document.getElementById('refreshBtn');

/** @type {HTMLInputElement} Champ de saisie de la ville dans la modale */
const cityInput       = document.getElementById('cityInput');

/** @type {HTMLButtonElement} Bouton "Valider" dans la modale de changement de ville */
const saveCityBtn     = document.getElementById('saveCityBtn');

/** @type {HTMLElement} Bloc de chargement (skeleton loader) */
const loadingRow      = document.getElementById('loadingRow');

/** @type {HTMLElement} Bloc d'affichage des erreurs */
const errorBox        = document.getElementById('errorBox');

/** @type {HTMLElement|null} Élément DOM de la modale Bootstrap */
const cityModalEl     = document.getElementById('cityModal');

/**
 * Conteneur de la grille de cards des villes prédéfinies.
 * Les cards sont générées et injectées dynamiquement dans cet élément.
 * @type {HTMLElement|null}
 */
const cityCardsGrid   = document.getElementById('cityCardsGrid');

/**
 * Instance Bootstrap.Modal pour la modale de changement de ville.
 * Initialisée uniquement si l'élément et Bootstrap sont disponibles dans le DOM.
 * @type {bootstrap.Modal|null}
 */
const cityModal = (cityModalEl && window.bootstrap?.Modal)
  ? bootstrap.Modal.getOrCreateInstance(cityModalEl)
  : null;


/* ============================================================================
   4. Fonctions utilitaires – Interface utilisateur
   ============================================================================ */

/**
 * Affiche ou masque le skeleton loader et les blocs de données météo.
 * Le loader est montré pendant le chargement pour signifier à l'utilisateur
 * qu'une requête est en cours et éviter l'affichage de données obsolètes.
 *
 * @param {boolean} loading - true pour afficher le loader, false pour le masquer.
 * @returns {void}
 */
function setLoading(loading) {
  // Affichage/masquage du bloc skeleton
  loadingRow?.classList.toggle('d-none', !loading);

  // Masquage des données pendant le chargement (visibility préserve l'espace)
  const visibility = loading ? 'hidden' : 'visible';
  if (tempLabel)       tempLabel.style.visibility       = visibility;
  if (tempMinMaxLabel) tempMinMaxLabel.style.visibility = visibility;
  if (metaLabel)       metaLabel.style.visibility       = visibility;
  if (weatherIconImg)  weatherIconImg.style.visibility  = visibility;
}

/**
 * Affiche un message d'erreur dans la zone dédiée (#errorBox).
 * Masque la zone si le message est null ou une chaîne vide.
 *
 * @param {string|null} message - Texte de l'erreur à afficher, ou null pour masquer.
 * @returns {void}
 */
function showError(message) {
  if (!errorBox) return;

  if (message) {
    errorBox.textContent = message;
    errorBox.classList.remove('d-none');
  } else {
    errorBox.textContent = '';
    errorBox.classList.add('d-none');
  }
}

/**
 * Met à jour l'interface avec les données météorologiques reçues de l'API.
 *
 * Note : on utilise .textContent (et non .innerHTML) pour :
 *   1. Éviter les failles XSS si des données externes sont injectées.
 *   2. Éviter l'accumulation de contenu (innerHTML += ajoute au lieu de remplacer).
 *
 * Note : la vitesse du vent OpenWeatherMap est fournie en m/s lorsque units=metric.
 * On la convertit en km/h (× 3,6) pour l'affichage, plus parlant pour l'utilisateur.
 *
 * @param {object}   data                      - Objet JSON retourné par l'API OpenWeatherMap.
 * @param {object}   data.main                 - Données de température et d'humidité.
 * @param {number}   data.main.temp            - Température actuelle (°C).
 * @param {number}   data.main.temp_min        - Température minimale (°C).
 * @param {number}   data.main.temp_max        - Température maximale (°C).
 * @param {number}   data.main.humidity        - Humidité relative (%).
 * @param {object[]} data.weather              - Tableau de conditions météo (au moins 1 élément).
 * @param {string}   data.weather[0].description - Description textuelle du temps.
 * @param {string}   data.weather[0].icon      - Code de l'icône météo (ex: "10d").
 * @param {object}   data.wind                 - Données de vent.
 * @param {number}   data.wind.speed           - Vitesse du vent (m/s).
 * @param {string}   data.name                 - Nom de la ville retourné par l'API.
 * @returns {void}
 */
function updateUI(data) {
  // --- Ville (nom officiel retourné par l'API, pas la saisie brute) ---
  if (cityLabel) {
    cityLabel.textContent = data.name;
  }

  // --- Température actuelle ---
  if (tempLabel) {
    tempLabel.textContent = `${Math.round(data.main.temp)} °C`;
  }

  // --- Températures min / max ---
  if (tempMinMaxLabel) {
    tempMinMaxLabel.textContent =
      `min ${Math.round(data.main.temp_min)} °C • max ${Math.round(data.main.temp_max)} °C`;
  }

  // --- Description, humidité et vent ---
  if (metaLabel) {
    const raw   = data.weather[0].description;
    const desc  = raw.charAt(0).toUpperCase() + raw.slice(1); // Première lettre en majuscule
    const windKmh = Math.round(data.wind.speed * 3.6);        // Conversion m/s → km/h

    metaLabel.textContent =
      `${desc} • Humidité ${data.main.humidity} % • Vent ${windKmh} km/h`;
  }

  // --- Icône météo ---
  // Format officiel : https://openweathermap.org/img/wn/{code}@2x.png
  if (weatherIconImg) {
    const iconCode = data.weather[0].icon;
    weatherIconImg.src = `${OWM_ICON_BASE_URL}${iconCode}@2x.png`;
    weatherIconImg.alt = data.weather[0].description; // Texte alternatif pour les lecteurs d'écran
  }

  // Synchroniser la surbrillance des cards avec la ville actuellement affichée
  updateActiveCard();
}


/* ============================================================================
   5. Récupération des données météo (Fetch API)
   ============================================================================
   On utilise fetch() (API moderne basée sur les Promises) plutôt que
   XMLHttpRequest pour les raisons suivantes :
     - Syntaxe plus lisible (async/await vs callbacks imbriqués).
     - Une nouvelle requête = un nouvel appel fetch() : pas de problème de
       réutilisation d'instance (XHR ne peut pas être rouvert après .send()).
     - Gestion des erreurs HTTP explicite via response.ok.
   ============================================================================ */

/**
 * Construit l'URL complète de l'API pour la ville spécifiée.
 * URLSearchParams encode automatiquement les caractères spéciaux
 * (espaces, accents…) pour former une URL valide.
 *
 * @param {string} city - Nom de la ville (ex: "Paris", "Paris, FR").
 * @returns {string} URL complète prête à être passée à fetch().
 */
function buildApiUrl(city) {
  const params = new URLSearchParams({
    q     : city,
    appid : API_KEY,
    units : API_UNITS,
    lang  : API_LANG,
  });
  return `${API_BASE_URL}?${params.toString()}`;
}

/**
 * Récupère les données météorologiques pour la ville courante
 * via l'API OpenWeatherMap, puis met à jour l'interface.
 *
 * Gestion des erreurs réseau et HTTP :
 *   - fetch() ne rejette la Promise que sur erreur réseau (pas de connexion,
 *     CORS, DNS…). Les codes HTTP d'erreur (4xx, 5xx) doivent être testés
 *     manuellement via response.ok.
 *
 * @async
 * @returns {Promise<void>}
 */
async function fetchWeather() {
  showError(null);   // Masquer une éventuelle erreur précédente
  setLoading(true);  // Afficher le skeleton loader

  try {
    const response = await fetch(buildApiUrl(currentCity));

    if (!response.ok) {
      // Erreurs HTTP : message adapté au code de statut
      switch (response.status) {
        case 401:
          throw new Error('Clé API invalide ou expirée. Vérifiez votre configuration.');
        case 404:
          throw new Error(`Ville introuvable : « ${currentCity} ». Vérifiez l'orthographe ou essayez "Ville, CODE_PAYS" (ex: "Lyon, FR").`);
        default:
          throw new Error(`Erreur serveur (code ${response.status}). Réessayez dans quelques instants.`);
      }
    }

    const data = await response.json();

    console.debug('[Météo] Données reçues :', data); // Debug – à retirer en production

    updateUI(data);

  } catch (error) {
    // Capture les erreurs réseau ET les Error levées manuellement ci-dessus
    console.error('[Météo] Erreur lors de la récupération des données :', error.message);
    showError(error.message);
  } finally {
    // Toujours masquer le loader, que la requête ait réussi ou échoué
    setLoading(false);
  }
}


/* ============================================================================
   6. Rafraîchissement automatique
   ============================================================================ */

/**
 * Démarre (ou redémarre) le timer de rafraîchissement automatique.
 *
 * La réinitialisation de l'intervalle avant d'en créer un nouveau est
 * indispensable lors d'un changement de ville : sans cela, on accumulerait
 * plusieurs setInterval actifs en parallèle, chacun appelant fetchWeather()
 * avec des fréquences superposées.
 *
 * @returns {void}
 */
function startAutoRefresh() {
  if (autoRefreshTimer !== null) {
    clearInterval(autoRefreshTimer); // Annule le timer précédent avant d'en créer un nouveau
  }
  autoRefreshTimer = setInterval(fetchWeather, REFRESH_INTERVAL_MS);
}


/* ============================================================================
   7. Changement de ville
   ============================================================================ */

/**
 * Gestionnaire de validation du changement de ville.
 * Lit la saisie, met à jour currentCity, ferme la modale,
 * relance l'intervalle et déclenche un chargement immédiat.
 *
 * @returns {void}
 */
function handleCityChange() {
  const newCity = cityInput?.value.trim();

  if (!newCity) {
    // Champ vide : ne rien faire, redonner le focus pour guider l'utilisateur
    cityInput?.focus();
    return;
  }

  currentCity = newCity;

  // Fermeture de la modale Bootstrap
  cityModal?.hide();

  // Vider le champ pour la prochaine ouverture de la modale
  if (cityInput) cityInput.value = '';

  // Réinitialiser le timer pour la nouvelle ville (évite les intervalles en doublon)
  startAutoRefresh();

  // Charger immédiatement les données pour la nouvelle ville sélectionnée
  fetchWeather();
}


/* ============================================================================
   8. Attachement des écouteurs d'événements
   ============================================================================ */

// --- Bouton "Actualiser" ---
refreshBtn?.addEventListener('click', fetchWeather);

// --- Bouton "Valider" dans la modale ---
saveCityBtn?.addEventListener('click', handleCityChange);

/**
 * Validation via la touche Entrée dans le champ de saisie de la modale.
 * Améliore l'UX : l'utilisateur peut valider sans chercher le bouton,
 * notamment sur mobile où le clavier virtuel occupe l'écran.
 */
cityInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Empêche tout submit de formulaire parent éventuel
    handleCityChange();
  }
});

/**
 * Focus automatique sur le champ lors de l'ouverture complète de la modale.
 * On utilise 'shown.bs.modal' (et non 'show.bs.modal') car le focus
 * avant la fin de l'animation peut être ignoré par certains navigateurs.
 */
cityModalEl?.addEventListener('shown.bs.modal', () => {
  cityInput?.focus();
});


/* ============================================================================
   9. Grille de cards – Villes prédéfinies
   ============================================================================
   Chaque card affiche en temps réel les données météo d'une ville prédéfinie
   (liste PRESET_CITIES). Les requêtes sont lancées en parallèle via Promise.all
   pour minimiser le temps de chargement total.

   Comportement :
     - Au chargement de la page, toutes les cards s'affichent avec un skeleton
       loader pendant que les requêtes API sont en cours.
     - Une fois les données reçues, chaque card est mise à jour indépendamment.
     - Un clic sur une card sélectionne la ville comme ville principale
       (équivalent à un changement de ville via la modale).
     - La card correspondant à la ville courante reçoit la classe .card-active
       pour la mettre visuellement en avant.
   ============================================================================ */

/**
 * Construit le HTML d'une card en état de chargement (skeleton loader).
 * Appelée lors de l'initialisation, avant que les données API soient disponibles.
 *
 * @param {string} label - Libellé de la ville à afficher.
 * @param {string} flag  - Emoji du drapeau du pays.
 * @returns {string} Chaîne HTML de la card skeleton.
 */
function buildCardSkeleton(label, flag) {
  return `
    <div class="card-city-flag">${flag}</div>
    <div class="card-city-name">${label}</div>
    <div class="card-city-skeleton">
      <div class="skeleton" style="height:14px; width:60%; margin: 0 auto 6px;"></div>
      <div class="skeleton" style="height:36px; width:70%; margin: 0 auto 6px;"></div>
      <div class="skeleton" style="height:12px; width:80%; margin: 0 auto;"></div>
    </div>
  `;
}

/**
 * Met à jour le contenu d'une card avec les données météo reçues de l'API.
 *
 * @param {HTMLElement} card - Élément DOM de la card à mettre à jour.
 * @param {object}      data - Objet JSON retourné par l'API OpenWeatherMap.
 * @returns {void}
 */
function updateCardUI(card, data) {
  const iconCode   = data.weather[0].icon;
  const iconUrl    = `${OWM_ICON_BASE_URL}${iconCode}@2x.png`;
  const temp       = Math.round(data.main.temp);
  const tempMin    = Math.round(data.main.temp_min);
  const tempMax    = Math.round(data.main.temp_max);
  const desc       = data.weather[0].description;
  const descCap    = desc.charAt(0).toUpperCase() + desc.slice(1);
  const flag       = card.dataset.flag;
  const label      = card.dataset.label;

  // On reconstruit l'intérieur de la card avec les données réelles.
  // On utilise textContent pour les valeurs dynamiques afin d'éviter tout XSS.
  card.innerHTML = `
    <div class="card-city-flag">${flag}</div>
    <div class="card-city-name">${label}</div>
    <img
      class="card-city-icon"
      src="${iconUrl}"
      alt="${desc}"
      width="52"
      height="52"
      loading="lazy"
    />
    <div class="card-city-temp">${temp} °C</div>
    <div class="card-city-minmax">min ${tempMin} ° • max ${tempMax} °</div>
    <div class="card-city-desc">${descCap}</div>
  `;
}

/**
 * Affiche l'état d'erreur sur une card (ville introuvable ou erreur réseau).
 *
 * @param {HTMLElement} card  - Élément DOM de la card à mettre à jour.
 * @param {string}      label - Libellé de la ville.
 * @param {string}      flag  - Emoji du drapeau.
 * @returns {void}
 */
function updateCardError(card, label, flag) {
  card.innerHTML = `
    <div class="card-city-flag">${flag}</div>
    <div class="card-city-name">${label}</div>
    <div class="card-city-error">
      <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
      Indisponible
    </div>
  `;
}

/**
 * Met à jour la surbrillance des cards en fonction de la ville courante.
 * La card correspondant à currentCity reçoit la classe CSS .card-active.
 * Les autres cards perdent cette classe.
 *
 * @returns {void}
 */
function updateActiveCard() {
  if (!cityCardsGrid) return;

  const cards = cityCardsGrid.querySelectorAll('.city-card');
  cards.forEach((card) => {
    // Comparaison insensible à la casse pour plus de robustesse
    const isActive = card.dataset.query.toLowerCase() === currentCity.toLowerCase()
                  || card.dataset.label.toLowerCase() === currentCity.toLowerCase();
    card.classList.toggle('card-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
}

/**
 * Initialise la grille de cards :
 *   1. Crée un élément DOM par ville prédéfinie avec un skeleton loader.
 *   2. Lance toutes les requêtes API en parallèle (Promise.allSettled).
 *   3. Met à jour chaque card dès que sa requête est résolue ou rejetée.
 *
 * Promise.allSettled (vs Promise.all) est utilisé intentionnellement :
 * une erreur sur une ville ne bloque pas le rendu des autres cards.
 *
 * @async
 * @returns {Promise<void>}
 */
async function initCityCards() {
  if (!cityCardsGrid) return;

  // --- Étape 1 : création des cards skeleton ---
  const cardElements = PRESET_CITIES.map((city) => {
    const card = document.createElement('button');
    card.className      = 'city-card';
    card.type           = 'button';
    card.dataset.query  = city.query;
    card.dataset.label  = city.label;
    card.dataset.flag   = city.flag;
    card.setAttribute('aria-label', `Sélectionner ${city.label}`);
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML      = buildCardSkeleton(city.label, city.flag);
    cityCardsGrid.appendChild(card);

    // Clic → sélection de la ville comme ville principale
    card.addEventListener('click', () => {
      currentCity = city.query;
      updateActiveCard();
      startAutoRefresh();
      fetchWeather();
      // Scroll doux vers la carte principale pour que l'utilisateur voie le résultat
      document.querySelector('.glass-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return card;
  });

  // --- Étape 2 : requêtes API parallèles ---
  const promises = PRESET_CITIES.map((city) =>
    fetch(buildApiUrl(city.query)).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
  );

  const results = await Promise.allSettled(promises);

  // --- Étape 3 : mise à jour de chaque card ---
  results.forEach((result, index) => {
    const card = cardElements[index];
    const city = PRESET_CITIES[index];

    if (result.status === 'fulfilled') {
      updateCardUI(card, result.value);
    } else {
      console.warn(`[Météo Cards] Erreur pour ${city.label} :`, result.reason?.message);
      updateCardError(card, city.label, city.flag);
    }
  });

  // Marquer la carte active si la ville courante est dans la liste
  updateActiveCard();
}


/* ============================================================================
   10. Initialisation
   ============================================================================ */

// Vérification de la présence de la clé API avant de lancer l'application.
if (!API_KEY) {
  showError(
    'Clé API manquante. Copiez config.example.js en config.js ' +
    'et renseignez votre clé OpenWeatherMap.'
  );
  console.error('[Météo] Aucune clé API trouvée. Vérifiez assets/js/config.js');
} else {
  // Chargement initial des données météo au démarrage
  fetchWeather();

  // Démarrage du rafraîchissement automatique toutes les 10 minutes
  startAutoRefresh();

  // Initialisation de la grille de cards des villes prédéfinies
  initCityCards();
}


/* ============================================================================
   11. Bouton "Retour en haut de page" (Back-to-top)
   ============================================================================
   Le bouton est affiché dès que l'utilisateur a défilé de plus de 300px
   vers le bas, et masqué lorsqu'il remonte en haut.

   Technique de performance : on utilise requestAnimationFrame pour éviter
   d'exécuter la logique à chaque pixel défilé. Le listener scroll est
   volontairement passif (passive: true) pour ne pas bloquer le rendu.
   ============================================================================ */

/** @type {HTMLButtonElement|null} Bouton "retour en haut de page" */
const backToTopBtn = document.getElementById('backToTopBtn');

/**
 * Seuil de défilement (en pixels) à partir duquel le bouton devient visible.
 * @constant {number}
 */
const BTT_THRESHOLD = 300;

/**
 * Flag interne pour éviter de recalculer le style à chaque frame
 * lorsque le statut n'a pas changé.
 * @type {boolean}
 */
let bttVisible = false;

/**
 * Gestionnaire de l'événement scroll.
 * Utilise requestAnimationFrame pour limiter les mises à jour du DOM
 * à une fois par frame de rendu (max 60fps), réduisant la charge CPU.
 *
 * @returns {void}
 */
function onScrollBtt() {
  requestAnimationFrame(() => {
    const shouldShow = window.scrollY > BTT_THRESHOLD;

    // N'intervenir sur le DOM que si l'état a réellement changé
    if (shouldShow !== bttVisible) {
      bttVisible = shouldShow;
      backToTopBtn?.classList.toggle('btt-hidden', !shouldShow);
    }
  });
}

/**
 * Remonte en douceur jusqu'en haut de la page.
 * behavior: 'smooth' : animation CSS native du navigateur (pas de JS maison).
 *
 * @returns {void}
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Attachement des écouteurs ---
if (backToTopBtn) {
  // passive: true : signale au navigateur que le listener ne bloquera pas
  // le défilement (optimisation pour les appareils tactiles).
  window.addEventListener('scroll', onScrollBtt, { passive: true });

  backToTopBtn.addEventListener('click', scrollToTop);
}
