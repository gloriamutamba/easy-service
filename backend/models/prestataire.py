from extensions import db


class Prestataire(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nom = db.Column(db.String(255))
    metier = db.Column(db.String(128))
    ville = db.Column(db.String(128))
    zone_intervention = db.Column(db.String(255), nullable=True)
    tarif = db.Column(db.Float, default=0)
    description = db.Column(db.Text)
    note = db.Column(db.Float, default=0)
    avis_count = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    horaires = db.Column(db.String(255), nullable=True)
