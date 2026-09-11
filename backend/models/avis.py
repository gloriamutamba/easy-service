from datetime import datetime
from extensions import db


class Avis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    nom = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(32), default='Visiteur')
    note = db.Column(db.Integer, nullable=False)
    commentaire = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
