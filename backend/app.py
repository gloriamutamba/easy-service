import os
from datetime import datetime, timedelta
try:
    from flask import Flask, request, jsonify, send_from_directory
    from werkzeug.security import generate_password_hash, check_password_hash
    from werkzeug.utils import secure_filename
    from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
    from sqlalchemy import text, or_, and_
    from flask_cors import CORS
    from extensions import db, jwt
    from models import (
        User, Client, Prestataire, Demande, Devis, Message,
        Category, Photo, TokenBlocklist,
    )
except Exception as e:
    print('Missing Python packages. Please install requirements from backend/requirements.txt')
    raise

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'easyservices.db')

FRONT_DIR = os.path.join(BASE_DIR, '..', 'front')
app = Flask(__name__, static_folder=FRONT_DIR, static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('EASYSERV_JWT_SECRET', 'dev-secret-change-me')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
app.config['JWT_ACCESS_COOKIE_NAME'] = 'es_token'
app.config['JWT_COOKIE_SECURE'] = False

CORS(app)
db.init_app(app)
jwt.init_app(app)

UPLOAD_DIR = os.path.join(BASE_DIR, '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB per file

# Utilities
def user_to_dict(u):
    return {'id': u.id, 'email': u.email, 'type': u.type, 'name': u.name}


def current_user_id():
    uid = get_jwt_identity()
    try:
        return int(uid)
    except (TypeError, ValueError):
        return uid


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload.get('jti')
    if not jti:
        return True
    return TokenBlocklist.query.filter_by(jti=jti).first() is not None

# Seed demo data
def seed_demo():
    if User.query.first():
        return
    # users
    admin = User(email='admin@easyservices.cd', password_hash=generate_password_hash('admin123'), type='admin', name='Administrateur')
    u1 = User(email='jean@email.com', password_hash=generate_password_hash('123456'), type='prestataire', name='Jean Kabongo')
    u2 = User(email='marie@email.com', password_hash=generate_password_hash('123456'), type='prestataire', name='Marie Tshibangu')
    u3 = User(email='paul@email.com', password_hash=generate_password_hash('123456'), type='prestataire', name='Paul Mbuyi')
    u7 = User(email='alice@email.com', password_hash=generate_password_hash('123456'), type='client', name='Alice Mukendi')
    db.session.add_all([admin,u1,u2,u3,u7])
    db.session.commit()
    # prestataires
    p1 = Prestataire(user_id=u1.id, nom='Jean Kabongo', metier='Plombier', ville='Lushi', tarif=25, description='Plombier expérimenté.', note=4.8, avis_count=12, active=True)
    p2 = Prestataire(user_id=u2.id, nom='Marie Tshibangu', metier='Électricien', ville='Lubumbashi', tarif=30, description='Électricienne certifiée.', note=4.9, avis_count=8, active=True)
    p3 = Prestataire(user_id=u3.id, nom='Paul Mbuyi', metier='Mécanicien', ville='Kolwezi', tarif=20, description='Mécanicien toutes marques.', note=4.5, avis_count=15, active=True)
    db.session.add_all([p1,p2,p3])
    db.session.commit()
    # clients
    c1 = Client(user_id=u7.id, nom='Alice Mukendi', email=u7.email, phone='+243901234567', ville='Lushi')
    db.session.add(c1)
    db.session.commit()
    # demandes & devis & messages
    d1 = Demande(client_id=c1.id, prestataire_id=p1.id, description='Fuite sous évier', adresse='Av. Lumumba, Lushi', date='2026-08-10', heure='09:00', budget=50, status='devis_envoye')
    db.session.add(d1)
    db.session.commit()
    dv = Devis(demande_id=d1.id, prestataire_id=p1.id, client_id=c1.id, prix=35, date='2026-08-10', heure='09:00', delai='1 heure', message='Je peux intervenir demain.', status='en_attente')
    db.session.add(dv)
    msg = Message(sender_id=c1.id, receiver_id=p1.id, content='Bonjour, êtes-vous disponible ?')
    db.session.add(msg)
    db.session.commit()
    # categories
    cats = [Category(name='Plombier', icon='fa-faucet', count=1), Category(name='Électricien', icon='fa-bolt', count=1), Category(name='Mécanicien', icon='fa-car', count=1), Category(name='Menuisier', icon='fa-hammer', count=0), Category(name='Informaticien', icon='fa-laptop-code', count=0)]
    db.session.add_all(cats)
    db.session.commit()

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    utype = data.get('type', 'client')
    name = data.get('name', '')
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'email exists'}), 400
    user = User(email=email, password_hash=generate_password_hash(password), type=utype, name=name)
    db.session.add(user)
    db.session.commit()
    if utype == 'client':
        client = Client(user_id=user.id, nom=name, email=email, phone=data.get('phone',''), ville=data.get('ville',''))
        db.session.add(client)
    else:
        presta = Prestataire(user_id=user.id, nom=name, metier=data.get('metier',''), ville=data.get('ville',''), active=True)
        db.session.add(presta)
    db.session.commit()
    return jsonify({'ok': True, 'user': user_to_dict(user)}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'invalid credentials'}), 401
    # if prestataire ensure active
    if user.type == 'prestataire':
        presta = Prestataire.query.filter_by(user_id=user.id).first()
        if not presta or not presta.active:
            return jsonify({'error': 'prestation account inactive'}), 403
    access = create_access_token(identity=str(user.id), additional_claims={'type': user.type})
    return jsonify({'access_token': access, 'user': user_to_dict(user)})


