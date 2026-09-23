const mongoose = require('mongoose');

const annadhanamSponsorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sponsoringItem: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnnadhanamSponsor', annadhanamSponsorSchema);
