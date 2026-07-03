// finance.js — Funções puras de cálculo/formatação. A cascata calcFinancials é o coração validado.
import { state } from './state.js';

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
if (typeof window !== 'undefined') window.escapeHTML = escapeHTML;

        function formatCurrency(val) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
        }
        function formatNumberToBR(val) {
            return (Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // ===== CÁLCULO EM CASCATA (CORAÇÃO DO SISTEMA — validado, não alterar a ordem) =====
        // 1) Faturamento Bruto -> 2) Royalties 15% (x0.85) -> 3) Impostos 14,25% (x0.8575)
        // -> 4) MENOS custos "Ferramenta/Fornecedor" (Fat. Líquido) -> 5) Margem DFC (x0.35)
        // -> 6) MENOS custos "Equipe/Manutenção" = Lucro Líquido
        function calcFinancials(fatBruto, custoFerramenta = 0, custoTimeManut = 0) {
            const bruto = Number(fatBruto) || 0;
            const aposRoyalties = bruto * 0.85;              // 2. Royalties 15%
            const aposImpostos = aposRoyalties * 0.8575;     // 3. Impostos 14,25%
            const fatLiquido = aposImpostos - (Number(custoFerramenta) || 0); // 4. Faturamento Líquido
            const margemDFC = fatLiquido * 0.35;             // 5. Margem DFC Realizada
            const lucroLiquido = margemDFC - (Number(custoTimeManut) || 0);   // 6. Lucro Líquido
            return { fatBruto: bruto, aposRoyalties, aposImpostos, fatLiquido, margemDFC, lucroLiquido };
        }

        // Margem "limpa" de um valor isolado (sem custos) — usada nos previews do modal e por transação.
        // Equivale a calcFinancials(val, 0, 0).margemDFC — idêntica à fórmula validada (0.85 x 0.8575 x 0.35).
        function calcMargin(val) {
            if (!val) return 0;
            return calcFinancials(Number(val), 0, 0).margemDFC;
        }

        // Soma os custos "Ferramenta/Fornecedor" alocados a UM projeto no mês (entra no passo 4 da cascata).
        function getClientToolCostInMonth(clientId, targetMonth) {
            let total = 0;
            state.expenses.forEach(e => {
                if (e.clientId !== clientId) return;
                if (e.type === 'unico' && e.month && e.month !== targetMonth) return;
                if ((e.type === 'recorrente' || !e.type) && e.month && e.month > targetMonth) return;
                total += Number(e.amount || 0);
            });
            return total;
        }

        function getMemberPct(client, memberId) {
            if (client.teamAllocations && Array.isArray(client.teamAllocations)) {
                const alloc = client.teamAllocations.find(a => a.memberId === memberId);
                if (alloc) return Number(alloc.percentage) / 100;
            }
            return 0;
        }

        function isClientOTActive(client, targetMonth) {
            const hasOT = Number(client.oneTimeValue || 0) > 0;
            if (!hasOT) return false;

            const otTransaction = state.transactions.find(t => t.clientId === client.id && t.type === 'onetime');
            if (otTransaction) {
                return otTransaction.month === targetMonth;
            }

            if (client.deliveryDate) {
                return client.deliveryDate.substring(0, 7) === targetMonth;
            }
            return true;
        }

        function getMemberCostInMonth(member, targetMonth) {
            if (!member) return 0;
            // Manutenção Única: só pesa no mês de referência (igual custo único de ferramenta, mas DEPOIS da margem).
            if (member.itemType === 'manutencao' && member.type === 'unico') {
                return (member.startMonth && member.startMonth === targetMonth) ? Number(member.cost || 0) : 0;
            }
            // Equipe e Manutenção Recorrente: custo a partir do mês de início.
            if (member.startMonth && member.startMonth > targetMonth) return 0;
            return Number(member.cost || 0);
        }

        function getCalculatedCosts(targetMonth) {
            const cFixo = state.team.reduce((a, c) => a + getMemberCostInMonth(c, targetMonth), 0);

            let cVarFornecedores = 0;
            state.expenses.forEach(e => {
                if (e.type === 'unico' && e.month && e.month !== targetMonth) return;
                if ((e.type === 'recorrente' || !e.type) && e.month && e.month > targetMonth) return;

                if (!e.clientId) {
                    cVarFornecedores += Number(e.amount || 0);
                } else {
                    const cl = state.clients.find(c => c.id === e.clientId);
                    if (cl && ((Number(cl.recurringValue||0)>0 && cl.status!=='Churn') || isClientOTActive(cl, targetMonth))) {
                        cVarFornecedores += Number(e.amount || 0);
                    }
                }
            });
            return { cFixo, cVarFornecedores, custosTotais: cFixo + cVarFornecedores };
        }

export { escapeHTML, formatCurrency, formatNumberToBR, calcFinancials, calcMargin, getClientToolCostInMonth, getMemberPct, isClientOTActive, getMemberCostInMonth, getCalculatedCosts };