@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    j = get_jwt()
    jti = j.get('jti')
    if jti:
        tb = TokenBlocklist(jti=jti)
        db.session.add(tb)
        db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/me')
@jwt_required()
def me():
    uid = current_user_id()
    user = User.query.get(uid)
    if not user:
        return jsonify({'error': 'not found'}), 404
    return jsonify({'user': user_to_dict(user)})


@app.route('/api/stats')
def public_stats():
    return jsonify({
        'prestataires': Prestataire.query.filter_by(active=True).count(),
        'clients': Client.query.count(),
        'missions': Demande.query.filter_by(status='terminee').count()
    })


@app.route('/api/client/me', methods=['GET', 'PUT'])
@jwt_required()
def client_me():
    uid = current_user_id()
    client = Client.query.filter_by(user_id=uid).first()
    user = User.query.get(uid)
    if not client:
        return jsonify({'error': 'client not found'}), 404
    if request.method == 'GET':
        return jsonify({
            'id': client.id,
            'user_id': client.user_id,
            'nom': client.nom,
            'email': client.email or (user.email if user else ''),
            'phone': client.phone,
            'ville': client.ville
        })
    data = request.get_json() or {}
    client.nom = data.get('nom', client.nom)
    client.email = data.get('email', client.email)
    client.phone = data.get('phone', client.phone)
    client.ville = data.get('ville', client.ville)
    if user:
        if data.get('nom'):
            user.name = data.get('nom')
        if data.get('email'):
            user.email = data.get('email')
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/prestataires')
def list_prestataires():
    prestas = Prestataire.query.filter_by(active=True).all()
    out = []
    for p in prestas:
        out.append({'id': p.id, 'user_id': p.user_id, 'nom': p.nom, 'metier': p.metier, 'ville': p.ville, 'tarif': p.tarif, 'description': p.description, 'note': p.note, 'active': p.active})
    return jsonify(out)

@app.route('/api/clients')
def list_clients():
    clients = Client.query.all()
    return jsonify([{'id':c.id,'nom':c.nom,'email':c.email,'phone':c.phone,'ville':c.ville} for c in clients])

def devis_to_dict(v):
    return {
        'id': v.id,
        'demande_id': v.demande_id,
        'prestataire_id': v.prestataire_id,
        'client_id': v.client_id,
        'prix': v.prix,
        'date': v.date,
        'heure': v.heure,
        'delai': v.delai,
        'message': v.message,
        'status': v.status,
        'created_at': v.created_at.isoformat() if v.created_at else ''
    }


