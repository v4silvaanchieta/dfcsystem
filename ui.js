// ui.js — Renderização (dashboard, listas, modais), gráficos Chart.js e ações de interface.
import { state } from './state.js';
import { escapeHTML, formatCurrency, formatNumberToBR, calcFinancials, calcMargin, getClientToolCostInMonth, getMemberPct, isClientOTActive, getMemberCostInMonth, getCalculatedCosts } from './finance.js';

window.appActions = window.appActions || {};

function showToast(msg, type = 'success') {
    const existing = document.querySelectorAll('.toast-msg');
    existing.forEach(el => el.remove());

    const toast = document.createElement('div');
    toast.className = `toast-msg fixed bottom-6 right-6 px-5 py-3.5 rounded-xl font-bold text-white shadow-2xl z-[100] transition-all duration-500 transform translate-y-0 opacity-100 flex items-center gap-3 ${type === 'success' ? 'bg-emerald-600 border border-emerald-500/50' : 'bg-red-600 border border-red-500/50'}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-5 h-5"></i><span>${escapeHTML(msg)}</span>`;
    document.body.appendChild(toast);
    if(window.lucide) { window.lucide.createIcons({root: toast}); }

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}
if (typeof window !== 'undefined') window.showToast = showToast;

        function setupCurrencyMasks() {
            document.querySelectorAll('.currency-mask').forEach(input => {
                const newInp = input.cloneNode(true);
                if(input.parentNode) input.parentNode.replaceChild(newInp, input);

                newInp.addEventListener('input', e => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val === '') {
                        e.target.dataset.value = 0; e.target.value = '';
                    } else {
                        let num = Number(val) / 100;
                        e.target.dataset.value = num; e.target.value = formatNumberToBR(num);
                    }

                    if(newInp.id === 'client-recurringValue') {
                        const t = document.getElementById('client-recurringMargin');
                        if (t) t.innerText = formatCurrency(calcMargin(Number(newInp.dataset.value)));
                    }
                    if(newInp.id === 'client-oneTimeValue') {
                        const t = document.getElementById('client-oneTimeMargin');
                        if (t) t.innerText = formatCurrency(calcMargin(Number(newInp.dataset.value)));
                    }
                });
            });
        }

        function setCurrencyInput(id, value) {
            const el = document.getElementById(id);
            if(el) { el.dataset.value = value || 0; el.value = value ? formatNumberToBR(value) : ''; }
        }
        function getCurrencyInput(id) {
            const el = document.getElementById(id);
            return el ? Number(el.dataset.value || 0) : 0;
        }

        window.appActions.toggleAuthMode = () => {
            state.isSignUpMode = !state.isSignUpMode;
            document.getElementById('name-field').classList.toggle('hidden', !state.isSignUpMode);
            document.getElementById('btn-action').innerText = state.isSignUpMode ? 'Criar Conta' : 'Entrar no Sistema';
            document.getElementById('toggle-auth-text').innerText = state.isSignUpMode ? 'Já tem conta?' : 'Não tem uma conta?';
            document.querySelector('#toggle-auth-text + button').innerText = state.isSignUpMode ? 'Fazer Login' : 'Criar conta grátis';
        };

        window.appActions.changeTab = (tabId) => {
            state.activeTab = tabId;
            document.getElementById('sidebar').classList.add('-translate-x-full');
            document.getElementById('sidebar-overlay').classList.add('hidden');
            renderNav();
            renderContent();
        };

        window.appActions.toggleMobileMenu = () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            }
        };

        window.appActions.setFilterMode = (mode) => {
            state.filterMode = mode;

            ['month', 'year', 'all', 'forecast'].forEach(m => {
                const btn = document.getElementById(`filter-btn-${m}`);
                if(btn) {
                    if (m === mode) {
                        btn.className = 'px-3 md:px-4 py-1.5 text-xs font-bold rounded-md bg-[#333] text-white shadow-sm transition-all whitespace-nowrap';
                    } else {
                        btn.className = 'px-3 md:px-4 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-white transition-all whitespace-nowrap';
                    }
                }
            });

            document.getElementById('filter-month-container').classList.toggle('hidden', mode !== 'month');
            document.getElementById('filter-year-container').classList.toggle('hidden', mode !== 'year');

            renderContent();
        };

        window.appActions.updateSelectedMonth = (val) => { state.selectedMonth = val; updateYearOptions(); renderContent(); };
        window.appActions.updateSelectedYear = (val) => { state.selectedYear = val; renderContent(); };
        window.appActions.setClientFilter = (f) => { state.clientFilter = f; renderContent(); };
        window.appActions.setMemberChart = (id) => { state.selectedMemberId = id; renderChart(); };

        window.appActions.closeModal = () => {
            const modals = ['modal-client', 'modal-item', 'modal-history', 'modal-member-dashboard', 'modal-task'];
            modals.forEach(m => document.getElementById(m)?.classList.add('hidden'));
            document.getElementById('modal-backdrop').classList.add('hidden');
        };

        const showModalBase = (id) => {
            document.getElementById('modal-backdrop').classList.remove('hidden');
            document.getElementById(id).classList.remove('hidden');
        };

        window.appActions.openClientModal = (id) => {
            document.getElementById('client-modal-title').innerText = id ? 'Editar Projeto' : 'Cadastrar Projeto';
            const c = state.clients.find(x => x.id === id) || {};

            document.getElementById('client-id').value = id || '';
            document.getElementById('client-name').value = c.name || '';
            document.getElementById('client-phase').value = c.phase || 'Tratativa';
            document.getElementById('client-status').value = c.status || 'Ativo';
            document.getElementById('client-system').value = c.system || '';
            document.getElementById('client-deliveryDate').value = c.deliveryDate || '';
            document.getElementById('client-observation').value = c.observation || '';

            setCurrencyInput('client-recurringValue', c.recurringValue);
            setCurrencyInput('client-oneTimeValue', c.oneTimeValue);

            document.getElementById('client-recurringMargin').innerText = formatCurrency(calcMargin(c.recurringValue));
            document.getElementById('client-oneTimeMargin').innerText = formatCurrency(calcMargin(c.oneTimeValue));

            // Populate Team Allocations
            const cont = document.getElementById('team-allocations-container');
            cont.innerHTML = '';
            if (c.teamAllocations && c.teamAllocations.length > 0) {
                c.teamAllocations.forEach(a => window.appActions.addTeamAllocationRow(a.memberId, a.percentage));
            } else if (!id) {
                window.appActions.addTeamAllocationRow(); // Default row
            }

            showModalBase('modal-client');
        };

        window.appActions.addTeamAllocationRow = (memberId = '', pct = '') => {
            const cont = document.getElementById('team-allocations-container');
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 allocation-row';

            const sel = document.createElement('select');
            sel.className = 'flex-1 bg-[#111] border border-[#333] rounded-lg p-2 text-white text-xs outline-none focus:border-red-500 alloc-member';
            sel.innerHTML = `<option value="">Selecionar Membro</option>` + state.team.filter(m => (m.itemType || 'equipe') !== 'manutencao').map(m => `<option value="${m.id}" ${m.id === memberId ? 'selected' : ''}>${escapeHTML(m.name)}</option>`).join('');

            const inp = document.createElement('input');
            inp.type = 'number';
            inp.placeholder = '%';
            inp.value = pct;
            inp.className = 'w-20 bg-[#111] border border-[#333] rounded-lg p-2 text-white text-xs text-center outline-none focus:border-red-500 alloc-pct';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'text-gray-500 hover:text-red-500 p-2';
            btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
            btn.onclick = () => row.remove();

            row.appendChild(sel); row.appendChild(inp); row.appendChild(btn);
            cont.appendChild(row);
            if(window.lucide) window.lucide.createIcons({root: row});
        };

        window.appActions.onItemCategoryChange = () => {
            const cat = document.getElementById('item-category').value;
            const isFerr = cat === 'ferramenta';
            const isManut = cat === 'manutencao';
            const showType = isFerr || isManut; // Tipo de Custo (Único/Recorrente): ferramenta E manutenção
            document.getElementById('item-role-group').classList.toggle('hidden', cat !== 'equipe');
            document.getElementById('item-etype-group').classList.toggle('hidden', !showType);
            document.getElementById('item-client-group').classList.toggle('hidden', !isFerr);
            document.getElementById('item-name-label').innerText = isFerr ? 'Descrição / Fornecedor' : (isManut ? 'Descrição da Manutenção' : 'Nome do Integrante');
            document.getElementById('item-month-label').innerText = showType ? 'Mês de Referência / Início' : 'Mês de Início';
            document.getElementById('item-value-label').innerText = isFerr ? 'Valor do Custo (R$)' : (isManut ? 'Valor da Manutenção (R$)' : 'Salário/Custo Fixo Mensal (R$)');
            document.getElementById('item-hint').innerText = isFerr
                ? 'Ferramenta/Fornecedor: sai ANTES da margem (impacta o Faturamento Líquido).'
                : (isManut
                    ? 'Manutenção: sai DEPOIS da margem (impacta o Lucro). Pode ser Única ou Recorrente.'
                    : 'Equipe: custo fixo recorrente, sai DEPOIS da margem (impacta o Lucro).');
        };

        // category: 'equipe' | 'manutencao' | 'ferramenta'
        window.appActions.openItemModal = (category = 'equipe', id = '') => {
            let rec = {};
            let cat = category;
            if (id) {
                if (state.expenses.some(x => x.id === id)) {
                    rec = state.expenses.find(x => x.id === id) || {};
                    cat = 'ferramenta';
                } else {
                    rec = state.team.find(x => x.id === id) || {};
                    cat = rec.itemType || 'equipe';
                }
            }

            document.getElementById('item-id').value = id || '';
            document.getElementById('item-category').value = cat;
            document.getElementById('item-modal-title').innerText = id ? 'Editar Custo' : 'Novo Custo';

            const sel = document.getElementById('item-clientId');
            sel.innerHTML = `<option value="">Custo Geral (Não Alocado)</option>` + state.clients.filter(c => c.status !== 'Churn').map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');

            document.getElementById('item-name').value = rec.name || '';
            if (cat === 'ferramenta') {
                document.getElementById('item-role').value = '';
                document.getElementById('item-expense-type').value = rec.type || 'recorrente';
                document.getElementById('item-month').value = rec.month || state.selectedMonth;
                sel.value = rec.clientId || '';
                setCurrencyInput('item-value', rec.amount);
            } else {
                document.getElementById('item-role').value = rec.role || '';
                document.getElementById('item-expense-type').value = rec.type || 'recorrente';
                document.getElementById('item-month').value = rec.startMonth || state.selectedMonth;
                setCurrencyInput('item-value', rec.cost);
            }

            window.appActions.onItemCategoryChange();
            showModalBase('modal-item');
        };

        window.appActions.openHistoryModal = (month) => {
            const c = state.closures.find(x => x.month === month);
            if (!c) return;
            const custoFerr = c.custoFerramenta !== undefined ? Number(c.custoFerramenta) : 0;
            const custoEq = c.custoEquipe !== undefined ? Number(c.custoEquipe) : (Number(c.margemTotalRealizada||0) - Number(c.lucroLiquido||0));
            const bruto = Number(c.mrrBrutoRealizado||0) + Number(c.otBrutoRealizado||0);

            let memberRows;
            if (c.memberMargins && Object.keys(c.memberMargins).length > 0) {
                memberRows = Object.entries(c.memberMargins).map(([mid, val]) => {
                    const m = state.team.find(x => x.id === mid);
                    return `<div class="flex justify-between items-center bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5">
                        <span class="text-sm text-gray-300 font-medium">${m ? escapeHTML(m.name) : '<span class="text-gray-600">Membro removido</span>'}</span>
                        <span class="text-sm font-bold text-emerald-400">${formatCurrency(val)}</span>
                    </div>`;
                }).join('');
            } else {
                memberRows = `<p class="text-xs text-gray-600 italic">Nenhum repasse registrado neste fechamento.</p>`;
            }

            document.getElementById('history-modal-title').innerText = 'Fechamento ' + escapeHTML(c.month);
            document.getElementById('history-modal-content').innerHTML = `
                <div class="space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="p-4 rounded-xl bg-[#0a0a0a] border border-[#222]">
                            <p class="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Faturamento Bruto</p>
                            <p class="text-xl font-black text-white">${formatCurrency(bruto)}</p>
                        </div>
                        <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                            <p class="text-[10px] uppercase font-bold text-emerald-500 tracking-widest mb-1">Margem DFC</p>
                            <p class="text-xl font-black text-white">${formatCurrency(c.margemTotalRealizada)}</p>
                        </div>
                        <div class="p-4 rounded-xl ${Number(c.lucroLiquido||0)>=0?'bg-emerald-900/30 border-emerald-500/40':'bg-red-900/30 border-red-500/40'} border">
                            <p class="text-[10px] uppercase font-bold text-white/70 tracking-widest mb-1">Lucro Líquido</p>
                            <p class="text-xl font-black text-white">${formatCurrency(c.lucroLiquido)}</p>
                        </div>
                    </div>

                    <div class="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-[#222] pb-2">Cascata do Mês</h4>
                        <div class="space-y-2.5 text-sm">
                            <div class="flex justify-between"><span class="text-gray-500">MRR Bruto Realizado</span><span class="text-white font-medium">${formatCurrency(c.mrrBrutoRealizado)}</span></div>
                            <div class="flex justify-between"><span class="text-gray-500">One Time Realizado</span><span class="text-white font-medium">${formatCurrency(c.otBrutoRealizado)}</span></div>
                            <div class="flex justify-between border-t border-[#222] pt-2.5"><span class="text-gray-500">− Ferramenta/Fornecedor (antes da margem)</span><span class="text-red-400 font-medium">-${formatCurrency(custoFerr)}</span></div>
                            <div class="flex justify-between"><span class="text-gray-500">= Margem DFC (×35%)</span><span class="text-emerald-400 font-bold">${formatCurrency(c.margemTotalRealizada)}</span></div>
                            <div class="flex justify-between"><span class="text-gray-500">− Equipe/Manutenção (depois da margem)</span><span class="text-red-400 font-medium">-${formatCurrency(custoEq)}</span></div>
                            <div class="flex justify-between border-t border-[#333] pt-2.5"><span class="text-white font-black uppercase text-xs">Lucro Líquido</span><span class="font-black ${Number(c.lucroLiquido||0)>=0?'text-emerald-500':'text-red-500'}">${formatCurrency(c.lucroLiquido)}</span></div>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Repasse por Integrante</h4>
                        <div class="space-y-2">${memberRows}</div>
                    </div>
                </div>
            `;
            if(window.lucide) window.lucide.createIcons();
            showModalBase('modal-history');
        };

        function renderNav() {
            const tabs = [
                { id: 'dashboard', icon: 'layout-dashboard', label: 'Painel DFC' },
                { id: 'clients', icon: 'users', label: 'Clientes & Projetos' },
                { id: 'operation', icon: 'kanban-square', label: 'Operação' },
                { id: 'team', icon: 'briefcase', label: 'Equipe & Custos Fixos' },
                { id: 'closure', icon: 'calculator', label: 'Fechamento do Mês' },
                { id: 'history', icon: 'history', label: 'Histórico de Faturamento' }
            ];
            const navMenu = document.getElementById('nav-menu');
            if (navMenu) {
                navMenu.innerHTML = tabs.map(t => {
                    const activeClass = state.activeTab === t.id ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-900/40 translate-x-1' : 'text-gray-400 hover:bg-[#222] hover:text-white font-medium hover:translate-x-1';
                    return `
                    <button onclick="window.appActions.changeTab('${escapeHTML(t.id)}')" class="flex items-center gap-3 w-full p-3.5 rounded-xl transition-all duration-300 ${activeClass}">
                        <i data-lucide="${t.icon}" class="w-5 h-5"></i><span>${t.label}</span>
                    </button>`;
                }).join('');
            }
            const headerTitle = document.getElementById('header-title');
            if (headerTitle) {
                const activeTabObj = tabs.find(t => t.id === state.activeTab);
                headerTitle.innerText = activeTabObj ? activeTabObj.label : 'Meu Perfil';
            }
        }

        function updateYearOptions() {
            const select = document.getElementById('selected-year');
            if(!select) return;
            const currentYear = new Date().getFullYear().toString();
            const years = new Set([currentYear]);
            if (state.selectedMonth) years.add(state.selectedMonth.split('-')[0]);
            state.closures.forEach(c => { if(c.month) years.add(c.month.split('-')[0]); });

            const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
            select.innerHTML = sortedYears.map(y => `<option value="${y}">Resumo do Ano (${y})</option>`).join('');
            select.value = state.selectedYear;
        }

        function renderChart() {
            const ctx = document.getElementById('yearlyChart');
            const mCtx = document.getElementById('memberChart');

            if (ctx) {
                let mainLabels = [], mainFaturamento = [], mainCustos = [];

                if (state.filterMode === 'forecast') {
                    mainLabels = ['Projeção Atual'];
                    const activeC = state.clients.filter(c => c.status !== 'Churn');
                    const prevMRR = activeC.reduce((a, c) => a + Number(c.recurringValue||0), 0);
                    const prevOT = activeC.reduce((a, c) => isClientOTActive(c, state.selectedMonth) ? a + Number(c.oneTimeValue||0) : a, 0);
                    const { cFixo, cVarFornecedores } = getCalculatedCosts(state.selectedMonth);
                    const fin = calcFinancials(prevMRR + prevOT, cVarFornecedores, cFixo);
                    mainFaturamento = [fin.margemDFC];
                    mainCustos = [cFixo];
                } else if (state.filterMode === 'month') {
                    mainLabels = [state.selectedMonth];
                    const closedMonth = state.closures.find(c => c.month === state.selectedMonth);
                    if (closedMonth) {
                        const fatMargin = Number(closedMonth.margemTotalRealizada || 0);
                        mainFaturamento = [fatMargin];
                        mainCustos = [fatMargin - Number(closedMonth.lucroLiquido || 0)];
                    } else {
                        const moTrans = state.transactions.filter(t => t.month === state.selectedMonth);
                        const realMRR = moTrans.filter(t => t.type === 'recorrente').reduce((a, c) => a + Number(c.value || 0), 0);
                        const realOT = moTrans.filter(t => t.type === 'onetime').reduce((a, c) => a + Number(c.value || 0), 0);
                        const { cFixo, cVarFornecedores } = getCalculatedCosts(state.selectedMonth);
                        const fin = calcFinancials(realMRR + realOT, cVarFornecedores, cFixo);
                        mainFaturamento = [fin.margemDFC];
                        mainCustos = [cFixo];
                    }
                } else {
                    const isAll = state.filterMode === 'all';
                    const yearClosures = isAll ? state.closures : state.closures.filter(c => c.month && c.month.startsWith(state.selectedYear));
                    const sorted = [...yearClosures].sort((a,b) => a.month.localeCompare(b.month));
                    mainLabels = sorted.map(c => { const p = c.month.split('-'); return p[1] + '/' + p[0].substring(2); });
                    mainFaturamento = sorted.map(c => Number(c.margemTotalRealizada || 0));
                    mainCustos = sorted.map(c => Number(c.margemTotalRealizada || 0) - Number(c.lucroLiquido || 0));
                }

                if(state.chartInstance) state.chartInstance.destroy();

                if(mainLabels.length === 0) {
                    state.chartInstance = new Chart(ctx, {
                        type: 'bar',
                        data: { labels: ['Sem Dados'], datasets: [{ label: `Nenhum fechamento`, data: [0], backgroundColor: '#333', borderRadius: 4 }] },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { display: false } }, plugins: { legend: { labels: { color: '#666' } } } }
                    });
                } else {
                    const mainColors = mainFaturamento.map((f, i) => f >= mainCustos[i] ? '#10b981' : '#ef4444');
                    state.chartInstance = new Chart(ctx, {
                        type: 'bar',
                        data: { labels: mainLabels, datasets: [ { label: 'Faturamento (Margem)', data: mainFaturamento, backgroundColor: mainColors, borderRadius: 4 }, { label: 'Custos Totais', data: mainCustos, backgroundColor: '#4b5563', borderRadius: 4 } ] },
                        options: {
                            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                            scales: { y: { beginAtZero: true, grid: { color: '#222', drawBorder: false }, ticks: { color: '#666', callback: val => 'R$ ' + (val/1000) + 'k' } }, x: { grid: { display: false }, ticks: { color: '#888', font: {weight: 'bold'} } } },
                            plugins: { legend: { position: 'top', labels: { color: '#e5e7eb', boxWidth: 12, font: {family: 'inherit', size: 11} } }, tooltip: { backgroundColor: '#111', titleColor: '#fff', bodyColor: '#ccc', borderColor: '#333', borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: context => context.dataset.label + ': ' + formatCurrency(context.raw) } } }
                        }
                    });
                }
            }

            if (mCtx) {
                if (state.memberChartInstance) state.memberChartInstance.destroy();

                if (!state.selectedMemberId || state.team.length === 0) {
                    state.memberChartInstance = new Chart(mCtx, {
                        type: 'bar', data: { labels: ['Sem Dados'], datasets: [{ label: 'Nenhum membro selecionado', data: [0], backgroundColor: '#333', borderRadius: 4 }] },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { display: false } }, plugins: { legend: { labels: { color: '#666' } } } }
                    });
                } else {
                    const member = state.team.find(m => m.id === state.selectedMemberId);
                    let mLabels = [], mMargins = [], mCosts = [];

                    if (state.filterMode === 'forecast') {
                        mLabels = ['Projeção'];
                        const margin = state.clients.filter(c => c.status !== 'Churn').reduce((sum, c) => {
                            let m = 0;
                            if (Number(c.recurringValue || 0) > 0) m += calcMargin(Number(c.recurringValue));
                            if (isClientOTActive(c, state.selectedMonth)) m += calcMargin(Number(c.oneTimeValue));
                            return sum + (m * getMemberPct(c, member.id));
                        }, 0);
                        mMargins = [margin]; mCosts = [getMemberCostInMonth(member, state.selectedMonth)];
                    } else if (state.filterMode === 'month') {
                        mLabels = [state.selectedMonth];
                        const closedMonth = state.closures.find(c => c.month === state.selectedMonth);
                        if (closedMonth && closedMonth.memberMargins && closedMonth.memberMargins[member.id] !== undefined) {
                            mMargins = [Number(closedMonth.memberMargins[member.id] || 0)];
                        } else {
                            const moTrans = state.transactions.filter(t => t.month === state.selectedMonth);
                            const margin = moTrans.reduce((sum, t) => {
                                const c = state.clients.find(x => x.id === t.clientId);
                                const tMargin = t.marginValue !== undefined ? Number(t.marginValue) : calcMargin(Number(t.value || 0));
                                return sum + (c ? tMargin * getMemberPct(c, member.id) : 0);
                            }, 0);
                            mMargins = [margin];
                        }
                        mCosts = [getMemberCostInMonth(member, state.selectedMonth)];
                    } else {
                        const isAll = state.filterMode === 'all';
                        const closuresToUse = isAll ? state.closures : state.closures.filter(c => c.month && c.month.startsWith(state.selectedYear));
                        const sortedC = [...closuresToUse].sort((a,b) => a.month.localeCompare(b.month));

                        mLabels = sortedC.map(c => { const p = c.month.split('-'); return p[1] + '/' + p[0].substring(2); });
                        mMargins = sortedC.map(closure => {
                            if (closure.memberMargins && closure.memberMargins[member.id] !== undefined) return Number(closure.memberMargins[member.id] || 0);
                            const moTrans = state.transactions.filter(t => t.month === closure.month);
                            return moTrans.reduce((sum, t) => {
                                const c = state.clients.find(x => x.id === t.clientId);
                                const tMargin = t.marginValue !== undefined ? Number(t.marginValue) : calcMargin(Number(t.value || 0));
                                return sum + (c ? tMargin * getMemberPct(c, member.id) : 0);
                            }, 0);
                        });
                        mCosts = sortedC.map(closure => getMemberCostInMonth(member, closure.month));
                    }

                    const memberColors = mMargins.map((m, i) => m >= mCosts[i] ? '#10b981' : '#ef4444');
                    state.memberChartInstance = new Chart(mCtx, {
                        type: 'bar',
                        data: { labels: mLabels, datasets: [ { label: 'Faturamento Repassado', data: mMargins, backgroundColor: memberColors, borderRadius: 4 }, { label: 'Custo Fixo Mensal', data: mCosts, backgroundColor: '#4b5563', borderRadius: 4 } ] },
                        options: {
                            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                            scales: { y: { beginAtZero: true, grid: { color: '#222', drawBorder: false }, ticks: { color: '#666', callback: val => 'R$ ' + (val/1000) + 'k' } }, x: { grid: { display: false }, ticks: { color: '#888', font: {weight: 'bold'} } } },
                            plugins: { legend: { position: 'top', labels: { color: '#e5e7eb', boxWidth: 12, font: {family: 'inherit', size: 11} } }, tooltip: { backgroundColor: '#111', titleColor: '#fff', bodyColor: '#ccc', borderColor: '#333', borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: context => context.dataset.label + ': ' + formatCurrency(context.raw) } } }
                        }
                    });
                }
            }
        }

        function renderContent() {
            const content = document.getElementById('tab-content');
            if(!content) return;

            content.classList.remove('animate-fade-in');
            void content.offsetWidth;
            content.classList.add('animate-fade-in');

            if (state.activeTab === 'dashboard') { content.innerHTML = getDashboardHTML(); setTimeout(renderChart, 50); }
            else if (state.activeTab === 'clients') content.innerHTML = getClientsHTML();
            else if (state.activeTab === 'operation') content.innerHTML = getOperationHTML();
            else if (state.activeTab === 'team') content.innerHTML = getTeamHTML();
            else if (state.activeTab === 'closure') content.innerHTML = getClosureHTML();
            else if (state.activeTab === 'history') content.innerHTML = getHistoryHTML();
            else if (state.activeTab === 'profile') content.innerHTML = getProfileHTML();

            if(window.lucide) window.lucide.createIcons();
            setupCurrencyMasks();
        }


        function getDashboardHTML() {
            const mode = state.filterMode;
            const equipeChart = state.team.filter(m => (m.itemType || 'equipe') !== 'manutencao');
            if (equipeChart.length > 0 && (!state.selectedMemberId || !equipeChart.find(m => m.id === state.selectedMemberId))) {
                state.selectedMemberId = equipeChart[0].id;
            }

            let totalsHTML = '', infoText = '';

            if (mode === 'forecast') {
                const activeC = state.clients.filter(c => c.status !== 'Churn');
                const prevMRR = activeC.reduce((a, c) => a + Number(c.recurringValue || 0), 0);
                const prevOT = activeC.reduce((a, c) => isClientOTActive(c, state.selectedMonth) ? a + Number(c.oneTimeValue || 0) : a, 0);
                const totalFaturamentoPrevisto = prevMRR + prevOT;

                const { cFixo, cVarFornecedores, custosTotais } = getCalculatedCosts(state.selectedMonth);
                const finPrev = calcFinancials(totalFaturamentoPrevisto, cVarFornecedores, cFixo);
                const totalMargemPrevista = finPrev.margemDFC;
                const lucroPrevisto = finPrev.lucroLiquido;

                infoText = `<strong>Visão Prevista:</strong> Projetando a fotografia do momento como se todas as receitas ativas fossem pagas neste mês.`;
                totalsHTML = `
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] shadow-lg relative group">
                        <h3 class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-blue-500"></div> Faturamento Previsto (MRR + OT)</h3>
                        <div class="text-3xl font-bold text-white mb-1">${formatCurrency(totalFaturamentoPrevisto)}</div>
                    </div>
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-[#0a0a0a] border border-emerald-900/30 shadow-lg relative group">
                        <h3 class="text-emerald-500 text-xs uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Margem Prevista (DFC)</h3>
                        <div class="text-3xl font-bold text-white mb-1">${formatCurrency(totalMargemPrevista)}</div>
                        <p class="text-xs text-gray-500 font-medium mt-2 border-t border-emerald-900/30 pt-2 flex justify-between"><span>Custos Equipe (Forn. já na margem):</span><span class="text-red-400 font-bold">-${formatCurrency(cFixo)}</span></p>
                    </div>
                    <div class="p-6 rounded-2xl ${lucroPrevisto >= 0 ? 'bg-gradient-to-br from-emerald-900/40 border-emerald-500/50' : 'bg-gradient-to-br from-red-900/40 border-red-500/50'} border shadow-lg relative group">
                        <h3 class="text-white/70 text-xs uppercase font-bold tracking-widest mb-2">Lucro Potencial</h3>
                        <div class="text-4xl font-black text-white">${formatCurrency(lucroPrevisto)}</div>
                    </div>
                `;
            } else if (mode === 'year' || mode === 'all') {
                const isAll = mode === 'all';
                const contextYear = isAll ? 'Todo o Período' : state.selectedYear;
                const closuresToUse = isAll ? state.closures : state.closures.filter(c => c.month && c.month.startsWith(state.selectedYear));

                const realMRR = closuresToUse.reduce((a, c) => a + Number(c.mrrBrutoRealizado||0), 0);
                const realMargin = closuresToUse.reduce((a, c) => a + Number(c.margemTotalRealizada||0), 0);
                const lucro = closuresToUse.reduce((a, c) => a + Number(c.lucroLiquido||0), 0);
                const cTotais = realMargin - lucro;

                infoText = `<strong>Visão Consolidada (${contextYear}):</strong> Soma baseada em todos os meses que já foram fechados e travados.`;
                totalsHTML = `
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] shadow-lg relative group">
                        <h3 class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-gray-500"></div> MRR Bruto Realizado</h3>
                        <div class="text-3xl font-bold text-white mb-1">${formatCurrency(realMRR)}</div>
                    </div>
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-[#0a0a0a] border border-emerald-900/30 shadow-lg relative group">
                        <h3 class="text-emerald-500 text-xs uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div> Margem DFC Gerada</h3>
                        <div class="text-3xl font-bold text-white mb-1">${formatCurrency(realMargin)}</div>
                        <p class="text-xs text-gray-500 font-medium mt-2 border-t border-emerald-900/30 pt-2 flex justify-between"><span>Custos Históricos:</span><span class="text-red-400 font-bold">-${formatCurrency(cTotais)}</span></p>
                    </div>
                    <div class="p-6 rounded-2xl ${lucro >= 0 ? 'bg-gradient-to-br from-emerald-900/40 border-emerald-500/50' : 'bg-gradient-to-br from-red-900/40 border-red-500/50'} border shadow-lg relative group">
                        <h3 class="text-white/70 text-xs uppercase font-bold tracking-widest mb-2">Lucro Consolidado</h3>
                        <div class="text-4xl font-black text-white">${formatCurrency(lucro)}</div>
                    </div>
                `;
            } else {
                const closedMonth = state.closures.find(c => c.month === state.selectedMonth);
                let realMRR = 0, realOT = 0, realMargin = 0, cTotais = 0, lucro = 0;
                let isLocked = false;

                if (closedMonth) {
                    isLocked = true;
                    realMRR = Number(closedMonth.mrrBrutoRealizado || 0);
                    realMargin = Number(closedMonth.margemTotalRealizada || 0);
                    lucro = Number(closedMonth.lucroLiquido || 0);
                    cTotais = realMargin - lucro;
                } else {
                    const moTrans = state.transactions.filter(t => t.month === state.selectedMonth);
                    realMRR = moTrans.filter(t => t.type === 'recorrente').reduce((a, c) => a + Number(c.value || 0), 0);
                    realOT = moTrans.filter(t => t.type === 'onetime').reduce((a, c) => a + Number(c.value || 0), 0);

                    const calculated = getCalculatedCosts(state.selectedMonth);
                    const finMes = calcFinancials(realMRR + realOT, calculated.cVarFornecedores, calculated.cFixo);
                    realMargin = finMes.margemDFC;
                    cTotais = calculated.cFixo;
                    lucro = finMes.lucroLiquido;
                }

                infoText = `<strong>Visão do Mês (${state.selectedMonth}):</strong> Cruzamento das receitas efetivamente recebidas contra os custos configurados para este mês.`;
                totalsHTML = `
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] shadow-lg relative group">
                        <h3 class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-gray-500"></div> MRR Bruto Realizado</h3>
                        <div class="text-3xl font-bold text-white mb-1">${formatCurrency(realMRR)}</div>
                    </div>
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-[#0a0a0a] border border-emerald-900/30 shadow-lg relative group">
                        <h3 class="text-emerald-500 text-xs uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-50 animate-pulse"></div> Margem DFC Realizada</h3>
                        <div class="text-3xl font-bold text-white mb-1">${formatCurrency(realMargin)}</div>
                        <p class="text-xs text-gray-500 font-medium mt-2 border-t border-emerald-900/30 pt-2 flex justify-between"><span>Custos Aplicáveis:</span><span class="text-red-400 font-bold">-${formatCurrency(cTotais)}</span></p>
                    </div>
                    <div class="p-6 rounded-2xl ${lucro >= 0 ? 'bg-gradient-to-br from-emerald-900/40 border-emerald-500/50' : 'bg-gradient-to-br from-red-900/40 border-red-500/50'} border shadow-lg relative group">
                        <h3 class="text-white/70 text-xs uppercase font-bold tracking-widest mb-2">Resultado do Mês ${isLocked ? '(Fechado)' : ''}</h3>
                        <div class="text-4xl font-black text-white">${formatCurrency(lucro)}</div>
                    </div>
                `;
            }

            return `
                <div class="space-y-6 animate-fade-in">
                    <div class="bg-blue-900/10 border border-blue-900/30 rounded-xl p-4 flex items-start gap-3 shadow-inner">
                        <i data-lucide="info" class="text-blue-400 w-5 h-5 flex-shrink-0 mt-0.5"></i>
                        <p class="text-sm text-blue-200/80 leading-relaxed">${infoText}</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">${totalsHTML}</div>

                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                        <div class="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl flex flex-col">
                            <div class="flex items-center justify-between mb-6">
                                <h3 class="text-xl font-bold text-white tracking-tight">Análise Geral (Margem x Custo)</h3>
                            </div>
                            <div class="h-80 w-full relative flex-1"><canvas id="yearlyChart"></canvas></div>
                        </div>

                        <div class="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl flex flex-col">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                <h3 class="text-xl font-bold text-white tracking-tight">Desempenho da Equipe</h3>
                                <select onchange="window.appActions.setMemberChart(this.value)" class="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-red-500">
                                    ${equipeChart.length===0?'<option>Sem Equipe</option>':equipeChart.map(m=>`<option value="${escapeHTML(m.id)}" ${state.selectedMemberId===m.id?'selected':''}>${escapeHTML(m.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="h-80 w-full relative flex-1"><canvas id="memberChart"></canvas></div>
                        </div>
                    </div>
                </div>
            `;
        }

        function getClientsHTML() {
            const moTrans = state.transactions.filter(t => t.month === state.selectedMonth);
            const list = state.clients.filter(c => state.clientFilter === 'Todos' || c.phase === state.clientFilter);

            // Clientes pendentes de pagamento SEMPRE no topo (baseado nas transactions do mês)
            const isClientPending = (client) => {
                if (client.status === 'Churn') return false;
                const cTrans = moTrans.filter(t => t.clientId === client.id);
                const recPend = Number(client.recurringValue||0) > 0 && !cTrans.find(t => t.type === 'recorrente');
                const otPend = Number(client.oneTimeValue||0) > 0 && isClientOTActive(client, state.selectedMonth) && !cTrans.find(t => t.type === 'onetime');
                return recPend || otPend;
            };
            list.sort((a, b) => (isClientPending(b) ? 1 : 0) - (isClientPending(a) ? 1 : 0));

            let html = `
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div class="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                        ${['Todos', 'Manutenção', 'Implementação', 'Tratativa'].map(p => `
                            <button onclick="window.appActions.setClientFilter('${escapeHTML(p)}')" class="px-5 py-2 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap ${state.clientFilter === p ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-[#111] text-gray-400 border border-[#333] hover:text-white'}">${escapeHTML(p)}</button>
                        `).join('')}
                    </div>
                    <button onclick="window.appActions.openClientModal()" class="bg-white text-black px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 w-full md:w-auto"><i data-lucide="plus" class="w-4 h-4"></i> Cadastrar Projeto</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            `;

            if(list.length === 0) html += `<div class="col-span-full py-20 text-center text-gray-500 border border-dashed border-[#333] rounded-2xl bg-[#111]">Nenhum projeto encontrado.</div>`;

            html += list.map(client => {
                const cTrans = moTrans.filter(t => t.clientId === client.id);
                const recTrans = cTrans.find(t => t.type === 'recorrente');
                const otTrans = cTrans.find(t => t.type === 'onetime');
                const isChurn = client.status === 'Churn';
                const recVal = Number(client.recurringValue) || 0;
                const otVal = Number(client.oneTimeValue) || 0;

                let teamBadges = '';
                if (client.teamAllocations && client.teamAllocations.length > 0) {
                    teamBadges = client.teamAllocations.map(alloc => {
                        const m = state.team.find(x => x.id === alloc.memberId);
                        return m ? `<span class="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-900/20 border border-emerald-900/50 px-2 py-0.5 rounded">${escapeHTML(m.name.split(' ')[0])} (${alloc.percentage}%)</span>` : '';
                    }).join('');
                }

                const hasPendingTask = state.tasks.some(t => t.clientId === client.id && t.status !== 'solucionado');

                let recHtml = '', otHtml = '';
                if(recVal > 0) {
                    recHtml = `<div class="flex items-center justify-between bg-[#0a0a0a] p-2 rounded-lg border border-[#1a1a1a]">
                        <div class="flex flex-col"><span class="text-[10px] text-gray-500 uppercase">MRR</span><span class="font-bold text-gray-200">${formatCurrency(recVal)}</span></div>
                        ${recTrans ? `<button data-action="removeBaixa" data-id="${escapeHTML(recTrans.id)}" class="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-md border border-emerald-500/20 font-bold">Recebido</button>` : `<button data-action="darBaixa" data-id="${escapeHTML(client.id)}" data-val="${recVal}" data-btype="recorrente" class="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md font-bold">Pagar</button>`}
                    </div>`;
                }
                if(otVal > 0 && isClientOTActive(client, state.selectedMonth)) {
                    otHtml = `<div class="flex items-center justify-between bg-[#0a0a0a] p-2 rounded-lg border border-[#1a1a1a]">
                        <div class="flex flex-col"><span class="text-[10px] text-gray-500 uppercase">One Time</span><span class="font-bold text-gray-200">${formatCurrency(otVal)}</span></div>
                        ${otTrans ? `<button data-action="removeBaixa" data-id="${escapeHTML(otTrans.id)}" class="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-md border border-emerald-500/20 font-bold">Recebido</button>` : `<button data-action="darBaixa" data-id="${escapeHTML(client.id)}" data-val="${otVal}" data-btype="onetime" class="text-xs bg-[#222] text-white px-3 py-1.5 rounded-md border border-[#444] font-bold">Pagar</button>`}
                    </div>`;
                }

                return `
                    <div class="bg-[#111] border ${isChurn ? 'border-red-900/50 opacity-60' : 'border-[#222]'} rounded-2xl p-6 relative flex flex-col h-full">
                        ${isChurn ? `<div class="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-lg rotate-12">CHURN</div>` : ''}
                        <div class="flex-1 cursor-pointer" data-action="openClientModal" data-id="${escapeHTML(client.id)}">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="font-black text-xl text-white">${escapeHTML(client.name)}</h3>
                                    <div class="flex flex-wrap gap-2 mt-2">
                                        ${hasPendingTask ? `<span class="text-[10px] uppercase font-black text-white bg-red-600 px-2 py-0.5 rounded animate-pulse">Tarefa Pendente</span>` : ''}
                                        <span class="text-[10px] uppercase font-bold text-gray-300 bg-[#222] border border-[#333] px-2 py-0.5 rounded">${escapeHTML(client.phase)}</span>
                                        ${teamBadges}
                                    </div>
                                </div>
                                <div class="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-gray-500"><i data-lucide="edit-3" class="w-4 h-4"></i></div>
                            </div>
                        </div>
                        <div class="pt-4 border-t border-[#222] space-y-2 mt-auto">
                            ${!isChurn ? `${recHtml}${otHtml}` : ''}
                            <button data-action="openTaskModal" data-clientid="${escapeHTML(client.id)}" class="w-full bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white hover:bg-[#222] text-xs font-bold py-2 rounded-md flex items-center justify-center gap-2 transition-colors"><i data-lucide="clipboard-plus" class="w-3.5 h-3.5"></i> Gerar Tarefa</button>
                        </div>
                    </div>
                `;
            }).join('');
            return html + '</div>';
        }

        // ================= OPERAÇÃO (KANBAN DE TAREFAS) =================
        const TASK_COLUMNS = [
            { key: 'solicitada', label: 'Demanda Solicitada', dot: 'bg-gray-500' },
            { key: 'analise', label: 'Em Análise', dot: 'bg-amber-500' },
            { key: 'executando', label: 'Executando', dot: 'bg-blue-500' },
            { key: 'solucionado', label: 'Solucionado', dot: 'bg-emerald-500' }
        ];

        function getOperationHTML() {
            const cols = TASK_COLUMNS.map((col, ci) => {
                const tasks = state.tasks.filter(t => (t.status || 'solicitada') === col.key);
                const cards = tasks.length === 0
                    ? `<div class="text-center text-[11px] text-gray-600 border border-dashed border-[#222] rounded-xl py-8">Sem tarefas</div>`
                    : tasks.map(t => {
                        const client = state.clients.find(c => c.id === t.clientId);
                        const due = t.dueDate ? t.dueDate.split('-').reverse().join('/') : '—';
                        const tagsHtml = (t.tags && t.tags.length) ? t.tags.map(tag => `<span class="text-[9px] uppercase font-bold text-gray-300 bg-[#1a1a1a] border border-[#333] px-1.5 py-0.5 rounded">${escapeHTML(tag)}</span>`).join('') : '';
                        const stakeHtml = (t.stakeholders && t.stakeholders.length) ? t.stakeholders.map(s => {
                            const phone = (s.phone || '').replace(/\D/g, '');
                            const nameRole = escapeHTML(s.name || '') + (s.role ? ` · ${escapeHTML(s.role)}` : '');
                            return phone
                                ? `<a href="https://wa.me/55${phone}" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300"><i data-lucide="phone" class="w-3 h-3"></i> ${nameRole}</a>`
                                : `<span class="flex items-center gap-1.5 text-[11px] text-gray-400"><i data-lucide="user" class="w-3 h-3"></i> ${nameRole}</span>`;
                        }).join('') : '';
                        const costHtml = Number(t.cost || 0) > 0 ? `<span class="text-red-400 font-bold">-${formatCurrency(t.cost)}</span>` : '';

                        return `
                            <div class="bg-[#111] border border-[#222] rounded-xl p-4 shadow-lg animate-fade-in cursor-pointer group hover:border-[#333] transition-colors" data-action="openTaskModal" data-id="${escapeHTML(t.id)}">
                                <div class="flex justify-between items-start gap-2 mb-2">
                                    <h4 class="font-bold text-sm text-white leading-snug">${escapeHTML(t.title || 'Sem título')}</h4>
                                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button data-action="deleteTask" data-id="${escapeHTML(t.id)}" class="w-6 h-6 flex items-center justify-center bg-[#1a1a1a] rounded text-gray-500 hover:text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                                    </div>
                                </div>
                                ${client ? `<p class="text-[10px] uppercase font-bold text-blue-400 mb-2">${escapeHTML(client.name)}</p>` : ''}
                                ${tagsHtml ? `<div class="flex flex-wrap gap-1 mb-2">${tagsHtml}</div>` : ''}
                                ${stakeHtml ? `<div class="space-y-1 mb-2 border-t border-[#1a1a1a] pt-2">${stakeHtml}</div>` : ''}
                                <div class="flex justify-between items-center border-t border-[#1a1a1a] pt-2 mt-2">
                                    <span class="text-[10px] text-gray-500 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${due}</span>
                                    ${costHtml}
                                </div>
                                <div class="flex justify-between gap-2 mt-3">
                                    <button data-action="moveTask" data-id="${escapeHTML(t.id)}" data-dir="prev" class="flex-1 bg-[#1a1a1a] border border-[#333] rounded-md py-1.5 text-gray-400 hover:text-white flex items-center justify-center ${ci === 0 ? 'opacity-30 pointer-events-none' : ''}"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
                                    <button data-action="moveTask" data-id="${escapeHTML(t.id)}" data-dir="next" class="flex-1 bg-[#1a1a1a] border border-[#333] rounded-md py-1.5 text-gray-400 hover:text-white flex items-center justify-center ${ci === TASK_COLUMNS.length - 1 ? 'opacity-30 pointer-events-none' : ''}"><i data-lucide="arrow-right" class="w-4 h-4"></i></button>
                                </div>
                            </div>
                        `;
                    }).join('');

                return `
                    <div class="flex-1 min-w-[280px] bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-4 flex flex-col">
                        <div class="flex items-center justify-between mb-4 px-1">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full ${col.dot}"></span>
                                <h3 class="text-xs font-black uppercase tracking-wider text-gray-300">${col.label}</h3>
                            </div>
                            <span class="text-[10px] font-bold text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">${tasks.length}</span>
                        </div>
                        <div class="space-y-3 flex-1">${cards}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="animate-fade-in">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h2 class="text-2xl font-bold text-white tracking-tight">Operação</h2>
                            <p class="text-sm text-gray-500 mt-1">Kanban de tarefas interligado a Clientes e Finanças.</p>
                        </div>
                        <button data-action="openTaskModal" data-id="" data-clientid="" class="bg-white text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200"><i data-lucide="plus" class="w-4 h-4"></i> Nova Tarefa</button>
                    </div>
                    <div class="flex gap-4 overflow-x-auto pb-4">${cols}</div>
                </div>
            `;
        }

        window.appActions.openTaskModal = (id = '', clientId = '') => {
            const t = id ? (state.tasks.find(x => x.id === id) || {}) : {};
            document.getElementById('task-modal-title').innerText = id ? 'Editar Tarefa' : 'Nova Tarefa';
            document.getElementById('task-id').value = id || '';

            const sel = document.getElementById('task-clientId');
            sel.innerHTML = `<option value="">Selecionar Cliente</option>` + state.clients.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
            sel.value = clientId || t.clientId || '';
            sel.disabled = !!clientId; // travado quando veio do botão "Gerar Tarefa" do card do cliente

            document.getElementById('task-title').value = t.title || '';
            document.getElementById('task-status').value = t.status || 'solicitada';
            document.getElementById('task-requestedBy').value = t.requestedBy || '';
            document.getElementById('task-supplier').value = t.supplier || '';
            document.getElementById('task-dueDate').value = t.dueDate || '';
            document.getElementById('task-tags').value = (t.tags && t.tags.length) ? t.tags.join(', ') : '';
            const links = t.links || {};
            document.getElementById('task-link-senhas').value = links.senhas || '';
            document.getElementById('task-link-cronograma').value = links.cronograma || '';
            document.getElementById('task-link-contrato').value = links.contrato || '';
            setCurrencyInput('task-cost', t.cost);

            const cont = document.getElementById('task-stakeholders-container');
            cont.innerHTML = '';
            if (t.stakeholders && t.stakeholders.length) {
                t.stakeholders.forEach(s => window.appActions.addStakeholderRow(s.name, s.role, s.phone));
            }

            showModalBase('modal-task');
        };

        window.appActions.addStakeholderRow = (name = '', role = '', phone = '') => {
            const cont = document.getElementById('task-stakeholders-container');
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 stakeholder-row';
            const mk = (ph, val, cls) => {
                const i = document.createElement('input');
                i.type = 'text'; i.placeholder = ph; i.value = val || '';
                i.className = `bg-[#111] border border-[#333] rounded-lg p-2 text-white text-xs outline-none focus:border-red-500 ${cls}`;
                return i;
            };
            const nameInp = mk('Nome', name, 'flex-1 stake-name');
            const roleInp = mk('Função', role, 'flex-1 stake-role');
            const phoneInp = mk('Telefone (DDD)', phone, 'w-32 stake-phone');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'text-gray-500 hover:text-red-500 p-2 flex-shrink-0';
            btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
            btn.onclick = () => row.remove();
            row.appendChild(nameInp); row.appendChild(roleInp); row.appendChild(phoneInp); row.appendChild(btn);
            cont.appendChild(row);
            if (window.lucide) window.lucide.createIcons({ root: row });
        };

        function getTeamHTML() {
            let html = `
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h2 class="text-2xl font-bold text-white tracking-tight">Equipe DFC</h2>
                    <button onclick="window.appActions.openItemModal('equipe')" class="bg-white text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Novo Integrante</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
            `;

            const equipeMembers = state.team.filter(m => (m.itemType || 'equipe') !== 'manutencao');
            if(equipeMembers.length === 0) html += `<div class="col-span-full py-10 text-center border border-dashed border-[#333] rounded-2xl bg-[#111]">Nenhum membro cadastrado.</div>`;
            else {
                html += equipeMembers.map(member => {
                    const memberClients = state.clients.filter(c => c.status !== 'Churn');
                    const mrrMcGerado = memberClients.reduce((acc, c) => acc + (calcMargin(Number(c.recurringValue||0)) * getMemberPct(c, member.id)), 0);
                    const mCost = getMemberCostInMonth(member, state.selectedMonth);
                    const lucro = mrrMcGerado - mCost;
                    const startStr = member.startMonth ? member.startMonth.split('-').reverse().join('/') : 'Sempre Ativo';
                    const itemCat = member.itemType || 'equipe';
                    const catBadge = itemCat === 'manutencao'
                        ? `<span class="text-orange-400 border border-orange-900/50 bg-orange-900/20 px-1 rounded ml-1">Manutenção</span>`
                        : '';

                    return `
                    <div class="bg-[#111] border border-[#222] rounded-2xl p-6 relative group flex flex-col cursor-pointer" data-action="openItemModal" data-cat="${itemCat}" data-id="${escapeHTML(member.id)}">
                        <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button data-action="deleteItem" data-coll="team" data-id="${escapeHTML(member.id)}" class="w-8 h-8 bg-[#222] rounded-lg text-gray-400 hover:text-red-500 flex items-center justify-center"><i data-lucide="trash" class="w-4 h-4"></i></button>
                        </div>
                        <div class="flex items-center gap-4 mb-6">
                            <div class="w-14 h-14 bg-red-800 rounded-xl flex items-center justify-center text-2xl font-black text-white">${escapeHTML(member.name).charAt(0).toUpperCase()}</div>
                            <div>
                                <h3 class="font-black text-xl text-white">${escapeHTML(member.name)}</h3>
                                <p class="text-[10px] text-gray-400 font-bold uppercase">${escapeHTML(member.role)} <span class="text-blue-400 border border-blue-900/50 bg-blue-900/20 px-1 rounded ml-1">Início: ${startStr}</span>${catBadge}</p>
                            </div>
                        </div>
                        <div class="space-y-1 bg-[#0a0a0a] rounded-xl p-4 border border-[#222]">
                            <div class="flex justify-between items-center text-sm py-1"><span class="text-gray-500">Custo Fixo Mensal:</span><span class="text-red-400">-${formatCurrency(mCost)}</span></div>
                            <div class="flex justify-between items-center text-sm py-1"><span class="text-gray-500">Margem (Repasse):</span><span class="text-emerald-400">+${formatCurrency(mrrMcGerado)}</span></div>
                            <div class="pt-2 mt-1 border-t border-[#333] flex justify-between items-center"><span class="text-xs font-black uppercase text-white">Lucro:</span><span class="font-black text-lg ${lucro>=0?'text-emerald-500':'text-red-500'}">${formatCurrency(lucro)}</span></div>
                        </div>
                    </div>`;
                }).join('');
            }
            html += `</div>`;

            // Expenses
            html += `
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-t border-[#222] pt-10">
                    <h2 class="text-2xl font-bold text-white tracking-tight">Custos & Fornecedores</h2>
                    <button onclick="window.appActions.openItemModal('ferramenta')" class="bg-[#1a1a1a] border border-[#333] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Novo Custo</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            `;
            const manutencaoItems = state.team.filter(m => m.itemType === 'manutencao');
            if(manutencaoItems.length === 0 && state.expenses.length === 0) html += `<div class="col-span-full py-10 text-center border border-dashed border-[#333] rounded-2xl bg-[#111]">Nenhum custo cadastrado.</div>`;
            else {
                html += manutencaoItems.map(item => {
                    const typeStr = item.type === 'unico' ? 'Único' : 'Recorrente';
                    const monthStr = item.startMonth ? item.startMonth.split('-').reverse().join('/') : 'Sempre';
                    return `
                        <div class="bg-[#111] border border-[#222] rounded-2xl p-6 relative group flex flex-col justify-between cursor-pointer" data-action="openItemModal" data-cat="manutencao" data-id="${escapeHTML(item.id)}">
                            <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button data-action="deleteItem" data-coll="team" data-id="${escapeHTML(item.id)}" class="w-8 h-8 flex items-center justify-center bg-[#222] rounded-lg text-gray-400 hover:text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
                            </div>
                            <h3 class="font-bold text-lg text-white mb-1 pr-16">${escapeHTML(item.name)}</h3>
                            <div class="flex flex-wrap gap-2 mb-4">
                                <p class="text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-900/20 border-orange-900/50 px-2 py-0.5 rounded border">Manutenção</p>
                                <p class="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-900/20 border-blue-900/50 px-2 py-0.5 rounded border">${typeStr} (${monthStr})</p>
                            </div>
                            <div class="text-2xl font-black text-red-400 mt-2">-${formatCurrency(item.cost)}</div>
                        </div>
                    `;
                }).join('');
                html += state.expenses.map(exp => {
                    const client = state.clients.find(c => c.id === exp.clientId);
                    const typeStr = exp.type === 'unico' ? 'Único' : 'Recorrente';
                    const monthStr = exp.month ? exp.month.split('-').reverse().join('/') : 'Sempre';

                    return `
                        <div class="bg-[#111] border border-[#222] rounded-2xl p-6 relative group flex flex-col justify-between cursor-pointer" data-action="openItemModal" data-cat="ferramenta" data-id="${escapeHTML(exp.id)}">
                            <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button data-action="deleteItem" data-coll="expenses" data-id="${escapeHTML(exp.id)}" class="w-8 h-8 flex items-center justify-center bg-[#222] rounded-lg text-gray-400 hover:text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
                            </div>
                            <h3 class="font-bold text-lg text-white mb-1 pr-16">${escapeHTML(exp.name)}</h3>
                            <div class="flex flex-wrap gap-2 mb-4">
                                <p class="text-[9px] font-bold uppercase tracking-wider ${client ? 'text-blue-400 bg-blue-900/20 border-blue-900/50' : 'text-gray-400 bg-[#222] border-[#333]'} px-2 py-0.5 rounded border">${client ? 'Projeto: ' + escapeHTML(client.name.split(' ')[0]) : 'Geral'}</p>
                                <p class="text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-900/20 border-orange-900/50 px-2 py-0.5 rounded border">${typeStr} (${monthStr})</p>
                            </div>
                            <div class="text-2xl font-black text-red-400 mt-2">-${formatCurrency(exp.amount)}</div>
                        </div>
                    `;
                }).join('');
            }
            html += `</div>`;
            return html;
        }

        function getClosureHTML() {
            const moTrans = state.transactions.filter(t => t.month === state.selectedMonth);
            const isLocked = state.closures.some(c => c.month === state.selectedMonth && c.locked);

            let html = `
                <div class="bg-[#111] border border-[#222] rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                    <div class="p-6 md:p-8 border-b border-[#222] bg-[#141414] flex flex-col md:flex-row md:justify-between items-center gap-4">
                        <h2 class="text-2xl font-black text-white">Fechamento: <span class="text-red-500">${escapeHTML(state.selectedMonth)}</span></h2>
                        ${isLocked ? `<div class="bg-red-900/20 text-red-400 border border-red-900/50 px-4 py-2 rounded-lg text-xs font-black uppercase"><i data-lucide="lock" class="w-4 h-4 inline mr-1"></i> Mês Travado</div>` : ''}
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead><tr class="bg-[#0a0a0a] border-b border-[#222] text-[10px] font-black uppercase text-gray-500">
                                <th class="p-5">Nome do Cliente</th><th class="p-5 text-right">Previsto (Contrato)</th><th class="p-5 text-right">Realizado (Baixa)</th>
                                <th class="p-5 text-right bg-[#111]">Margem Limpa DFC</th><th class="p-5 text-center">Status</th>
                            </tr></thead>
                            <tbody class="divide-y divide-[#222]">
            `;

            const validClients = state.clients.filter(c => c.status !== 'Churn' || (c.status === 'Churn' && moTrans.some(t => t.clientId === c.id)));
            if(validClients.length === 0) html += `<tr><td colspan="5" class="p-10 text-center text-gray-500">Nenhum projeto ativo.</td></tr>`;

            let somaPrevRec=0, somaPrevOt=0, somaRealRec=0, somaRealOt=0, somaMargem=0;

            validClients.forEach(client => {
                const cTrans = moTrans.filter(t => t.clientId === client.id);
                const recT = cTrans.find(t => t.type === 'recorrente');
                const otT = cTrans.find(t => t.type === 'onetime');
                const pR = Number(client.recurringValue||0);
                const pO = isClientOTActive(client, state.selectedMonth) ? Number(client.oneTimeValue||0) : 0;
                const rR = recT?recT.value:0;
                const rO = otT?otT.value:0;

                const clientForn = getClientToolCostInMonth(client.id, state.selectedMonth);
                const mTotal = calcFinancials(rR + rO, clientForn, 0).margemDFC;

                const isPaid = (pR===0 || rR>0) && (pO===0 || rO>0);
                const isPend = (pR>0 && rR===0) || (pO>0 && rO===0);

                somaPrevRec+=pR; somaPrevOt+=pO; somaRealRec+=rR; somaRealOt+=rO; somaMargem+=mTotal;

                let statusHTML = '-';
                if(isPaid && (pR>0||pO>0)) statusHTML = '<span class="bg-emerald-900/20 text-emerald-400 px-3 py-1 rounded text-[10px] uppercase font-bold">Tudo Pago</span>';
                else if(isPend) statusHTML = '<span class="bg-amber-900/20 text-amber-500 px-3 py-1 rounded text-[10px] uppercase font-bold">Pendente</span>';

                html += `
                    <tr class="hover:bg-[#1a1a1a]">
                        <td class="p-5 font-bold text-white text-sm">${escapeHTML(client.name)}</td>
                        <td class="p-5 text-right text-xs">${pR>0?`MRR: ${formatCurrency(pR)}<br>`:''}${pO>0?`O.T.: ${formatCurrency(pO)}`:''}</td>
                        <td class="p-5 text-right text-xs">${pR>0?`<span class="${rR>0?'text-emerald-400':'text-gray-600'}">${formatCurrency(rR)}</span><br>`:''}${pO>0?`<span class="${rO>0?'text-emerald-400':'text-gray-600'}">${formatCurrency(rO)}</span>`:''}</td>
                        <td class="p-5 text-right bg-[#111]"><span class="text-emerald-500 font-bold">${formatCurrency(mTotal)}</span></td>
                        <td class="p-5 text-center">${statusHTML}</td>
                    </tr>
                `;
            });

            if(validClients.length > 0) {
                 html += `
                    <tr class="bg-[#0a0a0a] border-t-2 border-[#333]">
                        <td class="p-5 font-black text-white text-sm uppercase text-right">TOTAL MÊS</td>
                        <td class="p-5 text-right text-xs font-bold text-gray-400">MRR: ${formatCurrency(somaPrevRec)}<br/>O.T.: ${formatCurrency(somaPrevOt)}</td>
                        <td class="p-5 text-right text-xs font-bold text-gray-200">MRR: ${formatCurrency(somaRealRec)}<br/>O.T.: ${formatCurrency(somaRealOt)}</td>
                        <td class="p-5 text-right font-black text-emerald-400 text-lg">${formatCurrency(somaMargem)}</td>
                        <td></td>
                    </tr>
                `;
            }

            html += `</tbody></table></div>
                <div class="p-6 md:p-8 bg-[#050505] flex justify-end">
                    <button onclick="window.appActions.lockMonth()" class="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-black uppercase text-xs transition-all shadow-lg hover:-translate-y-0.5"><i data-lucide="${isLocked ? 'refresh-cw' : 'lock'}" class="w-4 h-4 inline mr-2"></i> ${isLocked ? 'Atualizar Travamento' : 'Congelar & Salvar Mês'}</button>
                </div></div>`;
            return html;
        }

        function getHistoryHTML() {
            let html = `<div class="animate-fade-in"><div class="mb-8"><h2 class="text-2xl font-bold text-white tracking-tight">Histórico de Fechamentos</h2></div><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">`;
            if(state.closures.length === 0) html += `<div class="col-span-full py-20 text-center border border-dashed border-[#333] rounded-2xl bg-[#111]">Nenhum mês travado no histórico.</div>`;
            else {
                state.closures.sort((a,b) => b.month.localeCompare(a.month)).forEach(c => {
                    html += `
                    <div class="bg-[#111] border border-[#222] rounded-2xl p-6 relative flex flex-col shadow-lg cursor-pointer hover:border-[#3a3a3a] transition-colors" data-action="openHistoryModal" data-id="${escapeHTML(c.month)}">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="w-14 h-14 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-gray-400 border border-[#333]"><i data-lucide="calendar-days" class="w-6 h-6"></i></div>
                            <div>
                                <h3 class="font-black text-2xl text-white tracking-tighter">${escapeHTML(c.month)}</h3>
                                <span class="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-900/20 px-2 py-0.5 rounded w-max mt-1"><i data-lucide="lock" class="w-3 h-3 inline mr-1"></i> Travado</span>
                            </div>
                        </div>
                        <div class="bg-[#0a0a0a] rounded-xl p-4 border border-[#222] space-y-3 mb-4 flex-1">
                            <div class="flex justify-between items-center"><span class="text-[10px] text-gray-500 uppercase font-bold">MRR Bruto</span><span class="font-bold text-white text-sm">${formatCurrency(c.mrrBrutoRealizado)}</span></div>
                            <div class="flex justify-between items-center border-t border-[#222] pt-3"><span class="text-[10px] text-gray-500 uppercase font-bold">Margem</span><span class="font-bold text-emerald-400 text-sm">+${formatCurrency(c.margemTotalRealizada)}</span></div>
                            <div class="flex justify-between items-center border-t border-[#222] pt-3"><span class="text-[10px] text-gray-500 uppercase font-bold">Custos Equipe</span><span class="font-bold text-red-400 text-sm">-${formatCurrency(Number(c.margemTotalRealizada||0) - Number(c.lucroLiquido||0))}</span></div>
                        </div>
                        <div class="pt-4 border-t border-[#222] flex justify-between items-center">
                            <span class="text-[10px] text-gray-400 uppercase font-black">Líquido</span>
                            <span class="font-black text-2xl ${Number(c.lucroLiquido||0)>=0?'text-emerald-500':'text-red-500'} tracking-tight">${formatCurrency(c.lucroLiquido)}</span>
                        </div>
                    </div>`;
                });
            }
            return html + '</div></div>';
        }

        function getProfileHTML() {
            const userName = state.user?.displayName || '';
            const userEmail = state.user?.email || 'Visitante Anônimo';

            return `
                <div class="max-w-2xl mx-auto bg-[#111] border border-[#222] rounded-3xl shadow-2xl overflow-hidden animate-fade-in relative">
                    <div class="absolute -top-32 -left-32 w-64 h-64 bg-red-900/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div class="h-36 bg-gradient-to-br from-red-950 to-[#050505] relative border-b border-[#222]"></div>
                    <div class="px-8 pb-10 relative z-10">
                        <div class="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 mb-10 text-center sm:text-left">
                            <div class="w-32 h-32 bg-[#0a0a0a] border-4 border-[#111] rounded-full flex items-center justify-center text-5xl font-black text-red-500 shadow-2xl overflow-hidden">
                                ${userName ? userName.charAt(0).toUpperCase() : 'V'}
                            </div>
                            <div class="mb-2">
                                <h2 class="text-3xl font-black text-white tracking-tight">${escapeHTML(userName) || 'Visitante'}</h2>
                                <p class="text-gray-400 font-medium text-sm mt-1 bg-[#222] px-3 py-1 rounded-full border border-[#333] inline-block">${escapeHTML(userEmail)}</p>
                            </div>
                        </div>
                        <div class="space-y-6 bg-[#0a0a0a] p-8 rounded-2xl border border-[#222] shadow-inner">
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Nome de Exibição Público</label>
                                <input type="text" id="profile-name" value="${escapeHTML(userName)}" class="w-full bg-[#111] border border-[#333] rounded-xl p-3.5 text-white font-medium focus:border-red-500 outline-none" />
                            </div>
                            <div class="pt-6 mt-4 border-t border-[#222] flex flex-col sm:flex-row gap-4 justify-between items-center">
                                <button onclick="window.appActions.logout()" class="w-full sm:w-auto text-red-500 hover:text-white hover:bg-red-900 bg-red-950/20 border border-red-900/50 px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all"><i data-lucide="log-out" class="w-4 h-4 inline mr-2"></i> Encerrar Sessão</button>
                                <button onclick="window.appActions.saveProfile()" class="w-full sm:w-auto bg-white text-black px-8 py-3 rounded-xl font-black uppercase text-xs hover:bg-gray-200 transition-all shadow-lg"><i data-lucide="save" class="w-4 h-4 inline mr-2"></i> Salvar Perfil</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function updateHeaderGreeting() {
            if(!state.user) return;
            const name = state.user.displayName || (state.user.isAnonymous ? 'Visitante' : 'Usuário Financeiro');
            const snEl = document.getElementById('sidebar-user-name');
            const saIni = document.getElementById('sidebar-avatar-initial');
            if(snEl) snEl.innerText = name;
            if(saIni) saIni.innerText = name.charAt(0).toUpperCase();
        }

export { showToast, setCurrencyInput, getCurrencyInput, renderNav, updateYearOptions, renderContent, updateHeaderGreeting };
