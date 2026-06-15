import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { phone, vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate } = req.body;
    const id = generateId();

    await pool.query(
      `INSERT INTO driver_profiles (id, user_id, email, phone, vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, req.user.email, phone, vehicle_type || 'standard', vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate]
    );

    const [profile] = await pool.query('SELECT * FROM driver_profiles WHERE id = ?', [id]);
    res.status(201).json(profile[0]);
  } catch (error) {
    console.error('Create driver profile error:', error);
    res.status(500).json({ message: 'Failed to create profile' });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const allowedFields = [
      'phone', 'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year',
      'vehicle_color', 'license_plate', 'is_online', 'is_available', 'current_lat', 'current_lng',
      'documents_verified', 'license_url', 'insurance_url'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.params.id);

    // Only admin can update documents_verified
    const docUpdate = updates.includes('documents_verified');
    if (docUpdate && req.user.role !== 'admin') {
      const docIndex = updates.findIndex(u => u.startsWith('documents_verified'));
      updates.splice(docIndex, 1);
      values.splice(docIndex, 1);
      values.pop(); // remove the id param that was pushed
      values.push(req.params.id);
    }

    const userCheck = docUpdate && req.user.role === 'admin' ? '' : ' AND user_id = ?';
    if (!userCheck) {
      await pool.query(`UPDATE driver_profiles SET ${updates.join(', ')} WHERE id = ?`, values);
    } else {
      values.push(req.user.id);
      await pool.query(`UPDATE driver_profiles SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }

    const [profile] = await pool.query('SELECT * FROM driver_profiles WHERE id = ?', [req.params.id]);
    res.json(profile[0]);
  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM driver_profiles WHERE 1=1';
    const values = [];

    if (req.query.user_id) { query += ' AND user_id = ?'; values.push(req.query.user_id); }
    if (req.query.is_online) { query += ' AND is_online = ?'; values.push(req.query.is_online === 'true' ? 1 : 0); }
    if (req.query.documents_verified) { query += ' AND documents_verified = ?'; values.push(req.query.documents_verified === 'true' ? 1 : 0); }
    if (req.query.email) { query += ' AND email = ?'; values.push(req.query.email); }
    if (req.query.vehicle_type) { query += ' AND vehicle_type = ?'; values.push(req.query.vehicle_type); }

    const sort = req.query.sort || '-created_at';
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = sort.replace(/^-/, '');
    query += ` ORDER BY ${sortField} ${sortDir}`;

    if (req.query.limit) { query += ' LIMIT ?'; values.push(parseInt(req.query.limit)); }

    const [profiles] = await pool.query(query, values);
    res.json(profiles);
  } catch (error) {
    console.error('List driver profiles error:', error);
    res.status(500).json({ message: 'Failed to fetch profiles' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM driver_profiles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Profile deleted' });
  } catch (error) {
    console.error('Delete driver profile error:', error);
    res.status(500).json({ message: 'Failed to delete profile' });
  }
});

export default router;
