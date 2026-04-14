import './style.css';
import Chart from 'chart.js/auto';
import { fetchData, patchData, escapeHtml, generateId, formatCurrency } from './utils.js';

let investments = [];
let sips = [];
let allocationChart = null;

const investmentsTable = document.getElementById('investmentsTable');
const assetAllocation = document.getElementById('assetAllocation');
const sipContainer = document.getElementById('sipContainer');
const investmentForm = document.getElementById('investmentForm');
const portfolioValueEl = document.getElementById('portfolioValue');
const portfolioValueChangeEl = document.getElementById('portfolioValueChange');
const totalReturnsEl = document.getElementById('totalReturns');
const monthlySIPEl = document.getElementById('monthlySIP');

async function loadInvestments() {
    try {
        const data = await fetchData();
        investments = data.investments || [];
        sips = data.sips || [];

        if (investments.length === 0 && !data.investments_initialized) {
            investments = [
                { id: generateId(), name: 'HDFC Equity Fund', category: 'Equity', invested: 150000, current: 189000 },
                { id: generateId(), name: 'ICICI Debt Fund', category: 'Debt', invested: 100000, current: 108500 },
                { id: generateId(), name: 'SBI Gold ETF', category: 'Gold', invested: 80000, current: 90240 },
                { id: generateId(), name: 'Nifty 50 Index Fund', category: 'Index', invested: 75000, current: 86475 }
            ];
            sips = [
                { id: generateId(), name: 'HDFC Equity Fund', due: '5th', amount: 5000 },
                { id: generateId(), name: 'ICICI Debt Fund', due: '10th', amount: 3000 },
                { id: generateId(), name: 'Nifty 50 Index', due: '15th', amount: 7000 }
            ];
            await saveInvestments(true);
        }

        renderAll();
    } catch (err) {
        console.error('investments.js: Failed to load data:', err);
    }
}

async function saveInvestments(isInit = false) {
    try {
        const payload = { investments, sips };
        if (isInit) payload.investments_initialized = true;
        await patchData(payload);
    } catch (err) {
        console.error('investments.js: Failed to save investments:', err);
    }
}

function renderAll() {
    renderTable();
    renderSummary();
    renderAllocation();
    renderSIPs();
}

