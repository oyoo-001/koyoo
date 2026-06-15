import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const extractAndVerifyToken = async (req) => {
  let token = null;

  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fallback to ?token= query param (for SSE/EventSource which can't set headers)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.query('SELECT id, email, full_name, role FROM users WHERE id = ?', [decoded.userId]);
    return users.length > 0 ? users[0] : null;
  } catch {
    return null;
  }
};

export const authenticate = async (req, res, next) => {
  try {
    const user = await extractAndVerifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authenticateSSE = async (req, res, next) => {
  const user = await extractAndVerifyToken(req);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Authentication required' }));
    return;
  }
  req.user = user;
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    req.user = await extractAndVerifyToken(req);
    next();
  } catch {
    req.user = null;
    next();
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};
