import './style.css';
import { fetchData, patchData, escapeHtml, generateId, formatCurrency } from './utils.js';

let savings = [];
let transactions = [];
let settings = { savingsGoalTarget: 500000, emergencyFundTargetMonths: 6 };

const savingsAccounts = document.getElementById('savingsAccounts');
const totalSavingsEl = document.getElementById('totalSavings');
const monthlySavingsEl = document.getElementById('monthlySavings');
const savingsRateEl = document.getElementById('savingsRate');
const emergencyFundMonthsEl = document.getElementById('emergencyFundMonths');
const totalInterestEl = document.getElementById('totalInterest');
const interestBreakdown = document.getElementById('interestBreakdown');
const savingsForm = document.getElementById('savingsForm');
const savingsGoalPctEl = document.getElementById('savingsGoalPct');
const savingsGoalBarEl = document.getElementById('savingsGoalBar');
const emergencyFundPctEl = document.getElementById('emergencyFundPct');
const emergencyFundBarEl = document.getElementById('emergencyFundBar');
const savingsGrowthList = document.getElementById('savingsGrowthList');

async function loadData() {
    try {
        const data = await fetchData();
        savings = data.savings || [];
        transactions = data.transactions || [];
        settings = data.dashboard_settings || settings;

        if (savings.length === 0 && !data.savings_initialized) {
            savings = [
                { id: generateId(), name: 'Emergency Fund', type: 'High-Yield', balance: 180000, rate: 4.5, icon: '🛡️', color: 'emerald' },
                { id: generateId(), name: 'Vacation Fund', type: 'Savings', balance: 65000, rate: 3.5, icon: '✈️', color: 'blue' },
                { id: generateId(), name: 'Down Payment Fund', type: 'Fixed Deposit', balance: 100000, rate: 6.5, icon: '🏠', color: 'purple' }
            ];
            await saveSavings(true);
        }

        renderAll();
    } catch (err) {
        console.error('savings.js: Failed to load data:', err);
    }
}

async function saveSavings(isInit = false) {
    try {
        const payload = { savings };
        if (isInit) payload.savings_initialized = true;
        await patchData(payload);
    } catch (err) {
        console.error('savings.js: Failed to save savings:', err);
    }
}

function renderAll() {
    renderAccounts();
    renderSummary();
    renderInterest();
}

