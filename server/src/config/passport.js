import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { generateId } from '../utils/helpers.js';

export function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (clientID && clientSecret && !clientID.startsWith('your-')) {
    passport.use(new GoogleStrategy({
      clientID,
      clientSecret,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
      passReqToCallback: true,
    }, async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email from Google'), null);
        }

        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        let user;
        if (existing.length > 0) {
          user = existing[0];
        } else {
          const id = generateId();
          const tempPassword = await bcrypt.hash(generateId() + generateId(), 10);
          const fullName = profile.displayName || profile.name?.givenName || 'Google User';
          const avatarUrl = profile.photos?.[0]?.value;

          await pool.query(
            'INSERT INTO users (id, email, password_hash, full_name, avatar_url, email_verified) VALUES (?, ?, ?, ?, ?, TRUE)',
            [id, email, tempPassword, fullName, avatarUrl]
          );

          user = { id, email, full_name: fullName, avatar_url: avatarUrl, role: 'rider', email_verified: 1 };
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        // Parse state to get dynamic origin (supports ngrok)
        let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        let redirectPath = '/role-select';
        let isCapacitor = false;
        const stateParam = req.query?.state;
        if (stateParam) {
          try {
            const parsed = JSON.parse(stateParam);
            if (parsed.origin) frontendUrl = parsed.origin;
            if (parsed.redirect) redirectPath = parsed.redirect;
            if (parsed.capacitor) isCapacitor = true;
          } catch {
            // Fallback: treat as legacy redirect path
            redirectPath = stateParam;
          }
        }

        let redirectUrl;
        if (isCapacitor) {
          redirectUrl = `koyoo://oauth/callback?access_token=${token}&redirect=${encodeURIComponent(redirectPath)}`;
        } else {
          redirectUrl = `${frontendUrl}/login?access_token=${token}&redirect=${encodeURIComponent(redirectPath)}`;
        }

        done(null, { user, token, redirectUrl });
      } catch (error) {
        console.error('Google auth error:', error);
        done(error, null);
      }
    }));
  } else {
    console.warn('Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env');
  }

  passport.serializeUser((obj, done) => done(null, obj));
  passport.deserializeUser((obj, done) => done(null, obj));
}
