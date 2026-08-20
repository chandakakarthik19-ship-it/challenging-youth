const express = require('express');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
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
const imageMimeTypes = {
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
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

function getMediaBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'galleryMedia' });
}

function uploadToAtlas(file) {
  return new Promise((resolve, reject) => {
    const bucket = getMediaBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { gallery: 'scrolling', contentType: file.mimetype },
    });

    uploadStream.once('error', reject);
    uploadStream.once('finish', () => resolve(uploadStream.id.toString()));
    fs.createReadStream(file.path).once('error', reject).pipe(uploadStream);
  });
}

async function migrateLocalItems(gallery) {
  let changed = false;
  const items = [];

  for (const item of gallery.items) {
    if (!item.imageUrl.startsWith('/uploads/')) {
      items.push(item);
      continue;
    }

    const localPath = path.join(uploadDirectory, path.basename(item.imageUrl));
    if (!fs.existsSync(localPath)) {
      items.push(item);
      continue;
    }

    const extension = path.extname(localPath).toLowerCase();
    const mediaId = await uploadToAtlas({
      path: localPath,
      originalname: path.basename(localPath),
      mimetype: imageMimeTypes[extension] || 'application/octet-stream',
    });
    items.push({ ...item.toObject(), imageUrl: `/api/gallery/media/${mediaId}` });
    fs.unlinkSync(localPath);
    changed = true;
  }

  if (!changed) return gallery;

  return Gallery.findOneAndUpdate(
    { key: 'main-gallery' },
    { items },
    { new: true, runValidators: true }
  );
}

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
    const gallery = await Gallery.findOne({ key: 'main-gallery' });
    const migratedGallery = gallery ? await migrateLocalItems(gallery) : null;
    res.json({ items: migratedGallery?.items?.length ? migratedGallery.items : defaultItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/media/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid gallery media id.' });
    }

    const bucket = getMediaBucket();
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(req.params.id) }).toArray();
    if (!files.length) return res.status(404).json({ message: 'Gallery media not found.' });

    const extension = path.extname(files[0].filename || '').toLowerCase();
    const contentType =
      files[0].contentType || files[0].metadata?.contentType || imageMimeTypes[extension] || 'application/octet-stream';
    res.type(contentType);
    bucket.openDownloadStream(files[0]._id).on('error', () => {
      if (!res.headersSent) res.status(404).end();
    }).pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/upload', requireAdmin, (req, res) => {
  fs.mkdirSync(uploadDirectory, { recursive: true });

  upload.single('image')(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: 'Choose a JPG, PNG, GIF, or WEBP image under 5 MB.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Choose an image to upload.' });
    }

    try {
      const mediaId = await uploadToAtlas(req.file);
      fs.unlinkSync(req.file.path);
      res.status(201).json({ imageUrl: `/api/gallery/media/${mediaId}` });
    } catch (uploadError) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: uploadError.message });
    }
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
