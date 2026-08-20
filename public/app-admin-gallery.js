const GALLERY_ADMIN_KEY_STORAGE = 'challenging_youth_admin_key';

function getAdminKey() {
  return localStorage.getItem(GALLERY_ADMIN_KEY_STORAGE) || '';
}

function getActiveAdminKey() {
  return document.getElementById('adminKey').value.trim() || getAdminKey();
}

function setMessage(text, kind = '') {
  const message = document.getElementById('galleryAdminMessage');
  message.className = `message ${kind}`;
  message.textContent = text;
}

function renderPhotos(items) {
  const grid = document.getElementById('adminPhotoGrid');
  grid.replaceChildren(
    ...items.map((item) => {
      const card = document.createElement('figure');
      card.className = 'photo-gallery-card';

      const media = item.mediaType === 'video' ? document.createElement('video') : document.createElement('img');
      media.src = item.imageUrl;
      media.alt = item.caption || 'Gallery media';
      if (item.mediaType === 'video') {
        media.controls = true;
        media.preload = 'metadata';
      }

      const caption = document.createElement('figcaption');
      caption.textContent = item.caption || 'Gallery photo';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'danger';
      remove.textContent = 'Remove Photo';
      remove.addEventListener('click', () => deletePhoto(item._id));

      card.append(media, caption, remove);
      return card;
    })
  );
}

async function loadPhotos() {
  const res = await fetch('/api/photo-gallery');
  if (!res.ok) throw new Error('Unable to load photos.');
  const data = await res.json();
  renderPhotos(data.items);
}

async function addPhoto(event) {
  event.preventDefault();
  const file = document.getElementById('photoFile').files[0];
  if (!file) return;

  setMessage('Uploading photo...');
  const formData = new FormData();
  formData.append('image', file);
  formData.append('caption', document.getElementById('photoCaption').value.trim());

  const headers = {};
  const key = getActiveAdminKey();
  if (key) headers['x-admin-key'] = key;

  try {
    const res = await fetch('/api/photo-gallery', {
      method: 'POST',
      headers,
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Photo upload failed.');

    document.getElementById('photoForm').reset();
    setMessage('Photo added.', 'ok');
    await loadPhotos();
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function deletePhoto(id) {
  if (!confirm('Remove this photo?')) return;

  const headers = { 'Content-Type': 'application/json' };
  const key = getActiveAdminKey();
  if (key) headers['x-admin-key'] = key;

  try {
    const res = await fetch(`/api/photo-gallery/${id}`, { method: 'DELETE', headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Photo removal failed.');

    setMessage('Photo removed.', 'ok');
    await loadPhotos();
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function wireKeyButtons() {
  const input = document.getElementById('adminKey');
  const savedKey = getAdminKey();
  if (savedKey) input.value = savedKey;

  document.getElementById('saveKeyBtn').addEventListener('click', () => {
    const key = input.value.trim();
    if (!key) return setMessage('Enter admin key first.', 'error');
    localStorage.setItem(GALLERY_ADMIN_KEY_STORAGE, key);
    setMessage('Admin key saved.', 'ok');
  });

  document.getElementById('clearKeyBtn').addEventListener('click', () => {
    localStorage.removeItem(GALLERY_ADMIN_KEY_STORAGE);
    input.value = '';
    setMessage('Admin key removed.', 'ok');
  });
}

document.getElementById('photoForm').addEventListener('submit', addPhoto);
wireKeyButtons();
loadPhotos().catch((error) => setMessage(error.message, 'error'));
