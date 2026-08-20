const mongoose = require('mongoose');

const photoGallerySchema = new mongoose.Schema(
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
      maxlength: 160,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PhotoGallery', photoGallerySchema);
