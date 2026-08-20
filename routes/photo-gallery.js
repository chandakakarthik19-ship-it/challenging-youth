const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const PhotoGallery = require('../models/PhotoGallery');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'public', 'uploads');
const allowedMediaTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['video/ogg', '.ogv'],
]);
const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, allowedMediaTypes.has(file.mimetype));
  },
});

router.get('/', async (req, res) => {
  try {
    const photos = await PhotoGallery.find().sort({ createdAt: -1 }).lean();
    res.json({ items: photos });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', requireAdmin, (req, res) => {
  fs.mkdirSync(uploadDirectory, { recursive: true });

  upload.single('image')(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: 'Choose a JPG, PNG, GIF, WEBP, MP4, WEBM, or OGG file under 50 MB.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Choose an image to upload.' });
    }

    try {
      const extension = allowedMediaTypes.get(req.file.mimetype);
      const filename = `${crypto.randomUUID()}${extension}`;
      const target = path.join(uploadDirectory, filename);
      const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
      const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

      if (caption.length > 160) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Caption must be 160 characters or fewer.' });
      }

      fs.renameSync(req.file.path, target);
      const photo = await PhotoGallery.create({ imageUrl: `/uploads/${filename}`, caption, mediaType });
      res.status(201).json(photo);
    } catch (saveError) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: saveError.message });
    }
  });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const photo = await PhotoGallery.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found.' });

    const filename = path.basename(photo.imageUrl);
    const filePath = path.join(uploadDirectory, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'Photo deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
