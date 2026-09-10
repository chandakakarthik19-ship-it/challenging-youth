const express = require('express');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
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

function getMediaBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'photoGalleryMedia' });
}

function uploadToAtlas(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = getMediaBucket().openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { gallery: 'photo-gallery', contentType: file.mimetype },
    });

    uploadStream.once('error', reject);
    uploadStream.once('finish', () => resolve(uploadStream.id.toString()));
    fs.createReadStream(file.path).once('error', reject).pipe(uploadStream);
  });
}

function getMediaId(imageUrl) {
  const match = imageUrl.match(/^\/api\/photo-gallery\/media\/([a-f\d]{24})$/i);
  return match ? match[1] : null;
}

router.get('/', async (req, res) => {
  try {
    const photos = await PhotoGallery.find().sort({ createdAt: -1 }).lean();
    res.json({ items: photos });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/media/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid gallery media id.' });
    }

    const files = await getMediaBucket()
      .find({ _id: new mongoose.Types.ObjectId(req.params.id) })
      .toArray();
    if (!files.length) return res.status(404).json({ message: 'Gallery media not found.' });

    const contentType = files[0].contentType || files[0].metadata?.contentType || 'application/octet-stream';
    res.type(contentType);
    getMediaBucket().openDownloadStream(files[0]._id)
      .on('error', () => {
        if (!res.headersSent) res.status(404).end();
      })
      .pipe(res);
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

    let mediaId;
    try {
      const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
      const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

      if (caption.length > 160) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Caption must be 160 characters or fewer.' });
      }

      mediaId = await uploadToAtlas(req.file);
      fs.unlinkSync(req.file.path);
      const photo = await PhotoGallery.create({
        imageUrl: `/api/photo-gallery/media/${mediaId}`,
        caption,
        mediaType,
      });
      res.status(201).json(photo);
    } catch (saveError) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (mediaId) {
        await getMediaBucket().delete(new mongoose.Types.ObjectId(mediaId)).catch(() => {});
      }
      res.status(500).json({ message: saveError.message });
    }
  });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const photo = await PhotoGallery.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found.' });

    const mediaId = getMediaId(photo.imageUrl);
    if (mediaId) {
      await getMediaBucket().delete(new mongoose.Types.ObjectId(mediaId));
    } else {
      const filename = path.basename(photo.imageUrl);
      const filePath = path.join(uploadDirectory, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ message: 'Photo deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
