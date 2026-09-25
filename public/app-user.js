let transactionSort = 'date';

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

function sortTransactions(transactions) {
  return [...transactions].sort((first, second) => {
    if (transactionSort === 'amount') {
      return Number(second.amount || 0) - Number(first.amount || 0);
    }

    return new Date(second.date).getTime() - new Date(first.date).getTime();
  });
}

function renderSponsorNames(names) {
  return String(names || '-')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => `<div>${name}</div>`)
    .join('');
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

  const donations = sortTransactions(data.filter((t) => t.type === 'donation'));
  const expenditures = sortTransactions(data.filter((t) => t.type === 'expenditure'));

  donationRows.innerHTML = donations
    .map(
      (t, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(t.date)}</td>
        <td>${getTransactionName(t)}</td>
        <td>${money(t.amount)}</td>
      </tr>
    `
    )
    .join('');

  expenditureRows.innerHTML = expenditures
    .map(
      (t, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(t.date)}</td>
        <td>${getTransactionName(t)}</td>
        <td>${money(t.amount)}</td>
      </tr>
    `
    )
    .join('');

  document.querySelectorAll('button[data-transaction-sort]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.transactionSort === transactionSort);
    btn.onclick = () => {
      transactionSort = btn.dataset.transactionSort;
      loadTransactions();
    };
  });
}

function renderGallery(items) {
  const track = document.getElementById('userGalleryItems');
  const createSlides = () => {
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const slide = document.createElement('figure');
      slide.className = 'gallery-slide';

      const image = document.createElement('img');
      image.src = item.imageUrl;
      image.alt = item.caption || 'Gallery image';

      const caption = document.createElement('figcaption');
      caption.textContent = item.caption || 'Gallery image';

      slide.append(image, caption);
      fragment.appendChild(slide);
    });

    return fragment;
  };

  track.replaceChildren(createSlides(), createSlides());
}

async function loadAnnadhanamSponsors() {
  const res = await fetch('/api/annadhanam');
  if (!res.ok) throw new Error('Failed to fetch annadhanam sponsors.');

  const data = await res.json();
  const rows = document.getElementById('annadhanamUserRows');
  rows.innerHTML = data
    .map(
      (sponsor, index) => `
      <tr>
        <td>${index + 1}</td>
        <td class="sponsor-names">${renderSponsorNames(sponsor.name)}</td>
        <td>${sponsor.sponsoringItem || '-'}</td>
      </tr>
    `
    )
    .join('');
}

async function loadGallery() {
  const res = await fetch('/api/gallery');
  if (!res.ok) throw new Error('Failed to fetch gallery.');

  const data = await res.json();
  renderGallery(data.items);
}

async function initUserDashboard() {
  try {
    await Promise.all([loadSummary(), loadTransactions(), loadGallery(), loadAnnadhanamSponsors()]);
  } catch (error) {
    console.error(error);
    alert('Unable to load data right now.');
  }
}

initUserDashboard();