function renderAccounts() {
    if (!savingsAccounts) return;
    savingsAccounts.innerHTML = '';

    if (savings.length === 0) {
        savingsAccounts.innerHTML = `<p class="text-center text-slate-400 py-8">No savings accounts yet. Add one!</p>`;
        return;
    }

    const colorConfig = {
        emerald: { grad: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-200 text-emerald-800' },
        blue: { grad: 'from-blue-50 to-indigo-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
        purple: { grad: 'from-purple-50 to-pink-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-200 text-purple-800' }
    };

    savings.forEach(acc => {
        const config = colorConfig[acc.color] || colorConfig.blue;
        const div = document.createElement('div');
        div.className = `p-6 bg-gradient-to-r ${config.grad} rounded-2xl border-2 ${config.border} mb-4 relative group`;
        div.innerHTML = `
            <div class="absolute top-4 right-4 flex items-center gap-2">
                 <span class="px-3 py-1 ${config.badge} rounded-full text-sm font-bold">Active</span>
                 <button class="delete-acc-btn p-2 text-slate-400 hover:text-rose-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                 </button>
            </div>
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="text-xl font-bold text-slate-800">${escapeHtml(acc.name)}</h4>
                    <p class="text-sm text-slate-600">${escapeHtml(acc.type)}</p>
                </div>
            </div>
            <div class="flex items-end justify-between">
                <div>
                    <p class="text-sm text-slate-600 mb-1">Current Balance</p>
                    <h3 class="text-3xl font-bold ${config.text}">${formatCurrency(acc.balance)}</h3>
                </div>
                <div class="text-right">
                    <p class="text-sm text-slate-600 mb-1">Interest Rate</p>
                    <p class="text-xl font-bold text-indigo-600">${acc.rate}% APY</p>
                </div>
            </div>
        `;

        div.querySelector('.delete-acc-btn').addEventListener('click', () => deleteAccount(acc.id));
        savingsAccounts.appendChild(div);
    });
}

async function deleteAccount(id) {
    if (!confirm('Are you sure you want to delete this savings account?')) return;
    savings = savings.filter(acc => acc.id !== id);
    renderAll();
    await saveSavings();
}

function renderSummary() {
    const totalSavings = savings.reduce((sum, acc) => sum + acc.balance, 0);
    if (totalSavingsEl) totalSavingsEl.textContent = formatCurrency(totalSavings);

    const expenseTransactions = transactions.filter(t => t.amount < 0);
    const incomeTransactions = transactions.filter(t => t.category === 'Income');
    const allMonths = new Set([
        ...expenseTransactions.map(t => t.date.substring(0, 7)),
        ...incomeTransactions.map(t => t.date.substring(0, 7))
    ]);
    const totalMonthCount = Math.max(1, allMonths.size);

    const totalExpenses = Math.abs(expenseTransactions.reduce((sum, t) => sum + t.amount, 0));
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    const avgMonthlyExpenses = expenseTransactions.length > 0 ? totalExpenses / totalMonthCount : 40000;
    const avgMonthlyIncome = incomeTransactions.length > 0 ? totalIncome / totalMonthCount : (settings.standardIncome || 100000);

    const monthlySavingsAmt = Math.max(0, avgMonthlyIncome - avgMonthlyExpenses);
    const savingsRate = avgMonthlyIncome > 0 ? (monthlySavingsAmt / avgMonthlyIncome) * 100 : 0;
    const efMonths = totalSavings / Math.max(1, avgMonthlyExpenses);

    if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(monthlySavingsAmt);
    if (savingsRateEl) savingsRateEl.textContent = `${savingsRate.toFixed(0)}%`;
    if (emergencyFundMonthsEl) emergencyFundMonthsEl.textContent = `${efMonths.toFixed(1)} mo`;

    const savingsGoalTarget = settings.savingsGoalTarget || 500000;
    const savingsGoalPct = Math.min(100, (totalSavings / savingsGoalTarget) * 100);
    if (savingsGoalPctEl) savingsGoalPctEl.textContent = `${savingsGoalPct.toFixed(0)}%`;
    if (savingsGoalBarEl) savingsGoalBarEl.style.width = `${savingsGoalPct}%`;

    const efTargetMonths = settings.emergencyFundTargetMonths || 6;
    const efPct = Math.min(100, (efMonths / efTargetMonths) * 100);
    if (emergencyFundPctEl) emergencyFundPctEl.textContent = `${efPct.toFixed(0)}%`;
    if (emergencyFundBarEl) emergencyFundBarEl.style.width = `${efPct}%`;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthNet = transactions
        .filter(t => t.date.startsWith(currentMonthStr))
        .reduce((sum, t) => sum + t.amount, 0);

    const totalSavingsMsg = document.getElementById('totalSavingsMsg');
    if (totalSavingsMsg) {
        const growthPct = totalSavings > 0 ? (Math.max(0, thisMonthNet) / (totalSavings - Math.max(0, thisMonthNet)) * 100) : 0;
        totalSavingsMsg.textContent = `↑ ${growthPct.toFixed(1)}% this month`;
    }

    const totalInterestMsg = document.getElementById('totalInterestMsg');
    if (totalInterestMsg) {
        const monthlyInterest = savings.reduce((sum, acc) => sum + (acc.balance * (acc.rate / 100) / 12), 0);
        totalInterestMsg.textContent = `↑ ${formatCurrency(monthlyInterest)} this month`;
    }

    renderGrowthList();
}

function renderGrowthList() {
    if (!savingsGrowthList) return;
    savingsGrowthList.innerHTML = '';

    const months = {};
    transactions.forEach(t => {
        const monthStr = t.date.substring(0, 7);
        const label = new Date(t.date).toLocaleString('default', { month: 'long' });
        if (!(label in months)) months[label] = { key: monthStr, net: 0 };
    });

    transactions
        .filter(t => t.amount > 0 && t.category === 'Income')
        .forEach(t => {
            const label = new Date(t.date).toLocaleString('default', { month: 'long' });
            const monthStr = t.date.substring(0, 7);
            const monthExpenses = Math.abs(transactions
                .filter(tx => tx.date.startsWith(monthStr) && tx.amount < 0)
                .reduce((sum, tx) => sum + tx.amount, 0));
            if (months[label]) months[label].net = Math.max(0, t.amount - monthExpenses);
        });

    const entries = Object.entries(months).slice(0, 4);

    const demoData = [['January', 28000], ['December', 22000], ['November', 25000], ['October', 30000]];
    const displayEntries = entries.length > 0 ? entries.map(([m, v]) => [m, v.net]) : demoData;

    displayEntries.forEach(([month, value]) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center';
        row.innerHTML = `
            <span class="text-sm text-slate-600">${escapeHtml(month)}</span>
            <span class="font-bold text-slate-800">${formatCurrency(value)}</span>
        `;
        savingsGrowthList.appendChild(row);
    });

    const values = displayEntries.map(e => e[1]);
    const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const avgDiv = document.createElement('div');
    avgDiv.className = 'border-t-2 border-slate-200 pt-3 flex justify-between items-center';
    avgDiv.innerHTML = `
        <span class="font-bold text-slate-800">Avg/Month</span>
        <span class="font-bold text-emerald-600">${formatCurrency(avg)}</span>
    `;
    savingsGrowthList.appendChild(avgDiv);
}

function renderInterest() {
    if (!interestBreakdown) return;
    interestBreakdown.innerHTML = '';

    let totalInterest = 0;
    savings.forEach(acc => {
        const annualInterest = acc.balance * (acc.rate / 100);
        totalInterest += annualInterest;

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-slate-50 rounded-xl';
        div.innerHTML = `
            <span class="text-sm font-medium text-slate-700">${escapeHtml(acc.name)}</span>
            <span class="font-bold text-indigo-600">${formatCurrency(annualInterest)} /yr</span>
        `;
        interestBreakdown.appendChild(div);
    });

    if (totalInterestEl) totalInterestEl.textContent = formatCurrency(totalInterest);
}

if (savingsForm) {
    savingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('savName').value.trim();
        const type = document.getElementById('savType').value;
        const balance = parseFloat(document.getElementById('savBalance').value);
        const rate = parseFloat(document.getElementById('savRate').value);

        if (!name) { alert('Please enter an account name.'); return; }
        if (isNaN(balance) || balance < 0) { alert('Please enter a valid balance.'); return; }
        if (isNaN(rate) || rate < 0) { alert('Please enter a valid interest rate.'); return; }

        const colors = ['emerald', 'blue', 'purple'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        savings.push({ id: generateId(), name, type, balance, rate, color: randomColor });
        renderAll();
        await saveSavings();
        savingsForm.reset();
        window.toggleModal('savingsModal');
    });
}

async function init() {
    await loadData();
}

document.addEventListener('DOMContentLoaded', init);
