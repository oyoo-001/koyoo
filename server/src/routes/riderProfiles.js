import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { phone, default_payment_method } = req.body;
    const id = generateId();

    await pool.query(
      'INSERT INTO rider_profiles (id, user_id, phone, default_payment_method) VALUES (?, ?, ?, ?)',
      [id, req.user.id, phone, default_payment_method || 'cash']
    );

    const [profile] = await pool.query('SELECT * FROM rider_profiles WHERE id = ?', [id]);
    res.status(201).json(profile[0]);
  } catch (error) {
    console.error('Create rider profile error:', error);
    res.status(500).json({ message: 'Failed to create profile' });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { phone, default_payment_method } = req.body;
    const updates = [];
    const values = [];

    if (phone) { updates.push('phone = ?'); values.push(phone); }
    if (default_payment_method) { updates.push('default_payment_method = ?'); values.push(default_payment_method); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.params.id);
    await pool.query(`UPDATE rider_profiles SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, [...values, req.user.id]);

    const [profile] = await pool.query('SELECT * FROM rider_profiles WHERE id = ?', [req.params.id]);
    res.json(profile[0]);
  } catch (error) {
    console.error('Update rider profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = `SELECT rp.*, u.full_name, u.email, u.avatar_url, u.phone AS user_phone,
      COALESCE((SELECT COUNT(*) FROM rides WHERE rider_id = rp.user_id AND status = 'completed'), 0) AS total_rides,
      COALESCE((SELECT SUM(COALESCE(final_fare, 0)) FROM rides WHERE rider_id = rp.user_id AND status = 'completed'), 0) AS total_spent
      FROM rider_profiles rp LEFT JOIN users u ON rp.user_id = u.id WHERE 1=1`;
    const values = [];

    if (req.query.user_id) { query += ' AND rp.user_id = ?'; values.push(req.query.user_id); }

    const sort = req.query.sort || '-created_at';
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = sort.replace(/^-/, '');
    query += ` ORDER BY ${sortField} ${sortDir}`;

    if (req.query.limit) { query += ' LIMIT ?'; values.push(parseInt(req.query.limit)); }

    const [profiles] = await pool.query(query, values);
    res.json(profiles);
  } catch (error) {
    console.error('List rider profiles error:', error);
    res.status(500).json({ message: 'Failed to fetch profiles' });
  }
});

export default router;
