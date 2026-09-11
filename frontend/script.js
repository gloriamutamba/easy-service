// EASY SERVICES - script.js (cleaned)
'use strict';

const DB = {
    get(key) {
        try { const v = localStorage.getItem('es_' + key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
    },
    set(key, value) {
        try { localStorage.setItem('es_' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
    init() {
        if (!this.get('initialized')) {
            this.set('users', []);
            this.set('clients', []);
            this.set('prestataires', []);
            this.set('demandes', []);
            this.set('devis', []);
            this.set('messages', []);
            this.set('avis', []);
            this.set('notifications', []);
            // keep a minimal local categories fallback for offline/dev
            this.set('categories', [
                { id: 1, name: 'Plombier', icon: 'fa-faucet', count: 0 },
                { id: 2, name: 'Électricien', icon: 'fa-bolt', count: 0 },
                { id: 3, name: 'Mécanicien', icon: 'fa-car', count: 0 },
                { id: 4, name: 'Menuisier', icon: 'fa-hammer', count: 0 },
                { id: 5, name: 'Informaticien', icon: 'fa-laptop-code', count: 0 }
            ]);
            this.set('currentUser', null);
            this.set('initialized', true);
            // NOTE: do NOT call seedDemoData() automatically. Keep seedDemoData available
            // as an explicit offline/dev helper only.
        }
    },
    seedDemoData() {
        const users = [
            { id: 'u1', email: 'jean@email.com', password: '123456', type: 'prestataire', name: 'Jean Kabongo' },
            { id: 'u2', email: 'marie@email.com', password: '123456', type: 'prestataire', name: 'Marie Tshibangu' },
            { id: 'u3', email: 'paul@email.com', password: '123456', type: 'prestataire', name: 'Paul Mbuyi' },
            { id: 'u7', email: 'alice@email.com', password: '123456', type: 'client', name: 'Alice Mukendi' },
            { id: 'admin', email: 'admin@easyservices.cd', password: 'admin123', type: 'admin', name: 'Administrateur' }
        ];
        const prestas = [
            { id: 'p1', userId: 'u1', nom: 'Jean Kabongo', metier: 'Plombier', ville: 'Lushi', tarif: 25, description: 'Plombier expérimenté.', note: 4.8, avisCount: 12, active: true },
            { id: 'p2', userId: 'u2', nom: 'Marie Tshibangu', metier: 'Électricien', ville: 'Lubumbashi', tarif: 30, description: 'Électricienne certifiée.', note: 4.9, avisCount: 8, active: true },
            { id: 'p3', userId: 'u3', nom: 'Paul Mbuyi', metier: 'Mécanicien', ville: 'Kolwezi', tarif: 20, description: 'Mécanicien toutes marques.', note: 4.5, avisCount: 15, active: true }
        ];
        const clients = [
            { id: 'c1', userId: 'u7', nom: 'Alice Mukendi', email: 'alice@email.com', phone: '+243 90 123 4567', ville: 'Lushi' }
        ];
        const demandes = [
            { id: 'd1', clientId: 'c1', prestataireId: 'p1', description: 'Fuite sous évier', adresse: 'Av. Lumumba, Lushi', date: '2026-08-10', heure: '09:00', budget: 50, status: 'devis_envoye', createdAt: '2026-08-07T10:00:00' }
        ];
        const devis = [{ id: 'v1', demandeId: 'd1', prestataireId: 'p1', clientId: 'c1', prix: 35, date: '2026-08-10', heure: '09:00', delai: '1 heure', message: 'Je peux intervenir demain.', status: 'en_attente', createdAt: '2026-08-07T11:00:00' }];
        const messages = [{ id: 'm1', senderId: 'c1', receiverId: 'p1', content: 'Bonjour, êtes-vous disponible ?', timestamp: '2026-08-07T10:30:00', read: true }];
        const avis = [{ id: 'a1', clientId: 'c1', prestataireId: 'p3', note: 5, commentaire: 'Excellent service.', date: '2026-08-06' }];
        const notifs = [{ id: 'n1', userId: 'u1', type: 'demande', message: 'Nouvelle demande', read: false, date: '2026-08-07T10:00:00' }];

        this.set('users', users);
        this.set('prestataires', prestas);
        this.set('clients', clients);
        this.set('demandes', demandes);
        this.set('devis', devis);
        this.set('messages', messages);
        this.set('avis', avis);
        this.set('notifications', notifs);

        // update category counts
        const cats = this.get('categories') || [];
        prestas.forEach(p => { const c = cats.find(x => x.name === p.metier); if (c) c.count++; });
        this.set('categories', cats);
    }
};

// Helpers
function el(id) { return document.getElementById(id); }
function showModal(id) { const e = el(id); if (e) e.classList.add('active'); }
function closeModal(id) { const e = el(id); if (e) e.classList.remove('active'); if (id === 'chatModal' || id === 'prestaChatModal') stopChatPoll(); }
function escapeHtml(str) { if (str === undefined || str === null) return ''; return String(str).replace(/[&<>'"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]); }
function firstPhotoUrl(p) {
    if (!p) return '';
    const photos = p.photos || [];
    if (photos.length && photos[0].url) return photos[0].url;
    return p.photo_url || p.avatar || '';
}
function avatarHtml(name, photoUrl, extraClass) {
    const initial = escapeHtml((name || '?').charAt(0).toUpperCase());
    const cls = extraClass ? ('avatar ' + extraClass) : 'avatar';
    if (photoUrl) {
        return `<div class="${cls} avatar-photo"><img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(name || '')}"></div>`;
    }
    return `<div class="${cls}">${initial}</div>`;
}
function setAvatarEl(node, name, photoUrl) {
    if (!node) return;
    node.classList.add('avatar');
    if (photoUrl) {
        node.classList.add('avatar-photo');
        node.innerHTML = `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(name || '')}">`;
    } else {
        node.classList.remove('avatar-photo');
        node.textContent = (name || '?').charAt(0).toUpperCase();
    }
}
function formatDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR'); } catch (e) { return d; } }
function formatDateTime(d) { if (!d) return ''; try { return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return d; } }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// normalize text: lowercase + remove diacritics for tolerant searches
function normalizeText(s) {
    if (!s) return '';
    try {
        return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    } catch (e) {
        return String(s).toLowerCase();
    }
}

// --- API helpers / auth storage ---
function apiBase() { return window.location.origin + '/api'; }
function apiFetch(path, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    const token = localStorage.getItem('es_token');
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (!opts.headers['Content-Type'] && opts.body) opts.headers['Content-Type'] = 'application/json';
    return fetch(apiBase() + path, opts).then(r => r.json().then(b => ({ status: r.status, body: b })).catch(() => ({ status: r.status, body: null })));
}

function setAuth(token, user) { if (token) localStorage.setItem('es_token', token); if (user) localStorage.setItem('es_currentUser', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('es_token'); localStorage.removeItem('es_currentUser'); }
function getAuth() { const t = localStorage.getItem('es_token'); const u = localStorage.getItem('es_currentUser'); return t ? { token: t, user: u ? JSON.parse(u) : null } : null; }

// Verify current user using stored JWT-derived info (server is source of truth)
function getCurrentUserVerified() {
    const auth = getAuth();
    if (!auth) return null;
    return auth.user || null;
}

function ensureAuthModals() {
    if (el('loginModal') && el('registerModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="modal" id="loginModal">
        <div class="modal-content">
            <span class="close" onclick="closeModal('loginModal')">&times;</span>
            <h2>Connexion</h2>
            <form id="loginForm" onsubmit="handleLogin(event)">
                <div class="form-group"><label>Email</label><input type="email" id="loginEmail" required placeholder="votre@email.com"></div>
                <div class="form-group"><label>Mot de passe</label><input type="password" id="loginPassword" required placeholder="••••••••"></div>
                <button type="submit" class="btn-submit">Se connecter</button>
            </form>
        </div>
    </div>
    <div class="modal" id="registerModal">
        <div class="modal-content">
            <span class="close" onclick="closeModal('registerModal')">&times;</span>
            <h2>Inscription</h2>
            <form id="registerForm" onsubmit="handleRegister(event)">
                <div class="form-row">
                    <div class="form-group"><label>Nom</label><input type="text" id="regNom" required placeholder="Dupont"></div>
                    <div class="form-group"><label>Prénom</label><input type="text" id="regPrenom" required placeholder="Jean"></div>
                </div>
                <div class="form-group"><label>Email</label><input type="email" id="regEmail" required placeholder="votre@email.com"></div>
                <div class="form-group"><label>Téléphone</label><input type="tel" id="regPhone" required placeholder="+243..."></div>
                <div class="form-group"><label>Ville / Quartier</label><input type="text" id="regVille" placeholder="Lushi, Q. Industriel"></div>
                <div class="form-group"><label>Mot de passe</label><input type="password" id="regPassword" required placeholder="••••••••"></div>
                <div class="form-group"><label>Confirmer le mot de passe</label><input type="password" id="regPasswordConfirm" required placeholder="Confirmez le mot de passe"></div>
                <div class="form-group"><label>Type de compte</label>
                    <select id="regType" required onchange="toggleRegFields()">
                        <option value="client">Client</option>
                        <option value="prestataire">Prestataire</option>
                    </select>
                </div>
                <div class="form-group hidden" id="regMetierGroup">
                    <label>Métier / Catégorie principal</label>
                    <select id="regMetier">
                        <option value="">Choisir un métier...</option>
                        <option value="Plombier">Plombier</option>
                        <option value="Électricien">Électricien</option>
                        <option value="Mécanicien">Mécanicien</option>
                        <option value="Menuisier">Menuisier</option>
                        <option value="Informaticien">Informaticien</option>
                        <option value="Coiffeur">Coiffeur</option>
                        <option value="Couturier">Couturier</option>
                    </select>
                </div>
                <button type="submit" class="btn-submit">Créer mon compte</button>
            </form>
        </div>
    </div>`;
    document.body.appendChild(wrap);
}

function ensureChatModal() {
    if (el('chatModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="modal" id="chatModal">
        <div class="modal-content modal-chat">
            <div class="chat-header">
                <div class="chat-user">
                    <div class="avatar" id="chatAvatar">P</div>
                    <div><strong id="chatName">Prestataire</strong><span class="status online">En ligne</span></div>
                </div>
                <span class="close" onclick="closeModal('chatModal')">&times;</span>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input">
                <input type="text" id="chatMessageInput" placeholder="Écrivez votre message..." onkeypress="if(event.key==='Enter')sendMessage()">
                <button type="button" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(wrap);
}

function ensureDemandeModal() {
    if (el('demandeModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="modal" id="demandeModal">
        <div class="modal-content">
            <span class="close" onclick="closeModal('demandeModal')">&times;</span>
            <h2>Nouvelle demande</h2>
            <form id="demandeForm" onsubmit="submitDemande(event)">
                <input type="hidden" id="demandePrestataireId">
                <div class="form-group"><label>Prestataire</label><input type="text" id="demandePrestataireNom" readonly></div>
                <div class="form-group"><label>Description du besoin</label><textarea id="demandeDescription" rows="4" required placeholder="Décrivez votre problème..."></textarea></div>
                <div class="form-group"><label>Adresse d'intervention</label><input type="text" id="demandeAdresse" required placeholder="Votre adresse complète"></div>
                <div class="form-row">
                    <div class="form-group"><label>Date souhaitée</label><input type="date" id="demandeDate" required></div>
                    <div class="form-group"><label>Heure souhaitée</label><input type="time" id="demandeHeure"></div>
                </div>
                <div class="form-group"><label>Budget estimé (USD)</label><input type="number" id="demandeBudget" placeholder="Ex: 50" min="0"></div>
                <button type="submit" class="btn-submit">Envoyer la demande</button>
            </form>
        </div>
    </div>`;
    document.body.appendChild(wrap);
}

function ensurePrestataireModal() {
    if (el('prestataireModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="modal" id="prestataireModal">
        <div class="modal-content modal-large">
            <span class="close" onclick="closeModal('prestataireModal')">&times;</span>
            <div id="prestataireDetail"></div>
        </div>
    </div>`;
    document.body.appendChild(wrap);
}

function showAuthRequired(message) {
    const msg = message || 'Vous devez être connecté pour effectuer cette action.';
    const goLogin = confirm(msg + '\n\nOK = Se connecter   |   Annuler = Créer un compte');
    ensureAuthModals();
    if (goLogin) showModal('loginModal');
    else showModal('registerModal');
}

// Auth & registration
function toggleRegFields() {
    const t = el('regType'); const mg = el('regMetierGroup'); const vg = el('regVilleGroup'); if (!t) return; if (t.value === 'prestataire') { if (mg) mg.classList.remove('hidden'); if (vg) vg.classList.remove('hidden'); } else { if (mg) mg.classList.add('hidden'); if (vg) vg.classList.add('hidden'); }
}

function handleRegister(e) {
    if (e) e.preventDefault();
    const prenom = (el('regPrenom') || {}).value || '';
    const nom = (el('regNom') || {}).value || '';
    const name = prenom || nom ? (prenom + ' ' + nom).trim() : (el('regName') ? el('regName').value : '');
    const email = (el('regEmail') || {}).value || '';
    const phone = (el('regPhone') || {}).value || '';
    const password = (el('regPassword') || {}).value || '';
    const passwordConfirm = (el('regPasswordConfirm') || {}).value || '';
    const type = (el('regType') || {}).value || 'client';

    if (!email) { alert('Email requis.'); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) { alert('Email invalide.'); return; }
    if (!password || password.length < 6) { alert('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (password !== passwordConfirm) { alert('Les mots de passe ne correspondent pas.'); return; }

    // call backend
    apiFetch('/register', { method: 'POST', body: JSON.stringify({ email, password, type, name, phone, ville: (el('regVille') || {}).value || '', metier: (el('regMetier') || {}).value || '' }) })
        .then(res => {
            if (res.status === 201) {
                alert('Compte créé — connectez-vous.');
                closeModal('registerModal');
                showModal('loginModal');
            } else {
                alert((res.body && res.body.error) || 'Erreur lors de la création du compte.');
            }
        }).catch(err => { console.error(err); alert('Erreur réseau.'); });
}

function handleLogin(e) {
    if (e) e.preventDefault();
    const email = (el('loginEmail') || {}).value || '';
    const password = (el('loginPassword') || {}).value || '';
    apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
        .then(res => {
            if (res.status === 200 && res.body && res.body.access_token) {
                setAuth(res.body.access_token, res.body.user);
                // also set a cookie for server-side GET protections (admin.html)
                try { document.cookie = `es_token=${res.body.access_token};path=/`; } catch (e) { /* ignore */ }
                closeModal('loginModal');
                const user = res.body.user;
                if (user.type === 'admin') window.location.replace('admin.html');
                else if (user.type === 'prestataire') window.location.replace('prestataire.html');
                else window.location.replace('client.html');
            } else {
                alert((res.body && res.body.error) || 'Erreur de connexion');
            }
        }).catch(err => { console.error(err); alert('Erreur réseau.'); });
}

async function logout() {
    try {
        const res = await apiFetch('/logout', { method: 'POST' });
        // ignore response, always clear local auth
    } catch (e) {
        // ignore
    }
    // clear cookie too
    try { document.cookie = 'es_token=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT'; } catch (e) { }
    clearAuth();
    window.location.replace('index.html');
}

function checkAuth(required) {
    const u = getCurrentUserVerified();
    if (!u) { // not logged
        showAuthRequired('Vous devez être connecté pour accéder à cette page.');
        // ensure no history back to protected page
        window.location.replace('index.html');
        return null;
    }
    if (required && u.type !== required) {
        alert(required === 'admin' ? "Cette page est réservée aux administrateurs." : `Cette page est réservée aux ${required}s.`);
        window.location.replace('index.html');
        return null;
    }
    return u;
}

// Simple front-end section routers
function deactivateSiblings(el) {
    try {
        const parent = el && el.parentNode; if (!parent) return; parent.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        el.classList.add('active');
    } catch (e) { /* ignore */ }
}

function showClientSection(section, btn) {
    if (section !== 'recherche') {
        const user = getCurrentUserVerified();
        if (!user) {
            showAuthRequired('Connectez-vous pour accéder à vos demandes, messages et profil.');
            return;
        }
        if (user.type !== 'client' && user.type !== 'admin') {
            alert('Cette partie est réservée aux clients.');
            return;
        }
    }
    const sections = document.querySelectorAll('.client-section');
    sections.forEach(s => s.classList.remove('active'));
    const id = 'section-' + section;
    const target = el(id);
    if (target) target.classList.add('active');
    if (btn) deactivateSiblings(btn);
    if (section === 'demandes') renderClientDemandes();
    if (section === 'messages') renderClientMessages();
    if (section === 'profil') fillClientProfil();
}

function showPrestataireSection(section, btn) {
    const sections = document.querySelectorAll('.prestataire-section');
    sections.forEach(s => s.classList.remove('active'));
    const id = 'presta-' + section;
    const target = el(id);
    if (target) target.classList.add('active');
    if (btn) deactivateSiblings(btn);
    if (section === 'demandes') renderPrestaDemandes();
    if (section === 'devis') renderPrestaDevis();
    if (section === 'messages') renderPrestaMessages();
}

function showAdminSection(section, btn) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(s => s.classList.remove('active'));
    const id = 'admin-' + section;
    const target = el(id);
    if (target) target.classList.add('active');
    if (btn) deactivateSiblings(btn);
    // refresh admin views
    if (section === 'dashboard') renderAdminDashboard();
    if (section === 'clients') renderAdminClients();
    if (section === 'prestataires') renderAdminPrestataires();
    if (section === 'demandes') renderAdminDemandes();
    if (section === 'categories') renderAdminCategories();
    if (section === 'avis') renderAdminAvis();
}

// Index page
async function initIndex() {
    bindAssistantComposer();
    bindAvisStars();
    // show loading states
    const catsContainer = el('categoriesGrid');
    if (catsContainer) catsContainer.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Chargement...</p>';
    const topGrid = el('topPrestatairesGrid');
    if (topGrid) topGrid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Chargement...</p>';

    // fetch from API, fallback to local DB on error
    try {
        const [catsRes, prestasRes] = await Promise.allSettled([
            apiFetch('/categories', { method: 'GET' }),
            apiFetch('/prestataires', { method: 'GET' })
        ]);

        let cats = [];
        if (catsRes.status === 'fulfilled' && catsRes.value && catsRes.value.status === 200 && Array.isArray(catsRes.value.body)) {
            cats = catsRes.value.body;
            DB.set('categories', cats);
        } else {
            cats = DB.get('categories') || [];
        }

        let prestas = [];
        if (prestasRes.status === 'fulfilled' && prestasRes.value && prestasRes.value.status === 200 && Array.isArray(prestasRes.value.body)) {
            prestas = prestasRes.value.body;
            // store minimal local copy for offline UI
            DB.set('prestataires', prestas);
        } else {
            prestas = DB.get('prestataires') || [];
        }

        // stats
        let clientCount = (DB.get('clients') || []).length;
        let missionCount = (DB.get('demandes') || []).filter(d => d.status === 'terminee').length;
        try {
            const statsRes = await apiFetch('/stats', { method: 'GET' });
            if (statsRes && statsRes.status === 200 && statsRes.body) {
                if (typeof statsRes.body.prestataires === 'number') {
                    /* prefer live list length already fetched */
                }
                if (typeof statsRes.body.clients === 'number') clientCount = statsRes.body.clients;
                if (typeof statsRes.body.missions === 'number') missionCount = statsRes.body.missions;
            }
        } catch (e) { /* keep fallbacks */ }
        if (el('statPrestataires')) el('statPrestataires').textContent = prestas.length;
        if (el('statClients')) el('statClients').textContent = clientCount;
        if (el('statMissions')) el('statMissions').textContent = missionCount;

        // categories render
        if (catsContainer) {
            if (!cats.length) {
                catsContainer.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucune catégorie trouvée.</p>';
            } else {
                catsContainer.innerHTML = cats.map(c => `<div class="category-card" onclick="window.location.href='client.html?cat=${encodeURIComponent(c.name)}'"><i class="fas ${c.icon || 'fa-briefcase'}"></i><h3>${escapeHtml(c.name)}</h3><span>${c.count || 0} prestataire${(c.count || 0) > 1 ? 's' : ''}</span></div>`).join('');
            }
        }

        // aperçu recommandés (page dédiée pour la liste complète)
        if (topGrid) {
            const previewCount = document.querySelector('.rec-grid-preview') ? 3 : 6;
            const top = pickRecommendedPrestataires(prestas, previewCount);
            if (!top.length) {
                topGrid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire mis en avant pour le moment.</p>';
            } else {
                topGrid.innerHTML = top.map(recCardHtml).join('');
            }
        }
        document.dispatchEvent(new CustomEvent('landing:ready'));
        bindAssistantComposer();
        bindAvisStars();
        renderLandingAvis();
        applyMarketingAuth();

        const params = new URLSearchParams(window.location.search);
        if (params.get('login') === '1') { ensureAuthModals(); showModal('loginModal'); }
        if (params.get('register') === '1') { ensureAuthModals(); showModal('registerModal'); }

    } catch (e) {
        console.error('InitIndex error', e);
        if (catsContainer) catsContainer.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Erreur lors du chargement. Réessayez.</p>';
        if (topGrid) topGrid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Erreur lors du chargement. Réessayez.</p>';
        document.dispatchEvent(new CustomEvent('landing:ready'));
        applyMarketingAuth();
    }
}

// Client
async function initClient() {
    let user = null;
    try {
        const token = localStorage.getItem('es_token');
        if (token) {
            const me = await apiFetch('/me', { method: 'GET' });
            if (me && me.status === 200 && me.body && me.body.user) {
                user = me.body.user;
                setAuth(token, user);
            } else {
                clearAuth();
            }
        }
    } catch (e) { console.error(e); }

    if (user) {
        if (el('clientName')) el('clientName').textContent = user.name || user.email;
        if (el('clientWelcome')) el('clientWelcome').textContent = 'Bienvenue, ' + (user.name || '👋');
    } else {
        if (el('clientName')) el('clientName').textContent = 'Visiteur';
        if (el('clientWelcome')) el('clientWelcome').textContent = 'Trouvez un prestataire';
        const header = document.querySelector('.header-user');
        if (header && !el('clientLoginBtn')) {
            const btn = document.createElement('button');
            btn.id = 'clientLoginBtn';
            btn.className = 'btn-login';
            btn.type = 'button';
            btn.textContent = 'Connexion';
            btn.onclick = () => { ensureAuthModals(); showModal('loginModal'); };
            header.insertBefore(btn, header.firstChild);
        }
    }
    applyClientAccessUi(user);

    await renderPrestataires();

    const params = new URLSearchParams(window.location.search);
    if (params.get('urgence') === '1') {
        const banner = el('urgenceBanner');
        if (banner) banner.classList.remove('hidden');
        const cb = el('filterUrgence');
        if (cb) cb.checked = true;
    }
    const cat = params.get('cat');
    if (cat) {
        if (el('searchMetier')) el('searchMetier').value = cat;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', normalizeText(b.textContent) === normalizeText(cat));
        });
    }
    const ville = params.get('ville');
    if (ville && el('searchVille')) el('searchVille').value = ville;
    if (cat || ville) filterPrestataires();
    const presta = params.get('presta');
    if (presta) showPrestataireProfile(presta);
    if (params.get('login') === '1') { ensureAuthModals(); showModal('loginModal'); }

    if (user && user.type === 'client') {
        renderClientDemandes();
        renderClientMessages();
        fillClientProfil();
        renderClientNotifications();
    }
}

function applyClientAccessUi(user) {
    const isClient = !!(user && (user.type === 'client' || user.type === 'admin'));
    document.querySelectorAll('[data-auth="client"]').forEach(link => {
        link.classList.toggle('nav-locked', !isClient);
    });
    const notif = document.querySelector('.notifications-bell');
    if (notif) notif.classList.toggle('hidden', !isClient);
    const logoutLink = document.querySelector('.sidebar-footer a[onclick*="logout"]');
    if (logoutLink && !user) {
        logoutLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Connexion';
        logoutLink.onclick = ev => {
            ev.preventDefault();
            ensureAuthModals();
            showModal('loginModal');
        };
    }
}

function applyMarketingAuth() {
    const user = getCurrentUserVerified();
    if (!user) return;
    if (el('navAuth')) el('navAuth').classList.add('hidden');
    if (el('navUser')) {
        el('navUser').classList.remove('hidden');
        if (el('userNameDisplay')) el('userNameDisplay').textContent = user.name || user.nom || user.email;
    }
    if (user.type === 'admin' && el('navAdminBtn')) el('navAdminBtn').classList.remove('hidden');
}

function goUrgentSearch(e, metierPreset) {
    if (e && e.preventDefault) e.preventDefault();
    const metier = metierPreset || ((el('urgentMetier') || {}).value || '');
    const ville = ((el('urgentVille') || {}).value || '').trim();
    const q = new URLSearchParams({ urgence: '1' });
    if (metier) q.set('cat', metier);
    if (ville) q.set('ville', ville);
    window.location.href = 'client.html?' + q.toString();
}

function renderRecGrid(list) {
    const grid = el('topPrestatairesGrid');
    if (!grid) return;
    if (!list.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire pour ces filtres.</p>';
        return;
    }
    grid.innerHTML = list.map(recCardHtml).join('');
    document.dispatchEvent(new CustomEvent('landing:ready'));
}

async function initRecommandes() {
    applyMarketingAuth();
    bindAssistantComposer();
    const grid = el('topPrestatairesGrid');
    if (grid) grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Chargement...</p>';
    try {
        const res = await apiFetch('/prestataires', { method: 'GET' });
        const prestas = (res && res.status === 200 && Array.isArray(res.body)) ? res.body : (DB.get('prestataires') || []);
        window._recPrestas = pickRecommendedPrestataires(prestas, prestas.length);
        renderRecGrid(window._recPrestas);
    } catch (e) {
        console.error(e);
        if (grid) grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Erreur lors du chargement.</p>';
    }
}

function filterRecommandes() {
    const metier = ((el('recFilterMetier') || {}).value || '').trim();
    const ville = ((el('recFilterVille') || {}).value || '').trim().toLowerCase();
    let list = window._recPrestas || [];
    if (metier) list = list.filter(p => (p.metier || '') === metier);
    if (ville) list = list.filter(p => ((p.ville || '') + ' ' + (p.zone_intervention || '')).toLowerCase().includes(ville));
    renderRecGrid(list);
}

function initContact() {
    applyMarketingAuth();
    bindAssistantComposer();
    const user = getCurrentUserVerified();
    if (user) {
        if (el('contactNom')) el('contactNom').value = user.name || user.nom || '';
        if (el('contactEmail')) el('contactEmail').value = user.email || '';
    }
}

async function submitContact(e) {
    if (e) e.preventDefault();
    const err = el('contactFormError');
    const ok = el('contactFormOk');
    if (err) { err.classList.add('hidden'); err.textContent = ''; }
    if (ok) ok.classList.add('hidden');
    const payload = {
        nom: ((el('contactNom') || {}).value || '').trim(),
        email: ((el('contactEmail') || {}).value || '').trim(),
        sujet: ((el('contactSujet') || {}).value || 'question'),
        message: ((el('contactMessage') || {}).value || '').trim()
    };
    if (!payload.nom || !payload.email || payload.message.length < 10) {
        if (err) { err.textContent = 'Nom, email et un message d’au moins 10 caractères sont requis.'; err.classList.remove('hidden'); }
        return;
    }
    try {
        const res = await apiFetch('/contact', { method: 'POST', body: JSON.stringify(payload) });
        if (res && (res.status === 201 || res.status === 200) && res.body && res.body.ok) {
            if (el('contactMessage')) el('contactMessage').value = '';
            if (ok) ok.classList.remove('hidden');
            return;
        }
        if (err) {
            err.textContent = (res && res.body && res.body.error) || 'Envoi impossible.';
            err.classList.remove('hidden');
        }
    } catch (ex) {
        console.error(ex);
        if (err) { err.textContent = 'Erreur réseau.'; err.classList.remove('hidden'); }
    }
}

function pickRecommendedPrestataires(prestas, limit) {
    const scored = (prestas || []).map(p => {
        const note = Number(p.note) || 0;
        const avis = Number(p.avis_count) || 0;
        const photoBonus = firstPhotoUrl(p) ? 8 : 0;
        return { p, score: note * 12 + avis * 2 + photoBonus };
    }).sort((a, b) => b.score - a.score);

    const picked = [];
    const usedMetier = new Set();
    scored.forEach(item => {
        const metier = (item.p.metier || '').toLowerCase();
        if (metier && usedMetier.has(metier)) return;
        picked.push(item.p);
        if (metier) usedMetier.add(metier);
    });
    scored.forEach(item => {
        if (picked.length >= limit) return;
        if (!picked.includes(item.p)) picked.push(item.p);
    });
    return picked.slice(0, limit);
}

function recCardHtml(p) {
    const pid = p.id || '';
    const uid = p.userId || p.user_id || '';
    const nom = p.nom || p.name || '';
    const photo = firstPhotoUrl(p);
    const metier = p.metier || p.category || '';
    const ville = p.ville || p.zone_intervention || '';
    const note = Number(p.note) || 0;
    const avis = Number(p.avis_count) || 0;
    const desc = (p.description || '').trim().slice(0, 110);
    const cover = photo
        ? `<div class="rec-card-cover"><img src="${escapeHtml(photo)}" alt=""></div>`
        : `<div class="rec-card-cover rec-card-cover-muted" aria-hidden="true"><i class="fas fa-briefcase"></i></div>`;
    const rating = note
        ? `<span><i class="fas fa-star"></i> ${note.toFixed(1)}${avis ? ` <em>(${avis})</em>` : ''}</span>`
        : '';

    return `<article class="rec-card">
        ${cover}
        <div class="rec-card-body">
            ${avatarHtml(nom, photo, 'rec-card-avatar')}
            <h3>${escapeHtml(nom)}</h3>
            ${metier ? `<span class="rec-badge">${escapeHtml(metier)}</span>` : ''}
            <div class="rec-meta">
                ${ville ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ville)}</span>` : ''}
                ${rating}
            </div>
            ${desc ? `<p class="rec-desc">${escapeHtml(desc)}</p>` : ''}
        </div>
        <div class="rec-card-footer">
            <button type="button" class="btn-ghost" onclick="openChat('${uid}','${escapeHtml(nom)}')">Message</button>
            <button type="button" class="btn-solid" onclick="showPrestataireProfile('${pid}')">Voir profil</button>
        </div>
    </article>`;
}

function prestaCardHtml(p) {
    const uid = p.userId || p.user_id || '';
    const nom = p.nom || p.name || '';
    const photos = (p.photos || []).slice(0, 3).map(ph => `<img src="${ph.url}" alt="" style="width:60px;height:40px;object-fit:cover;border-radius:6px;margin-right:6px">`).join('');
    return `<div class="presta-card">
        <div class="presta-card-header">
            ${avatarHtml(nom, firstPhotoUrl(p))}
            <div class="presta-card-info">
                <h3>${escapeHtml(nom)}</h3>
                <div class="metier">${escapeHtml(p.metier || '')}</div>
                <div class="ville">${escapeHtml(p.ville || p.zone_intervention || '')}</div>
            </div>
        </div>
        <div class="presta-card-body">
            <p>${escapeHtml(p.description || '')}</p>
            ${photos ? `<div style="margin-top:10px">${photos}</div>` : ''}
        </div>
        <div class="presta-card-footer">
            <div class="presta-tarif">${p.tarif ? escapeHtml(String(p.tarif)) + ' $' : ''}</div>
            <div>
                <button type="button" class="btn-small-outline" onclick="openChat('${uid}','${escapeHtml(nom)}')">Message</button>
                <button type="button" class="btn-small" onclick="openDemandeModal('${p.id}','${escapeHtml(nom)}')">Demander un devis</button>
            </div>
        </div>
    </div>`;
}

async function renderPrestataires() {
    const grid = el('prestatairesGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Chargement...</p>';
    try {
        const res = await apiFetch('/prestataires', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            DB.set('prestataires', res.body);
            if (!res.body.length) {
                grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire disponible.</p>';
                return;
            }
            grid.innerHTML = res.body.map(prestaCardHtml).join('');
            return;
        }
    } catch (e) { console.error(e); }
    const prestas = (DB.get('prestataires') || []).filter(p => p.active !== false);
    if (!prestas.length) {
        grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire disponible.</p>';
        return;
    }
    grid.innerHTML = prestas.map(prestaCardHtml).join('');
}

async function showPrestataireProfile(prestaId) {
    if (!prestaId) return;
    ensurePrestataireModal();
    const box = el('prestataireDetail');
    if (box) box.innerHTML = '<p style="padding:24px;text-align:center;color:var(--gray);">Chargement du profil...</p>';
    showModal('prestataireModal');
    let p = null;
    try {
        const res = await apiFetch('/prestataires', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            p = res.body.find(x => String(x.id) === String(prestaId));
        }
    } catch (e) { console.error(e); }
    if (!p) {
        p = (DB.get('prestataires') || []).find(x => String(x.id) === String(prestaId));
    }
    if (!p || !box) {
        if (box) box.innerHTML = '<p style="padding:24px;">Prestataire introuvable.</p>';
        return;
    }
    if (!p.photos) {
        try {
            const ph = await fetch(apiBase() + '/prestataire/' + encodeURIComponent(prestaId) + '/photos');
            p.photos = await ph.json().catch(() => []);
        } catch (e) { p.photos = []; }
    }
    const uid = p.userId || p.user_id || '';
    const nom = p.nom || p.name || '';
    const extraPhotos = (p.photos || []).slice(1, 4).map(ph => `<img src="${escapeHtml(ph.url)}" alt="">`).join('');
    box.innerHTML = `
      <div class="presta-detail">
        <div class="presta-detail-left">
            ${avatarHtml(nom, firstPhotoUrl(p), 'avatar-profile')}
            <div class="stars">${p.note ? '★★★★★' : ''}</div>
            <div class="note-text">${p.note ? escapeHtml(String(p.note)) + '/5' : 'Pas encore de note'}</div>
        </div>
        <div class="presta-detail-right">
            <h2>${escapeHtml(nom)}</h2>
            <span class="metier">${escapeHtml(p.metier || '')} — ${escapeHtml(p.ville || '')}</span>
            <p class="presta-description">${escapeHtml(p.description || 'Aucune description.')}</p>
            <p><strong>Tarif :</strong> ${p.tarif ? escapeHtml(String(p.tarif)) + ' $ / h' : 'Non renseigné'}</p>
            ${extraPhotos ? `<div class="presta-photos">${extraPhotos}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap;">
                <button type="button" class="btn-small-outline" onclick="closeModal('prestataireModal');openChat('${uid}','${escapeHtml(nom)}')">Message</button>
                <button type="button" class="btn-small" onclick="closeModal('prestataireModal');openDemandeModal('${p.id}','${escapeHtml(nom)}')">Demander un devis</button>
            </div>
        </div>
      </div>`;
}

function statusLabel(status) {
    const map = {
        en_attente: 'En attente',
        devis_envoye: 'Devis reçu',
        acceptee: 'Acceptée',
        refusee: 'Refusée',
        terminee: 'Terminée',
        accepte: 'Accepté',
        refuse: 'Refusé'
    };
    return map[status] || status || '';
}

function statusClass(status) {
    if (status === 'devis_envoye') return 'status-devis-envoye';
    if (status === 'en_attente') return 'status-en-attente';
    if (status === 'acceptee' || status === 'accepte') return 'status-acceptee';
    if (status === 'refusee' || status === 'refuse') return 'status-refusee';
    if (status === 'terminee') return 'status-terminee';
    return 'status-en-cours';
}

function demandeCardHtml(d, role) {
    const latest = (d.devis || [])[0];
    const who = role === 'client' ? (d.prestataire_nom || 'Prestataire') : (d.client_nom || 'Client');
    const partnerId = role === 'client' ? d.prestataire_user_id : d.client_user_id;
    let devisHtml = '';
    if (latest) {
        devisHtml = `<div class="devis-details" style="margin-top:12px;">
            <p>Prix<strong>${escapeHtml(String(latest.prix || 0))} $</strong></p>
            <p>Date<strong>${escapeHtml(latest.date || '')} ${escapeHtml(latest.heure || '')}</strong></p>
            <p>Délai<strong>${escapeHtml(latest.delai || '—')}</strong></p>
        </div>
        ${latest.message ? `<p>${escapeHtml(latest.message)}</p>` : ''}
        <p style="font-size:13px;color:var(--gray);">Devis : ${escapeHtml(statusLabel(latest.status))}</p>`;
    }
    let actions = `<button type="button" class="btn-small-outline" onclick="openChat('${partnerId || ''}','${escapeHtml(who)}')">Message</button>`;
    if (role === 'prestataire' && d.status === 'en_attente') {
        actions += `<button type="button" class="btn-small" onclick="openReponseModal('${d.id}')">Répondre</button>`;
    }
    if (role === 'client' && latest && latest.status === 'en_attente') {
        actions += `<button type="button" class="btn-small" onclick="repondreDevis(${latest.id},'accepter')">Accepter</button>`;
        actions += `<button type="button" class="btn-small-outline" onclick="repondreDevis(${latest.id},'refuser')">Refuser</button>`;
    }
    return `<div class="demande-item">
        <div class="demande-info">
            <h4>${escapeHtml(d.description || '')}</h4>
            <p>${escapeHtml(who)}</p>
            <div class="demande-meta">
                <span><i class="fas fa-calendar"></i> ${escapeHtml(d.date || '')} ${escapeHtml(d.heure || '')}</span>
                ${d.adresse ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(d.adresse)}</span>` : ''}
            </div>
            ${devisHtml}
        </div>
        <div class="demande-actions">
            <span class="status-badge ${statusClass(d.status)}">${escapeHtml(statusLabel(d.status))}</span>
            ${actions}
        </div>
    </div>`;
}

async function renderClientDemandes() {
    const user = getCurrentUserVerified();
    if (!user || user.type !== 'client') return;
    const list = el('demandesList');
    if (!list) return;
    try {
        const me = await apiFetch('/client/me', { method: 'GET' });
        const clientId = me && me.body ? me.body.id : null;
        const res = await apiFetch('/demandes', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            const demandes = res.body.filter(d => !clientId || String(d.client_id) === String(clientId));
            if (!demandes.length) {
                list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucune demande.</p>';
                return;
            }
            list.innerHTML = demandes.map(d => demandeCardHtml(d, 'client')).join('');
            return;
        }
    } catch (e) { console.error(e); }
    list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucune demande.</p>';
}

async function renderConversations(containerId) {
    const container = el(containerId);
    if (!container) return;
    const user = getCurrentUserVerified();
    if (!user) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Connectez-vous pour voir vos messages.</p>';
        return;
    }
    try {
        const res = await apiFetch('/conversations', { method: 'GET' });
        if (!res || res.status !== 200 || !Array.isArray(res.body) || !res.body.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucune conversation.</p>';
            return;
        }
        container.innerHTML = res.body.map(c => `
            <div class="conversation-item" onclick="openChat('${c.partner_id}','${escapeHtml(c.partner_name || 'Utilisateur')}')">
                <div class="avatar">${escapeHtml((c.partner_name || 'U').charAt(0))}</div>
                <div class="conversation-info">
                    <h4>${escapeHtml(c.partner_name || 'Utilisateur')}</h4>
                    <p>${escapeHtml(c.last_message || '')}</p>
                </div>
                <span class="conversation-time">${escapeHtml(formatDateTime(c.last_at))}</span>
            </div>`).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Impossible de charger les messages.</p>';
    }
}

function renderClientMessages() { return renderConversations('messagesContainer'); }
function renderPrestaMessages() { return renderConversations('prestaMessagesContainer'); }

// Messaging
let currentChatPartner = null;
let currentChatName = '';
let chatPoll = null;

function chatUi() {
    if (el('prestaChatModal')) {
        return { modal: 'prestaChatModal', name: 'prestaChatName', messages: 'prestaChatMessages', input: 'prestaChatInput' };
    }
    ensureChatModal();
    return { modal: 'chatModal', name: 'chatName', messages: 'chatMessages', input: 'chatMessageInput' };
}

function stopChatPoll() {
    if (chatPoll) { clearInterval(chatPoll); chatPoll = null; }
}

function startChatPoll() {
    stopChatPoll();
    chatPoll = setInterval(() => { if (currentChatPartner) loadChatMessages(); }, 4000);
}

async function loadChatMessages() {
    const user = getCurrentUserVerified();
    const ui = chatUi();
    const container = el(ui.messages);
    if (!user || !currentChatPartner || !container) return;
    try {
        const res = await apiFetch('/messages?with=' + encodeURIComponent(currentChatPartner), { method: 'GET' });
        const messages = (res && res.status === 200 && Array.isArray(res.body)) ? res.body : [];
        container.innerHTML = messages.map(m => {
            const mine = String(m.sender_id) === String(user.id);
            return `<div class="message ${mine ? 'sent' : 'received'}">${escapeHtml(m.content)}<span class="t">${formatDateTime(m.timestamp)}</span></div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) { console.error(e); }
}

function openChat(partnerId, partnerName) {
    const user = getCurrentUserVerified();
    if (!user) { showAuthRequired('Connectez-vous pour envoyer un message.'); return; }
    if (!partnerId) { alert('Destinataire introuvable.'); return; }
    currentChatPartner = partnerId;
    currentChatName = partnerName || '';
    const ui = chatUi();
    if (el(ui.name)) el(ui.name).textContent = currentChatName;
    const box = el(ui.messages);
    if (box) box.innerHTML = '<p style="text-align:center;color:var(--gray);padding:16px;">Chargement...</p>';
    showModal(ui.modal);
    loadChatMessages();
    startChatPoll();
}

function renderChatMessages(containerId) { loadChatMessages(); }

async function sendMessage() {
    const ui = chatUi();
    const input = el(ui.input);
    if (!input) return;
    const txt = input.value.trim();
    if (!txt || !currentChatPartner) return;
    const user = getCurrentUserVerified();
    if (!user) { showAuthRequired('Connectez-vous pour envoyer un message.'); return; }
    input.value = '';
    try {
        const res = await apiFetch('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: currentChatPartner, content: txt }) });
        if (!res || res.status !== 201) {
            alert((res && res.body && res.body.error) || 'Message non envoyé.');
            input.value = txt;
            return;
        }
        await loadChatMessages();
        renderConversations(el('prestaMessagesContainer') ? 'prestaMessagesContainer' : 'messagesContainer');
    } catch (e) {
        console.error(e);
        input.value = txt;
        alert('Erreur réseau.');
    }
}

function sendPrestaMessage() { return sendMessage(); }

// Prestataire
async function initPrestataire() {
    try {
        if (!localStorage.getItem('es_token')) { window.location.replace('index.html?login=1'); return; }
        const me = await apiFetch('/me', { method: 'GET' });
        if (!me || me.status !== 200 || !me.body || !me.body.user) { clearAuth(); window.location.replace('index.html?login=1'); return; }
        const user = me.body.user;
        if (user.type !== 'prestataire') { alert('Espace prestataire réservé aux prestataires.'); window.location.replace('index.html'); return; }
        if (el('prestaName')) el('prestaName').textContent = user.name || '';
        renderPrestaDemandes(); renderPrestaMessages(); renderPrestaDevis();
        const inp = el('prestaPhotoInput'); if (inp) { inp.addEventListener('change', previewSelectedPhotos); }
        listPrestaServerPhotos();
        fillPrestaProfil();
    } catch (e) { console.error(e); clearAuth(); window.location.replace('index.html'); }
}

// photos: preview, upload, list
function previewSelectedPhotos() {
    const inp = el('prestaPhotoInput'); const box = el('prestaPhotoPreview'); if (!inp || !box) return; box.innerHTML = '';
    Array.from(inp.files || []).forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        const div = document.createElement('div'); div.style.width = '120px'; div.style.height = '80px'; div.style.position = 'relative'; div.style.borderRadius = '8px'; div.style.overflow = 'hidden'; div.style.boxShadow = 'var(--shadow)';
        const img = document.createElement('img'); img.src = url; img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
        const btn = document.createElement('button'); btn.textContent = '×'; btn.className = 'btn-icon delete'; btn.style.position = 'absolute'; btn.style.top = '6px'; btn.style.right = '6px'; btn.onclick = () => {
            const dt = new DataTransfer(); Array.from(inp.files).forEach((f, i) => { if (i !== idx) dt.items.add(f); }); inp.files = dt.files; previewSelectedPhotos();
        };
        div.appendChild(img); div.appendChild(btn); box.appendChild(div);
    });
}

async function uploadPrestaPhotos() {
    const inp = el('prestaPhotoInput'); if (!inp || !inp.files || !inp.files.length) { alert('Sélectionnez des fichiers d’abord.'); return; }
    const user = getCurrentUserVerified(); if (!user || user.type !== 'prestataire') { showAuthRequired('Connectez-vous en tant que prestataire.'); return; }
    const fd = new FormData(); Array.from(inp.files).forEach(f => fd.append('photos', f));
    try {
        const res = await fetch(apiBase() + '/prestataire/photos', { method: 'POST', body: fd, headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('es_token') || '') } });
        const json = await res.json().catch(() => null);
        if (res.status === 201 && json && json.photos) {
            alert('Photos téléversées.'); inp.value = ''; previewSelectedPhotos(); listPrestaServerPhotos();
        } else {
            alert((json && json.error) || 'Erreur lors de l\'upload');
        }
    } catch (e) { console.error(e); alert('Erreur réseau.'); }
}

async function listPrestaServerPhotos() {
    const user = getCurrentUserVerified(); if (!user || user.type !== 'prestataire') return; // must be prestataire
    try {
        // get prestataire id: fetch /api/prestataire/me
        const me = await apiFetch('/prestataire/me', { method: 'GET' });
        if (me && me.status === 200 && me.body && me.body.id) {
            const id = me.body.id;
            const res = await fetch(apiBase() + `/prestataire/${id}/photos`);
            const photos = await res.json().catch(() => []);
            setAvatarEl(el('prestaAvatar'), (me.body.nom || user.name || 'P'), (photos && photos[0] && photos[0].url) || '');
            const container = el('prestaPhotoServerList'); if (!container) return; if (!Array.isArray(photos) || !photos.length) { container.innerHTML = '<p style="color:var(--gray)">Aucune photo.</p>'; return; }
            container.innerHTML = photos.map(p => `<div style="display:inline-block;margin-right:8px;text-align:center"><img src="${p.url}" style="width:120px;height:80px;object-fit:cover;border-radius:8px;display:block;margin-bottom:6px"/><button class="btn-small-outline" onclick="deletePrestaPhoto(${p.id})">Supprimer</button></div>`).join('');
        }
    } catch (e) { console.error(e); }
}

async function deletePrestaPhoto(photoId) {
    if (!confirm('Supprimer cette photo ?')) return; try {
        const res = await fetch(apiBase() + `/prestataire/photos/${photoId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('es_token') || '') } });
        const json = await res.json().catch(() => null);
        if (res.status === 200 && json && json.ok) { alert('Supprimée'); listPrestaServerPhotos(); }
        else alert((json && json.error) || 'Erreur suppression');
    } catch (e) { console.error(e); alert('Erreur réseau'); }
}
async function fillPrestaProfil() {
    try {
        const me = await apiFetch('/prestataire/me', { method: 'GET' });
        if (!me || me.status !== 200 || !me.body) return;
        const p = me.body;
        if (el('prestaProfilNom')) el('prestaProfilNom').value = p.nom || '';
        if (el('prestaProfilEmail')) el('prestaProfilEmail').value = p.email || '';
        if (el('prestaProfilPhone')) el('prestaProfilPhone').value = p.phone || '';
        if (el('prestaProfilVille')) el('prestaProfilVille').value = p.ville || '';
        if (el('prestaProfilDesc')) el('prestaProfilDesc').value = p.description || '';
        if (el('prestaProfilTarif')) el('prestaProfilTarif').value = p.tarif || '';
        if (el('prestaProfilZone')) el('prestaProfilZone').value = p.zone_intervention || '';
        if (el('prestaProfilHoraires')) el('prestaProfilHoraires').value = p.horaires || '';
        if (el('dashNote')) el('dashNote').textContent = (p.note || 0).toFixed ? Number(p.note || 0).toFixed(1) : p.note;
    } catch (e) { console.error(e); }
}

async function renderPrestaDemandes() {
    const user = getCurrentUserVerified();
    if (!user || user.type !== 'prestataire') return;
    const list = el('prestaAllDemandes');
    const recent = el('prestaDemandesRecentes');
    try {
        const me = await apiFetch('/prestataire/me', { method: 'GET' });
        const prestaId = me && me.body ? me.body.id : null;
        const res = await apiFetch('/demandes', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            const demandes = res.body.filter(d => !prestaId || String(d.prestataire_id) === String(prestaId));
            if (el('dashDemandes')) el('dashDemandes').textContent = demandes.length;
            if (el('dashAcceptees')) el('dashAcceptees').textContent = demandes.filter(d => d.status === 'acceptee' || d.status === 'terminee').length;
            const html = !demandes.length
                ? '<p style="text-align:center;color:var(--gray);padding:20px;">Aucune demande.</p>'
                : demandes.map(d => demandeCardHtml(d, 'prestataire')).join('');
            if (list) list.innerHTML = html;
            if (recent) recent.innerHTML = html;
            return;
        }
    } catch (e) { console.error(e); }
    if (list) list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:20px;">Aucune demande.</p>';
}

async function renderPrestaDevis() {
    const list = el('prestaDevisList');
    if (!list) return;
    try {
        const res = await apiFetch('/devis', { method: 'GET' });
        if (!res || res.status !== 200 || !Array.isArray(res.body) || !res.body.length) {
            list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:20px;">Aucun devis envoyé.</p>';
            return;
        }
        list.innerHTML = res.body.map(v => `
            <div class="devis-item">
                <div class="devis-item-header">
                    <h4>Demande #${escapeHtml(String(v.demande_id))}</h4>
                    <div class="prix">${escapeHtml(String(v.prix || 0))} $</div>
                </div>
                <div class="devis-details">
                    <p>Date<strong>${escapeHtml(v.date || '')} ${escapeHtml(v.heure || '')}</strong></p>
                    <p>Délai<strong>${escapeHtml(v.delai || '—')}</strong></p>
                    <p>Statut<strong>${escapeHtml(statusLabel(v.status))}</strong></p>
                </div>
                ${v.message ? `<p>${escapeHtml(v.message)}</p>` : ''}
            </div>`).join('');
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:20px;">Impossible de charger les devis.</p>';
    }
}

// --- Missing feature implementations (minimal, defensive) ---
function filterPrestataires() {
    const metier = (el('searchMetier') || {}).value || '';
    const ville = (el('searchVille') || {}).value || '';
    const grid = el('prestatairesGrid'); if (!grid) return;
    // prefer server-side search when available
    apiFetch(`/search?metier=${encodeURIComponent(metier)}&ville=${encodeURIComponent(ville)}`, { method: 'GET' })
        .then(res => {
            if (res && res.status === 200 && Array.isArray(res.body)) {
                const list = res.body;
                if (!list.length) { grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire trouvé pour cette recherche.</p>'; return; }
                grid.innerHTML = list.map(prestaCardHtml).join('');
            } else {
                // fallback to client DB
                const all = DB.get('prestataires') || [];
                const list = all.filter(p => p.active !== false && (!metier || (p.metier || '').toLowerCase().includes(metier.toLowerCase())) && (!ville || ((p.ville || '') + ',' + (p.zone_intervention || '')).toLowerCase().includes(ville.toLowerCase())));
                if (!list.length) { grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire trouvé pour cette recherche.</p>'; return; }
                grid.innerHTML = list.map(prestaCardHtml).join('');
            }
        }).catch(err => {
            console.error('Search error', err);
            const all = DB.get('prestataires') || [];
            const list = all.filter(p => p.active !== false && (!metier || (p.metier || '').toLowerCase().includes(metier.toLowerCase())) && (!ville || ((p.ville || '') + ',' + (p.zone_intervention || '')).toLowerCase().includes(ville.toLowerCase())));
            if (!list.length) { grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire trouvé pour cette recherche.</p>'; return; }
            grid.innerHTML = list.map(prestaCardHtml).join('');
        });
}

function filterByCategory(cat, btn) { document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); if (cat === 'all') { (el('searchMetier') || {}).value = ''; } else { (el('searchMetier') || {}).value = cat; } filterPrestataires(); }

function disableUrgence() { const b = el('urgenceBanner'); if (b) b.classList.add('hidden'); }

function detectService(text) {
    const lower = normalizeText(text);
    const rules = [
        { keys: ['fuite', 'douche', 'evier', 'robinet', 'plomber', 'canalisation'], metier: 'Plombier' },
        { keys: ['prise', 'electric', 'courant', 'ampoule', 'disjoncteur'], metier: 'Électricien' },
        { keys: ['ordinateur', 'pc', 'allume', 'informatique', 'imprimante'], metier: 'Informaticien' },
        { keys: ['voiture', 'moteur', 'demarrage', 'pneu', 'mecan'], metier: 'Mécanicien' },
        { keys: ['coiff', 'cheveux', 'coupe', 'barbe'], metier: 'Coiffeur' },
        { keys: ['coutur', 'vetement', 'pantalon', 'robe'], metier: 'Couturier' },
        { keys: ['bois', 'meuble', 'porte', 'menuis'], metier: 'Menuisier' },
        { keys: ['peinture', 'mur', 'peintre'], metier: 'Peintre' },
        { keys: ['serrure', 'cle', 'serrurier'], metier: 'Serrurier' }
    ];
    for (const rule of rules) {
        if (rule.keys.some(k => lower.includes(k))) return rule.metier;
    }
    return '';
}

function clientAnalyzeProblem() {
    const input = el('clientAssistantInput'); if (!input) return;
    const text = input.value.trim();
    if (!text) { alert("Décrivez d'abord votre problème."); return; }
    const result = el('clientAssistantResult');
    const m = detectService(text);
    if (result) result.classList.remove('hidden');
    if (m) {
        if (el('searchMetier')) el('searchMetier').value = m;
        filterPrestataires();
        if (result) result.innerHTML = `<p style="color:var(--primary)">Service détecté : <strong>${escapeHtml(m)}</strong>. Voici les prestataires correspondants.</p>`;
    } else if (result) {
        result.innerHTML = '<p style="color:var(--gray)">Aucune correspondance automatique. Essayez un métier dans la barre de recherche.</p>';
    }
}

function toggleAssistant(open) {
    const widget = el('assistantWidget');
    const fab = el('assistantFab');
    if (!widget) return;
    const shouldOpen = open !== false && (open === true || !widget.classList.contains('open'));
    widget.classList.toggle('open', shouldOpen);
    widget.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    if (fab) {
        fab.classList.toggle('is-hidden', shouldOpen);
        fab.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }
    if (shouldOpen) {
        const ta = el('assistantInput');
        if (ta) ta.focus();
    }
}

function bindAssistantComposer() {
    const ta = el('assistantInput');
    if (!ta || ta.dataset.bound) return;
    ta.dataset.bound = '1';
    ta.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault();
            analyzeProblem(ev);
        }
    });
}

function appendAssistantBubble(role, html) {
    const thread = el('assistantThread');
    if (!thread) return null;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-' + role;
    bubble.innerHTML = html;
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
    return bubble;
}

function fillAssistant(text) {
    toggleAssistant(true);
    const ta = el('assistantInput');
    if (ta) ta.value = text || '';
    analyzeProblem();
}

function analyzeProblem(e) {
    if (e) e.preventDefault();
    const ta = el('assistantInput');
    if (!ta) return;
    const text = ta.value.trim();
    if (!text) return;
    toggleAssistant(true);
    appendAssistantBubble('user', escapeHtml(text));
    ta.value = '';
    const thinking = appendAssistantBubble('bot', '<i class="fas fa-spinner fa-spin"></i> Analyse en cours…');
    setTimeout(() => {
        if (thinking) thinking.remove();
        const m = detectService(text);
        if (m) {
            appendAssistantBubble('bot', `
                <strong>Service recommandé : ${escapeHtml(m)}</strong>
                <p>On a identifié un besoin de <b>${escapeHtml(m)}</b>. Voyez qui est disponible près de chez vous.</p>
                <a class="chat-cta" href="client.html?cat=${encodeURIComponent(m)}">Voir les ${escapeHtml(m)}s</a>`);
        } else {
            appendAssistantBubble('bot', 'Aucune correspondance pour l’instant. Précisez un peu (fuite, électricité, voiture, cheveux…).');
        }
    }, 400);
}

function starsDisplay(note) {
    const n = Math.max(0, Math.min(5, Math.round(Number(note) || 0)));
    return `<span class="stars" aria-label="${n} sur 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

function avisCardHtml(a) {
    const nom = a.nom || 'Visiteur';
    const initial = escapeHtml(nom.charAt(0).toUpperCase());
    return `<article class="avis-card">
        <div class="avis-card-top">
            ${starsDisplay(a.note)}
            <time>${escapeHtml(formatDate(a.created_at))}</time>
        </div>
        <p>${escapeHtml(a.commentaire || '')}</p>
        <div class="avis-card-author">
            <div class="avatar">${initial}</div>
            <div>
                <strong>${escapeHtml(nom)}</strong>
                <span>${escapeHtml(a.role || 'Visiteur')}</span>
            </div>
        </div>
    </article>`;
}

function bindAvisStars() {
    const picker = el('avisStars');
    if (!picker || picker.dataset.bound) return;
    picker.dataset.bound = '1';
    picker.addEventListener('click', ev => {
        const btn = ev.target.closest('button[data-note]');
        if (!btn) return;
        const note = btn.getAttribute('data-note');
        if (el('avisNote')) el('avisNote').value = note;
        picker.querySelectorAll('button').forEach(b => {
            b.classList.toggle('active', Number(b.getAttribute('data-note')) <= Number(note));
        });
    });
    const user = getCurrentUserVerified();
    if (user) {
        if (el('avisNom')) el('avisNom').value = user.name || user.nom || '';
        const group = el('avisNomGroup');
        if (group && (user.name || user.nom)) group.classList.add('hidden');
    }
}

async function renderLandingAvis() {
    const list = el('avisList');
    if (!list) return;
    try {
        const res = await apiFetch('/avis', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body) && res.body.length) {
            list.innerHTML = res.body.map(avisCardHtml).join('');
            document.dispatchEvent(new CustomEvent('landing:avis'));
            return;
        }
    } catch (e) { console.error(e); }
    const local = DB.get('avis') || [];
    if (local.length) {
        list.innerHTML = local.map(avisCardHtml).join('');
        return;
    }
    list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:24px;">Aucun avis pour le moment. Soyez le premier à noter.</p>';
}

async function submitAvis(e) {
    if (e) e.preventDefault();
    const err = el('avisFormError');
    if (err) { err.classList.add('hidden'); err.textContent = ''; }
    const note = Number((el('avisNote') || {}).value || 0);
    const commentaire = ((el('avisCommentaire') || {}).value || '').trim();
    const user = getCurrentUserVerified();
    const nom = ((el('avisNom') || {}).value || '').trim() || (user && (user.name || user.nom)) || '';
    if (note < 1 || note > 5) {
        if (err) { err.textContent = 'Choisissez une note entre 1 et 5 étoiles.'; err.classList.remove('hidden'); }
        return;
    }
    if (commentaire.length < 8) {
        if (err) { err.textContent = 'Écrivez un commentaire d’au moins 8 caractères.'; err.classList.remove('hidden'); }
        return;
    }
    if (!nom) {
        if (err) { err.textContent = 'Indiquez votre nom.'; err.classList.remove('hidden'); }
        return;
    }
    try {
        const res = await apiFetch('/avis', {
            method: 'POST',
            body: JSON.stringify({
                nom,
                note,
                commentaire,
                role: user ? (user.type || 'client') : 'Visiteur'
            })
        });
        if (res && (res.status === 201 || res.status === 200) && res.body && res.body.id) {
            if (el('avisCommentaire')) el('avisCommentaire').value = '';
            if (el('avisNote')) el('avisNote').value = '0';
            document.querySelectorAll('#avisStars button').forEach(b => b.classList.remove('active'));
            renderLandingAvis();
            return;
        }
        if (err) {
            err.textContent = (res && res.body && res.body.error) || 'Impossible de publier l’avis.';
            err.classList.remove('hidden');
        }
    } catch (ex) {
        console.error(ex);
        if (err) { err.textContent = 'Erreur réseau.'; err.classList.remove('hidden'); }
    }
}

function openDemandeModal(prestaId, prestaNom) {
    const user = getCurrentUserVerified();
    if (!user) { showAuthRequired('Connectez-vous pour demander une prestation.'); return; }
    if (user.type !== 'client') { alert('Seuls les clients peuvent envoyer des demandes.'); return; }
    ensureDemandeModal();
    if (el('demandePrestataireId')) el('demandePrestataireId').value = prestaId;
    if (el('demandePrestataireNom')) el('demandePrestataireNom').value = prestaNom;
    if (el('demandeDate')) el('demandeDate').value = new Date().toISOString().split('T')[0];
    showModal('demandeModal');
}

async function submitDemande(e) {
    if (e) e.preventDefault();
    const user = getCurrentUserVerified();
    if (!user || user.type !== 'client') { showAuthRequired('Connectez-vous en tant que client.'); return; }
    const payload = {
        description: (el('demandeDescription') || {}).value || '',
        adresse: (el('demandeAdresse') || {}).value || '',
        date: (el('demandeDate') || {}).value || '',
        heure: (el('demandeHeure') || {}).value || '',
        budget: Number((el('demandeBudget') || {}).value || 0),
        prestataire_id: (el('demandePrestataireId') || {}).value || ''
    };
    try {
        const me = await apiFetch('/client/me', { method: 'GET' });
        if (!me || me.status !== 200 || !me.body) { alert('Profil client introuvable. Reconnectez-vous.'); return; }
        payload.client_id = me.body.id;
        const res = await apiFetch('/demandes', { method: 'POST', body: JSON.stringify(payload) });
        if (res && (res.status === 201 || res.status === 200)) {
            alert('Demande envoyée');
            closeModal('demandeModal');
            renderClientDemandes();
            return;
        }
        alert((res && res.body && res.body.error) || 'Erreur lors de l\'envoi.');
    } catch (err) {
        console.error(err);
        alert('Erreur réseau.');
    }
}

async function fillClientProfil() {
    try {
        const res = await apiFetch('/client/me', { method: 'GET' });
        if (!res || res.status !== 200 || !res.body) return;
        const c = res.body;
        const parts = String(c.nom || '').trim().split(/\s+/);
        if (el('profilNom')) el('profilNom').value = parts.slice(-1)[0] || c.nom || '';
        if (el('profilPrenom')) el('profilPrenom').value = parts.slice(0, -1).join(' ') || '';
        if (el('profilEmail')) el('profilEmail').value = c.email || '';
        if (el('profilPhone')) el('profilPhone').value = c.phone || '';
        if (el('profilVille')) el('profilVille').value = c.ville || '';
    } catch (e) { console.error(e); }
}

async function updateClientProfil(e) {
    if (e) e.preventDefault();
    const user = getCurrentUserVerified();
    if (!user || user.type !== 'client') { alert('Action non autorisée.'); return; }
    const nom = ((el('profilPrenom') || {}).value || '') + ' ' + ((el('profilNom') || {}).value || '');
    try {
        const res = await apiFetch('/client/me', {
            method: 'PUT',
            body: JSON.stringify({
                nom: nom.trim(),
                email: (el('profilEmail') || {}).value || '',
                phone: (el('profilPhone') || {}).value || '',
                ville: (el('profilVille') || {}).value || ''
            })
        });
        if (res && res.status === 200) alert('Profil client mis à jour');
        else alert((res && res.body && res.body.error) || 'Erreur lors de la sauvegarde.');
    } catch (err) {
        console.error(err);
        alert('Erreur réseau.');
    }
}

async function updatePrestaProfil(e) {
    if (e) e.preventDefault();
    const user = getCurrentUserVerified(); if (!user || user.type !== 'prestataire') { alert('Action non autorisée.'); return; }
    // gather form
    const payload = {
        nom: (el('prestaProfilNom') || {}).value || '',
        email: (el('prestaProfilEmail') || {}).value || '',
        phone: (el('prestaProfilPhone') || {}).value || '',
        ville: (el('prestaProfilVille') || {}).value || '',
        description: (el('prestaProfilDesc') || {}).value || '',
        tarif: Number((el('prestaProfilTarif') || {}).value || 0),
        horaires: (el('prestaProfilHoraires') || {}).value || '',
        zone_intervention: (el('prestaProfilZone') || {}).value || ''
    };
    try {
        const res = await apiFetch('/prestataire/me', { method: 'PUT', body: JSON.stringify(payload) });
        if (res && res.status === 200 && res.body && res.body.ok) {
            alert('Profil prestataire mis à jour');
            // refresh local view: fetch server presta info
            const me = await apiFetch('/prestataire/me', { method: 'GET' });
            if (me && me.status === 200 && me.body) {
                // update local DB minimal copy
                const prestas = DB.get('prestataires') || [];
                let p = prestas.find(x => String(x.userId) === String(me.body.user_id) || String(x.id) === String(me.body.id));
                if (!p) {
                    p = { id: me.body.id, userId: me.body.user_id };
                    prestas.push(p);
                }
                p.nom = me.body.nom; p.metier = me.body.metier; p.ville = me.body.ville; p.tarif = me.body.tarif; p.description = me.body.description; p.horaires = me.body.horaires || ''; p.zone_intervention = me.body.zone_intervention || '';
                DB.set('prestataires', prestas);
            }
        } else {
            alert((res && res.body && res.body.error) || 'Erreur lors de la sauvegarde.');
        }
    } catch (err) { console.error(err); alert('Erreur réseau.'); }
}

function renderClientNotifications() { const user = getCurrentUserVerified(); if (!user) return; const notifs = (DB.get('notifications') || []).filter(n => n.userId === user.id).slice(0, 10); const panel = el('notifList'); const dot = el('notifDot'); if (dot) dot.classList.toggle('hidden', !notifs.some(n => !n.read)); if (!panel) return; if (!notifs.length) { panel.innerHTML = '<p style="color:var(--gray)">Aucune notification</p>'; return; } panel.innerHTML = notifs.map(n => `<div class="notif-item ${n.read ? '' : 'unread'}">${escapeHtml(n.message)}</div>`).join(''); }

function toggleNotifPanel() { const pnl = el('notifPanel'); if (pnl) pnl.classList.toggle('hidden'); const user = getCurrentUserVerified(); if (user) { const notifs = DB.get('notifications') || []; notifs.filter(n => n.userId === user.id).forEach(n => n.read = true); DB.set('notifications', notifs); renderClientNotifications(); } }

async function repondreDevis(devisId, action) {
    if (!confirm(action === 'accepter' ? 'Accepter ce devis ?' : 'Refuser ce devis ?')) return;
    try {
        const res = await apiFetch('/devis/' + devisId + '/repondre', { method: 'POST', body: JSON.stringify({ action }) });
        if (res && res.status === 200) {
            alert(action === 'accepter' ? 'Devis accepté. Le prestataire a été informé.' : 'Devis refusé. Le prestataire a été informé.');
            renderClientDemandes();
            renderClientMessages();
            return;
        }
        alert((res && res.body && res.body.error) || 'Action impossible.');
    } catch (e) {
        console.error(e);
        alert('Erreur réseau.');
    }
}

function openReponseModal(demandeId) {
    const user = getCurrentUserVerified();
    if (!user || user.type !== 'prestataire') { showAuthRequired('Connectez-vous en tant que prestataire pour répondre.'); return; }
    if (el('reponseDemandeId')) el('reponseDemandeId').value = demandeId;
    if (el('reponseRecap')) el('reponseRecap').innerHTML = '<p style="color:var(--gray)">Chargement...</p>';
    showModal('reponseModal');
    apiFetch('/demandes', { method: 'GET' }).then(res => {
        if (!el('reponseRecap')) return;
        const d = res && Array.isArray(res.body) ? res.body.find(x => String(x.id) === String(demandeId)) : null;
        if (!d) { el('reponseRecap').innerHTML = '<p>Demande introuvable.</p>'; return; }
        el('reponseRecap').innerHTML = `<p><strong>Besoin :</strong> ${escapeHtml(d.description || '')}</p><p><strong>Date :</strong> ${escapeHtml(d.date || '')} ${escapeHtml(d.heure || '')}</p>`;
    }).catch(() => { if (el('reponseRecap')) el('reponseRecap').innerHTML = '<p>Impossible de charger la demande.</p>'; });
}

async function submitReponse(e) {
    if (e) e.preventDefault();
    const user = getCurrentUserVerified();
    if (!user || user.type !== 'prestataire') { alert('Action non autorisée.'); return; }
    const payload = {
        demande_id: (el('reponseDemandeId') || {}).value || '',
        prix: Number((el('reponsePrix') || {}).value || 0),
        date: (el('reponseDate') || {}).value || '',
        heure: (el('reponseHeure') || {}).value || '',
        delai: (el('reponseDelai') || {}).value || '',
        message: (el('reponseMessage') || {}).value || ''
    };
    try {
        const res = await apiFetch('/devis', { method: 'POST', body: JSON.stringify(payload) });
        if (res && res.status === 201) {
            alert('Devis envoyé. Le client le verra dans Mes demandes et Messages.');
            closeModal('reponseModal');
            renderPrestaDemandes();
            renderPrestaDevis();
            renderPrestaMessages();
            return;
        }
        alert((res && res.body && res.body.error) || 'Erreur lors de l\'envoi du devis.');
    } catch (err) {
        console.error(err);
        alert('Erreur réseau.');
    }
}

// Admin
async function initAdmin() {
    try {
        if (!localStorage.getItem('es_token')) { window.location.replace('index.html?login=1'); return; }
        const me = await apiFetch('/me', { method: 'GET' });
        if (!me || me.status !== 200 || !me.body || !me.body.user) { clearAuth(); window.location.replace('index.html?login=1'); return; }
        const user = me.body.user;
        if (user.type !== 'admin') { alert('Espace administrateur réservé aux administrateurs.'); window.location.replace('index.html'); return; }
        // load admin views from API where possible
        renderAdminDashboard(); renderAdminClients(); renderAdminPrestataires(); renderAdminDemandes(); renderAdminCategories();
    } catch (e) { console.error(e); clearAuth(); window.location.replace('index.html'); }
}

async function renderAdminDashboard() {
    try {
        const res = await apiFetch('/admin/stats', { method: 'GET' });
        if (res && res.status === 200 && res.body) {
            if (el('adminTotalClients')) el('adminTotalClients').textContent = res.body.clients;
            if (el('adminTotalPrestas')) el('adminTotalPrestas').textContent = res.body.prestataires;
            if (el('adminTotalDemandes')) el('adminTotalDemandes').textContent = res.body.demandes;
            if (el('adminTotalTerminees')) el('adminTotalTerminees').textContent = res.body.terminees || 0;
        } else {
            if (el('adminTotalClients')) el('adminTotalClients').textContent = (DB.get('clients') || []).length;
            if (el('adminTotalPrestas')) el('adminTotalPrestas').textContent = (DB.get('prestataires') || []).length;
            if (el('adminTotalDemandes')) el('adminTotalDemandes').textContent = (DB.get('demandes') || []).length;
        }
    } catch (e) {
        console.error(e);
    }
}

async function renderAdminClients() {
    const tbody = el('adminClientsTable'); if (!tbody) return;
    try {
        const res = await apiFetch('/admin/users', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            tbody.innerHTML = res.body.filter(u => u.type === 'client').map(c => `<tr><td>${escapeHtml(c.name || '')}</td><td>${escapeHtml(c.email || '')}</td><td>—</td><td>—</td><td>${escapeHtml(c.created_at || '')}</td><td><button onclick="deleteUser('${c.id}','client')">Suppr</button></td></tr>`).join('');
            return;
        }
    } catch (e) { console.error(e); }
    const clients = DB.get('clients') || []; tbody.innerHTML = clients.map(c => `<tr><td>${escapeHtml(c.nom || '')}</td><td>${escapeHtml(c.email || '')}</td><td>${escapeHtml(c.phone || '')}</td><td>${escapeHtml(c.ville || '')}</td><td>${formatDate(c.createdAt) || 'N/A'}</td><td><button onclick="deleteUser('${c.userId}','client')">Suppr</button></td></tr>`).join('');
}

async function renderAdminPrestataires() {
    const tbody = el('adminPrestasTable'); if (!tbody) return;
    try {
        const res = await apiFetch('/admin/prestataires', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            tbody.innerHTML = res.body.map(p => `<tr><td>${escapeHtml(p.nom || '')}</td><td>${escapeHtml(p.metier || '')}</td><td>${escapeHtml(p.ville || '')}</td><td>${p.note || 0}/5</td><td><button onclick="togglePrestaStatus('${p.id}')">${p.active !== false ? 'Désactiver' : 'Activer'}</button></td></tr>`).join('');
            return;
        }
    } catch (e) { console.error(e); }
    const prestas = DB.get('prestataires') || []; tbody.innerHTML = prestas.map(p => `<tr><td>${escapeHtml(p.nom || '')}</td><td>${escapeHtml(p.metier || '')}</td><td>${escapeHtml(p.ville || '')}</td><td>${p.note || 0}/5</td><td><button onclick="togglePrestaStatus('${p.id}')">${p.active !== false ? 'Désactiver' : 'Activer'}</button></td></tr>`).join('');
}

async function renderAdminDemandes() {
    const tbody = el('adminDemandesTable'); if (!tbody) return;
    try {
        const res = await apiFetch('/admin/demandes', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            tbody.innerHTML = res.body.map(d => `<tr><td>${escapeHtml(String(d.id) || '')}</td><td>${escapeHtml(d.description || '')}</td><td>${escapeHtml(d.status || '')}</td><td>${formatDate(d.created_at)}</td></tr>`).join('');
            return;
        }
    } catch (e) { console.error(e); }
    const demandes = DB.get('demandes') || []; tbody.innerHTML = demandes.map(d => `<tr><td>${escapeHtml(d.id || '')}</td><td>${escapeHtml(d.description || '')}</td><td>${escapeHtml(d.status || '')}</td><td>${formatDate(d.createdAt)}</td></tr>`).join('');
}

async function renderAdminCategories() { const container = el('adminCategoriesTags'); if (!container) return; try { const res = await apiFetch('/categories', { method: 'GET' }); if (res && res.status === 200 && Array.isArray(res.body)) { container.innerHTML = res.body.map(c => `<div class="category-tag">${escapeHtml(c.name)} <button onclick="deleteCategory(${c.id})">×</button></div>`).join(''); return; } } catch (e) { console.error(e); } const cats = DB.get('categories') || []; container.innerHTML = cats.map(c => `<div class="category-tag">${escapeHtml(c.name)} <button onclick="deleteCategory(${c.id})">×</button></div>`).join(''); }
async function addCategory() {
    const name = ((el('newCategoryName') || {}).value || '').trim();
    if (!name) return;
    try {
        const res = await apiFetch('/categories', { method: 'POST', body: JSON.stringify({ name }) });
        if (res && res.status === 201) {
            if (el('newCategoryName')) el('newCategoryName').value = '';
            renderAdminCategories();
            renderAdminDashboard();
            return;
        }
        alert((res && res.body && res.body.error) || 'Impossible d\'ajouter la catégorie.');
    } catch (e) { console.error(e); alert('Erreur réseau.'); }
}
async function deleteCategory(id) {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
        const res = await apiFetch('/categories/' + id, { method: 'DELETE' });
        if (res && res.status === 200) {
            renderAdminCategories();
            renderAdminDashboard();
            return;
        }
        alert((res && res.body && res.body.error) || 'Suppression impossible.');
    } catch (e) { console.error(e); alert('Erreur réseau.'); }
}
async function renderAdminAvis() {
    const container = el('adminAvisList');
    if (!container) return;
    try {
        const res = await apiFetch('/avis', { method: 'GET' });
        if (res && res.status === 200 && Array.isArray(res.body)) {
            if (!res.body.length) {
                container.innerHTML = '<p style="color:var(--gray);padding:24px;">Aucun avis à modérer pour le moment.</p>';
                return;
            }
            container.innerHTML = res.body.map(a => `<div class="avis-item"><strong>${escapeHtml(String(a.note || ''))}/5</strong> — ${escapeHtml(a.nom || '')} : ${escapeHtml(a.commentaire || '')}</div>`).join('');
            return;
        }
    } catch (e) { console.error(e); }
    const avis = DB.get('avis') || [];
    if (!avis.length) {
        container.innerHTML = '<p style="color:var(--gray);padding:24px;">Aucun avis à modérer pour le moment.</p>';
        return;
    }
    container.innerHTML = avis.map(a => `<div class="avis-item"><strong>${escapeHtml(String(a.note || ''))}/5</strong> — ${escapeHtml(a.commentaire || '')}</div>`).join('');
}
function togglePrestaStatus(id) { const prestas = DB.get('prestataires') || []; const p = prestas.find(x => x.id === id); if (p) { p.active = p.active === false ? true : false; DB.set('prestataires', prestas); renderAdminPrestataires(); } }
function deleteUser(userId, type) { if (!confirm('Supprimer cet utilisateur ?')) return; let users = DB.get('users') || []; users = users.filter(u => u.id !== userId); DB.set('users', users); if (type === 'client') { let clients = DB.get('clients') || []; clients = clients.filter(c => c.userId !== userId); DB.set('clients', clients); renderAdminClients(); } else { let prestas = DB.get('prestataires') || []; prestas = prestas.filter(p => p.userId !== userId); DB.set('prestataires', prestas); renderAdminPrestataires(); } renderAdminDashboard(); }

// Routing: call appropriate init based on pathname
document.addEventListener('DOMContentLoaded', () => {
    DB.init();
    const path = window.location.pathname.toLowerCase();
    if (path.includes('index.html') || path.endsWith('/') || path.endsWith('easy-service') || path.endsWith('easy-services')) initIndex();
    if (path.includes('recommandes.html')) initRecommandes();
    if (path.includes('contact.html')) initContact();
    if (path.includes('client.html')) initClient();
    if (path.includes('prestataire.html')) initPrestataire();
    if (path.includes('admin.html')) initAdmin();
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('modal') && e.target.classList.contains('active')) {
            e.target.classList.remove('active');
        }
    });
});
