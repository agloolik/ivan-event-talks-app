# BigQuery Release Explorer & Composer ⚡

Une application web moderne construite avec **Python Flask**, **Vanilla CSS** et **JavaScript** pour suivre en temps réel les notes de mise à jour de Google Cloud BigQuery, et composer facilement des publications pour Twitter (X).

---

## ✨ Fonctionnalités

*   **Extraction Automatique** : Récupère et analyse le flux RSS Atom officiel de Google Cloud BigQuery.
*   **Découpage Atomique** : Sépare les entrées quotidiennes consolidées en cartes individuelles et classifiées (*Feature*, *Issue*, *Deprecation*, *General*).
*   **Design Premium & Sombre** : Interface moderne exploitant le glassmorphism, avec des indicateurs de couleur dynamiques associés à chaque type de release.
*   **Contrôles Avancés** : Recherche textuelle instantanée en local et filtrage par onglet de catégories.
*   **Mise à jour & Cache** : Système de mise à jour à la demande avec un indicateur de chargement (skeletons), renforcé par un cache serveur de 5 minutes.
*   **Social Composer (X / Twitter)** : Modale de rédaction de tweet pré-formatée avec gestion automatique de la limite de 280 caractères (comptabilisant les URLs pour 23 caractères).

---

## 🛠️ Structure du Projet

```text
bk-releases-notes/
├── app.py                  # Serveur Flask, gestion du cache et parseur RSS (BeautifulSoup)
├── templates/
│   └── index.html          # Structure HTML5 sémantique avec la modale du Composer
├── static/
│   ├── css/
│   │   └── style.css       # Charte graphique (variables CSS, glassmorphism, responsive)
│   └── js/
│       └── main.js         # Moteur client (recherche, filtrage, modal et logique X)
├── .gitignore              # Fichiers et dossiers exclus de Git
└── README.md               # Documentation du projet
```

---

## 🚀 Installation et Démarrage

### Prérequis
*   Python 3.10+
*   Accès Internet (pour récupérer le flux RSS)

### 1. Cloner le projet et entrer dans le dossier
```bash
git clone git@github.com:agloolik/ivan-event-talks-app.git
cd ivan-event-talks-app
```

### 2. Configurer l'environnement virtuel et installer les dépendances
```bash
python3 -m venv venv
source venv/bin/activate  # Sur Windows, utilisez `venv\Scripts\activate`
pip install Flask requests beautifulsoup4
```

### 3. Lancer le serveur Flask
```bash
python app.py
```

Le serveur sera accessible sur **`http://localhost:5000`**.

---

## ⚙️ Architecture & API

### Route `/api/releases`
Retourne la liste structurée des notes de mise à jour sous format JSON.
*   **Query Parameter** : `refresh=true` (force le serveur à ignorer le cache et à interroger directement Google Cloud).

**Format de réponse type :**
```json
{
  "updates": [
    {
      "id": "up_0_0",
      "date": "June 15, 2026",
      "type": "Feature",
      "html": "<p>Use Gemini Cloud Assist to analyze SQL...</p>",
      "text": "Use Gemini Cloud Assist to analyze SQL..."
    }
  ],
  "cached_at": 1781628941,
  "is_cached": false
}
```
