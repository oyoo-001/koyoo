import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM app_settings WHERE id = ?', ['default']);
    if (settings.length === 0) {
      return res.json({
        id: 'default',
        settings: {
          app_name: 'Koyoo Taxi',
          base_fare: 2.50,
          per_km_rate: 1.20,
          vehicle_types: [
            { id: 'standard', name: 'Standard', multiplier: 1.0, seats: 4 },
            { id: 'premium', name: 'Premium', multiplier: 1.5, seats: 4 },
            { id: 'xl', name: 'XL', multiplier: 2.0, seats: 7 },
            { id: 'boda', name: 'Boda', multiplier: 0.7, seats: 1 },
          ],
          allowed_counties: ['Muranga', 'Nairobi'],
        },
      });
    }
    res.json({
      id: settings[0].id,
      settings: typeof settings[0].settings === 'string'
        ? JSON.parse(settings[0].settings)
        : settings[0].settings,
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

export default router;
