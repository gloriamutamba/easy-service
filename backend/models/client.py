from extensions import db


class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nom = db.Column(db.String(255))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(64))
    ville = db.Column(db.String(128))
