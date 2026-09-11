from datetime import datetime
from extensions import db


class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    sujet = db.Column(db.String(64))
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
