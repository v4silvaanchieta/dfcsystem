// ui.js — Renderização (dashboard, listas, modais), gráficos Chart.js e ações de interface.
import { state } from './state.js';
import { escapeHTML, formatCurrency, formatNumberToBR, calcFinancials, calcMargin, getClientToolCostInMonth, getMemberPct, isClientOTActive, getMemberCostInMonth, getCalculatedCosts, isClientLate, formatDateBR, getClientOTValueForMonth, getOTMonthIndex, getOTInstallments } from './finance.js';

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
        window.appActions.setClientsView = (v) => { state.clientsView = v; renderContent(); };
        window.appActions.setClientStatusFilter = (f) => { state.clientStatusFilter = f; renderContent(); };
        window.appActions.setClientSort = (field) => {
            const s = state.clientSort || { field: null, dir: 'asc' };
            state.clientSort = s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' };
            renderContent();
        };
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
            document.getElementById('client-startDate').value = c.startDate || '';
            document.getElementById('client-deliveryDate').value = c.deliveryDate || '';
            document.getElementById('client-delivered').checked = !!c.delivered;
            document.getElementById('client-cronograma').value = c.cronograma || '';
            document.getElementById('client-observation').value = c.observation || '';

            setCurrencyInput('client-recurringValue', c.recurringValue);
            setCurrencyInput('client-oneTimeValue', c.oneTimeValue);
            document.getElementById('client-oneTimeMonth').value = c.oneTimeMonth || '';
            document.getElementById('client-oneTimeInstallments').value = c.oneTimeInstallments || '';

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
                    const active = state.activeTab === t.id;
                    return `
                    <button onclick="window.appActions.changeTab('${escapeHTML(t.id)}')" class="relative flex items-center gap-3 w-full pl-4 pr-3 py-2.5 rounded-lg transition-colors ${active ? 'text-white bg-[#141416]' : 'text-gray-500 hover:text-white'}">
                        <span class="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full ${active ? 'bg-red-500' : 'bg-transparent'}"></span>
                        <i data-lucide="${t.icon}" class="w-[18px] h-[18px]"></i><span class="text-sm font-medium">${t.label}</span>
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
                    const prevOT = activeC.reduce((a, c) => a + getClientOTValueForMonth(c, state.selectedMonth), 0);
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
                            m += calcMargin(getClientOTValueForMonth(c, state.selectedMonth));
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

        let _lastRenderedTab = null;
        function renderContent() {
            const content = document.getElementById('tab-content');
            if(!content) return;

            // Filtro de período (Mensal/Anual/Geral/Previsto + seletores) só faz sentido em Painel e Fechamento.
            const pf = document.getElementById('period-filter');
            if (pf) pf.style.display = (state.activeTab === 'dashboard' || state.activeTab === 'closure') ? '' : 'none';

            // Re-anima SÓ ao trocar de aba — não a cada snapshot (evita a tela "piscar" o tempo todo).
            if (state.activeTab !== _lastRenderedTab) {
                content.classList.remove('animate-fade-in');
                void content.offsetWidth;
                content.classList.add('animate-fade-in');
                _lastRenderedTab = state.activeTab;
            }

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


        // Linha de KPIs flat (sem caixões): número grande + label, separados por régua fina.
        function kpiRow(items) {
            return `<div class="grid grid-cols-1 sm:grid-cols-3 border-t border-[#1a1a1d]">` + items.map((it, i) => `
                <div class="px-5 py-5 ${i < items.length - 1 ? 'sm:border-r' : ''} border-b sm:border-b-0 border-[#1a1a1d]">
                    <div class="text-[11px] uppercase tracking-wider text-gray-600 font-semibold flex items-center gap-2">${it.dot ? `<span class="w-1.5 h-1.5 rounded-full ${it.dot}"></span>` : ''}${it.label}</div>
                    <div class="dfc-mono ${it.big ? 'text-4xl' : 'text-3xl'} font-semibold ${it.color || 'text-white'} mt-2.5 tracking-tight">${it.value}</div>
                    ${it.sub ? `<div class="text-xs text-gray-500 mt-1.5">${it.sub}</div>` : ''}
                </div>`).join('') + `</div>`;
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
                const prevOT = activeC.reduce((a, c) => a + getClientOTValueForMonth(c, state.selectedMonth), 0);
                const totalFaturamentoPrevisto = prevMRR + prevOT;

                const { cFixo, cVarFornecedores, custosTotais } = getCalculatedCosts(state.selectedMonth);
                const finPrev = calcFinancials(totalFaturamentoPrevisto, cVarFornecedores, cFixo);
                const totalMargemPrevista = finPrev.margemDFC;
                const lucroPrevisto = finPrev.lucroLiquido;

                infoText = `<strong>Visão Prevista:</strong> Projetando a fotografia do momento como se todas as receitas ativas fossem pagas neste mês.`;
                totalsHTML = kpiRow([
                    { label: 'Faturamento Previsto (MRR + OT)', dot: 'bg-blue-500', value: formatCurrency(totalFaturamentoPrevisto) },
                    { label: 'Margem Prevista (DFC)', dot: 'bg-emerald-500', value: formatCurrency(totalMargemPrevista), sub: `− Custos Equipe ${formatCurrency(cFixo)} (fornecedor já na margem)` },
                    { label: 'Lucro Potencial', value: formatCurrency(lucroPrevisto), color: lucroPrevisto >= 0 ? 'text-emerald-400' : 'text-red-400', big: true }
                ]);
            } else if (mode === 'year' || mode === 'all') {
                const isAll = mode === 'all';
                const contextYear = isAll ? 'Todo o Período' : state.selectedYear;
                const closuresToUse = isAll ? state.closures : state.closures.filter(c => c.month && c.month.startsWith(state.selectedYear));

                const realMRR = closuresToUse.reduce((a, c) => a + Number(c.mrrBrutoRealizado||0), 0);
                const realMargin = closuresToUse.reduce((a, c) => a + Number(c.margemTotalRealizada||0), 0);
                const lucro = closuresToUse.reduce((a, c) => a + Number(c.lucroLiquido||0), 0);
                const cTotais = realMargin - lucro;

                infoText = `<strong>Visão Consolidada (${contextYear}):</strong> Soma baseada em todos os meses que já foram fechados e travados.`;
                totalsHTML = kpiRow([
                    { label: 'MRR Bruto Realizado', dot: 'bg-gray-500', value: formatCurrency(realMRR) },
                    { label: 'Margem DFC Gerada', dot: 'bg-emerald-500', value: formatCurrency(realMargin), sub: `− Custos ${formatCurrency(cTotais)}` },
                    { label: 'Lucro Consolidado', value: formatCurrency(lucro), color: lucro >= 0 ? 'text-emerald-400' : 'text-red-400', big: true }
                ]);
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
                totalsHTML = kpiRow([
                    { label: 'MRR Bruto Realizado', dot: 'bg-gray-500', value: formatCurrency(realMRR) },
                    { label: 'Margem DFC Realizada', dot: 'bg-emerald-500', value: formatCurrency(realMargin), sub: `− Custos ${formatCurrency(cTotais)}` },
                    { label: `Resultado do Mês ${isLocked ? '(Fechado)' : ''}`, value: formatCurrency(lucro), color: lucro >= 0 ? 'text-emerald-400' : 'text-red-400', big: true }
                ]);
            }

            // ===== Operacional: Implementação (entrega/prazo) e Pagamentos do mês =====
            const impl = state.clients.filter(c => c.phase === 'Implementação' && c.status !== 'Churn');
            const implNaoEntregue = impl.filter(c => !c.delivered);
            const implAtrasados = implNaoEntregue.filter(c => isClientLate(c)).length;
            const implAtivos = implNaoEntregue.length - implAtrasados;
            const implEntregues = impl.filter(c => c.delivered);
            const implForaPrazo = implEntregues.filter(c => c.deliveredAt && c.deliveryDate && c.deliveredAt > c.deliveryDate).length;
            const implNoPrazo = implEntregues.length - implForaPrazo;

            const moTransD = state.transactions.filter(t => t.month === state.selectedMonth);
            const statusPagto = (c) => {
                if (c.status === 'Churn') return 'none';
                const rec = Number(c.recurringValue || 0);
                const otA = isClientOTActive(c, state.selectedMonth);
                if (rec <= 0 && !otA) return 'none';
                const ct = moTransD.filter(t => t.clientId === c.id);
                const recOk = rec <= 0 || ct.some(t => t.type === 'recorrente');
                const otOk = !otA || ct.some(t => t.type === 'onetime');
                return (recOk && otOk) ? 'pago' : 'inadimplente';
            };
            let nPagos = 0, nInad = 0;
            state.clients.forEach(c => { const p = statusPagto(c); if (p === 'pago') nPagos++; else if (p === 'inadimplente') nInad++; });

            const miniStat = (label, n, color) => `
                <div class="min-w-[104px]">
                    <div class="dfc-mono text-2xl font-semibold ${color}">${n}</div>
                    <div class="text-[11px] text-gray-500 mt-0.5">${label}</div>
                </div>`;
            const statsHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6 border-t border-[#1a1a1d] pt-6">
                    <div>
                        <div class="text-[11px] uppercase tracking-widest text-gray-600 font-semibold mb-4">Implementação</div>
                        <div class="flex flex-wrap gap-x-8 gap-y-4">
                            ${miniStat('Ativos', implAtivos, 'text-white')}
                            ${miniStat('Entregues no prazo', implNoPrazo, 'text-emerald-400')}
                            ${miniStat('Fora do prazo', implForaPrazo, 'text-amber-400')}
                            ${miniStat('Atrasados', implAtrasados, 'text-red-400')}
                        </div>
                    </div>
                    <div>
                        <div class="text-[11px] uppercase tracking-widest text-gray-600 font-semibold mb-4">Pagamentos · <span class="dfc-mono text-gray-500">${escapeHTML(state.selectedMonth)}</span></div>
                        <div class="flex flex-wrap gap-x-8 gap-y-4">
                            ${miniStat('Pagos', nPagos, 'text-emerald-400')}
                            ${miniStat('Inadimplentes', nInad, 'text-amber-400')}
                        </div>
                    </div>
                </div>`;

            return `
                <div class="space-y-8 animate-fade-in">
                    <p class="text-[13px] text-gray-500 leading-relaxed flex items-start gap-2.5"><i data-lucide="info" class="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5"></i><span>${infoText}</span></p>
                    ${totalsHTML}
                    ${statsHTML}

                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-8 pt-2">
                        <div class="flex flex-col">
                            <h3 class="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-4">Análise Geral (Margem × Custo)</h3>
                            <div class="h-72 w-full relative flex-1"><canvas id="yearlyChart"></canvas></div>
                        </div>
                        <div class="flex flex-col">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                                <h3 class="text-xs uppercase tracking-wider text-gray-600 font-semibold">Desempenho da Equipe</h3>
                                <select onchange="window.appActions.setMemberChart(this.value)" class="bg-[#141416] border border-[#242428] rounded-lg px-3 py-1.5 text-sm text-white focus:border-red-500 outline-none">
                                    ${equipeChart.length===0?'<option>Sem Equipe</option>':equipeChart.map(m=>`<option value="${escapeHTML(m.id)}" ${state.selectedMemberId===m.id?'selected':''}>${escapeHTML(m.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="h-72 w-full relative flex-1"><canvas id="memberChart"></canvas></div>
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

            // Grupo por status: Churn ; Concluído (= projeto entregue) ; Ativo (em andamento)
            const groupOf = (c) => c.status === 'Churn' ? 'churn' : (c.delivered ? 'concluido' : 'ativo');
            // Status de pagamento no mês selecionado (usa isClientPending / moTrans)
            const hasBilling = (c) => c.status !== 'Churn' && (Number(c.recurringValue||0) > 0 || (Number(c.oneTimeValue||0) > 0 && isClientOTActive(c, state.selectedMonth)));
            const isInadimplente = (c) => isClientPending(c);                 // tem cobrança e ainda não deu baixa
            const isPago = (c) => hasBilling(c) && !isClientPending(c);       // tem cobrança e já recebeu tudo
            const statusFilter = state.clientStatusFilter || 'Todos';
            const shown = statusFilter === 'Todos' ? list
                : statusFilter === 'pago' ? list.filter(isPago)
                : statusFilter === 'inadimplente' ? list.filter(isInadimplente)
                : list.filter(c => groupOf(c) === statusFilter);
            const viewList = state.clientsView === 'list';
            const countFor = (key) => key === 'Todos' ? list.length
                : key === 'pago' ? list.filter(isPago).length
                : key === 'inadimplente' ? list.filter(isInadimplente).length
                : list.filter(c => groupOf(c) === key).length;

            const phaseChips = ['Todos', 'Manutenção', 'Implementação', 'Tratativa'].map(p => `
                <button onclick="window.appActions.setClientFilter('${escapeHTML(p)}')" class="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${state.clientFilter === p ? 'bg-red-600 text-white' : 'bg-[#141416] text-gray-500 border border-[#1c1c1f] hover:text-white'}">${escapeHTML(p)}</button>
            `).join('');

            const statusChips = [
                { key: 'Todos', label: 'Todos' }, { key: 'ativo', label: 'Ativos' },
                { key: 'concluido', label: 'Concluídos' }, { key: 'churn', label: 'Churn' },
                { key: 'pago', label: 'Pagos', cc: 'text-emerald-500' }, { key: 'inadimplente', label: 'Inadimplentes', cc: 'text-amber-500' }
            ].map(s => {
                const n = countFor(s.key);
                const on = statusFilter === s.key;
                return `<button onclick="window.appActions.setClientStatusFilter('${s.key}')" class="text-[11px] font-semibold transition-colors ${on ? 'text-white' : 'text-gray-600 hover:text-gray-300'}">${s.label} <span class="dfc-mono ${s.cc || (on ? 'text-gray-300' : 'text-gray-700')}">${n}</span></button>`;
            }).join('<span class="text-gray-800">·</span>');

            // Resumo do mês: quanto há a receber, quanto já recebeu, quanto falta (parcelas de setup incluídas)
            let aReceber = 0, recebidoMes = 0;
            list.forEach(c => {
                if (c.status === 'Churn') return;
                const rec = Number(c.recurringValue || 0);
                const ot = getClientOTValueForMonth(c, state.selectedMonth);
                aReceber += rec + ot;
                const ct = moTrans.filter(t => t.clientId === c.id);
                if (rec > 0 && ct.find(t => t.type === 'recorrente')) recebidoMes += rec;
                const otx = ct.find(t => t.type === 'onetime');
                if (otx) recebidoMes += Number(otx.value || 0);
            });
            const pendenteMes = aReceber - recebidoMes;

            let html = `
                <div class="flex flex-col gap-4 mb-6">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-5 flex-wrap">
                            <div class="inline-flex bg-[#141416] border border-[#1c1c1f] rounded-xl p-1">
                                <button data-action="setClientsView" data-view="list" class="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewList ? 'bg-[#1b1b1e] text-white' : 'text-gray-500 hover:text-white'}"><i data-lucide="table-2" class="w-4 h-4"></i> Lista</button>
                                <button data-action="setClientsView" data-view="cards" class="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${!viewList ? 'bg-[#1b1b1e] text-white' : 'text-gray-500 hover:text-white'}"><i data-lucide="layout-grid" class="w-4 h-4"></i> Cartões</button>
                            </div>
                            <div class="flex gap-1.5 overflow-x-auto scrollbar-hide">${phaseChips}</div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-2 text-[11px] text-gray-500">
                                <span class="uppercase tracking-wide font-semibold whitespace-nowrap">Baixas de</span>
                                <input type="month" value="${escapeHTML(state.selectedMonth)}" onchange="window.appActions.updateSelectedMonth(this.value)" style="color-scheme:dark" class="bg-[#141416] border border-[#1c1c1f] rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-red-500 outline-none" />
                            </div>
                            <button onclick="window.appActions.openClientModal()" class="bg-[#f3f3f4] text-black px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white transition-colors"><i data-lucide="plus" class="w-4 h-4"></i> Cadastrar</button>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-3 flex-wrap">${statusChips}</div>
                        <div class="flex items-center gap-5 text-[11px]">
                            <span class="text-gray-500">A receber <span class="dfc-mono text-gray-400">${escapeHTML(state.selectedMonth)}</span></span>
                            <span class="text-gray-500">Pendente <span class="dfc-mono text-amber-400 font-semibold">${formatCurrency(pendenteMes)}</span></span>
                            <span class="text-gray-500">Recebido <span class="dfc-mono text-emerald-400 font-semibold">${formatCurrency(recebidoMes)}</span></span>
                        </div>
                    </div>
                </div>
            `;

            if (shown.length === 0) return html + `<div class="py-16 text-center text-gray-500 border border-dashed border-[#1c1c1f] rounded-2xl">Nenhum projeto neste filtro.</div>`;

            const renderGroup = (items) => viewList ? getClientsListHTML(items) : getClientsCardsHTML(items, moTrans);

            // "Todos" => separa em seções Ativos / Concluídos / Churn
            if (statusFilter === 'Todos') {
                return html + [
                    { key: 'ativo', label: 'Ativos', dot: 'bg-emerald-500' },
                    { key: 'concluido', label: 'Concluídos', dot: 'bg-blue-500' },
                    { key: 'churn', label: 'Churn', dot: 'bg-red-500' }
                ].map(sec => {
                    const items = shown.filter(c => groupOf(c) === sec.key);
                    if (!items.length) return '';
                    return `
                        <div class="flex items-center gap-3 mt-8 mb-3">
                            <span class="w-1.5 h-1.5 rounded-full ${sec.dot}"></span>
                            <h3 class="text-xs uppercase tracking-widest text-gray-500 font-semibold">${sec.label}</h3>
                            <span class="dfc-mono text-[11px] text-gray-600">${items.length}</span>
                            <div class="flex-1 border-t border-[#161619]"></div>
                        </div>
                        ${renderGroup(items)}`;
                }).join('');
            }

            return html + renderGroup(shown);
        }

        // Visão em linhas (flat) — MRR + Implementação (parcela do mês), datas Início/Entrega e baixa.
        function getClientsCardsHTML(list, moTrans) {
            return `<div class="divide-y divide-[#1a1a1d]">` + list.map(client => {
                const cid = escapeHTML(client.id);
                const cTrans = moTrans.filter(t => t.clientId === client.id);
                const recTrans = cTrans.find(t => t.type === 'recorrente');
                const otTrans = cTrans.find(t => t.type === 'onetime');
                const isChurn = client.status === 'Churn';
                const late = isClientLate(client);
                const recVal = Number(client.recurringValue) || 0;
                const otVal = getClientOTValueForMonth(client, state.selectedMonth); // parcela do setup neste mês
                const otActive = otVal > 0;
                const otN = getOTInstallments(client);
                const otIdx = getOTMonthIndex(client, state.selectedMonth);
                const otLabel = (otN > 1 && otIdx >= 0) ? `Implementação ${otIdx + 1}/${otN}` : 'Implementação';
                const hasPendingTask = state.tasks.some(t => t.clientId === client.id && t.status !== 'solucionado');

                let teamBadges = '';
                if (client.teamAllocations && client.teamAllocations.length > 0) {
                    teamBadges = client.teamAllocations.map(alloc => {
                        const m = state.team.find(x => x.id === alloc.memberId);
                        return m ? `<span class="text-emerald-500/80">${escapeHTML(m.name.split(' ')[0])} ${alloc.percentage}%</span>` : '';
                    }).filter(Boolean).join('<span class="text-gray-700">·</span>');
                }

                const payBtn = (val, type, trans) => trans
                    ? `<button data-action="removeBaixa" data-id="${escapeHTML(trans.id)}" class="text-[11px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap">Recebido</button>`
                    : `<button data-action="darBaixa" data-id="${cid}" data-val="${val}" data-btype="${type}" class="text-[11px] bg-red-600 text-white px-2.5 py-1 rounded-md font-semibold whitespace-nowrap hover:bg-red-700">Pagar</button>`;
                const moneyLine = (label, val, btn) => `
                    <div class="flex items-center justify-end gap-2.5">
                        <div class="text-right leading-tight">
                            <div class="text-[9px] uppercase text-gray-600 tracking-wide">${label}</div>
                            <div class="dfc-mono text-sm font-semibold text-white">${formatCurrency(val)}</div>
                        </div>
                        ${btn}
                    </div>`;

                return `
                    <div class="group flex items-start gap-4 py-4 px-2 -mx-2 rounded-lg hover:bg-[#0e0e10] transition-colors ${isChurn ? 'opacity-50' : ''}">
                        <div class="flex-1 min-w-0 cursor-pointer pt-0.5" data-action="openClientModal" data-id="${cid}">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-white truncate">${escapeHTML(client.name)}</span>
                                ${late ? `<span class="text-[9px] uppercase font-bold text-white bg-red-600 px-1.5 py-0.5 rounded animate-pulse">Atrasado</span>` : ''}
                                ${hasPendingTask ? `<span class="text-[9px] uppercase font-bold text-white bg-amber-600 px-1.5 py-0.5 rounded">Tarefa</span>` : ''}
                                ${isChurn ? `<span class="text-[9px] uppercase font-bold text-red-400 border border-red-900/50 px-1.5 py-0.5 rounded">Churn</span>` : ''}
                            </div>
                            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-gray-500 mt-1">
                                <span class="text-gray-400">${escapeHTML(client.phase)}</span>
                                ${client.system ? `<span class="text-gray-700">·</span><span>${escapeHTML(client.system)}</span>` : ''}
                                <span class="text-gray-700">·</span><span>Início <span class="dfc-mono text-gray-300">${formatDateBR(client.startDate)}</span></span>
                                <span class="text-gray-700">·</span><span>Entrega <span class="dfc-mono ${late ? 'text-red-400 font-semibold' : (client.delivered ? 'text-emerald-400' : 'text-gray-300')}">${formatDateBR(client.deliveryDate)}</span></span>
                                ${teamBadges ? `<span class="text-gray-700">·</span>${teamBadges}` : ''}
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-2 flex-shrink-0">
                            ${!isChurn && recVal > 0 ? moneyLine('MRR / mês', recVal, payBtn(recVal, 'recorrente', recTrans)) : ''}
                            ${!isChurn && otActive ? moneyLine(otLabel, otVal, payBtn(otVal, 'onetime', otTrans)) : ''}
                            ${!isChurn && recVal === 0 && !otActive ? `<span class="text-[11px] text-gray-600 py-1">Sem cobrança no mês</span>` : ''}
                        </div>
                        <div class="flex flex-col gap-1.5 flex-shrink-0 pt-0.5">
                            ${client.cronograma ? `<a href="${escapeHTML(client.cronograma)}" target="_blank" rel="noopener" title="Cronograma de implementação" class="w-7 h-7 inline-flex items-center justify-center text-blue-400/80 hover:text-blue-400 hover:bg-blue-500/10 rounded-md"><i data-lucide="calendar-clock" class="w-4 h-4"></i></a>` : ''}
                            ${late ? `<button data-action="markDelivered" data-id="${cid}" title="Marcar como entregue" class="w-7 h-7 inline-flex items-center justify-center text-emerald-400 hover:bg-emerald-600/15 rounded-md"><i data-lucide="check" class="w-4 h-4"></i></button>` : ''}
                            <button data-action="openTaskModal" data-clientid="${cid}" title="Gerar tarefa" class="w-7 h-7 inline-flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#1b1b1e] rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="clipboard-plus" class="w-4 h-4"></i></button>
                            <button data-action="deleteClient" data-id="${cid}" title="Excluir projeto" class="w-7 h-7 inline-flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                `;
            }).join('') + `</div>`;
        }

        // Lista editável (estilo planilha) — edita qualquer campo escalar; salva ao sair da célula.
        function getClientsListHTML(list) {
            const fases = ['Tratativa', 'Implementação', 'Manutenção'];
            const statuses = ['Ativo', 'Churn'];
            const sort = state.clientSort || { field: null, dir: 'asc' };
            const sortVal = (c, f) => {
                switch (f) {
                    case 'name': return (c.name || '').toLowerCase();
                    case 'phase': return (c.phase || '').toLowerCase();
                    case 'status': return (c.status || '').toLowerCase();
                    case 'system': return (c.system || '').toLowerCase();
                    case 'startDate': return c.startDate || '';
                    case 'deliveryDate': return c.deliveryDate || '';
                    case 'delivered': return c.delivered ? 1 : 0;
                    case 'recurringValue': return Number(c.recurringValue || 0);
                    case 'oneTimeValue': return Number(c.oneTimeValue || 0);
                    default: return '';
                }
            };
            const rowsList = sort.field ? list.slice().sort((a, b) => {
                const va = sortVal(a, sort.field), vb = sortVal(b, sort.field);
                if (va < vb) return sort.dir === 'asc' ? -1 : 1;
                if (va > vb) return sort.dir === 'asc' ? 1 : -1;
                return 0;
            }) : list;
            const arrowFor = (f) => sort.field === f ? `<span class="text-red-500 ml-0.5">${sort.dir === 'asc' ? '↑' : '↓'}</span>` : '';
            const th = (f, label, align) => `<th class="${align || 'text-left'} font-semibold px-3 py-3 cursor-pointer select-none hover:text-gray-300 transition-colors ${sort.field === f ? 'text-gray-200' : ''}" data-action="setClientSort" data-field="${f}">${label}${arrowFor(f)}</th>`;
            const totalMRR = list.reduce((a, c) => a + Number(c.recurringValue || 0), 0);
            const rows = rowsList.map(client => {
                const cid = escapeHTML(client.id);
                const late = isClientLate(client);
                const faseOpts = fases.map(f => `<option ${f === (client.phase || '') ? 'selected' : ''}>${f}</option>`).join('');
                const statusOpts = statuses.map(s => `<option ${s === (client.status || 'Ativo') ? 'selected' : ''}>${s}</option>`).join('');
                return `
                    <tr class="border-b border-[#161619] hover:bg-[#141416] ${client.status === 'Churn' ? 'opacity-60' : ''}">
                        <td class="border-r border-[#161619]"><input class="cell-edit font-medium" data-id="${cid}" data-field="name" value="${escapeHTML(client.name || '')}" /></td>
                        <td class="border-r border-[#161619]"><select class="cell-edit" data-id="${cid}" data-field="phase">${faseOpts}</select></td>
                        <td class="border-r border-[#161619]"><select class="cell-edit" data-id="${cid}" data-field="status">${statusOpts}</select></td>
                        <td class="border-r border-[#161619]"><input class="cell-edit" data-id="${cid}" data-field="system" value="${escapeHTML(client.system || '')}" placeholder="—" /></td>
                        <td class="border-r border-[#161619]"><input type="date" style="color-scheme:dark" class="cell-edit dfc-mono text-xs" data-id="${cid}" data-field="startDate" value="${escapeHTML(client.startDate || '')}" /></td>
                        <td class="border-r border-[#161619]"><input type="date" style="color-scheme:dark" class="cell-edit dfc-mono text-xs ${late ? 'cell-late' : ''}" data-id="${cid}" data-field="deliveryDate" value="${escapeHTML(client.deliveryDate || '')}" /></td>
                        <td class="border-r border-[#161619] text-center px-2"><input type="checkbox" class="w-4 h-4 accent-emerald-500 align-middle cursor-pointer" data-id="${cid}" data-field="delivered" data-celltype="check" ${client.delivered ? 'checked' : ''} /></td>
                        <td class="border-r border-[#161619]"><input class="cell-edit dfc-mono text-right currency-mask" data-id="${cid}" data-field="recurringValue" data-celltype="currency" data-value="${Number(client.recurringValue || 0)}" value="${formatNumberToBR(client.recurringValue)}" /></td>
                        <td class="border-r border-[#161619]"><input class="cell-edit dfc-mono text-right currency-mask" data-id="${cid}" data-field="oneTimeValue" data-celltype="currency" data-value="${Number(client.oneTimeValue || 0)}" value="${formatNumberToBR(client.oneTimeValue)}" /></td>
                        <td class="text-center px-2"><button data-action="openClientModal" data-id="${cid}" class="w-7 h-7 inline-flex items-center justify-center text-gray-600 hover:text-white rounded-md hover:bg-[#1b1b1e] transition-colors" title="Abrir (rateio, observações)"><i data-lucide="maximize-2" class="w-3.5 h-3.5"></i></button></td>
                    </tr>`;
            }).join('');

            return `
                <div>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse" style="min-width:960px">
                            <thead>
                                <tr class="bg-[#0f0f11] border-b border-[#242427] text-[10px] uppercase tracking-wider text-gray-600">
                                    ${th('name', 'Cliente / Empresa')}
                                    ${th('phase', 'Fase')}
                                    ${th('status', 'Status')}
                                    ${th('system', 'Sistema')}
                                    ${th('startDate', 'Início')}
                                    ${th('deliveryDate', 'Entrega')}
                                    ${th('delivered', 'Entregue', 'text-center')}
                                    ${th('recurringValue', 'MRR', 'text-right')}
                                    ${th('oneTimeValue', 'Setup', 'text-right')}
                                    <th class="px-3 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center px-4 py-3 border-t border-[#242427] bg-[#0f0f11] text-xs text-gray-500">
                        <span>${list.length} ${list.length === 1 ? 'cliente' : 'clientes'}</span>
                        <span>MRR total <span class="dfc-mono text-gray-200 font-semibold">${formatCurrency(totalMRR)}</span></span>
                    </div>
                </div>
            `;
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
                    ? `<div class="text-center text-[11px] text-gray-700 py-8">—</div>`
                    : tasks.map(t => {
                        const client = state.clients.find(c => c.id === t.clientId);
                        const due = t.dueDate ? t.dueDate.split('-').reverse().join('/') : '—';
                        const tagsHtml = (t.tags && t.tags.length) ? t.tags.map(tag => `<span class="text-[9px] uppercase font-semibold text-gray-400 bg-[#1b1b1e] px-1.5 py-0.5 rounded">${escapeHTML(tag)}</span>`).join('') : '';
                        const stakeHtml = (t.stakeholders && t.stakeholders.length) ? t.stakeholders.map(s => {
                            const phone = (s.phone || '').replace(/\D/g, '');
                            const nameRole = escapeHTML(s.name || '') + (s.role ? ` · ${escapeHTML(s.role)}` : '');
                            return phone
                                ? `<a href="https://wa.me/55${phone}" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300"><i data-lucide="phone" class="w-3 h-3"></i> ${nameRole}</a>`
                                : `<span class="flex items-center gap-1.5 text-[11px] text-gray-400"><i data-lucide="user" class="w-3 h-3"></i> ${nameRole}</span>`;
                        }).join('') : '';
                        const costHtml = Number(t.cost || 0) > 0 ? `<span class="dfc-mono text-red-400 font-semibold">-${formatCurrency(t.cost)}</span>` : '';

                        return `
                            <div class="bg-[#141416] rounded-xl p-3.5 animate-fade-in cursor-pointer group hover:bg-[#17171a] transition-colors" data-action="openTaskModal" data-id="${escapeHTML(t.id)}">
                                <div class="flex justify-between items-start gap-2 mb-2">
                                    <h4 class="font-semibold text-[13px] text-white leading-snug">${escapeHTML(t.title || 'Sem título')}</h4>
                                    <button data-action="deleteTask" data-id="${escapeHTML(t.id)}" class="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                                </div>
                                ${client ? `<p class="text-[10px] uppercase font-semibold text-blue-400/90 mb-2">${escapeHTML(client.name)}</p>` : ''}
                                ${tagsHtml ? `<div class="flex flex-wrap gap-1 mb-2">${tagsHtml}</div>` : ''}
                                ${stakeHtml ? `<div class="space-y-1 mb-2 pt-2 border-t border-[#1e1e21]">${stakeHtml}</div>` : ''}
                                <div class="flex justify-between items-center pt-2 mt-1 border-t border-[#1e1e21]">
                                    <span class="text-[10px] text-gray-500 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${due}</span>
                                    ${costHtml}
                                </div>
                                <div class="flex justify-between gap-2 mt-2.5">
                                    <button data-action="moveTask" data-id="${escapeHTML(t.id)}" data-dir="prev" class="flex-1 bg-[#1b1b1e] rounded-md py-1.5 text-gray-500 hover:text-white flex items-center justify-center ${ci === 0 ? 'opacity-25 pointer-events-none' : ''}"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
                                    <button data-action="moveTask" data-id="${escapeHTML(t.id)}" data-dir="next" class="flex-1 bg-[#1b1b1e] rounded-md py-1.5 text-gray-500 hover:text-white flex items-center justify-center ${ci === TASK_COLUMNS.length - 1 ? 'opacity-25 pointer-events-none' : ''}"><i data-lucide="arrow-right" class="w-4 h-4"></i></button>
                                </div>
                            </div>
                        `;
                    }).join('');

                return `
                    <div class="flex-1 min-w-[270px] flex flex-col">
                        <div class="flex items-center justify-between mb-3 px-1">
                            <div class="flex items-center gap-2">
                                <span class="w-1.5 h-1.5 rounded-full ${col.dot}"></span>
                                <h3 class="text-[11px] font-semibold uppercase tracking-widest text-gray-400">${col.label}</h3>
                            </div>
                            <span class="dfc-mono text-[10px] text-gray-600">${tasks.length}</span>
                        </div>
                        <div class="space-y-2.5 flex-1 bg-[#0c0c0d] rounded-xl p-2.5">${cards}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="animate-fade-in">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-7 gap-4">
                        <div>
                            <h2 class="text-xl font-semibold text-white tracking-tight">Operação</h2>
                            <p class="text-[13px] text-gray-500 mt-1">Kanban de tarefas interligado a Clientes e Finanças.</p>
                        </div>
                        <button data-action="openTaskModal" data-id="" data-clientid="" class="bg-[#f3f3f4] text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition-colors"><i data-lucide="plus" class="w-4 h-4"></i> Nova Tarefa</button>
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
            const equipeMembers = state.team.filter(m => (m.itemType || 'equipe') !== 'manutencao');
            const manutencaoItems = state.team.filter(m => m.itemType === 'manutencao');

            let html = `
                <div class="flex items-center justify-between gap-3 mb-4">
                    <h2 class="text-xl font-semibold text-white tracking-tight">Equipe DFC</h2>
                    <button onclick="window.appActions.openItemModal('equipe')" class="bg-[#f3f3f4] text-black hover:bg-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"><i data-lucide="user-plus" class="w-4 h-4"></i> Novo Integrante</button>
                </div>`;

            if (equipeMembers.length === 0) html += `<div class="py-10 text-center text-gray-600 text-sm">Nenhum membro cadastrado.</div>`;
            else html += `<div class="divide-y divide-[#1a1a1d]">` + equipeMembers.map(member => {
                const memberClients = state.clients.filter(c => c.status !== 'Churn');
                const mrrMcGerado = memberClients.reduce((acc, c) => acc + (calcMargin(Number(c.recurringValue||0)) * getMemberPct(c, member.id)), 0);
                const mCost = getMemberCostInMonth(member, state.selectedMonth);
                const lucro = mrrMcGerado - mCost;
                const startStr = member.startMonth ? member.startMonth.split('-').reverse().join('/') : 'Sempre';
                const mid = escapeHTML(member.id);
                return `
                    <div class="group flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-[#0e0e10] cursor-pointer transition-colors" data-action="openItemModal" data-cat="equipe" data-id="${mid}">
                        <div class="w-9 h-9 rounded-lg bg-[#1b1b1e] flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">${escapeHTML(member.name).charAt(0).toUpperCase()}</div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-white truncate">${escapeHTML(member.name)}</div>
                            <div class="text-[11px] text-gray-500 mt-0.5">${escapeHTML(member.role || '')}${member.role ? ' · ' : ''}Início ${startStr}</div>
                        </div>
                        <div class="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
                            <div><div class="text-[9px] uppercase text-gray-600 tracking-wide">Custo</div><div class="dfc-mono text-red-400 text-sm">-${formatCurrency(mCost)}</div></div>
                            <div><div class="text-[9px] uppercase text-gray-600 tracking-wide">Repasse</div><div class="dfc-mono text-emerald-400 text-sm">+${formatCurrency(mrrMcGerado)}</div></div>
                            <div><div class="text-[9px] uppercase text-gray-600 tracking-wide">Lucro</div><div class="dfc-mono text-sm font-semibold ${lucro>=0?'text-emerald-400':'text-red-400'}">${formatCurrency(lucro)}</div></div>
                        </div>
                        <button data-action="deleteItem" data-coll="team" data-id="${mid}" class="w-7 h-7 inline-flex items-center justify-center text-gray-600 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>`;
            }).join('') + `</div>`;

            html += `
                <div class="flex items-center justify-between gap-3 mb-4 mt-12">
                    <h2 class="text-xl font-semibold text-white tracking-tight">Custos & Fornecedores</h2>
                    <button onclick="window.appActions.openItemModal('ferramenta')" class="bg-[#141416] border border-[#1c1c1f] text-gray-300 hover:text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"><i data-lucide="plus" class="w-4 h-4"></i> Novo Custo</button>
                </div>`;

            const costRow = (id, cat, coll, name, badgeHtml, val) => `
                <div class="group flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-[#0e0e10] cursor-pointer transition-colors" data-action="openItemModal" data-cat="${cat}" data-id="${escapeHTML(id)}">
                    <div class="flex-1 min-w-0">
                        <div class="font-semibold text-white truncate">${escapeHTML(name)}</div>
                        <div class="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">${badgeHtml}</div>
                    </div>
                    <div class="dfc-mono text-red-400 font-semibold flex-shrink-0">-${formatCurrency(val)}</div>
                    <button data-action="deleteItem" data-coll="${coll}" data-id="${escapeHTML(id)}" class="w-7 h-7 inline-flex items-center justify-center text-gray-600 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>`;

            if (manutencaoItems.length === 0 && state.expenses.length === 0) {
                html += `<div class="py-10 text-center text-gray-600 text-sm">Nenhum custo cadastrado.</div>`;
            } else {
                html += `<div class="divide-y divide-[#1a1a1d]">`;
                html += manutencaoItems.map(item => {
                    const typeStr = item.type === 'unico' ? 'Único' : 'Recorrente';
                    const monthStr = item.startMonth ? item.startMonth.split('-').reverse().join('/') : 'Sempre';
                    const badge = `<span class="text-orange-400 font-semibold uppercase text-[9px] tracking-wide">Manutenção</span><span class="text-gray-700">·</span><span>${typeStr} · ${monthStr}</span>`;
                    return costRow(item.id, 'manutencao', 'team', item.name, badge, item.cost);
                }).join('');
                html += state.expenses.map(exp => {
                    const client = state.clients.find(c => c.id === exp.clientId);
                    const typeStr = exp.type === 'unico' ? 'Único' : 'Recorrente';
                    const monthStr = exp.month ? exp.month.split('-').reverse().join('/') : 'Sempre';
                    const badge = `<span class="${client ? 'text-blue-400' : 'text-gray-500'} font-semibold uppercase text-[9px] tracking-wide">${client ? 'Projeto: ' + escapeHTML(client.name.split(' ')[0]) : 'Geral'}</span><span class="text-gray-700">·</span><span>${typeStr} · ${monthStr}</span>`;
                    return costRow(exp.id, 'ferramenta', 'expenses', exp.name, badge, exp.amount);
                }).join('');
                html += `</div>`;
            }

            return html;
        }

        function getClosureHTML() {
            const moTrans = state.transactions.filter(t => t.month === state.selectedMonth);
            const isLocked = state.closures.some(c => c.month === state.selectedMonth && c.locked);

            let html = `
                <div class="animate-fade-in">
                    <div class="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 mb-6">
                        <h2 class="text-xl font-semibold text-white tracking-tight">Fechamento <span class="dfc-mono text-gray-500 ml-1">${escapeHTML(state.selectedMonth)}</span></h2>
                        ${isLocked ? `<div class="text-red-400 text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5"><i data-lucide="lock" class="w-3.5 h-3.5"></i> Mês travado</div>` : ''}
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead><tr class="border-b border-[#242427] text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                                <th class="py-3 pr-4">Cliente</th><th class="py-3 px-4 text-right">Previsto</th><th class="py-3 px-4 text-right">Realizado</th>
                                <th class="py-3 px-4 text-right">Margem DFC</th><th class="py-3 pl-4 text-center">Status</th>
                            </tr></thead>
                            <tbody class="divide-y divide-[#161619]">
            `;

            const validClients = state.clients.filter(c => c.status !== 'Churn' || (c.status === 'Churn' && moTrans.some(t => t.clientId === c.id)));
            if(validClients.length === 0) html += `<tr><td colspan="5" class="p-10 text-center text-gray-500">Nenhum projeto ativo.</td></tr>`;

            let somaPrevRec=0, somaPrevOt=0, somaRealRec=0, somaRealOt=0, somaMargem=0;

            validClients.forEach(client => {
                const cTrans = moTrans.filter(t => t.clientId === client.id);
                const recT = cTrans.find(t => t.type === 'recorrente');
                const otT = cTrans.find(t => t.type === 'onetime');
                const pR = Number(client.recurringValue||0);
                const pO = getClientOTValueForMonth(client, state.selectedMonth);
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
                    <tr class="hover:bg-[#0e0e10]">
                        <td class="py-3.5 pr-4 font-semibold text-white text-sm">${escapeHTML(client.name)}</td>
                        <td class="py-3.5 px-4 text-right text-xs text-gray-500">${pR>0?`MRR: ${formatCurrency(pR)}<br>`:''}${pO>0?`O.T.: ${formatCurrency(pO)}`:''}</td>
                        <td class="py-3.5 px-4 text-right text-xs">${pR>0?`<span class="${rR>0?'text-emerald-400':'text-gray-600'}">${formatCurrency(rR)}</span><br>`:''}${pO>0?`<span class="${rO>0?'text-emerald-400':'text-gray-600'}">${formatCurrency(rO)}</span>`:''}</td>
                        <td class="py-3.5 px-4 text-right"><span class="text-emerald-400 font-semibold dfc-mono">${formatCurrency(mTotal)}</span></td>
                        <td class="py-3.5 pl-4 text-center">${statusHTML}</td>
                    </tr>
                `;
            });

            if(validClients.length > 0) {
                 html += `
                    <tr class="border-t border-[#242427]">
                        <td class="py-4 pr-4 font-bold text-white text-xs uppercase tracking-wide text-right">Total do mês</td>
                        <td class="py-4 px-4 text-right text-xs font-semibold text-gray-500">MRR: ${formatCurrency(somaPrevRec)}<br/>O.T.: ${formatCurrency(somaPrevOt)}</td>
                        <td class="py-4 px-4 text-right text-xs font-semibold text-gray-300">MRR: ${formatCurrency(somaRealRec)}<br/>O.T.: ${formatCurrency(somaRealOt)}</td>
                        <td class="py-4 px-4 text-right font-bold text-emerald-400 dfc-mono">${formatCurrency(somaMargem)}</td>
                        <td></td>
                    </tr>
                `;
            }

            html += `</tbody></table></div>
                <div class="flex justify-end mt-6">
                    <button onclick="window.appActions.lockMonth()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs transition-colors flex items-center gap-2"><i data-lucide="${isLocked ? 'refresh-cw' : 'lock'}" class="w-4 h-4"></i> ${isLocked ? 'Atualizar Travamento' : 'Congelar & Salvar Mês'}</button>
                </div></div>`;
            return html;
        }

        function getHistoryHTML() {
            let html = `<div class="animate-fade-in"><h2 class="text-xl font-semibold text-white tracking-tight mb-6">Histórico de Fechamentos</h2>`;
            if (state.closures.length === 0) {
                html += `<div class="py-16 text-center text-gray-600 text-sm">Nenhum mês travado no histórico.</div>`;
            } else {
                html += `<div class="divide-y divide-[#1a1a1d]">` + state.closures.sort((a,b) => b.month.localeCompare(a.month)).map(c => {
                    const custoEq = Number(c.margemTotalRealizada||0) - Number(c.lucroLiquido||0);
                    const lucroPos = Number(c.lucroLiquido||0) >= 0;
                    return `
                    <div class="group flex items-center gap-4 py-4 px-2 -mx-2 rounded-lg hover:bg-[#0e0e10] cursor-pointer transition-colors" data-action="openHistoryModal" data-id="${escapeHTML(c.month)}">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <i data-lucide="calendar-days" class="w-4 h-4 text-gray-600 flex-shrink-0"></i>
                            <span class="dfc-mono font-semibold text-white">${escapeHTML(c.month)}</span>
                            <span class="text-emerald-500/80 text-[10px] uppercase font-semibold tracking-wide flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Travado</span>
                        </div>
                        <div class="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
                            <div><div class="text-[9px] uppercase text-gray-600 tracking-wide">MRR</div><div class="dfc-mono text-sm text-gray-300">${formatCurrency(c.mrrBrutoRealizado)}</div></div>
                            <div><div class="text-[9px] uppercase text-gray-600 tracking-wide">Margem</div><div class="dfc-mono text-sm text-emerald-400">${formatCurrency(c.margemTotalRealizada)}</div></div>
                            <div><div class="text-[9px] uppercase text-gray-600 tracking-wide">Custos</div><div class="dfc-mono text-sm text-red-400">-${formatCurrency(custoEq)}</div></div>
                        </div>
                        <div class="text-right flex-shrink-0 min-w-[110px]">
                            <div class="text-[9px] uppercase text-gray-600 tracking-wide">Líquido</div>
                            <div class="dfc-mono text-base font-semibold ${lucroPos ? 'text-emerald-400' : 'text-red-400'}">${formatCurrency(c.lucroLiquido)}</div>
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-700 group-hover:text-gray-400 flex-shrink-0"></i>
                    </div>`;
                }).join('') + `</div>`;
            }
            return html + `</div>`;
        }

        function getProfileHTML() {
            const userName = state.user?.displayName || '';
            const userEmail = state.user?.email || 'Visitante Anônimo';

            return `
                <div class="max-w-xl mx-auto animate-fade-in">
                    <div class="flex items-center gap-5 mb-10">
                        <div class="w-16 h-16 rounded-full bg-[#141416] border border-[#242427] flex items-center justify-center text-2xl font-bold text-red-500 flex-shrink-0">${userName ? userName.charAt(0).toUpperCase() : 'V'}</div>
                        <div>
                            <h2 class="text-2xl font-semibold text-white tracking-tight">${escapeHTML(userName) || 'Visitante'}</h2>
                            <p class="text-gray-500 text-sm mt-0.5">${escapeHTML(userEmail)}</p>
                        </div>
                    </div>
                    <div class="space-y-6">
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Nome de exibição público</label>
                            <input type="text" id="profile-name" value="${escapeHTML(userName)}" class="w-full bg-[#141416] border border-[#242427] rounded-xl p-3.5 text-white font-medium focus:border-red-500 outline-none" />
                        </div>
                        <div class="pt-6 border-t border-[#1a1a1d] flex flex-col sm:flex-row gap-3 justify-between items-center">
                            <button onclick="window.appActions.logout()" class="w-full sm:w-auto text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 py-2"><i data-lucide="log-out" class="w-4 h-4"></i> Encerrar sessão</button>
                            <button onclick="window.appActions.saveProfile()" class="w-full sm:w-auto bg-[#f3f3f4] text-black px-6 py-2.5 rounded-xl font-bold uppercase text-xs hover:bg-white transition-colors flex items-center justify-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Salvar perfil</button>
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
