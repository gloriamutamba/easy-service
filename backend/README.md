Backend Flask + SQLite for Easy Services

Prerequisites
- Python 3.9+ (3.10 recommended)

Install

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate    # Windows PowerShell
pip install -r requirements.txt
```

Run

```bash
# from backend folder
# development server
python app.py
# or
set FLASK_APP=app.py
flask run
```

API Endpoints (examples)
- POST /api/register  { email, password, type, name }
- POST /api/login     { email, password }
- GET  /api/me        (requires Authorization: Bearer <token>)
- GET  /api/prestataires
- GET  /api/demandes
- POST /api/demandes  { client_id, prestataire_id, description }
- POST /api/devis     (requires JWT for prestataire)
- GET/POST /api/messages

Notes
- JWT secret is read from `EASYSERV_JWT_SECRET` env var or default dev key in `app.py` (change for production).
- The backend seeds demo data on first run (users, prestataires, client, demande, devis, messages, categories).
