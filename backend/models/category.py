from extensions import db


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True)
    icon = db.Column(db.String(64))
    count = db.Column(db.Integer, default=0)
