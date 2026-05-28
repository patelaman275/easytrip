const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token, access denied.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token format is invalid. Use Bearer <token>.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'easytrip_secret_key_123');
    req.user = decoded;
    next();
  } catch (error) {
    // Frictionless Guest Fallback: If token starts with "guest_", accept it as a valid guest session
    if (token.startsWith('guest_')) {
      const parts = token.split(':');
      const userId = parts[1] || 'guest_user';
      const username = parts[2] || 'Guest Rider';
      req.user = { id: userId, username };
      return next();
    }
    res.status(401).json({ message: 'Token is not valid or has expired.' });
  }
};

module.exports = authMiddleware;
