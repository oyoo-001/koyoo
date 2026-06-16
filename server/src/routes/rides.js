import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, authenticateSSE } from '../middleware/auth.js';
import { generateId, isInServiceArea, getRegion } from '../utils/helpers.js';
import { sendEmail } from '../utils/email.js';
import { autoRestrictUser } from './users.js';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const [userCheck] = await pool.query(
      'SELECT is_restricted, restriction_reason FROM users WHERE id = ?',
      [req.user.id]
    );
    if (userCheck.length > 0 && userCheck[0].is_restricted) {
      return res.status(403).json({
        message: `Your account has been restricted: ${userCheck[0].restriction_reason || 'Violation of terms of service'}`,
      });
    }

    const {
      pickup_address, pickup_lat, pickup_lng,
      destination_address, destination_lat, destination_lng,
      estimated_fare, distance_km, duration_min,
      vehicle_type, payment_method, surge_multiplier,
      payment_status, paystack_reference
    } = req.body;

    // Validate service area
    const pickupLat = parseFloat(pickup_lat);
    const pickupLng = parseFloat(pickup_lng);
    const destLat = parseFloat(destination_lat);
    const destLng = parseFloat(destination_lng);

    if (!pickupLat || !pickupLng || isNaN(pickupLat) || isNaN(pickupLng)) {
      return res.status(400).json({ message: 'Invalid pickup location. Please select a valid address.' });
    }
    if (!destLat || !destLng || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json({ message: 'Invalid destination. Please select a valid address.' });
    }

    if (!isInServiceArea(pickupLat, pickupLng)) {
      return res.status(400).json({ message: 'Sorry, we do not offer rides in this region yet. We currently serve Nairobi and Muranga counties only.' });
    }
    if (!isInServiceArea(destLat, destLng)) {
      return res.status(400).json({ message: 'Sorry, we do not offer rides to this region yet. We currently serve Nairobi and Muranga counties only.' });
    }

    const id = generateId();
    const pickupRegion = getRegion(pickupLat, pickupLng);
    const [user] = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [req.user.id]);

    await pool.query(
      `INSERT INTO rides (id, rider_id, rider_name, rider_email, pickup_address, pickup_lat, pickup_lng,
        destination_address, destination_lat, destination_lng, estimated_fare, distance_km, duration_min,
        vehicle_type, payment_method, surge_multiplier, payment_status, paystack_reference, pickup_region)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, user[0]?.full_name || 'Rider', user[0]?.email,
       pickup_address, pickup_lat, pickup_lng,
       destination_address, destination_lat, destination_lng,
       estimated_fare, distance_km, duration_min,
       vehicle_type || 'standard', payment_method || 'cash', surge_multiplier || 1.0,
       payment_status || 'pending', paystack_reference || null, pickupRegion]
    );

    const [ride] = await pool.query('SELECT * FROM rides WHERE id = ?', [id]);

    // Notify SSE clients
    req.app.get('rideEmitter')?.emit('rideUpdate', { type: 'create', data: ride[0] });

    res.status(201).json(ride[0]);
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ message: 'Failed to create ride' });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const allowedFields = [
      'driver_id', 'driver_name', 'status', 'payment_status', 'final_fare',
      'paystack_reference', 'driver_rating', 'rider_rating', 'rider_comment',
      'driver_comment', 'route_polyline', 'call_active', 'call_offer',
      'call_answer', 'call_ice_candidates',
      'driver_vehicle_make', 'driver_vehicle_model', 'driver_vehicle_color',
      'driver_vehicle_plate', 'driver_vehicle_type',
      'rider_lat', 'rider_lng',
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

    // Auto-set timestamps based on status
    if (req.body.status === 'accepted') {
      updates.push('driver_id = ?');
      values.push(req.user.id);
      if (req.body.driver_name) {
        updates.push('driver_name = ?');
        values.push(req.body.driver_name);
      }
    }
    if (req.body.status === 'in_progress') {
      updates.push('started_at = NOW()');
    }
    if (req.body.status === 'cancelled') {
      updates.push('cancelled_at = NOW()');
    }
    if (req.body.status === 'completed') {
      updates.push('completed_at = NOW()');
    }

    values.push(req.params.id);
    await pool.query(`UPDATE rides SET ${updates.join(', ')} WHERE id = ?`, values);

    const [ride] = await pool.query('SELECT * FROM rides WHERE id = ?', [req.params.id]);

    const r = ride[0];

    // Auto-create driver earning (65% commission) when ride is completed
    if (req.body.status === 'completed' && r.driver_id) {
      const totalFare = Number(r.final_fare || r.estimated_fare || 0);
      const commissionPercent = 65.00;
      const commissionAmount = Math.round((totalFare * commissionPercent / 100) * 100) / 100;
      if (commissionAmount > 0) {
        const [driverProfile] = await pool.query(
          'SELECT id FROM driver_profiles WHERE user_id = ?',
          [r.driver_id]
        );
        if (driverProfile.length > 0) {
          const earningId = generateId();
          await pool.query(
            `INSERT INTO driver_earnings (id, driver_id, ride_id, total_fare, commission_percent, commission_amount)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [earningId, driverProfile[0].id, r.id, totalFare, commissionPercent, commissionAmount]
          );
        }
      }
    }

    // Auto-restrict if ride was cancelled or payment failed
    if (req.body.status === 'cancelled' && r?.rider_id) {
      autoRestrictUser(r.rider_id);
    }
    if (req.body.payment_status === 'failed' && r?.rider_id) {
      autoRestrictUser(r.rider_id);
    }

    // Increment rides_since_discount for rider on completion
    if (req.body.status === 'completed' && r?.rider_id) {
      await pool.query(
        `UPDATE rider_profiles
         SET rides_since_discount = rides_since_discount + 1
         WHERE user_id = ?`,
        [r.rider_id]
      );
    }

    // Send receipt email when completed
    if (req.body.status === 'completed' && r?.rider_email) {
      const fare = Number(r.final_fare || r.estimated_fare || 0).toFixed(2);
      await sendEmail({
        to: r.rider_email,
        subject: `Your Koyoo ride receipt — KSh ${fare}`,
        body: `Hi ${r.rider_name || 'there'},\n\nThank you for riding with Koyoo! Here's your trip receipt:\n\n📍 From: ${r.pickup_address}\n🏁 To: ${r.destination_address}\n🚗 Driver: ${r.driver_name || '—'}\n📏 Distance: ${Number(r.distance_km || 0).toFixed(1)} km\n⏱ Duration: ~${Math.round(r.duration_min || 0)} min\n💰 Total: KSh ${fare}\n\nWe hope you had a great ride!\n\nThe Koyoo Team`,
      });
    }

    // Notify SSE clients
    req.app.get('rideEmitter')?.emit('rideUpdate', { type: 'update', data: ride[0] });

    res.json(ride[0]);
  } catch (error) {
    console.error('Update ride error:', error);
    res.status(500).json({ message: 'Failed to update ride' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM rides WHERE 1=1';
    const values = [];

    if (req.query.rider_id) { query += ' AND rider_id = ?'; values.push(req.query.rider_id); }
    if (req.query.driver_id) { query += ' AND driver_id = ?'; values.push(req.query.driver_id); }
    if (req.query.status) {
      const statuses = req.query.status.split(',');
      query += ` AND status IN (${statuses.map(() => '?').join(',')})`;
      values.push(...statuses);
    }
    if (req.query.vehicle_type) { query += ' AND vehicle_type = ?'; values.push(req.query.vehicle_type); }

    const sort = req.query.sort || '-created_at';
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = sort.replace(/^-/, '');
    query += ` ORDER BY ${sortField} ${sortDir}`;

    if (req.query.limit) { query += ' LIMIT ?'; values.push(parseInt(req.query.limit)); }

    const [rides] = await pool.query(query, values);
    res.json(rides);
  } catch (error) {
    console.error('List rides error:', error);
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
});

// SSE endpoint for ride updates
router.get('/stream', authenticateSSE, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const onRideUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  req.app.get('rideEmitter')?.on('rideUpdate', onRideUpdate);

  req.on('close', () => {
    req.app.get('rideEmitter')?.off('rideUpdate', onRideUpdate);
  });
});

export default router;
