import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateId, generateOtp, sanitizeUser } from '../utils/helpers.js';
import { sendEmail } from '../utils/email.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpId = generateId();

    await pool.query(
      'INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?)',
      [id, email, passwordHash, full_name || null, phone || null]
    );

    await pool.query(
      'INSERT INTO otp_codes (id, email, code, type, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [otpId, email, otp, 'verification']
    );

    await sendEmail({
      to: email,
      subject: 'Your Koyoo verification code',
      body: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    });

    res.status(201).json({ message: 'Registration successful. Please verify your email.', user_id: id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp_code } = req.body;
    if (!email || !otp_code) {
      return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    const [otps] = await pool.query(
      'SELECT * FROM otp_codes WHERE email = ? AND code = ? AND type = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp_code, 'verification']
    );

    if (otps.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = ?', [otps[0].id]);
    await pool.query('UPDATE users SET email_verified = TRUE WHERE email = ?', [email]);

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const token = jwt.sign({ userId: users[0].id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ message: 'Email verified', access_token: token, user: sanitizeUser(users[0]) });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const otp = generateOtp();
    const otpId = generateId();

    await pool.query(
      'INSERT INTO otp_codes (id, email, code, type, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [otpId, email, otp, 'verification']
    );

    await sendEmail({
      to: email,
      subject: 'Your new Koyoo verification code',
      body: `Your new verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    });

    res.json({ message: 'OTP resent' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, users[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: users[0].id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ access_token: token, user: sanitizeUser(users[0]) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(sanitizeUser(users[0]));
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = generateId() + '-' + generateId();
    await pool.query(
      'INSERT INTO password_reset_tokens (id, email, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
      [generateId(), email, token]
    );

    await sendEmail({
      to: email,
      subject: 'Reset your Koyoo password',
      body: `Reset your password using this link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Reset password request error:', error);
    res.status(500).json({ message: 'Failed to send reset email' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;
    if (!reset_token || !new_password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const [tokens] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [reset_token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, tokens[0].email]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [tokens[0].id]);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// GET /auth/google - redirect to Google OAuth
router.get('/google', (req, res, next) => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  if (!clientID || clientID.startsWith('your-')) {
    return res.status(501).json({ message: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env' });
  }
  const redirect = req.query.redirect || '/role-select';
  const isCapacitor = req.query.capacitor === 'true';
  // Capture the origin (e.g., ngrok URL) from referer or origin header
  const origin = req.headers.origin || req.headers.referer || process.env.FRONTEND_URL || 'http://localhost:5173';
  const originUrl = new URL(origin).origin;
  // Encode origin + redirect path + capacitor flag in state
  const state = JSON.stringify({ origin: originUrl, redirect, capacitor: isCapacitor });
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

// GET /auth/google/callback - handle Google OAuth callback
router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', {
      session: false,
      failWithError: true,
    }, (err, profile) => {
      if (err || !profile) {
        // Parse state for dynamic origin on failure too
        let fallbackUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const stateParam = req.query?.state;
        if (stateParam) {
          try {
            const parsed = JSON.parse(stateParam);
            if (parsed.origin) fallbackUrl = parsed.origin;
          } catch {}
        }
        return res.redirect(`${fallbackUrl}/login?error=google_auth_failed`);
      }
      const { user, token, redirectUrl } = profile;
      // Frontend will catch the access_token from URL params
      res.redirect(redirectUrl);
    })(req, res, next);
  }
);

export default router;
