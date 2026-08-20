const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};

    if (type === 'donation' || type === 'expenditure') {
      filter.type = type;
    }

    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const result = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const summary = {
      totalDonations: 0,
      totalExpenditures: 0,
      balance: 0,
    };

    for (const row of result) {
      if (row._id === 'donation') summary.totalDonations = row.total;
      if (row._id === 'expenditure') summary.totalExpenditures = row.total;
    }

    summary.balance = summary.totalDonations - summary.totalExpenditures;

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { type, name, description, amount, date } = req.body;

    if (!['donation', 'expenditure'].includes(type)) {
      return res.status(400).json({ message: 'Type must be donation or expenditure.' });
    }

    const normalizedName = (typeof name === 'string' ? name : description || '').trim();

    if (!normalizedName) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    const transaction = await Transaction.create({
      type,
      name: normalizedName,
      description: normalizedName,
      amount,
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, description, amount, date } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction id.' });
    }

    const update = {};

    if (type !== undefined) {
      if (!['donation', 'expenditure'].includes(type)) {
        return res.status(400).json({ message: 'Type must be donation or expenditure.' });
      }
      update.type = type;
    }

    if (name !== undefined || description !== undefined) {
      const rawName = name !== undefined ? name : description;

      if (typeof rawName !== 'string' || !rawName.trim()) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
      }

      update.name = rawName.trim();
      update.description = rawName.trim();
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ message: 'Amount must be a positive number.' });
      }
      update.amount = amount;
    }

    if (date !== undefined) {
      update.date = new Date(date);
    }

    const transaction = await Transaction.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction id.' });
    }

    const deleted = await Transaction.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
