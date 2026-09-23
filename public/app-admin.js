let editingId = null;
let annadhanamEditingId = null;

function money(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function toInputDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function getTransactionName(transaction) {
  return transaction.name || transaction.description || '-';
}

function renderSponsorNames(names) {
  return String(names || '-')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => `<div>${name}</div>`)
    .join('');
}

function getActiveAdminKey() {
  const input = document.getElementById('adminKey');
  const typedKey = input ? input.value.trim() : '';
  return typedKey;
}

function setMessage(text, kind = '') {
  const el = document.getElementById('adminMessage');
  el.className = `message ${kind}`;
  el.textContent = text;
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  headers['Content-Type'] = 'application/json';

  const key = getActiveAdminKey();
  if (key) headers['x-admin-key'] = key;

  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.message || 'Request failed.');
  }

  return body;
}

async function loadSummary() {
  const data = await api('/api/transactions/summary');
  document.getElementById('totalDonations').textContent = money(data.totalDonations);
  document.getElementById('totalExpenditures').textContent = money(data.totalExpenditures);
  document.getElementById('balance').textContent = money(data.balance);
}

async function loadTransactions() {
  const data = await api('/api/transactions');
  const donationRows = document.getElementById('adminDonationRows');
  const expenditureRows = document.getElementById('adminExpenditureRows');

  const donations = data.filter((t) => t.type === 'donation');
  const expenditures = data.filter((t) => t.type === 'expenditure');

  const renderRows = (list) =>
    list
      .map(
        (t) => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${getTransactionName(t)}</td>
        <td>${money(t.amount)}</td>
        <td>
          <div class="actions">
            <button type="button" class="ghost" data-action="edit" data-id="${t._id}">Edit</button>
            <button type="button" class="danger" data-action="delete" data-id="${t._id}">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

  donationRows.innerHTML = renderRows(donations);
  expenditureRows.innerHTML = renderRows(expenditures);

  document.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(data.find((t) => t._id === btn.dataset.id)));
  });

  document.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
  });
}

function renderGalleryEditor(items) {
  const editor = document.getElementById('galleryEditor');
  editor.replaceChildren(
    ...items.map((item, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'gallery-editor-item';
      wrapper.dataset.imageUrl = item.imageUrl || '';

      const preview = document.createElement('img');
      preview.className = 'gallery-editor-preview';
      preview.src = item.imageUrl || '/logo.png';
      preview.alt = item.caption || `Gallery image ${index + 1}`;

      const imageLabel = document.createElement('label');
      imageLabel.textContent = `Photo ${index + 1}`;

      const imageInput = document.createElement('input');
      imageInput.name = 'image';
      imageInput.type = 'file';
      imageInput.accept = 'image/jpeg,image/png,image/gif,image/webp';

      const urlInput = document.createElement('input');
      urlInput.name = 'imageUrl';
      urlInput.type = 'text';
      urlInput.placeholder = 'Or paste an image URL';
      urlInput.value = item.imageUrl || '';
      urlInput.required = true;

      const captionLabel = document.createElement('label');
      captionLabel.textContent = 'Caption';

      const captionInput = document.createElement('input');
      captionInput.name = 'caption';
      captionInput.type = 'text';
      captionInput.value = item.caption || '';
      captionInput.maxLength = 160;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost gallery-remove';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => wrapper.remove());

      imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (!file) return;
        preview.src = URL.createObjectURL(file);
        urlInput.required = false;
      });

      urlInput.addEventListener('input', () => {
        wrapper.dataset.imageUrl = urlInput.value.trim();
        if (urlInput.value.trim()) preview.src = urlInput.value.trim();
      });

      wrapper.append(preview, imageLabel, imageInput, urlInput, captionLabel, captionInput, removeButton);
      return wrapper;
    })
  );
}

