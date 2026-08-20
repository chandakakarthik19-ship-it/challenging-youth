const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const Gallery = require('../models/Gallery');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'public', 'uploads');
const allowedImageTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
]);
const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, allowedImageTypes.has(file.mimetype));
  },
});
const defaultItems = [
  { imageUrl: '/logo.png', caption: 'Challenging Youth logo' },
  {
    imageUrl: '/WhatsApp%20Image%202026-08-20%20at%2011.33.54%20AM.png',
    caption: 'Challenging Youth event image',
  },
];

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 12) {
    return null;
  }

  const normalized = items.map((item) => ({
    imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '',
    caption: typeof item.caption === 'string' ? item.caption.trim() : '',
  }));

  if (
    normalized.some(
      (item) =>
        !item.imageUrl ||
        !(item.imageUrl.startsWith('/') || /^https?:\/\//i.test(item.imageUrl))
    )
  ) {
    return null;
  }

  return normalized;
}

router.get('/', async (req, res) => {
  try {
    const gallery = await Gallery.findOne({ key: 'main-gallery' }).lean();
    res.json({ items: gallery?.items?.length ? gallery.items : defaultItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/upload', requireAdmin, (req, res) => {
  fs.mkdirSync(uploadDirectory, { recursive: true });

  upload.single('image')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: 'Choose a JPG, PNG, GIF, or WEBP image under 5 MB.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Choose an image to upload.' });
    }

    const extension = allowedImageTypes.get(req.file.mimetype);
    const filename = `${crypto.randomUUID()}${extension}`;
    const target = path.join(uploadDirectory, filename);

    fs.renameSync(req.file.path, target);
    res.status(201).json({ imageUrl: `/uploads/${filename}` });
  });
});

router.put('/', requireAdmin, async (req, res) => {
  try {
    const items = normalizeItems(req.body.items);

    if (!items) {
      return res.status(400).json({ message: 'Add between 1 and 12 images with valid image URLs.' });
    }

    const gallery = await Gallery.findOneAndUpdate(
      { key: 'main-gallery' },
      { key: 'main-gallery', items },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(gallery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
