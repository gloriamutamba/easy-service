from datetime import datetime
from extensions import db


class Demande(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    prestataire_id = db.Column(db.Integer, db.ForeignKey('prestataire.id'))
    description = db.Column(db.Text)
    adresse = db.Column(db.String(255))
    date = db.Column(db.String(32))
    heure = db.Column(db.String(32))
    budget = db.Column(db.Float, default=0)
    status = db.Column(db.String(64), default='en_attente')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