async function addGalleryItem() {
  const editor = document.getElementById('galleryEditor');

  const existingItems = [...editor.querySelectorAll('.gallery-editor-item')];
  if (existingItems.length >= 12) {
    setMessage('The gallery can contain up to 12 photos.', 'error');
    return;
  }

  try {
    setMessage('Preparing selected photos...');
    const items = [];

    for (const item of existingItems) {
      const fileInput = item.querySelector('[name="image"]');
      const imageUrl = fileInput.files[0]
        ? await uploadGalleryImage(fileInput.files[0])
        : item.querySelector('[name="imageUrl"]').value.trim();

      items.push({
        imageUrl,
        caption: item.querySelector('[name="caption"]').value.trim(),
      });
    }

    items.push({ imageUrl: '', caption: '' });
    renderGalleryEditor(items);
    setMessage('Add the new photo, then save the gallery.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function loadGallery() {
  const data = await api('/api/gallery');
  renderGalleryEditor(data.items);
}

async function uploadGalleryImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const headers = {};
  const key = getActiveAdminKey();
  if (key) headers['x-admin-key'] = key;

  const res = await fetch('/api/gallery/upload', { method: 'POST', headers, body: formData });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Image upload failed.');
  return body.imageUrl;
}

async function submitGallery(event) {
  event.preventDefault();
  setMessage('Saving gallery...');

  try {
    const items = [];
    for (const item of document.querySelectorAll('.gallery-editor-item')) {
      const fileInput = item.querySelector('[name="image"]');
      const urlInput = item.querySelector('[name="imageUrl"]');
      const imageUrl = fileInput.files[0] ? await uploadGalleryImage(fileInput.files[0]) : urlInput.value.trim();

      if (!imageUrl) throw new Error('Choose a photo or enter an image URL for every gallery item.');
      items.push({
        imageUrl,
        caption: item.querySelector('[name="caption"]').value.trim(),
      });
    }

    await api('/api/gallery', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
    setMessage('Gallery updated.', 'ok');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function startEdit(transaction) {
  if (!transaction) return;

  editingId = transaction._id;
  document.getElementById('formTitle').textContent = 'Edit Transaction';
  document.getElementById('submitBtn').textContent = 'Save Changes';

  document.getElementById('type').value = transaction.type;
  document.getElementById('name').value = getTransactionName(transaction);
  document.getElementById('amount').value = Number(transaction.amount).toFixed(2);
  document.getElementById('date').value = toInputDate(transaction.date);
}

function resetForm() {
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add Transaction';
  document.getElementById('submitBtn').textContent = 'Add Transaction';
  document.getElementById('transactionForm').reset();
  document.getElementById('type').value = 'donation';
}

async function submitForm(event) {
  event.preventDefault();
  setMessage('Saving...');

  const payload = {
    type: document.getElementById('type').value,
    name: document.getElementById('name').value.trim(),
    amount: Number(document.getElementById('amount').value),
  };

  const dateValue = document.getElementById('date').value;
  if (dateValue) payload.date = dateValue;

  try {
    if (editingId) {
      await api(`/api/transactions/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setMessage('Transaction updated.', 'ok');
    } else {
      await api('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMessage('Transaction added.', 'ok');
    }

    resetForm();
    await Promise.all([loadSummary(), loadTransactions()]);
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;

  try {
    await api(`/api/transactions/${id}`, { method: 'DELETE' });
    setMessage('Transaction deleted.', 'ok');
    if (editingId === id) resetForm();
    await Promise.all([loadSummary(), loadTransactions()]);
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function setAnnadhanamMessage(text, kind = '') {
  const el = document.getElementById('annadhanamMessage');
  el.className = `message ${kind}`;
  el.textContent = text;
}

function resetAnnadhanamForm() {
  annadhanamEditingId = null;
  document.getElementById('annadhanamForm').reset();
}

async function loadAnnadhanamSponsors() {
  const data = await api('/api/annadhanam');
  const rows = document.getElementById('annadhanamRows');

  rows.innerHTML = data
    .map(
      (sponsor, index) => `
      <tr>
        <td>${index + 1}</td>
        <td class="sponsor-names">${renderSponsorNames(sponsor.name)}</td>
        <td>${sponsor.sponsoringItem || '-'}</td>
        <td>
          <div class="actions">
            <button type="button" class="ghost" data-annadhanam-action="edit" data-id="${sponsor._id}">Edit</button>
            <button type="button" class="danger" data-annadhanam-action="delete" data-id="${sponsor._id}">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  document.querySelectorAll('[data-annadhanam-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => startEditAnnadhanamSponsor(btn.dataset.id));
  });

  document.querySelectorAll('[data-annadhanam-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteAnnadhanamSponsor(btn.dataset.id));
  });
}

function startEditAnnadhanamSponsor(id) {
  const form = document.getElementById('annadhanamForm');
  const nameInput = document.getElementById('annadhanamNames');
  const itemInput = document.getElementById('annadhanamItem');

  const sponsor = document.querySelector(`[data-annadhanam-action="edit"][data-id="${id}"]`);
  if (!sponsor) return;

  const row = sponsor.closest('tr');
  if (!row) return;

  const rowCells = row.querySelectorAll('td');
  const nameValue = rowCells[1]?.textContent || '';
  const itemValue = rowCells[2]?.textContent || '';

  annadhanamEditingId = id;
  nameInput.value = nameValue;
  itemInput.value = itemValue;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitAnnadhanamForm(event) {
  event.preventDefault();
  setAnnadhanamMessage('Saving sponsor...');

  const payload = {
    name: document.getElementById('annadhanamNames').value.trim(),
    sponsoringItem: document.getElementById('annadhanamItem').value.trim(),
  };

  try {
    if (annadhanamEditingId) {
      await api(`/api/annadhanam/${annadhanamEditingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setAnnadhanamMessage('Sponsor updated.', 'ok');
    } else {
      await api('/api/annadhanam', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAnnadhanamMessage('Sponsor added.', 'ok');
    }

    resetAnnadhanamForm();
    await loadAnnadhanamSponsors();
  } catch (error) {
    setAnnadhanamMessage(error.message, 'error');
  }
}

async function deleteAnnadhanamSponsor(id) {
  if (!confirm('Delete this sponsor?')) return;

  try {
    await api(`/api/annadhanam/${id}`, { method: 'DELETE' });
    setAnnadhanamMessage('Sponsor deleted.', 'ok');
    if (annadhanamEditingId === id) resetAnnadhanamForm();
    await loadAnnadhanamSponsors();
  } catch (error) {
    setAnnadhanamMessage(error.message, 'error');
  }
}

async function initAdminDashboard() {
  document.getElementById('transactionForm').addEventListener('submit', submitForm);
  document.getElementById('cancelEditBtn').addEventListener('click', resetForm);
  document.getElementById('galleryForm').addEventListener('submit', submitGallery);
  document.getElementById('annadhanamForm').addEventListener('submit', submitAnnadhanamForm);
  document.getElementById('cancelAnnadhanamEditBtn').addEventListener('click', resetAnnadhanamForm);

  document.getElementById('addGalleryItemBtn').addEventListener('click', addGalleryItem);

  try {
    await Promise.all([loadSummary(), loadTransactions(), loadGallery(), loadAnnadhanamSponsors()]);
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

initAdminDashboard();
