import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

const router = Router();

// Public: get active ads (visible to anyone)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const [ads] = await pool.query(
      `SELECT * FROM ads
       WHERE is_active = TRUE
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (ends_at IS NULL OR ends_at >= ?)
       ORDER BY priority DESC, created_at DESC`,
      [now, now]
    );
    res.json(ads);
  } catch (error) {
    console.error('Get active ads error:', error);
    res.status(500).json({ message: 'Failed to fetch ads' });
  }
});

// Admin: list all ads
router.get('/', authenticate, async (req, res) => {
  try {
    const [ads] = await pool.query('SELECT * FROM ads ORDER BY priority DESC, created_at DESC');
    res.json(ads);
  } catch (error) {
    console.error('List ads error:', error);
    res.status(500).json({ message: 'Failed to list ads' });
  }
});

// Admin: create ad
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, image_url, link_url, is_active, position, priority, starts_at, ends_at } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const id = generateId();
    await pool.query(
      `INSERT INTO ads (id, title, description, image_url, link_url, is_active, position, priority, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, image_url || null, link_url || null, is_active !== false, position || 'banner', priority || 0, starts_at || null, ends_at || null]
    );
    const [ad] = await pool.query('SELECT * FROM ads WHERE id = ?', [id]);
    res.status(201).json(ad[0]);
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({ message: 'Failed to create ad' });
  }
});

// Admin: update ad
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const allowed = ['title', 'description', 'image_url', 'link_url', 'is_active', 'position', 'priority', 'starts_at', 'ends_at'];
    const updates = [];
    const values = [];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    values.push(req.params.id);
    await pool.query(`UPDATE ads SET ${updates.join(', ')} WHERE id = ?`, values);
    const [ad] = await pool.query('SELECT * FROM ads WHERE id = ?', [req.params.id]);
    if (ad.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    res.json(ad[0]);
  } catch (error) {
    console.error('Update ad error:', error);
    res.status(500).json({ message: 'Failed to update ad' });
  }
});

// Admin: delete ad
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM ads WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    res.json({ message: 'Ad deleted' });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({ message: 'Failed to delete ad' });
  }
});

export default router;
