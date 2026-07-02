// state.js — Estado global compartilhado da aplicação (SquadDFC)

        function getInitialMonth() {
            const d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        }

        const state = {
            user: null,
            activeTab: 'dashboard',
            filterMode: 'month',
            clients: [], transactions: [], team: [], closures: [], expenses: [],
            selectedMonth: getInitialMonth(),
            selectedYear: new Date().getFullYear().toString(),
            clientFilter: 'Todos',
            isSignUpMode: false,
            chartInstance: null,
            memberChartInstance: null,
            selectedMemberId: null
        };

export { getInitialMonth, state };
