# Backend Easy Services

API Flask + SQLite + JWT. Le frontend est servi automatiquement depuis `../frontend`.

**Guide complet (install, lancement, comptes démo) :** voir le [README à la racine](../README.md).

## Installer et lancer

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Ouvre http://127.0.0.1:5000/

Aucun build frontend. En production, définir `EASYSERV_JWT_SECRET` (voir README racine).

## Fichiers

- `app.py` — routes API + `python app.py`
- `extensions.py` — `db`, `jwt`
- `models/` — un fichier par modèle
- `requirements.txt` — dépendances Python
- `easyservices.db` — créée au premier lancement
