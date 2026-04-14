export const API_URL = '/api/data';

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}

export function toggleModal(id) {
    document.getElementById(id)?.classList.toggle('active');
}
window.toggleModal = toggleModal;

export async function fetchData() {
    const res = await fetch(API_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

export async function patchData(slice) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slice)
    });
    if (!res.ok) throw new Error('Save failed: HTTP ' + res.status);
}

export function generateId() {
    return crypto.randomUUID();
}

export function formatCurrency(amount, fractionDigits = 0) {
    return `₹${Number(amount).toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
}
