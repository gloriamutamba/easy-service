from datetime import datetime
from extensions import db


class Devis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    demande_id = db.Column(db.Integer, db.ForeignKey('demande.id'), nullable=False)
    prestataire_id = db.Column(db.Integer, db.ForeignKey('prestataire.id'))
    client_id = db.Column(db.Integer, db.ForeignKey('client.id'))
    prix = db.Column(db.Float, default=0)
    date = db.Column(db.String(32))
    heure = db.Column(db.String(32))
    delai = db.Column(db.String(64))
    message = db.Column(db.Text)
    status = db.Column(db.String(64), default='en_attente')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