def demande_to_dict(d):
    client = Client.query.get(d.client_id)
    presta = Prestataire.query.get(d.prestataire_id) if d.prestataire_id else None
    devis = Devis.query.filter_by(demande_id=d.id).order_by(Devis.created_at.desc()).all()
    return {
        'id': d.id,
        'client_id': d.client_id,
        'prestataire_id': d.prestataire_id,
        'description': d.description,
        'adresse': d.adresse,
        'date': d.date,
        'heure': d.heure,
        'budget': d.budget,
        'status': d.status,
        'created_at': d.created_at.isoformat() if d.created_at else '',
        'client_nom': client.nom if client else '',
        'client_user_id': client.user_id if client else None,
        'prestataire_nom': presta.nom if presta else '',
        'prestataire_user_id': presta.user_id if presta else None,
        'devis': [devis_to_dict(v) for v in devis]
    }


def add_message(sender_id, receiver_id, content):
    if not sender_id or not receiver_id or not content:
        return
    db.session.add(Message(sender_id=int(sender_id), receiver_id=int(receiver_id), content=content))


@app.route('/api/demandes', methods=['GET','POST'])
def demandes_route():
    if request.method == 'GET':
        ds = Demande.query.order_by(Demande.created_at.desc()).all()
        return jsonify([demande_to_dict(d) for d in ds])
    data = request.get_json() or {}
    client_id = data.get('client_id')
    if not client_id:
        return jsonify({'error':'client_id required'}),400
    try:
        client_id = int(client_id)
        presta_id = int(data.get('prestataire_id')) if data.get('prestataire_id') else None
    except (TypeError, ValueError):
        return jsonify({'error': 'invalid ids'}), 400
    d = Demande(client_id=client_id, prestataire_id=presta_id, description=data.get('description',''), adresse=data.get('adresse',''), date=data.get('date',''), heure=data.get('heure',''), budget=data.get('budget',0), status='en_attente')
    db.session.add(d)
    db.session.commit()
    client = Client.query.get(client_id)
    presta = Prestataire.query.get(presta_id) if presta_id else None
    if client and presta:
        add_message(client.user_id, presta.user_id, f"Nouvelle demande : {d.description}")
        db.session.commit()
    return jsonify({'ok':True,'id':d.id}),201

@app.route('/api/devis', methods=['GET', 'POST'])
@jwt_required()
def devis_route():
    uid = current_user_id()
    user = User.query.get(uid)
    if request.method == 'GET':
        if user and user.type == 'prestataire':
            presta = Prestataire.query.filter_by(user_id=uid).first()
            qs = Devis.query.filter_by(prestataire_id=presta.id).order_by(Devis.created_at.desc()).all() if presta else []
        elif user and user.type == 'client':
            client = Client.query.filter_by(user_id=uid).first()
            qs = Devis.query.filter_by(client_id=client.id).order_by(Devis.created_at.desc()).all() if client else []
        else:
            qs = []
        return jsonify([devis_to_dict(v) for v in qs])

    if not user or user.type != 'prestataire':
        return jsonify({'error':'not prestataire'}),403
    data = request.get_json() or {}
    try:
        demande_id = int(data.get('demande_id'))
    except (TypeError, ValueError):
        return jsonify({'error':'demande not found'}),404
    presta = Prestataire.query.filter_by(user_id=uid).first()
    if not presta:
        return jsonify({'error':'not prestataire'}),403
    dem = Demande.query.get(demande_id)
    if not dem:
        return jsonify({'error':'demande not found'}),404
    dv = Devis(demande_id=demande_id, prestataire_id=presta.id, client_id=dem.client_id, prix=data.get('prix',0), date=data.get('date',''), heure=data.get('heure',''), delai=data.get('delai',''), message=data.get('message',''), status='en_attente')
    db.session.add(dv)
    dem.status = 'devis_envoye'
    client = Client.query.get(dem.client_id)
    if client:
        recap = f"Devis envoyé : {dv.prix} $ pour « {dem.description} »"
        if dv.message:
            recap += f" — {dv.message}"
        add_message(presta.user_id, client.user_id, recap)
    db.session.commit()
    return jsonify({'ok':True,'id':dv.id}),201


