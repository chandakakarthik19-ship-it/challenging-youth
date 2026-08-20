function money(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function getTransactionName(transaction) {
  return transaction.name || transaction.description || '-';
}

async function loadSummary() {
  const res = await fetch('/api/transactions/summary');
  if (!res.ok) throw new Error('Failed to fetch summary.');

  const data = await res.json();
  document.getElementById('totalDonations').textContent = money(data.totalDonations);
  document.getElementById('totalExpenditures').textContent = money(data.totalExpenditures);
  document.getElementById('balance').textContent = money(data.balance);
}

async function loadTransactions() {
  const res = await fetch('/api/transactions');
  if (!res.ok) throw new Error('Failed to fetch transactions.');

  const donationRows = document.getElementById('userDonationRows');
  const expenditureRows = document.getElementById('userExpenditureRows');
  const data = await res.json();

  const donations = data.filter((t) => t.type === 'donation');
  const expenditures = data.filter((t) => t.type === 'expenditure');

  donationRows.innerHTML = donations
    .map(
      (t) => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${getTransactionName(t)}</td>
        <td>${money(t.amount)}</td>
      </tr>
    `
    )
    .join('');

  expenditureRows.innerHTML = expenditures
    .map(
      (t) => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${getTransactionName(t)}</td>
        <td>${money(t.amount)}</td>
      </tr>
    `
    )
    .join('');
}

async function initUserDashboard() {
  try {
    await Promise.all([loadSummary(), loadTransactions()]);
  } catch (error) {
    console.error(error);
    alert('Unable to load data right now.');
  }
}

initUserDashboard();
