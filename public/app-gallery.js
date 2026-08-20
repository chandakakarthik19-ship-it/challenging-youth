function setMessage(text, kind = '') {
  const message = document.getElementById('photoGalleryMessage');
  message.className = `message ${kind}`;
  message.textContent = text;
}

function renderPhotos(items) {
  const grid = document.getElementById('photoGalleryGrid');
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

      const download = document.createElement('a');
      download.className = 'download-button';
      download.href = item.imageUrl;
      download.download = '';
      download.textContent = 'Download';

      card.append(media, caption, download);
      return card;
    })
  );
}

async function loadPhotos() {
  try {
    const res = await fetch('/api/photo-gallery');
    if (!res.ok) throw new Error('Unable to load photos.');

    const data = await res.json();
    renderPhotos(data.items);
    if (data.items.length === 0) setMessage('No photos added yet.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

loadPhotos();