@app.route('/api/devis/<int:devis_id>/repondre', methods=['POST'])
@jwt_required()
def repondre_devis(devis_id):
    uid = current_user_id()
    client = Client.query.filter_by(user_id=uid).first()
    if not client:
        return jsonify({'error': 'forbidden'}), 403
    dv = Devis.query.get(devis_id)
    if not dv or dv.client_id != client.id:
        return jsonify({'error': 'not found'}), 404
    action = (request.get_json() or {}).get('action')
    presta = Prestataire.query.get(dv.prestataire_id)
    dem = Demande.query.get(dv.demande_id)
    if action == 'accepter':
        dv.status = 'accepte'
        if dem:
            dem.status = 'acceptee'
        if presta:
            add_message(client.user_id, presta.user_id, f"Le client a accepté le devis de {dv.prix} $.")
    elif action == 'refuser':
        dv.status = 'refuse'
        if dem:
            dem.status = 'refusee'
        if presta:
            add_message(client.user_id, presta.user_id, f"Le client a refusé le devis de {dv.prix} $.")
    else:
        return jsonify({'error': 'action invalide'}), 400
    db.session.commit()
    return jsonify({'ok': True})


@app.route('/api/conversations')
@jwt_required()
def conversations():
    uid = current_user_id()
    ms = Message.query.filter(or_(Message.sender_id == uid, Message.receiver_id == uid)).order_by(Message.timestamp.desc()).all()
    seen = {}
    for m in ms:
        other = m.receiver_id if m.sender_id == uid else m.sender_id
        if other in seen:
            continue
        other_user = User.query.get(other)
        seen[other] = {
            'partner_id': other,
            'partner_name': (other_user.name if other_user else None) or 'Utilisateur',
            'partner_type': other_user.type if other_user else '',
            'last_message': m.content,
            'last_at': m.timestamp.isoformat() if m.timestamp else ''
        }
    return jsonify(list(seen.values()))


@app.route('/api/messages', methods=['GET','POST'])
@jwt_required()
def messages_route():
    uid = current_user_id()
    if request.method == 'GET':
        other = request.args.get('with')
        if other:
            try:
                oid = int(other)
            except (TypeError, ValueError):
                return jsonify([])
            ms = Message.query.filter(
                or_(
                    and_(Message.sender_id == uid, Message.receiver_id == oid),
                    and_(Message.sender_id == oid, Message.receiver_id == uid)
                )
            ).order_by(Message.timestamp.asc()).all()
        else:
            ms = Message.query.filter(or_(Message.sender_id == uid, Message.receiver_id == uid)).order_by(Message.timestamp.asc()).all()
        return jsonify([{'id':m.id,'sender_id':m.sender_id,'receiver_id':m.receiver_id,'content':m.content,'timestamp':m.timestamp.isoformat() if m.timestamp else ''} for m in ms])
    data = request.get_json() or {}
    try:
        receiver_id = int(data.get('receiver_id'))
    except (TypeError, ValueError):
        return jsonify({'error': 'receiver_id required'}), 400
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': 'content required'}), 400
    if receiver_id == uid:
        return jsonify({'error': 'invalid receiver'}), 400
    m = Message(sender_id=uid, receiver_id=receiver_id, content=content)
    db.session.add(m)
    db.session.commit()
    return jsonify({'ok':True,'id':m.id,'timestamp': m.timestamp.isoformat() if m.timestamp else ''}),201

@app.route('/api/categories')
def get_categories():
    cats = Category.query.all()
    return jsonify([{'id':c.id,'name':c.name,'icon':c.icon,'count':c.count} for c in cats])


@app.route('/api/categories', methods=['POST'])
@jwt_required()
def create_category():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user or user.type != 'admin':
        return jsonify({'error': 'forbidden'}), 403
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name required'}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({'error': 'exists'}), 400
    c = Category(name=name, icon=data.get('icon','fa-circle'))
    db.session.add(c)
    db.session.commit()
    return jsonify({'ok': True, 'id': c.id}), 201


@app.route('/api/categories/<int:cat_id>', methods=['DELETE'])
@jwt_required()
def delete_category(cat_id):
    uid = get_jwt_identity(); user = User.query.get(uid)
    if not user or user.type != 'admin':
        return jsonify({'error': 'forbidden'}), 403
    c = Category.query.get(cat_id)
    if not c:
        return jsonify({'error':'not found'}), 404
    db.session.delete(c)
    db.session.commit()
    return jsonify({'ok': True})


def is_admin_user(uid):
    try:
        uid = int(uid)
    except (TypeError, ValueError):
        pass
    u = User.query.get(uid)
    return u and u.type == 'admin'


