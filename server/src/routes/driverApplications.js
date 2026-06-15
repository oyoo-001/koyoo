import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';
import {
  sendEmail,
  buildDriverApplicationEmail,
  buildDriverApprovedNewAccountEmail,
  buildDriverApprovedExistingEmail,
  buildDriverRejectedEmail,
} from '../utils/email.js';

const router = Router();

// Submit driver application (public — no auth required)
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if already applied
    const [existing] = await pool.query(
      'SELECT id, status FROM driver_applications WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (existing.length > 0) {
      if (existing[0].status === 'pending') {
        return res.status(409).json({ message: 'Application already pending for this email' });
      }
      if (existing[0].status === 'approved') {
        return res.status(409).json({ message: 'Application already approved for this email' });
      }
      if (existing[0].status === 'rejected') {
        return res.status(409).json({ message: 'Application was previously rejected for this email' });
      }
    }

    const id = generateId();
    const formToken = generateId() + '-' + generateId();

    await pool.query(
      'INSERT INTO driver_applications (id, email, form_token) VALUES (?, ?, ?)',
      [id, email, formToken]
    );

    const formUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/driver-apply?token=${formToken}&id=${id}`;

    const appEmail = buildDriverApplicationEmail({ formUrl });
    await sendEmail({ to: email, subject: appEmail.subject, html: appEmail.html });

    res.status(201).json({ message: 'Application submitted. Check your email for the form link.' });
  } catch (error) {
    console.error('Driver application error:', error);
    res.status(500).json({ message: 'Failed to submit application' });
  }
});

// Get application by form token (for the form page)
router.get('/form/:token', async (req, res) => {
  try {
    const [apps] = await pool.query(
      'SELECT id, email, status, full_name, phone, vehicle_type, vehicle_make, vehicle_model, vehicle_year, license_plate FROM driver_applications WHERE form_token = ?',
      [req.params.token]
    );
    if (apps.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(apps[0]);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Failed to get application' });
  }
});

// Update application with driver details (from the form page)
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['full_name', 'phone', 'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year', 'license_plate'];
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
    await pool.query(`UPDATE driver_applications SET ${updates.join(', ')} WHERE id = ?`, values);

    const [app] = await pool.query('SELECT * FROM driver_applications WHERE id = ?', [req.params.id]);
    res.json(app[0]);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ message: 'Failed to update application' });
  }
});

// Admin: list all applications
router.get('/', authenticate, async (req, res) => {
  try {
    const status = req.query.status || '';
    let query = 'SELECT * FROM driver_applications';
    const values = [];
    if (status) {
      query += ' WHERE status = ?';
      values.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [apps] = await pool.query(query, values);
    res.json(apps);
  } catch (error) {
    console.error('List applications error:', error);
    res.status(500).json({ message: 'Failed to list applications' });
  }
});

// Admin: approve application → create user account → send credentials
router.patch('/:id/approve', authenticate, async (req, res) => {
  try {
    const [apps] = await pool.query('SELECT * FROM driver_applications WHERE id = ?', [req.params.id]);
    if (apps.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const app = apps[0];
    if (app.status !== 'pending') {
      return res.status(400).json({ message: `Application already ${app.status}` });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id, password_hash FROM users WHERE email = ?', [app.email]);
    let userId;
    let tempPassword = null;

    if (existing.length > 0) {
      // Link to existing user
      userId = existing[0].id;
    } else {
      // Create new user account
      userId = generateId();
      tempPassword = generateId().slice(0, 12) + 'K1!';
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await pool.query(
        'INSERT INTO users (id, email, password_hash, full_name, email_verified, role) VALUES (?, ?, ?, ?, TRUE, ?)',
        [userId, app.email, passwordHash, app.full_name || 'Driver', 'driver']
      );
    }

    // Check if driver profile already exists
    const [existingProfile] = await pool.query('SELECT id FROM driver_profiles WHERE user_id = ?', [userId]);
    if (existingProfile.length === 0) {
      const profileId = generateId();
      await pool.query(
        `INSERT INTO driver_profiles (id, user_id, email, phone, vehicle_type, vehicle_make, vehicle_model, vehicle_year, license_plate, is_online, is_available, documents_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, TRUE)`,
        [profileId, userId, app.email, app.phone, app.vehicle_type || 'standard',
         app.vehicle_make, app.vehicle_model, app.vehicle_year, app.license_plate]
      );
    }

    // Mark application as approved
    await pool.query('UPDATE driver_applications SET status = ? WHERE id = ?', ['approved', req.params.id]);

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    if (tempPassword) {
      const approvedEmail = buildDriverApprovedNewAccountEmail({
        email: app.email,
        password: tempPassword,
        loginUrl,
      });
      await sendEmail({ to: app.email, subject: approvedEmail.subject, html: approvedEmail.html });
    } else {
      const approvedEmail = buildDriverApprovedExistingEmail({ loginUrl });
      await sendEmail({ to: app.email, subject: approvedEmail.subject, html: approvedEmail.html });
    }

    res.json({ message: 'Application approved. Credentials sent via email.' });
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ message: 'Failed to approve application' });
  }
});

// Admin: reject application
router.patch('/:id/reject', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE driver_applications SET status = ? WHERE id = ?', ['rejected', req.params.id]);

    const [apps] = await pool.query('SELECT email FROM driver_applications WHERE id = ?', [req.params.id]);
    if (apps.length > 0) {
      const rejectedEmail = buildDriverRejectedEmail();
      await sendEmail({ to: apps[0].email, subject: rejectedEmail.subject, html: rejectedEmail.html });
    }

    res.json({ message: 'Application rejected' });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ message: 'Failed to reject application' });
  }
});

export default router;
