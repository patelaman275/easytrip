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
    res.status(401).json({ message: 'Token is not valid or has expired.' });
  }
};

module.exports = authMiddleware;