function renderSIPs() {
    if (!sipContainer) return;
    sipContainer.innerHTML = '';

    if (sips.length === 0) {
        sipContainer.innerHTML = `<p class="text-center text-slate-500 py-4">No upcoming SIPs</p>`;
        if (monthlySIPEl) monthlySIPEl.textContent = formatCurrency(0);
        return;
    }

    let totalThisMonth = 0;
    sips.forEach(sip => {
        totalThisMonth += sip.amount;
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-3';
        div.innerHTML = `
            <div>
                <p class="font-bold text-slate-800">${escapeHtml(sip.name)}</p>
                <p class="text-sm text-slate-500">Due: ${escapeHtml(sip.due)} of month</p>
            </div>
            <span class="font-bold text-indigo-600">${formatCurrency(sip.amount)}</span>
        `;
        sipContainer.appendChild(div);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'border-t-2 border-slate-200 pt-4 flex justify-between items-center mt-3';
    totalDiv.innerHTML = `
        <span class="font-bold text-slate-800">Total This Month</span>
        <span class="font-bold text-indigo-600 text-xl">${formatCurrency(totalThisMonth)}</span>
    `;
    sipContainer.appendChild(totalDiv);

    if (monthlySIPEl) monthlySIPEl.textContent = formatCurrency(totalThisMonth);
}

function renderTable() {
    if (!investmentsTable) return;
    investmentsTable.innerHTML = '';

    if (investments.length === 0) {
        investmentsTable.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400">No investments yet. Add your first one!</td></tr>`;
        return;
    }

    investments.forEach(inv => {
        const returns = inv.invested > 0 ? ((inv.current - inv.invested) / inv.invested) * 100 : 0;
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0';
        row.innerHTML = `
            <td class="text-start">
                <div class="font-bold text-slate-800">${escapeHtml(inv.name)}</div>
            </td>
            <td class="text-start">
                <span class="px-3 py-1 rounded-full text-xs font-bold ${getCategoryClass(inv.category)}">
                    ${escapeHtml(inv.category)}
                </span>
            </td>
            <td class="text-end font-medium text-slate-600">${formatCurrency(inv.invested)}</td>
            <td class="text-end font-black text-slate-800">${formatCurrency(inv.current)}</td>
            <td class="text-end font-bold ${returns >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                ${returns >= 0 ? '↑' : '↓'} ${Math.abs(returns).toFixed(1)}%
            </td>
            <td class="text-end">
                <button class="delete-inv-btn p-2 text-slate-400 hover:text-rose-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                </button>
            </td>
        `;

        row.querySelector('.delete-inv-btn').addEventListener('click', () => deleteInvestment(inv.id));
        investmentsTable.appendChild(row);
    });
}

async function deleteInvestment(id) {
    if (!confirm('Are you sure you want to delete this investment?')) return;
    investments = investments.filter(inv => inv.id !== id);
    renderAll();
    await saveInvestments();
}

function getCategoryClass(cat) {
    switch (cat) {
        case 'Equity': return 'bg-blue-100 text-blue-700 border border-blue-200';
        case 'Debt': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        case 'Gold': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        case 'Index': return 'bg-purple-100 text-purple-700 border border-purple-200';
        default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
}

function renderSummary() {
    const totalInvested = investments.reduce((sum, inv) => sum + inv.invested, 0);
    const totalCurrent = investments.reduce((sum, inv) => sum + inv.current, 0);
    const totalReturnAmt = totalCurrent - totalInvested;
    const totalReturnPct = totalInvested > 0 ? (totalReturnAmt / totalInvested) * 100 : 0;

    if (portfolioValueEl) portfolioValueEl.textContent = formatCurrency(totalCurrent);
    if (portfolioValueChangeEl) {
        portfolioValueChangeEl.textContent = `↑ ${formatCurrency(totalReturnAmt)} (${totalReturnPct.toFixed(1)}%)`;
    }
    if (totalReturnsEl) totalReturnsEl.textContent = `${totalReturnPct.toFixed(1)}%`;
}

function renderAllocation() {
    if (!assetAllocation) return;
    assetAllocation.innerHTML = '';

    const totalCurrent = investments.reduce((sum, inv) => sum + inv.current, 0);
    if (totalCurrent === 0) return;

    const categories = ['Equity', 'Debt', 'Gold', 'Index'];
    const colors = {
        Equity: 'from-blue-400 to-blue-600',
        Debt: 'from-emerald-400 to-emerald-600',
        Gold: 'from-yellow-400 to-yellow-600',
        Index: 'from-purple-400 to-purple-600'
    };

    const chartData = [];
    const chartLabels = [];
    const chartColors = {
        Equity: '#3b82f6',
        Debt: '#10b981',
        Gold: '#eab308',
        Index: '#a855f7'
    };
    const activeColors = [];

    categories.forEach(cat => {
        const catTotal = investments
            .filter(inv => inv.category === cat)
            .reduce((sum, inv) => sum + inv.current, 0);

        if (catTotal === 0) return;

        const percentage = (catTotal / totalCurrent) * 100;
        chartData.push(catTotal);
        chartLabels.push(cat);
        activeColors.push(chartColors[cat]);

        const div = document.createElement('div');
        div.innerHTML = `
            <div>
                <div class="flex justify-between mb-3">
                    <div>
                        <h4 class="font-bold text-slate-800">${escapeHtml(cat)}</h4>
                        <p class="text-sm text-slate-600">${formatCurrency(catTotal)} • ${percentage.toFixed(1)}%</p>
                    </div>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                    <div class="bg-gradient-to-r ${colors[cat]} h-4 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        assetAllocation.appendChild(div);
    });

    // Render Doughnut Chart
    const ctx = document.getElementById('allocationChart');
    if (ctx) {
        if (allocationChart) {
            allocationChart.destroy();
        }

        allocationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: activeColors,
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 12,
                        cornerRadius: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return ` ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

if (investmentForm) {
    investmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('invName').value.trim();
        const category = document.getElementById('invCategory').value;
        const invested = parseFloat(document.getElementById('invAmount').value);
        const current = parseFloat(document.getElementById('invCurrent').value);

        if (!name) { alert('Please enter an investment name.'); return; }
        if (isNaN(invested) || invested < 0) { alert('Please enter a valid invested amount.'); return; }
        if (isNaN(current) || current < 0) { alert('Please enter a valid current value.'); return; }

        investments.push({ id: generateId(), name, category, invested, current });
        renderAll();
        await saveInvestments();
        investmentForm.reset();
        window.toggleModal('investmentModal');
    });
}

async function init() {
    await loadInvestments();
}

document.addEventListener('DOMContentLoaded', init);
