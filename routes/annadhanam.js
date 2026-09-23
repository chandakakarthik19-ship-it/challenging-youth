const express = require('express');
const mongoose = require('mongoose');
const AnnadhanamSponsor = require('../models/AnnadhanamSponsor');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

function normalizeSponsorNames(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

router.get('/', async (req, res) => {
  try {
    const sponsors = await AnnadhanamSponsor.find().sort({ createdAt: -1 });
    res.json(sponsors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, sponsoringItem } = req.body;

    const combinedName = normalizeSponsorNames(name);
    const normalizedItem = String(sponsoringItem || '').trim();

    if (!combinedName) {
      return res.status(400).json({ message: 'Sponsor name is required.' });
    }

    if (!normalizedItem) {
      return res.status(400).json({ message: 'Sponsoring item is required.' });
    }

    const sponsor = await AnnadhanamSponsor.create({
      name: combinedName,
      sponsoringItem: normalizedItem,
    });

    res.status(201).json(sponsor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sponsoringItem } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid sponsor id.' });
    }

    const update = {};

    if (name !== undefined) {
      const combinedName = normalizeSponsorNames(name);
      if (!combinedName) {
        return res.status(400).json({ message: 'Sponsor name cannot be empty.' });
      }
      update.name = combinedName;
    }

    if (sponsoringItem !== undefined) {
      const normalizedItem = String(sponsoringItem || '').trim();
      if (!normalizedItem) {
        return res.status(400).json({ message: 'Sponsoring item cannot be empty.' });
      }
      update.sponsoringItem = normalizedItem;
    }

    const sponsor = await AnnadhanamSponsor.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found.' });
    }

    res.json(sponsor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid sponsor id.' });
    }

    const deleted = await AnnadhanamSponsor.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Sponsor not found.' });
    }

    res.json({ message: 'Sponsor deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