@app.route('/api/admin/stats')
@jwt_required()
def admin_stats():
    uid = get_jwt_identity()
    if not is_admin_user(uid):
        return jsonify({'error':'forbidden'}), 403
    total_clients = Client.query.count()
    total_prestas = Prestataire.query.count()
    total_demandes = Demande.query.count()
    terminees = Demande.query.filter_by(status='terminee').count()
    return jsonify({'clients': total_clients, 'prestataires': total_prestas, 'demandes': total_demandes, 'terminees': terminees})


@app.route('/api/admin/users')
@jwt_required()
def admin_users():
    uid = get_jwt_identity()
    if not is_admin_user(uid):
        return jsonify({'error':'forbidden'}), 403
    users = User.query.all()
    out = [{'id':u.id,'email':u.email,'type':u.type,'name':u.name,'created_at':u.created_at.isoformat()} for u in users]
    return jsonify(out)


@app.route('/api/admin/prestataires')
@jwt_required()
def admin_prestataires():
    uid = get_jwt_identity()
    if not is_admin_user(uid):
        return jsonify({'error':'forbidden'}), 403
    ps = Prestataire.query.all()
    out = []
    for p in ps:
        u = User.query.get(p.user_id)
        out.append({'id':p.id,'nom':p.nom,'metier':p.metier,'ville':p.ville,'note':p.note,'active':p.active,'user_email': u.email if u else ''})
    return jsonify(out)


@app.route('/api/admin/demandes')
@jwt_required()
def admin_demandes():
    uid = get_jwt_identity()
    if not is_admin_user(uid):
        return jsonify({'error':'forbidden'}), 403
    ds = Demande.query.order_by(Demande.created_at.desc()).all()
    out = []
    for d in ds:
        out.append({'id':d.id,'client_id':d.client_id,'prestataire_id':d.prestataire_id,'description':d.description,'date':d.date,'heure':d.heure,'status':d.status,'created_at':d.created_at.isoformat()})
    return jsonify(out)


@app.route('/admin.html')
def admin_page():
    # Auth is enforced in the frontend via /api/me.
    # Serving index.html here hid the admin UI even for valid admins
    # (flask-jwt-extended 4.x has no verify_jwt_in_request_optional).
    return app.send_static_file('admin.html')


@app.route('/api/prestataire/me', methods=['GET','PUT'])
@jwt_required()
def prestataire_me():
    uid = get_jwt_identity()
    presta = Prestataire.query.filter_by(user_id=uid).first()
    user = User.query.get(uid)
    if not presta:
        return jsonify({'error':'prestataire not found'}), 404
    if request.method == 'GET':
        return jsonify({
            'id': presta.id,
            'user_id': presta.user_id,
            'nom': presta.nom,
            'metier': presta.metier,
            'ville': presta.ville,
            'tarif': presta.tarif,
            'description': presta.description,
            'note': presta.note,
            'active': presta.active,
            'horaires': presta.horaires or '',
            'zone_intervention': presta.zone_intervention or '',
            'email': user.email if user else '',
            'phone': getattr(presta, 'phone', '') or ''
        })
    data = request.get_json() or {}
    presta.nom = data.get('nom', presta.nom)
    presta.metier = data.get('metier', presta.metier)
    presta.ville = data.get('ville', presta.ville)
    presta.tarif = data.get('tarif', presta.tarif)
    presta.description = data.get('description', presta.description)
    # store horaires and zone_intervention if provided
    if 'horaires' in data:
        presta.horaires = data.get('horaires')
    if 'zone_intervention' in data:
        presta.zone_intervention = data.get('zone_intervention')
    # also update user name/email if provided
    if user:
        user.name = data.get('name', user.name)
        if data.get('email'):
            user.email = data.get('email')
    db.session.commit()
    return jsonify({'ok':True})


