import './style.css';
import { fetchData, patchData, escapeHtml, generateId, formatCurrency } from './utils.js';

let goals = [];

const activeGoalsContainer = document.getElementById('activeGoalsContainer');
const completedGoalsContainer = document.getElementById('completedGoalsContainer');
const monthlyContributionsContainer = document.getElementById('monthlyContributionsContainer');
const activeGoalsCountEl = document.getElementById('activeGoalsCount');
const totalTargetAmountEl = document.getElementById('totalTargetAmount');
const completedGoalsCountEl = document.getElementById('completedGoalsCount');
const goalForm = document.getElementById('goalForm');
const updateProgressForm = document.getElementById('updateProgressForm');
const updateGoalAmountEl = document.getElementById('updateGoalAmount');
const updateGoalIdEl = document.getElementById('updateGoalId');
const updateGoalTitleEl = document.getElementById('updateGoalTitle');

async function loadGoals() {
    try {
        const data = await fetchData();
        goals = data.goals || [];

        if (goals.length === 0 && !data.goals_initialized) {
            goals = [
                { id: generateId(), name: 'House Down Payment', target: 200000, current: 120000, date: '2026-12-31', category: 'purchase', status: 'active', icon: '🏠' },
                { id: generateId(), name: 'Europe Vacation', target: 80000, current: 35000, date: '2026-06-30', category: 'travel', status: 'active', icon: '✈️' },
                { id: generateId(), name: 'New Car', target: 300000, current: 25000, date: '2027-03-31', category: 'purchase', status: 'active', icon: '🚗' },
                { id: generateId(), name: 'Wedding Fund', target: 500000, current: 150000, date: '2026-12-31', category: 'other', status: 'active', icon: '💍' },
                { id: generateId(), name: 'New Laptop', target: 75000, current: 75000, date: '2026-01-15', category: 'purchase', status: 'completed', icon: '💻' },
                { id: generateId(), name: 'Online Course', target: 15000, current: 15000, date: '2025-11-20', category: 'education', status: 'completed', icon: '📚' },
                { id: generateId(), name: 'Guitar Purchase', target: 25000, current: 25000, date: '2025-09-10', category: 'purchase', status: 'completed', icon: '🎸' }
            ];
            await saveGoals(true);
        }

        renderAll();
    } catch (err) {
        console.error('goals.js: Failed to load data:', err);
    }
}

async function saveGoals(isInit = false) {
    try {
        const payload = { goals };
        if (isInit) payload.goals_initialized = true;
        await patchData(payload);
    } catch (err) {
        console.error('goals.js: Failed to save goals:', err);
    }
}

function renderAll() {
    renderSummary();
    renderActiveGoals();
    renderCompletedGoals();
    renderContributions();
}

function renderSummary() {
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const totalTarget = activeGoals.reduce((sum, g) => sum + g.target, 0);

    if (activeGoalsCountEl) activeGoalsCountEl.textContent = activeGoals.length;
    if (totalTargetAmountEl) totalTargetAmountEl.textContent = formatCurrency(totalTarget);
    if (completedGoalsCountEl) completedGoalsCountEl.textContent = completedGoals.length;
}

function computeGoalStatus(g) {
    const now = new Date();
    const deadline = new Date(g.date);
    const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
    const pct = (g.current / g.target) * 100;

    if (daysLeft < 0) return { label: '⚠️ Overdue', cls: 'text-rose-600' };
    const totalDays = (deadline - new Date(Math.min(...goals.filter(x => x.id === g.id).map(() => deadline - 365 * 24 * 60 * 60 * 1000)))) / (1000 * 60 * 60 * 24);
    const expectedPct = 100 - (daysLeft / Math.max(1, totalDays + daysLeft)) * 100;
    if (pct >= Math.max(0, expectedPct - 10)) return { label: '✓ On Track', cls: 'text-emerald-600' };
    return { label: '⚠️ Behind', cls: 'text-amber-500' };
}

