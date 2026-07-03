// main.js — Inicialização do Firebase, autenticação, listeners onSnapshot e ações de persistência.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInAnonymously, signInWithCustomToken, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { state } from './state.js';
import { calcFinancials, calcMargin, getCalculatedCosts, getMemberPct } from './finance.js';
import { showToast, getCurrencyInput, renderNav, renderContent, updateYearOptions, updateHeaderGreeting } from './ui.js';

window.appActions = window.appActions || {};

        let firebaseConfig = {
            apiKey: "AIzaSyDML8GP1iSR92I-07L3cUhe9B3AwIuuQnM",
            authDomain: "squaddfc-a7f0e.firebaseapp.com",
            projectId: "squaddfc-a7f0e",
            storageBucket: "squaddfc-a7f0e.firebasestorage.app",
            messagingSenderId: "952471267384",
            appId: "1:952471267384:web:f253bc3a4e141a80b61ecd"
        };

        if (typeof __firebase_config !== 'undefined') {
            try { firebaseConfig = JSON.parse(__firebase_config); } catch(e) { console.error("Config fallback used"); }
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'squaddfc-a7f0e';

        window.appActions.handleEmailAuth = async () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            const name = document.getElementById('login-name').value;
            const errEl = document.getElementById('login-error');

            try {
                if (state.isSignUpMode) {
                    const cred = await createUserWithEmailAndPassword(auth, email, pass);
                    await updateProfile(cred.user, { displayName: name });
                } else {
                    await signInWithEmailAndPassword(auth, email, pass);
                }
            } catch (error) {
                errEl.innerText = "Erro na autenticação: Verifique seus dados.";
                errEl.classList.remove('hidden');
            }
        };

        window.appActions.loginWithGoogle = async () => {
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Erro ao entrar com Google:", error);
                const errEl = document.getElementById('login-error');
                errEl.innerText = "Falha ao aceder com o Google.";
                errEl.classList.remove('hidden');
            }
        };

        window.appActions.loginAnonymously = async () => {
            try { await signInAnonymously(auth); } catch (e) { console.error(e); }
        };

        window.appActions.logout = async () => {
            await signOut(auth);
            state.activeTab = 'dashboard';
        };

        window.appActions.saveClient = async () => {
            if (!state.user) return;
            const id = document.getElementById('client-id').value;
            const name = document.getElementById('client-name').value;
            if(!name) return showToast('Nome é obrigatório', 'error');

            const teamAllocations = [];
            let totalPct = 0;
            document.querySelectorAll('.allocation-row').forEach(row => {
                const m = row.querySelector('.alloc-member').value;
                const p = Number(row.querySelector('.alloc-pct').value);
                if (m && p > 0) {
                    teamAllocations.push({ memberId: m, percentage: p });
                    totalPct += p;
                }
            });

            if (teamAllocations.length > 0 && totalPct !== 100) {
                return showToast('A soma das porcentagens deve ser 100%', 'error');
            }

            const data = {
                name,
                phase: document.getElementById('client-phase').value,
                status: document.getElementById('client-status').value,
                system: document.getElementById('client-system').value,
                deliveryDate: document.getElementById('client-deliveryDate').value,
                recurringValue: getCurrencyInput('client-recurringValue'),
                oneTimeValue: getCurrencyInput('client-oneTimeValue'),
                observation: document.getElementById('client-observation').value,
                teamAllocations,
                updatedAt: serverTimestamp()
            };

            const coll = collection(db, 'artifacts', appId, 'users', state.user.uid, 'clients');
            try {
                if (id) await updateDoc(doc(coll, id), data);
                else await addDoc(coll, { ...data, createdAt: serverTimestamp() });

                showToast('Projeto salvo!');
                window.appActions.closeModal();
            } catch(e) { showToast('Erro ao salvar', 'error'); }
        };

        window.appActions.saveItem = async () => {
            if (!state.user) return;
            const id = document.getElementById('item-id').value;
            const cat = document.getElementById('item-category').value;
            const name = document.getElementById('item-name').value;
            if (!name) return showToast('Nome / Descrição obrigatório', 'error');

            const targetColl = cat === 'ferramenta' ? 'expenses' : 'team';
            const data = cat === 'ferramenta'
                ? {
                    name,
                    type: document.getElementById('item-expense-type').value,
                    month: document.getElementById('item-month').value,
                    clientId: document.getElementById('item-clientId').value,
                    amount: getCurrencyInput('item-value')
                  }
                : {
                    name,
                    role: document.getElementById('item-role').value,
                    startMonth: document.getElementById('item-month').value,
                    cost: getCurrencyInput('item-value'),
                    itemType: cat,
                    type: document.getElementById('item-expense-type').value // 'recorrente' | 'unico' (usado na Manutenção)
                  };

            const base = ['artifacts', appId, 'users', state.user.uid];
            try {
                if (id) {
                    // Permite trocar de categoria movendo entre coleções (team <-> expenses)
                    const oldColl = state.expenses.some(x => x.id === id) ? 'expenses' : (state.team.some(x => x.id === id) ? 'team' : targetColl);
                    if (oldColl === targetColl) {
                        await updateDoc(doc(db, ...base, targetColl, id), data);
                    } else {
                        await deleteDoc(doc(db, ...base, oldColl, id));
                        await addDoc(collection(db, ...base, targetColl), data);
                    }
                } else {
                    await addDoc(collection(db, ...base, targetColl), data);
                }
                showToast('Item salvo!');
                window.appActions.closeModal();
            } catch(e) { showToast('Erro ao salvar', 'error'); }
        };

        window.appActions.deleteItem = async (collName, id) => {
            if (!state.user) return;
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'users', state.user.uid, collName, id));
                showToast('Item removido');
            } catch(e) { showToast('Erro', 'error'); }
        };

        // Aliases de compatibilidade (chamadas antigas continuam funcionando)
        window.appActions.openTeamModal = (id) => window.appActions.openItemModal('equipe', id || '');
        window.appActions.openExpenseModal = (id) => window.appActions.openItemModal('ferramenta', id || '');
        window.appActions.deleteTeam = (id) => window.appActions.deleteItem('team', id);
        window.appActions.deleteExpense = (id) => window.appActions.deleteItem('expenses', id);

        window.appActions.darBaixa = async (clientId, val, type) => {
            if (!state.user) return;
            const data = {
                clientId, type, month: state.selectedMonth,
                value: Number(val),
                marginValue: calcMargin(Number(val)),
                createdAt: serverTimestamp()
            };
            try {
                await addDoc(collection(db, 'artifacts', appId, 'users', state.user.uid, 'transactions'), data);
                showToast('Pagamento confirmado!');
            } catch(e) { showToast('Erro na baixa', 'error'); }
        };

        window.appActions.removeBaixa = async (id) => {
            if (!state.user) return;
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'users', state.user.uid, 'transactions', id));
                showToast('Baixa removida');
            } catch(e) { showToast('Erro', 'error'); }
        };

        window.appActions.lockMonth = async () => {
            if (!state.user) return;
            const moTrans = state.transactions.filter(t => t.month === state.selectedMonth);

            let realMRR = 0, realOT = 0;
            moTrans.forEach(t => {
                if (t.type === 'recorrente') realMRR += Number(t.value || 0);
                if (t.type === 'onetime') realOT += Number(t.value || 0);
            });

            // Cascata DFC: "Ferramenta/Fornecedor" (cVarFornecedores) sai ANTES do x0.35; "Equipe" (cFixo) sai DEPOIS.
            const { cFixo, cVarFornecedores, custosTotais } = getCalculatedCosts(state.selectedMonth);
            const fin = calcFinancials(realMRR + realOT, cVarFornecedores, cFixo);
            const realMargin = fin.margemDFC;
            const lucroLiquido = fin.lucroLiquido;

            const memberMargins = {};
            state.team.forEach(m => {
                let margin = moTrans.reduce((sum, t) => {
                    const c = state.clients.find(x => x.id === t.clientId);
                    const tm = t.marginValue !== undefined ? Number(t.marginValue) : calcMargin(Number(t.value || 0));
                    return sum + (c ? tm * getMemberPct(c, m.id) : 0);
                }, 0);
                memberMargins[m.id] = margin;
            });

            const data = {
                month: state.selectedMonth,
                locked: true,
                mrrBrutoRealizado: realMRR,
                otBrutoRealizado: realOT,
                margemTotalRealizada: realMargin,
                custoFerramenta: cVarFornecedores,
                custoEquipe: cFixo,
                custosTotais,
                lucroLiquido,
                memberMargins,
                lockedAt: serverTimestamp()
            };

            const coll = collection(db, 'artifacts', appId, 'users', state.user.uid, 'monthly_closures');
            const exist = state.closures.find(c => c.month === state.selectedMonth);
            try {
                if (exist) await updateDoc(doc(coll, exist.id), data);
                else await addDoc(coll, data);
                showToast(`Mês ${state.selectedMonth} travado e salvo!`);
            } catch(e) { showToast('Erro', 'error'); }
        };

        window.appActions.saveProfile = async () => {
            const name = document.getElementById('profile-name').value;
            try {
                if(auth.currentUser) {
                    await updateProfile(auth.currentUser, { displayName: name });
                    state.user = auth.currentUser;
                    showToast('Perfil salvo!');
                    updateHeaderGreeting();
                    renderContent();
                } else {
                    showToast('Erro: Utilizador não autenticado.', 'error');
                }
            } catch(e) {
                showToast('Erro ao salvar o perfil.', 'error');
            }
        };

        let authReady = false;

        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) {
                console.error('Auth initialization error:', e);
            }
            authReady = true;
            if (auth.currentUser) {
                setupListeners(auth.currentUser);
            }
        };

        let unsubListeners = [];

        function setupListeners(user) {
            if (!user) return;
            unsubListeners.forEach(fn => fn());
            unsubListeners = [];

            const errCb = (e) => console.error('Snapshot err', e);

            const userDocPath = `artifacts/${appId}/users/${user.uid}`;

            unsubListeners.push(onSnapshot(collection(db, `${userDocPath}/clients`), s => { state.clients = s.docs.map(d => ({id: d.id, ...d.data()})); updateYearOptions(); renderContent(); }, errCb));
            unsubListeners.push(onSnapshot(collection(db, `${userDocPath}/transactions`), s => { state.transactions = s.docs.map(d => ({id: d.id, ...d.data()})); renderContent(); }, errCb));
            unsubListeners.push(onSnapshot(collection(db, `${userDocPath}/team`), s => { state.team = s.docs.map(d => ({id: d.id, ...d.data()})); renderContent(); }, errCb));
            unsubListeners.push(onSnapshot(collection(db, `${userDocPath}/expenses`), s => { state.expenses = s.docs.map(d => ({id: d.id, ...d.data()})); renderContent(); }, errCb));
            unsubListeners.push(onSnapshot(collection(db, `${userDocPath}/monthly_closures`), s => { state.closures = s.docs.map(d => ({id: d.id, ...d.data()})); updateYearOptions(); renderContent(); }, errCb));
        }

        onAuthStateChanged(auth, user => {
            state.user = user;
            const login = document.getElementById('login-screen');
            const app = document.getElementById('app-screen');

            if(user) {
                updateHeaderGreeting();
                login.classList.add('hidden');
                app.classList.remove('hidden');
                setTimeout(() => { app.classList.remove('opacity-0'); renderNav(); renderContent(); }, 50);

                // Only setup listeners if initAuth is complete. This avoids early snapshots on cached credentials.
                if (authReady) {
                    setupListeners(user);
                }
            } else {
                app.classList.add('hidden');
                login.classList.remove('hidden');
                setTimeout(() => { login.classList.remove('opacity-0'); }, 50);
                unsubListeners.forEach(fn => fn());
                unsubListeners = [];
            }
        });

        // ================= DELEGAÇÃO DE CLIQUES (data-action / data-id — evita interpolar ids inline e o "Unexpected token") =================
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const d = el.dataset;
            const A = window.appActions;
            switch (d.action) {
                case 'openClientModal': A.openClientModal(d.id); break;
                case 'openItemModal': A.openItemModal(d.cat, d.id || ''); break;
                case 'deleteItem': A.deleteItem(d.coll, d.id); break;
                case 'darBaixa': A.darBaixa(d.id, Number(d.val), d.btype); break;
                case 'removeBaixa': A.removeBaixa(d.id); break;
                case 'openHistoryModal': A.openHistoryModal(d.id); break;
            }
        });

        // Initialize Authentication before everything else
        initAuth();
