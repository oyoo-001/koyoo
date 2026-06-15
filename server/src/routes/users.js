import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';
import { sendEmail } from '../utils/email.js';

const router = Router();

router.post('/invite', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const tempPassword = generateId().substring(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const id = generateId();

    await pool.query(
      'INSERT INTO users (id, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, TRUE)',
      [id, email, passwordHash, role || 'rider']
    );

    await sendEmail({
      to: email,
      subject: 'You\'ve been invited to Koyoo Taxi',
      body: `You've been invited to join Koyoo Taxi as a ${role || 'rider'}.\n\nYour temporary password is: ${tempPassword}\n\nPlease log in and change your password.\n\n${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
    });

    res.status(201).json({ message: 'User invited successfully', user_id: id });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ message: 'Failed to invite user' });
  }
});

// ── Admin: Get full user details ──
router.get('/:id/details', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, full_name, phone, role, is_restricted, restriction_reason, restricted_at, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = users[0];
    const [rides] = await pool.query(
      "SELECT COUNT(*) AS total_rides, COALESCE(SUM(final_fare), 0) AS total_spent FROM rides WHERE rider_id = ? AND status = 'completed'",
      [req.params.id]
    );
    const [cancellations] = await pool.query(
      "SELECT COUNT(*) AS recent_cancellations FROM rides WHERE rider_id = ? AND status = 'cancelled' AND created_at > NOW() - INTERVAL 1 HOUR",
      [req.params.id]
    );
    const [profile] = await pool.query(
      'SELECT id, phone, total_rides, total_spent, discount_percent, discount_eligible_rides, rides_since_discount FROM rider_profiles WHERE user_id = ?',
      [req.params.id]
    );

    res.json({
      user,
      rideStats: {
        total_rides: Number(rides[0].total_rides),
        total_spent: Number(rides[0].total_spent),
        recent_cancellations: Number(cancellations[0].recent_cancellations),
      },
      profile: profile[0] || null,
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Failed to get user details' });
  }
});

// ── Admin: Restrict user ──
router.patch('/:id/restrict', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query(
      'UPDATE users SET is_restricted = TRUE, restriction_reason = ?, restricted_at = NOW() WHERE id = ?',
      [reason || 'Violation of terms of service', req.params.id]
    );
    res.json({ message: 'User restricted' });
  } catch (error) {
    console.error('Restrict user error:', error);
    res.status(500).json({ message: 'Failed to restrict user' });
  }
});

// ── Admin: Unrestrict user ──
router.patch('/:id/unrestrict', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_restricted = FALSE, restriction_reason = NULL, restricted_at = NULL WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'User unrestricted' });
  } catch (error) {
    console.error('Unrestrict user error:', error);
    res.status(500).json({ message: 'Failed to unrestrict user' });
  }
});

// ── Admin: Set rider discount ──
router.patch('/:id/discount', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { discount_percent, discount_eligible_rides } = req.body;
    if (discount_percent === undefined && discount_eligible_rides === undefined) {
      return res.status(400).json({ message: 'Provide discount_percent or discount_eligible_rides' });
    }
    const updates = [];
    const values = [];
    if (discount_percent !== undefined) {
      updates.push('discount_percent = ?');
      values.push(parseFloat(discount_percent));
    }
    if (discount_eligible_rides !== undefined) {
      updates.push('discount_eligible_rides = ?');
      values.push(parseInt(discount_eligible_rides));
    }
    values.push(req.params.id);
    await pool.query(
      `UPDATE rider_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );
    res.json({ message: 'Discount updated' });
  } catch (error) {
    console.error('Set discount error:', error);
    res.status(500).json({ message: 'Failed to set discount' });
  }
});

// ── Auto-restriction bot: check and auto-restrict abusive riders ──
// Called internally when a ride is cancelled or payment fails
export async function autoRestrictUser(userId) {
  try {
    const [cancellations] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM rides WHERE rider_id = ? AND status = 'cancelled' AND created_at > NOW() - INTERVAL 1 HOUR",
      [userId]
    );
    const cancelCount = Number(cancellations[0].cnt);

    const [paymentFails] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM rides WHERE rider_id = ? AND payment_status = 'failed' AND created_at > NOW() - INTERVAL 24 HOUR",
      [userId]
    );
    const failCount = Number(paymentFails[0].cnt);

    const reasons = [];
    if (cancelCount >= 5) reasons.push('Excessive ride cancellations (5+ in 1 hour)');
    if (failCount >= 2) reasons.push('Repeated payment failures');

    if (reasons.length > 0) {
      await pool.query(
        'UPDATE users SET is_restricted = TRUE, restriction_reason = ?, restricted_at = NOW() WHERE id = ? AND is_restricted = FALSE',
        [reasons.join('; '), userId]
      );
      console.log(`Auto-restricted user ${userId}: ${reasons.join('; ')}`);
    }
  } catch (error) {
    console.error('Auto-restrict check error:', error);
  }
}

export default router;
