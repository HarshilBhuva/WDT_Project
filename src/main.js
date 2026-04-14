import './style.css';
import { fetchData, patchData, escapeHtml, generateId, formatCurrency } from './utils.js';

let transactions = [];
let savings = [];
let investments = [];
let settings = { baseBalance: 0, standardIncome: 0, emergencyFundTargetMonths: 6 };

const tableBody = document.getElementById('transactionTableBody');
const totalNetWorthEl = document.getElementById('totalNetWorth');
const monthlyIncomeEl = document.getElementById('monthlyIncome');
const incomeSourceEl = document.getElementById('incomeSource');
const transactionForm = document.getElementById('transactionForm');
const settingsForm = document.getElementById('settingsForm');

async function loadData() {
    try {
        const data = await fetchData();
        transactions = data.transactions || [];
        savings = data.savings || [];
        investments = data.investments || [];
        settings = data.dashboard_settings || settings;
        renderTable();
        populateSettingsForm();
    } catch (err) {
        console.error('main.js: Failed to load data:', err);
    }
}

function populateSettingsForm() {
    if (!settingsForm) return;
    document.getElementById('baseBalanceInput').value = settings.baseBalance || 0;
    document.getElementById('standardIncomeInput').value = settings.standardIncome || 0;
    document.getElementById('efMonthsInput').value = settings.emergencyFundTargetMonths || 6;
}

async function saveTransactions() {
    try {
        await patchData({ transactions });
    } catch (err) {
        console.error('main.js: Failed to save transactions:', err);
    }
}

async function saveSettings() {
    try {
        await patchData({ dashboard_settings: settings });
    } catch (err) {
        console.error('main.js: Failed to save settings:', err);
    }
}

function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (transactions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-slate-400">No transactions yet. Add your first one!</td></tr>`;
        updateStats();
        return;
    }

    transactions.forEach(tx => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0';
        tr.dataset.id = tx.id;

        const amountColor = tx.amount > 0 ? 'text-emerald-500' : 'text-slate-700';
        const amountSign = tx.amount > 0 ? '+' : '';

        tr.innerHTML = `
          <td class="py-4 ps-6 text-start">
            <div class="font-bold text-slate-800">${escapeHtml(tx.desc)}</div>
          </td>
          <td class="py-4 text-start">
            <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">${escapeHtml(tx.category)}</span>
          </td>
          <td class="py-4 text-start text-slate-500 font-medium text-sm">${escapeHtml(tx.date)}</td>
          <td class="py-4 text-end pe-4 font-black ${amountColor}">
            ${amountSign}${formatCurrency(Math.abs(tx.amount), 2)}
          </td>
          <td class="py-4 pe-6 text-end">
            <button class="delete-tx-btn p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Delete transaction">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
            </button>
          </td>
        `;

        tr.querySelector('.delete-tx-btn').addEventListener('click', () => deleteTransaction(tx.id));
        tableBody.appendChild(tr);
    });

    updateStats();
}

function updateStats() {
    if (!totalNetWorthEl || !monthlyIncomeEl) return;

    const transBalance = transactions.reduce((acc, tx) => acc + tx.amount, 0);
    const savingsBalance = savings.reduce((acc, s) => acc + s.balance, 0);
    const investmentBalance = investments.reduce((acc, inv) => acc + inv.current, 0);
    const baseBalance = parseFloat(settings.baseBalance || 0);
    const totalNetWorth = transBalance + savingsBalance + investmentBalance + baseBalance;

    const breakdownSavingsEl = document.getElementById('breakdownSavings');
    const breakdownInvestmentsEl = document.getElementById('breakdownInvestments');
    const breakdownCashEl = document.getElementById('breakdownCash');

    if (breakdownSavingsEl) breakdownSavingsEl.textContent = formatCurrency(savingsBalance);
    if (breakdownInvestmentsEl) breakdownInvestmentsEl.textContent = formatCurrency(investmentBalance);
    if (breakdownCashEl) breakdownCashEl.textContent = formatCurrency(transBalance + baseBalance);

    const standardIncome = parseFloat(settings.standardIncome || 0);
    const transIncome = transactions
        .filter(tx => tx.amount > 0 && tx.category === 'Income')
        .reduce((acc, tx) => acc + tx.amount, 0);
    const displayIncome = standardIncome > 0 ? standardIncome : transIncome;

    totalNetWorthEl.textContent = formatCurrency(totalNetWorth, 2);
    monthlyIncomeEl.textContent = formatCurrency(displayIncome, 2);

    if (incomeSourceEl) {
        incomeSourceEl.textContent = standardIncome > 0 ? 'Standard Target' : 'From Transactions';
    }
}

async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    transactions = transactions.filter(tx => tx.id !== id);
    renderTable();
    await saveTransactions();
}

const clearAllTxBtn = document.getElementById('clearAllTxBtn');
if (clearAllTxBtn) {
    clearAllTxBtn.addEventListener('click', async () => {
        if (!transactions.length) return;
        if (!confirm('Delete ALL transactions? This cannot be undone.')) return;
        transactions = [];
        renderTable();
        await saveTransactions();
    });
}

if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('descInput').value.trim();
        const amountVal = parseFloat(document.getElementById('amountInput').value);
        const category = document.getElementById('categoryInput').value;
        const date = document.getElementById('dateInput').value;

        if (!desc) { alert('Please enter a description.'); return; }
        if (isNaN(amountVal) || amountVal <= 0) { alert('Please enter a valid positive amount.'); return; }
        if (!date) { alert('Please select a date.'); return; }

        const finalAmount = category === 'Income' ? amountVal : -amountVal;
        transactions.unshift({ id: generateId(), desc, category, date, amount: finalAmount });
        renderTable();
        await saveTransactions();
        transactionForm.reset();
        window.toggleModal('transactionModal');
    });
}

if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const baseBalance = parseFloat(document.getElementById('baseBalanceInput').value) || 0;
        const standardIncome = parseFloat(document.getElementById('standardIncomeInput').value) || 0;
        const emergencyFundTargetMonths = parseFloat(document.getElementById('efMonthsInput').value) || 6;

        settings = { baseBalance, standardIncome, emergencyFundTargetMonths };
        updateStats();
        await saveSettings();
        window.toggleModal('settingsModal');
    });
}

async function init() {
    const dateInput = document.getElementById('dateInput');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    await loadData();
}

document.addEventListener('DOMContentLoaded', init);