function renderActiveGoals() {
    if (!activeGoalsContainer) return;
    activeGoalsContainer.innerHTML = '';

    const activeGoals = goals.filter(g => g.status === 'active');

    if (activeGoals.length === 0) {
        activeGoalsContainer.innerHTML = `<p class="text-slate-400 col-span-2 text-center py-8">No active goals. Create one!</p>`;
        return;
    }

    const categoryConfig = {
        purchase: { bg: 'from-blue-100 to-blue-200', text: 'text-blue-700', bar: 'from-blue-400 to-blue-600', badge: 'bg-blue-100 text-blue-800' },
        travel: { bg: 'from-purple-100 to-purple-200', text: 'text-purple-700', bar: 'from-purple-400 to-purple-600', badge: 'bg-purple-100 text-purple-800' },
        savings: { bg: 'from-emerald-100 to-emerald-200', text: 'text-emerald-700', bar: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-100 text-emerald-800' },
        education: { bg: 'from-indigo-100 to-indigo-200', text: 'text-indigo-700', bar: 'from-indigo-400 to-indigo-600', badge: 'bg-indigo-100 text-indigo-800' },
        investment: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-700', bar: 'from-yellow-400 to-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
        other: { bg: 'from-orange-100 to-orange-200', text: 'text-orange-700', bar: 'from-orange-400 to-orange-600', badge: 'bg-orange-100 text-orange-800' }
    };

    activeGoals.forEach(g => {
        const config = categoryConfig[g.category] || categoryConfig.other;
        const pct = Math.min(100, (g.current / g.target) * 100);
        const status = computeGoalStatus(g);

        const div = document.createElement('div');
        div.className = 'card-premium p-8 relative group';
        div.innerHTML = `
            <div class="absolute top-4 right-4 flex items-center gap-2">
                 <span class="px-3 py-1 ${config.badge} rounded-full text-sm font-bold">Active</span>
                  <button class="update-goal-btn p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Update Progress">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <button class="delete-goal-btn p-2 text-slate-400 hover:text-rose-600 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                  </button>
             </div>
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-14 h-14 bg-gradient-to-br ${config.bg} rounded-2xl flex items-center justify-center text-3xl">
                        ${g.icon || '🎯'}
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">${escapeHtml(g.name)}</h3>
                        <p class="text-sm text-slate-500">Target: ${new Date(g.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>
            <div class="mb-4">
                <div class="flex justify-between mb-2">
                    <span class="text-sm font-medium text-slate-600">${formatCurrency(g.current)} of ${formatCurrency(g.target)}</span>
                    <span class="text-sm font-bold ${config.text}">${pct.toFixed(0)}%</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                    <div class="bg-gradient-to-r ${config.bar} h-4 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
            <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600">${formatCurrency(g.target - g.current)} remaining</span>
                <span class="font-medium ${status.cls}">${status.label}</span>
            </div>
        `;

        div.querySelector('.delete-goal-btn').addEventListener('click', () => deleteGoal(g.id));
        div.querySelector('.update-goal-btn').addEventListener('click', () => openUpdateModal(g));
        activeGoalsContainer.appendChild(div);
    });
}

function openUpdateModal(goal) {
    if (!updateGoalIdEl || !updateGoalTitleEl) return;
    updateGoalIdEl.value = goal.id;
    updateGoalTitleEl.textContent = `Update Progress: ${goal.name}`;
    if (updateGoalAmountEl) updateGoalAmountEl.value = '';
    window.toggleModal('updateProgressModal');
}

function renderCompletedGoals() {
    if (!completedGoalsContainer) return;
    completedGoalsContainer.innerHTML = '';

    const completedGoals = goals.filter(g => g.status === 'completed');

    if (completedGoals.length === 0) {
        completedGoalsContainer.innerHTML = `<p class="text-slate-400 text-center py-4">No completed goals yet — keep going!</p>`;
        return;
    }

    completedGoals.forEach(g => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 relative group';
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                    ${g.icon || '✅'}
                </div>
                <div>
                    <h4 class="font-bold text-slate-800">${escapeHtml(g.name)}</h4>
                    <p class="text-sm text-slate-600">Completed ${new Date(g.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} • ${formatCurrency(g.target)}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button class="delete-goal-btn p-2 text-slate-300 hover:text-rose-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                </button>
                <span class="text-2xl">✅</span>
            </div>
        `;

        div.querySelector('.delete-goal-btn').addEventListener('click', () => deleteGoal(g.id));
        completedGoalsContainer.appendChild(div);
    });
}

async function deleteGoal(id) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    goals = goals.filter(g => g.id !== id);
    renderAll();
    await saveGoals();
}

function renderContributions() {
    if (!monthlyContributionsContainer) return;
    monthlyContributionsContainer.innerHTML = '';

    const activeGoals = goals.filter(g => g.status === 'active');
    let totalMonthly = 0;

    if (activeGoals.length === 0) {
        monthlyContributionsContainer.innerHTML = `<p class="text-slate-400 text-center py-4">Add active goals to see required contributions.</p>`;
        return;
    }

    activeGoals.forEach(g => {
        const monthsRemaining = Math.max(1, (new Date(g.date) - new Date()) / (1000 * 60 * 60 * 24 * 30.44));
        const contribution = (g.target - g.current) / monthsRemaining;
        totalMonthly += contribution;

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-4 bg-slate-50 rounded-xl';
        div.innerHTML = `
            <span class="font-medium text-slate-700">${escapeHtml(g.name)}</span>
            <span class="font-bold text-slate-800">${formatCurrency(Math.round(contribution))}/mo</span>
        `;
        monthlyContributionsContainer.appendChild(div);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'border-t-2 border-slate-300 pt-4 flex justify-between items-center';
    totalDiv.innerHTML = `
        <span class="font-bold text-slate-800 text-lg">Total Monthly</span>
        <span class="font-bold text-indigo-600 text-xl">${formatCurrency(Math.round(totalMonthly))}</span>
    `;
    monthlyContributionsContainer.appendChild(totalDiv);
}

if (goalForm) {
    goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('goalName').value.trim();
        const target = parseFloat(document.getElementById('goalAmount').value);
        const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
        const date = document.getElementById('goalDate').value;
        const category = document.getElementById('goalCategory').value;

        if (!name) { alert('Please enter a goal name.'); return; }
        if (isNaN(target) || target <= 0) { alert('Please enter a valid target amount.'); return; }
        if (!date) { alert('Please select a target date.'); return; }

        const icons = { purchase: '🛍️', travel: '✈️', savings: '💰', education: '📚', investment: '📈', other: '🎯' };

        goals.push({
            id: generateId(),
            name,
            target,
            current,
            date,
            category,
            status: current >= target ? 'completed' : 'active',
            icon: icons[category] || '🎯'
        });

        renderAll();
        await saveGoals();
        goalForm.reset();
        window.toggleModal('goalModal');
    });
}

if (updateProgressForm) {
    updateProgressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goalId = document.getElementById('updateGoalId').value;
        const amount = parseFloat(document.getElementById('updateGoalAmount').value);
        const updateType = document.querySelector('input[name="updateType"]:checked').value;

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        const goalIndex = goals.findIndex(g => g.id === goalId);
        if (goalIndex === -1) return;

        const goal = goals[goalIndex];
        if (updateType === 'add') {
            goal.current += amount;
        } else {
            goal.current = amount;
        }

        // Check if completed
        if (goal.current >= goal.target) {
            goal.current = goal.target;
            goal.status = 'completed';
        } else {
            goal.status = 'active';
        }

        renderAll();
        await saveGoals();
        updateProgressForm.reset();
        window.toggleModal('updateProgressModal');
    });
}

async function init() {
    await loadGoals();
}

document.addEventListener('DOMContentLoaded', init);
