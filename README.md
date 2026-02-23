# Application Météo

Application météo en temps réel utilisant l'API OpenWeatherMap.

## Installation

1. Cloner le dépôt
```bash
   git clone https://github.com/TON_USERNAME/meteo-app.git
```

2. Créer le fichier de configuration
```bash
   cp assets/js/config.example.js assets/js/config.js
```

3. Renseigner votre clé API dans `assets/js/config.js`
   - Obtenez une clé gratuite sur [openweathermap.org](https://openweathermap.org/api)

4. Ouvrir `index.html` dans un navigateur

## Structure
- `assets/js/config.example.js` → modèle de configuration (sans clé)
- `assets/js/config.js` → configuration locale (ignorée par Git)
- `assets/js/scripts.js` → logique de l'application
- `assets/css/styles.css` → styles

## Auteur
Yannick ERDMANN
```

---

## Récapitulatif du flux complet
```
Toi en local                     GitHub (public)
─────────────────                ───────────────────────
config.js         ──🚫 ignoré──▶ (absent du dépôt)
config.example.js ──✅ commité──▶ config.example.js
scripts.js        ──✅ commité──▶ scripts.js
index.html        ──✅ commité──▶ index.html
styles.css        ──✅ commité──▶ styles.css
.gitignore        ──✅ commité──▶ .gitignore
README.md         ──✅ commité──▶ README.md