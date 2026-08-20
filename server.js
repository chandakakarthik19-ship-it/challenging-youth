const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const dns = require('dns');

dotenv.config();

const transactionsRouter = require('./routes/transactions');
const galleryRouter = require('./routes/gallery');
const photoGalleryRouter = require('./routes/photo-gallery');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/user.html');
});

app.use('/api/transactions', transactionsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/photo-gallery', photoGalleryRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

function isSrvDnsError(error) {
  return (
    error &&
    error.code === 'ECONNREFUSED' &&
    typeof error.message === 'string' &&
    error.message.includes('querySrv')
  );
}

function parseDnsServers() {
  const raw = process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function connectMongoWithDnsRetry(uri) {
  try {
    await mongoose.connect(uri);
  } catch (error) {
    if (!uri.startsWith('mongodb+srv://') || !isSrvDnsError(error)) {
      throw error;
    }

    const dnsServers = parseDnsServers();
    if (dnsServers.length === 0) {
      throw error;
    }

    console.warn('MongoDB SRV lookup failed. Retrying with custom DNS servers:', dnsServers.join(', '));
    dns.setServers(dnsServers);
    await mongoose.connect(uri);
  }
}

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing in environment variables.');
    }

    await connectMongoWithDnsRetry(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Other devices: use this computer's LAN IP on port ${PORT}.`);
    });
  } catch (error) {
    console.error('Startup error:', error.message);
    process.exit(1);
  }
}

startServer();
