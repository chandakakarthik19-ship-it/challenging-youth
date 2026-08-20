function requireAdmin(req, res, next) {
  const adminKey = req.header('x-admin-key');

  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ message: 'ADMIN_KEY is not configured on the server.' });
  }

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized: Invalid admin key.' });
  }

  next();
}

module.exports = { requireAdmin };
