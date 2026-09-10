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
function closeModal(id) { const e = el(id); if (e) e.classList.remove('active'); }
function escapeHtml(str) { if (str === undefined || str === null) return ''; return String(str).replace(/[&<>'"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]); }
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

function showAuthRequired(message) {
    const msg = message || 'Vous devez être connecté pour effectuer cette action.';
    if (confirm(msg + '\n\nVoulez-vous vous connecter ? (Annuler = Créer un compte)')) {
        showModal('loginModal');
    } else {
        showModal('registerModal');
    }
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
    const sections = document.querySelectorAll('.client-section');
    sections.forEach(s => s.classList.remove('active'));
    const id = 'section-' + section;
    const target = el(id);
    if (target) target.classList.add('active');
    if (btn) deactivateSiblings(btn);
    // trigger renders when opening a section
    if (section === 'demandes') renderClientDemandes();
    if (section === 'messages') renderClientMessages();
    if (section === 'profil') { /* potential profile render */ }
}

function showPrestataireSection(section, btn) {
    const sections = document.querySelectorAll('.prestataire-section');
    sections.forEach(s => s.classList.remove('active'));
    const id = 'presta-' + section;
    const target = el(id);
    if (target) target.classList.add('active');
    if (btn) deactivateSiblings(btn);
    if (section === 'demandes') renderPrestaDemandes();
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
        const clients = DB.get('clients') || [];
        const demandes = DB.get('demandes') || [];
        const terminees = demandes.filter(d => d.status === 'terminee');
        if (el('statPrestataires')) el('statPrestataires').textContent = prestas.length;
        if (el('statClients')) el('statClients').textContent = clients.length;
        if (el('statMissions')) el('statMissions').textContent = terminees.length;

        // categories render
        if (catsContainer) {
            if (!cats.length) {
                catsContainer.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucune catégorie trouvée.</p>';
            } else {
                catsContainer.innerHTML = cats.map(c => `<div class="category-card" onclick="window.location.href='client.html?cat=${encodeURIComponent(c.name)}'"><i class="fas ${c.icon || 'fa-briefcase'}"></i><h3>${escapeHtml(c.name)}</h3><span>${c.count || 0} prestataire${(c.count || 0) > 1 ? 's' : ''}</span></div>`).join('');
            }
        }

        // top prestataires
        if (topGrid) {
            const top = prestas.slice(0, 6);
            if (!top.length) {
                topGrid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire mis en avant pour le moment.</p>';
            } else {
                topGrid.innerHTML = top.map(p => `<div class="presta-card"><div class="avatar">${escapeHtml((p.nom || p.name || '').charAt(0))}</div><div class="presta-info"><h3>${escapeHtml(p.nom || p.name || '')}</h3><span>${escapeHtml(p.metier || p.category || '')}</span><p>${escapeHtml((p.description || '').slice(0, 120))}</p></div><div class="presta-actions"><button class="btn-small-outline" onclick="openChat('${p.userId || p.user_id || ''}','${escapeHtml(p.nom || p.name || '')})">Message</button><button class="btn-small" onclick="window.location.href='prestataire.html?presta=${p.id || p.id}'">Voir profil</button></div></div>`).join('');
            }
        }

        // auth UI
        const user = getCurrentUserVerified();
        if (user) {
            if (el('navAuth')) el('navAuth').classList.add('hidden');
            if (el('navUser')) { el('navUser').classList.remove('hidden'); if (el('userNameDisplay')) el('userNameDisplay').textContent = user.name || user.nom || user.email; }
            if (user.type === 'admin' && el('navAdminBtn')) el('navAdminBtn').classList.remove('hidden');
        }

    } catch (e) {
        console.error('InitIndex error', e);
        if (catsContainer) catsContainer.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Erreur lors du chargement. Réessayez.</p>';
        if (topGrid) topGrid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Erreur lors du chargement. Réessayez.</p>';
    }
}

// Client
async function initClient() {
    // verify with server
    try {
        const me = await apiFetch('/me', { method: 'GET' });
        if (!me || me.status !== 200 || !me.body || !me.body.user) {
            clearAuth(); window.location.replace('index.html'); return;
        }
        const user = me.body.user;
        if (user.type !== 'client') { alert('Espace client réservé aux clients.'); window.location.replace('index.html'); return; }
        if (el('clientName')) el('clientName').textContent = user.name || user.email;
        renderPrestataires(); renderClientDemandes(); renderClientMessages();
    } catch (e) { console.error(e); clearAuth(); window.location.replace('index.html'); }
}

function renderPrestataires() { const grid = el('prestatairesGrid'); if (!grid) return; const prestas = DB.get('prestataires') || []; grid.innerHTML = prestas.filter(p => p.active !== false).map(p => `<div class="presta-card"><div class="avatar">${escapeHtml((p.nom || '').charAt(0))}</div><div class="presta-info"><h3>${escapeHtml(p.nom)}</h3><span>${escapeHtml(p.metier)}</span><p>${escapeHtml(p.description || '')}</p></div><div class="presta-actions"><button onclick="openChat('${p.userId}','${escapeHtml(p.nom)}')">Message</button><button onclick="window.location.href='prestataire.html?presta=${p.id}'">Voir profil</button></div></div>`).join(''); }

function renderClientDemandes() {
    const user = getCurrentUserVerified(); if (!user || user.type !== 'client') return; const clients = DB.get('clients') || []; const client = clients.find(c => c.userId === user.id); if (!client) return; const list = el('demandesList'); if (!list) return; const demandes = (DB.get('demandes') || []).filter(d => d.clientId === client.id); if (!demandes.length) { list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucune demande.</p>'; return; } list.innerHTML = demandes.map(d => `<div class="demande-item"><h4>${escapeHtml(d.description)}</h4><div>${escapeHtml(d.date || '')}</div></div>`).join('');
}

function renderClientMessages() {
    const user = getCurrentUserVerified(); if (!user) return; const container = el('messagesContainer'); if (!container) return; const messages = DB.get('messages') || []; const partners = new Set(); messages.filter(m => m.senderId === user.id || m.receiverId === user.id).forEach(m => partners.add(m.senderId === user.id ? m.receiverId : m.senderId)); if (!partners.size) { container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucune conversation.</p>'; return; } const prestas = DB.get('prestataires') || []; container.innerHTML = Array.from(partners).map(pid => { const p = prestas.find(x => x.userId === pid); const last = messages.filter(m => (m.senderId === user.id && m.receiverId === pid) || (m.senderId === pid && m.receiverId === user.id)).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]; return `<div class="conversation-item" onclick="openChat('${pid}','${escapeHtml(p ? (p.nom || '') : 'Utilisateur')}')"><div class="avatar">${escapeHtml((p ? (p.nom || '') : 'U').charAt(0))}</div><div class="info"><h4>${escapeHtml(p ? (p.nom || '') : 'Utilisateur')}</h4><p>${escapeHtml(last ? last.content : '')}</p></div></div>` }).join('');
}

// Messaging
let currentChatPartner = null;
function openChat(partnerId, partnerName) {
    const user = getCurrentUserVerified();
    if (!user) { showAuthRequired('Connectez-vous pour envoyer un message.'); return; }
    currentChatPartner = partnerId;
    if (el('chatModal')) {
        if (el('chatName')) el('chatName').textContent = partnerName || '';
        renderChatMessages('chatMessages');
        showModal('chatModal');
    }
}
function renderChatMessages(containerId) { const user = getCurrentUserVerified(); if (!user) return; const messages = (DB.get('messages') || []).filter(m => (m.senderId === user.id && m.receiverId === currentChatPartner) || (m.senderId === currentChatPartner && m.receiverId === user.id)).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); const container = el(containerId); if (!container) return; container.innerHTML = messages.map(m => `<div class="message ${m.senderId === user.id ? 'sent' : 'received'}">${escapeHtml(m.content)}<span class="t">${formatDateTime(m.timestamp)}</span></div>`).join(''); container.scrollTop = container.scrollHeight; }
function sendMessage() { const input = el('chatMessageInput'); if (!input) return; const txt = input.value.trim(); if (!txt || !currentChatPartner) return; const user = getCurrentUserVerified(); if (!user) { showAuthRequired('Connectez-vous pour envoyer un message.'); return; } const msgs = DB.get('messages') || []; msgs.push({ id: 'm' + generateId(), senderId: user.id, receiverId: currentChatPartner, content: txt, timestamp: new Date().toISOString(), read: false }); DB.set('messages', msgs); input.value = ''; renderChatMessages('chatMessages'); }

// Prestataire
async function initPrestataire() {
    try {
        const me = await apiFetch('/me', { method: 'GET' });
        if (!me || me.status !== 200 || !me.body || !me.body.user) { clearAuth(); window.location.replace('index.html'); return; }
        const user = me.body.user;
        if (user.type !== 'prestataire') { alert('Espace prestataire réservé aux prestataires.'); window.location.replace('index.html'); return; }
        if (el('prestaName')) el('prestaName').textContent = user.name || '';
        renderPrestaDemandes(); renderPrestaMessages();
        const inp = el('prestaPhotoInput'); if (inp) { inp.addEventListener('change', previewSelectedPhotos); }
        listPrestaServerPhotos();
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
function renderPrestaDemandes() { const user = getCurrentUserVerified(); if (!user || user.type !== 'prestataire') return; const prestas = DB.get('prestataires') || []; const presta = prestas.find(p => p.userId === user.id); if (!presta) return; const list = el('prestaAllDemandes'); if (!list) return; const demandes = (DB.get('demandes') || []).filter(d => d.prestataireId === presta.id); if (!demandes.length) { list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:20px;">Aucune demande.</p>'; return; } list.innerHTML = demandes.map(d => `<div class="demande-item"><h4>${escapeHtml(d.description)}</h4><div>${escapeHtml(d.date || '')}</div></div>`).join(''); }
function renderPrestaMessages() { /* similar to client*/ }

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
                grid.innerHTML = list.map(p => {
                    const photos = (p.photos || []).slice(0, 3).map(ph => `<img src="${ph.url}" style="width:60px;height:40px;object-fit:cover;border-radius:6px;margin-right:6px">`).join('');
                    return `<div class="presta-card"><div class="presta-card-header"><div class="avatar">${escapeHtml((p.nom || '').charAt(0))}</div><div class="presta-card-info"><h3>${escapeHtml(p.nom)}</h3><div class="metier">${escapeHtml(p.metier)}</div><div class="ville" style="color:var(--gray);font-size:13px">${escapeHtml(p.ville || (p.zone_intervention || ''))}</div></div></div><div class="presta-card-body"><p>${escapeHtml(p.description || '')}</p><div style="margin-top:10px">${photos}</div></div><div class="presta-card-footer"><div class="presta-tarif">${escapeHtml(p.tarif ? p.tarif + ' $' : '')}</div><div><button class="btn-small-outline" onclick="openChat('${p.user_id}','${escapeHtml(p.nom)}')">Message</button><button class="btn-small" onclick="window.location.href='prestataire.html?presta=${p.id}'">Voir profil</button></div></div></div>`
                }).join('');
            } else {
                // fallback to client DB
                const all = DB.get('prestataires') || [];
                const list = all.filter(p => p.active !== false && (!metier || (p.metier || '').toLowerCase().includes(metier.toLowerCase())) && (!ville || ((p.ville || '') + ',' + (p.zone_intervention || '')).toLowerCase().includes(ville.toLowerCase())));
                if (!list.length) { grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire trouvé pour cette recherche.</p>'; return; }
                grid.innerHTML = list.map(p => `<div class="presta-card"><div class="avatar">${escapeHtml((p.nom || '').charAt(0))}</div><div class="presta-info"><h3>${escapeHtml(p.nom)}</h3><span>${escapeHtml(p.metier)}</span><p>${escapeHtml(p.description || '')}</p></div><div class="presta-actions"><button onclick="openChat('${p.userId}','${escapeHtml(p.nom)}')">Message</button><button onclick="openDemandeModal('${p.id}','${escapeHtml(p.nom)}')">Demander un devis</button></div></div>`).join('');
            }
        }).catch(err => {
            console.error('Search error', err);
            // fallback to client DB
            const all = DB.get('prestataires') || [];
            const list = all.filter(p => p.active !== false && (!metier || (p.metier || '').toLowerCase().includes(metier.toLowerCase())) && (!ville || ((p.ville || '') + ',' + (p.zone_intervention || '')).toLowerCase().includes(ville.toLowerCase())));
            if (!list.length) { grid.innerHTML = '<p style="text-align:center;color:var(--gray);padding:40px;">Aucun prestataire trouvé pour cette recherche.</p>'; return; }
            grid.innerHTML = list.map(p => `<div class="presta-card"><div class="avatar">${escapeHtml((p.nom || '').charAt(0))}</div><div class="presta-info"><h3>${escapeHtml(p.nom)}</h3><span>${escapeHtml(p.metier)}</span><p>${escapeHtml(p.description || '')}</p></div><div class="presta-actions"><button onclick="openChat('${p.userId}','${escapeHtml(p.nom)}')">Message</button><button onclick="openDemandeModal('${p.id}','${escapeHtml(p.nom)}')">Demander un devis</button></div></div>`).join('');
        });
}

function filterByCategory(cat, btn) { document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); if (cat === 'all') { (el('searchMetier') || {}).value = ''; } else { (el('searchMetier') || {}).value = cat; } filterPrestataires(); }

function disableUrgence() { const b = el('urgenceBanner'); if (b) b.classList.add('hidden'); }

function clientAnalyzeProblem() {
    const input = el('clientAssistantInput'); if (!input) return; const text = input.value.trim(); if (!text) { alert("Décrivez d'abord votre problème."); return; }
    const lower = normalizeText(text);
    const keywords = ['fuite', 'douche', 'evier', 'prise', 'ordinateur', 'voiture', 'coiff']; let found = '';
    for (const k of keywords) if (lower.includes(k)) { found = k; break; }
    if (found) {
        const map = { 'fuite': 'Plombier', 'prise': 'Électricien', 'ordinateur': 'Informaticien', 'voiture': 'Mécanicien', 'coiff': 'Coiffeur' };
        const m = map[found] || '';
        if (m) { (el('searchMetier') || {}).value = m; filterPrestataires(); if (el('clientAssistantResult')) el('clientAssistantResult').innerHTML = `<p style="color:var(--primary)">Service détecté : ${m}</p>`; }
    } else {
        if (el('clientAssistantResult')) el('clientAssistantResult').innerHTML = '<p style="color:var(--gray)">Aucune correspondance trouvée.</p>';
    }
}

// Assistant functions used on index.html
function fillAssistant(text) {
    const ta = el('assistantInput'); if (!ta) return; ta.value = text || '';
}

function analyzeProblem() {
    const ta = el('assistantInput'); if (!ta) return; const text = ta.value.trim(); if (!text) { alert('Décrivez votre problème.'); return; }
    const lower = normalizeText(text);
    const keywords = ['fuite', 'douche', 'evier', 'prise', 'ordinateur', 'voiture', 'coiff']; let found = '';
    for (const k of keywords) if (lower.includes(k)) { found = k; break; }
    const rec = el('assistantRecommendation'); if (found) {
        const map = { 'fuite': 'Plombier', 'prise': 'Électricien', 'ordinateur': 'Informaticien', 'voiture': 'Mécanicien', 'coiff': 'Coiffeur' };
        const m = map[found] || '';
        if (m) { (el('searchMetier') || {}).value = m; filterPrestataires(); if (rec) { rec.classList.remove('hidden'); rec.innerHTML = `<p style="color:var(--primary)">Service détecté : ${m}</p>`; } }
    } else {
        if (rec) { rec.classList.remove('hidden'); rec.innerHTML = '<p style="color:var(--gray)">Aucune correspondance trouvée.</p>'; }
    }
}

function openDemandeModal(prestaId, prestaNom) {
    const user = getCurrentUserVerified();
    if (!user) { showAuthRequired('Connectez-vous pour demander une prestation.'); return; }
    if (user.type !== 'client') { alert('Seuls les clients peuvent envoyer des demandes.'); return; }
    if (el('demandePrestataireId')) el('demandePrestataireId').value = prestaId;
    if (el('demandePrestataireNom')) el('demandePrestataireNom').value = prestaNom;
    if (el('demandeDate')) el('demandeDate').value = new Date().toISOString().split('T')[0];
    showModal('demandeModal');
}

function submitDemande(e) {
    if (e) e.preventDefault(); const user = checkAuth('client'); if (!user) return; const clients = DB.get('clients') || []; const client = clients.find(c => c.userId === user.id); if (!client) { alert('Profil client introuvable'); return; } const demande = { id: 'd' + generateId(), clientId: client.id, prestataireId: (el('demandePrestataireId') || {}).value || '', description: (el('demandeDescription') || {}).value || '', adresse: (el('demandeAdresse') || {}).value || '', date: (el('demandeDate') || {}).value || '', heure: (el('demandeHeure') || {}).value || '', budget: Number((el('demandeBudget') || {}).value || 0), status: 'en_attente', urgency: (el('demandeUrgence') || {}).value || 'normal', createdAt: new Date().toISOString() };
    const demandes = DB.get('demandes') || []; demandes.push(demande); DB.set('demandes', demandes); alert('Demande envoyée'); closeModal('demandeModal'); renderClientDemandes();
}

function updateClientProfil(e) { if (e) e.preventDefault(); const user = getCurrentUserVerified(); if (!user || user.type !== 'client') { alert('Action non autorisée.'); return; } const clients = DB.get('clients') || []; const c = clients.find(x => x.userId === user.id); if (!c) return; c.nom = (el('profilNom') || {}).value || c.nom; c.prenom = (el('profilPrenom') || {}).value || c.prenom; c.email = (el('profilEmail') || {}).value || c.email; c.phone = (el('profilPhone') || {}).value || c.phone; c.ville = (el('profilVille') || {}).value || c.ville; c.quartier = (el('profilQuartier') || {}).value || c.quartier; c.adresse = (el('profilAdresse') || {}).value || c.adresse; DB.set('clients', clients); alert('Profil client mis à jour'); }

function updatePrestaProfil(e) { if (e) e.preventDefault(); const user = getCurrentUserVerified(); if (!user || user.type !== 'prestataire') { alert('Action non autorisée.'); return; } const prestas = DB.get('prestataires') || []; const p = prestas.find(x => x.userId === user.id); if (!p) return; p.nom = (el('prestaProfilNom') || {}).value || p.nom; p.email = (el('prestaProfilEmail') || {}).value || p.email; p.phone = (el('prestaProfilPhone') || {}).value || p.phone; p.ville = (el('prestaProfilVille') || {}).value || p.ville; p.description = (el('prestaProfilDesc') || {}).value || p.description; p.tarif = Number((el('prestaProfilTarif') || {}).value || p.tarif); p.horaires = (el('prestaProfilHoraires') || {}).value || p.horaires; DB.set('prestataires', prestas); alert('Profil prestataire mis à jour'); }

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

function sendPrestaMessage() { const input = el('prestaChatInput'); if (!input) return; const txt = input.value.trim(); if (!txt || !currentChatPartner) return; const user = getCurrentUserVerified(); if (!user) { showAuthRequired('Connectez-vous pour envoyer un message.'); return; } if (user.type !== 'prestataire') { alert('Action non autorisée.'); return; } const msgs = DB.get('messages') || []; msgs.push({ id: 'm' + generateId(), senderId: user.id, receiverId: currentChatPartner, content: txt, timestamp: new Date().toISOString(), read: false }); DB.set('messages', msgs); input.value = ''; if (el('prestaChatMessages')) renderChatMessages('prestaChatMessages'); }

function openReponseModal(demandeId) { const user = getCurrentUserVerified(); if (!user || user.type !== 'prestataire') { showAuthRequired('Connectez-vous en tant que prestataire pour répondre.'); return; } if (el('reponseDemandeId')) el('reponseDemandeId').value = demandeId; const demandes = DB.get('demandes') || []; const d = demandes.find(x => x.id === demandeId); const clients = DB.get('clients') || []; const c = d ? clients.find(x => x.id === d.clientId) : null; if (el('reponseRecap')) el('reponseRecap').innerHTML = `<p><strong>Client:</strong> ${escapeHtml(c ? c.nom : '')}</p><p><strong>Besoin:</strong> ${escapeHtml(d ? d.description : '')}</p>`; showModal('reponseModal'); }

function submitReponse(e) { if (e) e.preventDefault(); const user = getCurrentUserVerified(); if (!user || user.type !== 'prestataire') { alert('Action non autorisée.'); return; } const prestas = DB.get('prestataires') || []; const presta = prestas.find(p => p.userId === user.id); if (!presta) { alert('Profil prestataire introuvable'); return; } const demandeId = (el('reponseDemandeId') || {}).value || ''; const prix = Number((el('reponsePrix') || {}).value || 0); const date = (el('reponseDate') || {}).value || ''; const heure = (el('reponseHeure') || {}).value || ''; const delai = (el('reponseDelai') || {}).value || ''; const message = (el('reponseMessage') || {}).value || ''; const devis = DB.get('devis') || []; const dem = (DB.get('demandes') || []).find(d => d.id === demandeId); devis.push({ id: 'v' + generateId(), demandeId, prestataireId: presta.id, clientId: dem ? dem.clientId : '', prix, date, heure, delai, message, status: 'en_attente', createdAt: new Date().toISOString() }); DB.set('devis', devis); if (dem) { dem.status = 'devis_envoye'; DB.set('demandes', DB.get('demandes')); } alert('Devis envoyé'); closeModal('reponseModal'); renderPrestaDemandes(); }

// Admin
async function initAdmin() {
    try {
        const me = await apiFetch('/me', { method: 'GET' });
        if (!me || me.status !== 200 || !me.body || !me.body.user) { clearAuth(); window.location.replace('index.html'); return; }
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
function addCategory() { const name = (el('newCategoryName') || {}).value || ''; if (!name) return; const cats = DB.get('categories') || []; if (cats.find(x => x.name.toLowerCase() === name.toLowerCase())) { alert('Existe'); return; } cats.push({ id: Date.now(), name, icon: 'fa-circle', count: 0 }); DB.set('categories', cats); renderAdminCategories(); renderAdminDashboard(); }
function deleteCategory(id) { if (!confirm('Supprimer?')) return; let cats = DB.get('categories') || []; cats = cats.filter(c => c.id != id); DB.set('categories', cats); renderAdminCategories(); renderAdminDashboard(); }
function togglePrestaStatus(id) { const prestas = DB.get('prestataires') || []; const p = prestas.find(x => x.id === id); if (p) { p.active = p.active === false ? true : false; DB.set('prestataires', prestas); renderAdminPrestataires(); } }
function deleteUser(userId, type) { if (!confirm('Supprimer cet utilisateur ?')) return; let users = DB.get('users') || []; users = users.filter(u => u.id !== userId); DB.set('users', users); if (type === 'client') { let clients = DB.get('clients') || []; clients = clients.filter(c => c.userId !== userId); DB.set('clients', clients); renderAdminClients(); } else { let prestas = DB.get('prestataires') || []; prestas = prestas.filter(p => p.userId !== userId); DB.set('prestataires', prestas); renderAdminPrestataires(); } renderAdminDashboard(); }

// Routing: call appropriate init based on pathname
document.addEventListener('DOMContentLoaded', () => {
    DB.init();
    const path = window.location.pathname.toLowerCase();
    if (path.includes('index.html') || path.endsWith('/') || path.endsWith('easy-services')) initIndex();
    if (path.includes('client.html')) initClient();
    if (path.includes('prestataire.html')) initPrestataire();
    if (path.includes('admin.html')) initAdmin();
    // common safe calls
    try { if (el('notifList')) {/* noop */ } } catch (e) { }
});
