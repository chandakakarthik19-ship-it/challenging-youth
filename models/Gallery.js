const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const gallerySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: 'main-gallery',
    },
    items: {
      type: [galleryItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gallery', gallerySchema);
