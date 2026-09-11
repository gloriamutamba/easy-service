# Easy Services

Plateforme de mise en relation entre clients et prestataires (Lushi, Lubumbashi, Kolwezi).

**Stack :** Flask + SQLite + JWT côté serveur, HTML / CSS / JS côté navigateur.  
**Pas de Node, pas de React, rien à compiler** pour lancer l’app en local.

## Prérequis

- [Python 3.10+](https://www.python.org/downloads/) (3.9 minimum)
- Git
- Un navigateur

Vérifier Python :

```bash
python --version
```

Sous Windows, si `python` n’existe pas, utilise `py -3`.

## Installer

À la racine du dépôt :

```bash
cd backend
python -m venv .venv
```

Activer l’environnement :

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Puis installer les paquets :

```bash
pip install -r requirements.txt
```

Paquets principaux : Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Cors.

## Lancer l’application

Toujours depuis `backend/`, avec le venv activé :

```bash
python app.py
```

Le serveur démarre sur **http://127.0.0.1:5000/**

- Accueil : http://127.0.0.1:5000/
- Recommandés : http://127.0.0.1:5000/recommandes.html
- Contact : http://127.0.0.1:5000/contact.html
- Espace client : http://127.0.0.1:5000/client.html
- Espace prestataire : http://127.0.0.1:5000/prestataire.html
- Admin : http://127.0.0.1:5000/admin.html

Au premier lancement, SQLite crée `backend/easyservices.db` et injecte des données de démo.

### Comptes de démo

| Rôle         | Email                     | Mot de passe |
| ------------ | ------------------------- | ------------ |
| Client       | `alice@email.com`         | `123456`     |
| Prestataire  | `jean@email.com`          | `123456`     |
| Admin        | `admin@easyservices.cd`   | `admin123`   |

## Builder ?

**Rien à builder pour développer.** Le dossier `frontend/` est servi tel quel par Flask (`index.html`, `style.css`, `script.js`).

En production, tu peux seulement :

1. Changer le secret JWT :

   ```powershell
   # Windows PowerShell
   $env:EASYSERV_JWT_SECRET = "un-secret-long-et-aleatoire"
   python app.py
   ```

   ```bash
   # macOS / Linux
   export EASYSERV_JWT_SECRET="un-secret-long-et-aleatoire"
   python app.py
   ```

2. Servir avec un serveur WSGI (optionnel, pas requis en local) :

   ```bash
   pip install gunicorn
   gunicorn -w 2 -b 0.0.0.0:5000 app:app
   ```

   Sous Windows, `gunicorn` n’est pas adapté : garde `python app.py` ou utilise un WSGI Windows (Waitress).

Il n’y a **pas** de `npm install` / `npm run build`.

## Structure

```
easy-service/
├── frontend/          # pages, CSS, JS, images (servi par Flask)
├── backend/           # API Flask
│   ├── app.py         # routes + démarrage
│   ├── extensions.py  # db, jwt
│   ├── models/        # User, Client, Prestataire, Demande, …
│   ├── requirements.txt
│   └── easyservices.db   # créé au premier lancement (gitignored)
├── uploads/           # photos prestataires
└── README.md
```

## API (aperçu)

Base : `http://127.0.0.1:5000/api`

| Méthode | Chemin            | Auth JWT | Rôle |
| ------- | ----------------- | -------- | ---- |
| POST    | `/register`       | non      |      |
| POST    | `/login`          | non      |      |
| GET     | `/me`             | oui      |      |
| GET     | `/prestataires`   | non      |      |
| GET     | `/categories`     | non      |      |
| GET     | `/stats`          | non      |      |
| GET/POST| `/avis`           | non      |      |
| POST    | `/contact`        | non      |      |
| GET/POST| `/demandes`       | oui      | client / presta |
| GET/POST| `/devis`          | oui      |      |
| GET/POST| `/messages`       | oui      |      |

En-tête : `Authorization: Bearer <token>` (le token est renvoyé par `/login`).

## Dépannage

- **404 sur `/`** : lance bien `python app.py` depuis `backend/` (le dossier statique est `../frontend`).
- **`Missing Python packages`** : venv activé + `pip install -r requirements.txt`.
- **Port 5000 occupé** : ferme l’ancien `python app.py` ou change le port dans `app.py`.
- **Base « cassée »** : arrête le serveur, supprime `backend/easyservices.db`, relance : la démo est recréée.
