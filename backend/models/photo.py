from datetime import datetime
from extensions import db


class Photo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prestataire_id = db.Column(db.Integer, db.ForeignKey('prestataire.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
