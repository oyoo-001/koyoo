import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, authenticateSSE } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { ride_id, sender_name, sender_role, content, type } = req.body;
    if (!ride_id || !content) {
      return res.status(400).json({ message: 'Ride ID and content are required' });
    }

    const id = generateId();

    await pool.query(
      'INSERT INTO messages (id, ride_id, sender_id, sender_name, sender_role, content, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, ride_id, req.user.id, sender_name || req.user.full_name, sender_role || 'rider', content, type || 'text']
    );

    const [msg] = await pool.query('SELECT * FROM messages WHERE id = ?', [id]);

    // Notify SSE
    req.app.get('messageEmitter')?.emit('messageUpdate', { type: 'create', data: msg[0] });

    res.status(201).json(msg[0]);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM messages WHERE 1=1';
    const values = [];

    if (req.query.ride_id) { query += ' AND ride_id = ?'; values.push(req.query.ride_id); }
    if (req.query.sender_id) { query += ' AND sender_id = ?'; values.push(req.query.sender_id); }

    const sort = req.query.sort || '-created_at';
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = sort.replace(/^-/, '');
    query += ` ORDER BY ${sortField} ${sortDir}`;

    if (req.query.limit) { query += ' LIMIT ?'; values.push(parseInt(req.query.limit)); }

    const [messages] = await pool.query(query, values);
    res.json(messages);
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

router.get('/stream', authenticateSSE, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const onMessageUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  req.app.get('messageEmitter')?.on('messageUpdate', onMessageUpdate);

  req.on('close', () => {
    req.app.get('messageEmitter')?.off('messageUpdate', onMessageUpdate);
  });
});

export default router;