@app.route('/api/search')
def api_search():
    # query params: metier, ville
    metier = (request.args.get('metier') or '').strip()
    ville = (request.args.get('ville') or '').strip()
    query = Prestataire.query.filter_by(active=True)
    results = []
    # simple case-insensitive matching
    for p in query.all():
        keep = True
        if metier:
            if not p.metier or metier.lower() not in p.metier.lower():
                keep = False
        if ville and keep:
            # check main ville
            found = False
            if p.ville and ville.lower() in p.ville.lower():
                found = True
            # check zone_intervention list (comma-separated)
            zi = getattr(p, 'zone_intervention', None) or ''
            if not found and zi:
                zones = [z.strip().lower() for z in zi.split(',') if z.strip()]
                if any(ville.lower() == z or ville.lower() in z or z in ville.lower() for z in zones):
                    found = True
            if not found:
                keep = False
        if keep:
            # include photos
            photos = Photo.query.filter_by(prestataire_id=p.id).order_by(Photo.created_at.desc()).all()
            photos_out = [{'id':ph.id, 'url': f'/uploads/{ph.filename}'} for ph in photos]
            results.append({'id':p.id, 'user_id':p.user_id, 'nom':p.nom, 'metier':p.metier, 'ville':p.ville, 'zone_intervention': getattr(p,'zone_intervention',None), 'tarif':p.tarif, 'description':p.description, 'note':p.note, 'photos': photos_out})
    return jsonify(results)


@app.route('/api/prestataire/<int:presta_id>/photos')
def presta_photos(presta_id):
    photos = Photo.query.filter_by(prestataire_id=presta_id).order_by(Photo.created_at.desc()).all()
    out = []
    for p in photos:
        out.append({'id': p.id, 'filename': p.filename, 'url': f'/uploads/{p.filename}', 'created_at': p.created_at.isoformat()})
    return jsonify(out)


@app.route('/api/prestataire/photos', methods=['POST'])
@jwt_required()
def upload_presta_photos():
    uid = get_jwt_identity()
    presta = Prestataire.query.filter_by(user_id=uid).first()
    if not presta:
        return jsonify({'error':'not prestataire'}), 403
    if 'photos' not in request.files:
        return jsonify({'error':'no files'}), 400
    files = request.files.getlist('photos')
    saved = []
    for f in files:
        fname = f.filename or ''
        if not fname:
            continue
        ext = fname.rsplit('.',1)[-1].lower()
        if ext not in ALLOWED_EXT:
            continue
        f.seek(0, os.SEEK_END)
        size = f.tell()
        f.seek(0)
        if size > MAX_FILE_SIZE:
            continue
        safe = secure_filename(f'{int(datetime.utcnow().timestamp())}_{generate_password_hash(fname)[:10]}.{ext}')
        path = os.path.join(UPLOAD_DIR, safe)
        f.save(path)
        ph = Photo(prestataire_id=presta.id, filename=safe)
        db.session.add(ph)
        db.session.commit()
        saved.append({'id': ph.id, 'filename': ph.filename, 'url': f'/uploads/{ph.filename}'})
    if not saved:
        return jsonify({'error':'no valid files uploaded'}), 400
    return jsonify({'ok':True,'photos':saved}), 201


@app.route('/api/prestataire/photos/<int:photo_id>', methods=['DELETE'])
@jwt_required()
def delete_presta_photo(photo_id):
    uid = get_jwt_identity()
    presta = Prestataire.query.filter_by(user_id=uid).first()
    if not presta:
        return jsonify({'error':'not prestataire'}), 403
    ph = Photo.query.get(photo_id)
    if not ph or ph.prestataire_id != presta.id:
        return jsonify({'error':'not found or unauthorized'}), 404
    # delete file
    try:
        path = os.path.join(UPLOAD_DIR, ph.filename)
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass
    db.session.delete(ph)
    db.session.commit()
    return jsonify({'ok':True})


@app.route('/')
def index_root():
    return app.send_static_file('index.html')


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

# DB init
def ensure_prestataire_columns():
    try:
        with db.engine.connect() as conn:
            rows = conn.execute(text("PRAGMA table_info(prestataire);"))
            cols = [r[1] for r in rows.fetchall()]
            if 'zone_intervention' not in cols:
                conn.execute(text("ALTER TABLE prestataire ADD COLUMN zone_intervention TEXT;"))
            if 'horaires' not in cols:
                conn.execute(text("ALTER TABLE prestataire ADD COLUMN horaires TEXT;"))
    except Exception:
        pass

with app.app_context():
    db.create_all()
    ensure_prestataire_columns()
    seed_demo()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
