import './style.css';
import { Chart, registerables } from 'chart.js';
import { fetchData, escapeHtml, formatCurrency } from './utils.js';

Chart.register(...registerables);

let transactions = [];
let investments = [];
let savings = [];
let dashboardSettings = {};

const categoryBreakdown = document.getElementById('categoryBreakdown');
const totalExpenseValueEl = document.getElementById('totalExpenseValue');
const topCategoryEl = document.getElementById('topCategory');
const topMerchantsEl = document.getElementById('topMerchants');
const growthChartCanvas = document.getElementById('growthChart');

async function loadData() {
    try {
        const data = await fetchData();
        transactions = data.transactions || [];
        investments = data.investments || [];
        savings = data.savings || [];
        dashboardSettings = data.dashboard_settings || {};
        renderReports();
    } catch (err) {
        console.error('reports.js: Failed to load data:', err);
    }
}

function renderReports() {
    renderSpendingCategory();
    renderGrowthChart();
    renderTopMerchants();
    renderRiskExposure();
}

function renderSpendingCategory() {
    if (!categoryBreakdown) return;

    const expenses = transactions.filter(tx => tx.amount < 0);
    const totalExpenses = Math.abs(expenses.reduce((sum, tx) => sum + tx.amount, 0));

    const categories = {};
    expenses.forEach(tx => {
        if (!categories[tx.category]) categories[tx.category] = 0;
        categories[tx.category] += Math.abs(tx.amount);
    });

    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    if (totalExpenseValueEl) totalExpenseValueEl.textContent = formatCurrency(totalExpenses);
    if (topCategoryEl && sortedCategories.length > 0) {
        const [name, value] = sortedCategories[0];
        const pct = ((value / totalExpenses) * 100).toFixed(0);
        topCategoryEl.textContent = `${escapeHtml(name)} (${pct}%)`;
    }

    categoryBreakdown.innerHTML = '';

    if (sortedCategories.length === 0) {
        categoryBreakdown.innerHTML = '<p class="text-slate-400 text-sm">No expenses found for this period.</p>';
        return;
    }

    sortedCategories.slice(0, 5).forEach(([name, value]) => {
        const pct = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(0) : 0;
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="flex justify-between mb-2">
                <span class="text-sm font-bold text-slate-700">${escapeHtml(name)}</span>
                <span class="text-sm font-black text-slate-800">${formatCurrency(value)} <span class="text-slate-400 font-medium ml-1">(${pct}%)</span></span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div class="h-3 rounded-full bg-gradient-to-r ${getBarColor(name)} transition-all duration-1000" style="width: ${pct}%"></div>
            </div>
        `;
        categoryBreakdown.appendChild(div);
    });
}

function renderGrowthChart() {
    if (!growthChartCanvas) return;

    // Calculate historical net worth from transactions
    // Simplified: Group by month and show cumulative balance
    const monthlyNet = {};
    const baseBalance = dashboardSettings.baseBalance || 0;
    
    // Sort transactions by date
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let runningBalance = baseBalance + 
                        savings.reduce((s, a) => s + a.balance, 0) + 
                        investments.reduce((s, i) => s + i.current, 0);
    
    // We want to show the last 6 months
    const labels = [];
    const balances = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('default', { month: 'short' }).toUpperCase();
        labels.push(monthLabel);
        
        // This is a simplification for the prototype
        // Real app would track historical balances per month
        // Here we simulate some growth based on net income
        const monthStr = d.toISOString().substring(0, 7);
        const monthTx = transactions.filter(t => t.date.startsWith(monthStr));
        const monthNet = monthTx.reduce((sum, t) => sum + t.amount, 0);
        
        runningBalance += monthNet;
        balances.push(runningBalance);
    }

    new Chart(growthChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net Worth',
                data: balances,
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 4,
                pointRadius: 4,
                pointBackgroundColor: '#4F46E5',
                pointBorderColor: '#fff',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { display: false },
                    ticks: { callback: (v) => '₹' + (v / 1000) + 'k' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTopMerchants() {
    if (!topMerchantsEl) return;
    
    const expenses = transactions.filter(t => t.amount < 0);
    const merchants = {};
    
    // Group by description (merchants)
    expenses.forEach(t => {
        const desc = t.desc.split(' ')[0]; // Take first word as merchant name
        if (!merchants[desc]) merchants[desc] = 0;
        merchants[desc] += Math.abs(t.amount);
    });
    
    const sorted = Object.entries(merchants).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    topMerchantsEl.innerHTML = '';
    if (sorted.length === 0) {
        topMerchantsEl.innerHTML = '<p class="text-xs text-slate-400 italic">No merchant data yet...</p>';
        return;
    }
    
    sorted.forEach(([name, value]) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center';
        div.innerHTML = `
            <span class="text-sm font-medium text-slate-600">${escapeHtml(name)}</span>
            <span class="text-sm font-bold text-slate-800">${formatCurrency(value)}</span>
        `;
        topMerchantsEl.appendChild(div);
    });
}

function renderRiskExposure() {
    const equityCategories = ['Equity', 'Index', 'Crypto'];
    const safeCategories = ['Debt', 'Gold', 'Cash'];
    
    const totalInvestments = investments.reduce((s, i) => s + i.current, 0);
    const totalSavings = savings.reduce((s, a) => s + a.balance, 0);
    const totalAssets = totalInvestments + totalSavings;
    
    if (totalAssets === 0) return;
    
    const riskAmount = investments
        .filter(i => equityCategories.includes(i.category))
        .reduce((s, i) => s + i.current, 0);
        
    const safeAmount = totalAssets - riskAmount;
    
    const riskPct = (riskAmount / totalAssets) * 100;
    const safePct = (safeAmount / totalAssets) * 100;
    
    const equityRiskBar = document.getElementById('equityRiskBar');
    const equityRiskPctText = document.getElementById('equityRiskPctText');
    const safeAssetsBar = document.getElementById('safeAssetsBar');
    const safeAssetsPctText = document.getElementById('safeAssetsPctText');
    
    if (equityRiskBar) equityRiskBar.style.width = `${riskPct}%`;
    if (equityRiskPctText) equityRiskPctText.textContent = `${riskPct.toFixed(0)}%`;
    if (safeAssetsBar) safeAssetsBar.style.width = `${safePct}%`;
    if (safeAssetsPctText) safeAssetsPctText.textContent = `${safePct.toFixed(0)}%`;
}

function getBarColor(category) {
    const colors = {
        Rent: 'from-indigo-500 to-indigo-600',
        Food: 'from-emerald-500 to-emerald-600',
        Fun: 'from-rose-500 to-rose-600',
        Utilities: 'from-amber-500 to-amber-600',
        Income: 'from-blue-500 to-blue-600',
        Other: 'from-slate-400 to-slate-500'
    };
    return colors[category] || colors.Other;
}

async function init() {
    await loadData();
}

document.addEventListener('DOMContentLoaded', init);
