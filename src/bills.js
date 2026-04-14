import './style.css';
import { fetchData, patchData, escapeHtml, generateId, formatCurrency } from './utils.js';

let bills = [];

const billsList = document.getElementById('billsList');
const upcomingBillsCountEl = document.getElementById('upcomingBillsCount');
const upcomingBillsTotalEl = document.getElementById('upcomingBillsTotal');
const monthlyFixedTotalEl = document.getElementById('monthlyFixedTotal');
const paidMonthTotalEl = document.getElementById('paidMonthTotal');
const billForm = document.getElementById('billForm');

async function loadBills() {
    try {
        const data = await fetchData();
        bills = data.bills || [];

        if (bills.length === 0 && !data.bills_initialized) {
            bills = [
                { id: generateId(), name: 'Rent', amount: 12000, date: '2026-03-01', frequency: 'monthly', status: 'pending', category: 'Rent' },
                { id: generateId(), name: 'Netflix', amount: 499, date: '2026-03-15', frequency: 'monthly', status: 'pending', category: 'Fun' },
                { id: generateId(), name: 'Electricity', amount: 2500, date: '2026-03-10', frequency: 'monthly', status: 'pending', category: 'Utilities' },
                { id: generateId(), name: 'Internet', amount: 999, date: '2026-02-28', frequency: 'monthly', status: 'paid', category: 'Utilities' },
                { id: generateId(), name: 'Insurance', amount: 15000, date: '2026-05-20', frequency: 'yearly', status: 'pending', category: 'Other' }
            ];
            await saveBills(true);
        }

        renderAll();
    } catch (err) {
        console.error('bills.js: Failed to load data:', err);
    }
}

async function saveBills(isInit = false) {
    try {
        const payload = { bills };
        if (isInit) payload.bills_initialized = true;
        await patchData(payload);
    } catch (err) {
        console.error('bills.js: Failed to save bills:', err);
    }
}

function renderAll() {
    renderStats();
    renderBills();
}

function renderStats() {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcoming = bills.filter(b => {
        const d = new Date(b.date);
        return d >= today && d <= nextWeek && b.status === 'pending';
    });

    const monthlyFixed = bills
        .filter(b => b.frequency === 'monthly')
        .reduce((sum, b) => sum + b.amount, 0);

    const paidThisMonth = bills.filter(b => {
        if (b.status !== 'paid') return false;
        const d = b.paidDate ? new Date(b.paidDate) : new Date(b.date);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).reduce((sum, b) => sum + b.amount, 0);

    if (upcomingBillsCountEl) upcomingBillsCountEl.textContent = upcoming.length;
    if (upcomingBillsTotalEl) upcomingBillsTotalEl.textContent = `Total: ${formatCurrency(upcoming.reduce((s, b) => s + b.amount, 0))}`;
    if (monthlyFixedTotalEl) monthlyFixedTotalEl.textContent = formatCurrency(monthlyFixed);
    if (paidMonthTotalEl) paidMonthTotalEl.textContent = formatCurrency(paidThisMonth);
}

function renderBills() {
    if (!billsList) return;
    billsList.innerHTML = '';

    if (bills.length === 0) {
        billsList.innerHTML = `<p class="text-center text-slate-400 py-8">No bills yet. Add your first bill!</p>`;
        return;
    }

    bills.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(bill => {
        const isPaid = bill.status === 'paid';
        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-5 rounded-2xl border transition-all ${isPaid ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`;

        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl ${isPaid ? 'bg-slate-200 text-slate-500' : 'bg-rose-50 text-rose-600'}">
                    ${getIcon(bill.name)}
                </div>
                <div>
                    <h4 class="font-bold text-slate-800">${escapeHtml(bill.name)}</h4>
                    <p class="text-xs text-slate-500">${escapeHtml(bill.frequency.charAt(0).toUpperCase() + bill.frequency.slice(1))} • Due ${new Date(bill.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                </div>
            </div>
            <div class="flex items-center gap-6">
                <div class="text-right">
                    <div class="font-black text-slate-800">${formatCurrency(bill.amount)}</div>
                    <div class="text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'text-emerald-500' : 'text-rose-500'}">${escapeHtml(bill.status)}</div>
                </div>
                <div class="flex gap-2" data-bill-id="${bill.id}">
                    ${!isPaid ? `<button class="mark-paid-btn p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>` : ''}
                    <button class="delete-bill-btn p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                    </button>
                </div>
            </div>
        `;

        const actions = div.querySelector(`[data-bill-id="${bill.id}"]`);
        actions.querySelector('.delete-bill-btn')?.addEventListener('click', () => deleteBill(bill.id));
        if (!isPaid) {
            actions.querySelector('.mark-paid-btn')?.addEventListener('click', () => markAsPaid(bill.id));
        }

        billsList.appendChild(div);
    });
}

function getIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('netflix')) return '🎬';
    if (n.includes('rent')) return '🏠';
    if (n.includes('elect')) return '⚡';
    if (n.includes('intern') || n.includes('wifi')) return '🌐';
    if (n.includes('insur')) return '🛡️';
    if (n.includes('gym')) return '💪';
    if (n.includes('spotify') || n.includes('music')) return '🎵';
    return '📄';
}

async function markAsPaid(id) {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;
    bill.status = 'paid';
    bill.paidDate = new Date().toISOString().split('T')[0];
    renderAll();
    await saveBills();
}

async function deleteBill(id) {
    if (!confirm('Delete this bill?')) return;
    bills = bills.filter(b => b.id !== id);
    renderAll();
    await saveBills();
}

if (billForm) {
    billForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('billName').value.trim();
        const amount = parseFloat(document.getElementById('billAmount').value);
        const date = document.getElementById('billDate').value;
        const frequency = document.getElementById('billFrequency').value;

        if (!name) { alert('Please enter a bill name.'); return; }
        if (isNaN(amount) || amount <= 0) { alert('Please enter a valid positive amount.'); return; }
        if (!date) { alert('Please select a due date.'); return; }

        bills.push({ id: generateId(), name, amount, date, frequency, status: 'pending' });
        renderAll();
        await saveBills();
        billForm.reset();
        window.toggleModal('billModal');
    });
}

async function init() {
    await loadBills();
}

document.addEventListener('DOMContentLoaded', init);
