import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

const router = Router();

function paystackHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

function formatPhone(phone) {
  let p = phone.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (p.startsWith('+')) p = p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

async function getDriverName(driverId) {
  const [rows] = await pool.query(
    `SELECT u.full_name FROM users u JOIN driver_profiles dp ON u.id = dp.user_id WHERE dp.id = ?`,
    [driverId]
  );
  return rows[0]?.full_name || 'Koyoo Driver';
}

async function createPaystackRecipient(type, name, accountDetails) {
  let body;
  if (type === 'mpesa') {
    body = {
      type: 'mobile_money',
      name,
      account_number: formatPhone(accountDetails.phone),
      bank_code: 'MPESA',
      currency: 'KES',
    };
  } else {
    body = {
      type: 'nuban',
      name,
      account_number: accountDetails.bank_account.replace(/[^0-9]/g, ''),
      bank_code: accountDetails.bank_code,
      currency: 'KES',
    };
  }

  const res = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: paystackHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Failed to create Paystack recipient');
  return data.data.recipient_code;
}

async function initiatePaystackTransfer(recipientCode, amountKsh, reason) {
  const amountKobo = Math.round(amountKsh * 100);
  const res = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: paystackHeaders(),
    body: JSON.stringify({
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reason: reason || 'Koyoo driver withdrawal',
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Failed to initiate Paystack transfer');
  return data.data;
}

// List Kenyan banks from Paystack
router.get('/banks', authenticate, async (req, res) => {
  try {
    const cacheRes = await fetch('https://api.paystack.co/bank?country=kenya&currency=KES&perPage=100', {
      headers: paystackHeaders(),
    });
    const data = await cacheRes.json();
    if (!data.status) return res.json([]);
    const banks = data.data.map((b) => ({
      code: b.code,
      name: b.name,
    }));
    banks.sort((a, b) => a.name.localeCompare(b.name));
    res.json(banks);
  } catch (error) {
    console.error('List banks error:', error);
    res.json([]);
  }
});

// Get driver's earnings summary (balance + history)
router.get('/earnings', authenticate, async (req, res) => {
  try {
    const [profile] = await pool.query('SELECT id FROM driver_profiles WHERE user_id = ?', [req.user.id]);
    if (profile.length === 0) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
    const driverId = profile[0].id;

    const [earnings] = await pool.query(
      'SELECT * FROM driver_earnings WHERE driver_id = ? ORDER BY created_at DESC',
      [driverId]
    );

    const [pendingRows] = await pool.query(
      'SELECT COALESCE(SUM(commission_amount), 0) AS total FROM driver_earnings WHERE driver_id = ? AND status = ?',
      [driverId, 'available']
    );
    const [withdrawnRows] = await pool.query(
      'SELECT COALESCE(SUM(commission_amount), 0) AS total FROM driver_earnings WHERE driver_id = ? AND status = ?',
      [driverId, 'withdrawn']
    );
    const totalCommission = Number(pendingRows[0]?.total || 0) + Number(withdrawnRows[0]?.total || 0);

    res.json({
      earnings,
      available_balance: Number(pendingRows[0]?.total || 0),
      total_earned: totalCommission,
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
});

// Request withdrawal
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const { amount, method, phone, bank_name, bank_account, bank_code } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }
    if (!method || !['mpesa', 'bank'].includes(method)) {
      return res.status(400).json({ message: 'Invalid withdrawal method' });
    }
    if (method === 'mpesa' && !phone) {
      return res.status(400).json({ message: 'M-Pesa phone number is required' });
    }
    if (method === 'bank' && (!bank_name || !bank_account || !bank_code)) {
      return res.status(400).json({ message: 'Bank name, account number, and bank code are required' });
    }

    const [profile] = await pool.query('SELECT id FROM driver_profiles WHERE user_id = ?', [req.user.id]);
    if (profile.length === 0) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
    const driverId = profile[0].id;

    // Check available balance
    const [balanceRows] = await pool.query(
      'SELECT COALESCE(SUM(commission_amount), 0) AS total FROM driver_earnings WHERE driver_id = ? AND status = ?',
      [driverId, 'available']
    );
    const availableBalance = Number(balanceRows[0]?.total || 0);
    if (amount > availableBalance) {
      return res.status(400).json({ message: `Insufficient balance. Available: KSh ${availableBalance.toFixed(2)}` });
    }

    const id = generateId();
    await pool.query(
      `INSERT INTO withdrawals (id, driver_id, amount, method, phone, bank_name, bank_account, bank_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, driverId, amount, method, phone || null, bank_name || null, bank_account || null, bank_code || null]
    );

    const [withdrawal] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [id]);
    res.status(201).json(withdrawal[0]);
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Failed to create withdrawal request' });
  }
});

// List withdrawals for the current driver
router.get('/', authenticate, async (req, res) => {
  try {
    const [profile] = await pool.query('SELECT id FROM driver_profiles WHERE user_id = ?', [req.user.id]);
    if (profile.length === 0) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
    const driverId = profile[0].id;
    const [withdrawals] = await pool.query(
      'SELECT * FROM withdrawals WHERE driver_id = ? ORDER BY created_at DESC',
      [driverId]
    );
    res.json(withdrawals);
  } catch (error) {
    console.error('List withdrawals error:', error);
    res.status(500).json({ message: 'Failed to list withdrawals' });
  }
});

// Admin: list all withdrawals with driver info
router.get('/all', authenticate, async (req, res) => {
  try {
    const [user] = await pool.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (!user[0] || user[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const [withdrawals] = await pool.query(
      `SELECT w.*, dp.full_name, dp.email, dp.phone AS driver_phone
       FROM withdrawals w
       LEFT JOIN driver_profiles dp ON w.driver_id = dp.id
       ORDER BY w.created_at DESC`
    );
    res.json(withdrawals);
  } catch (error) {
    console.error('Admin list withdrawals error:', error);
    res.status(500).json({ message: 'Failed to list withdrawals' });
  }
});

// Admin: update withdrawal status (approve/reject) — triggers Paystack transfer on approval
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const [user] = await pool.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (!user[0] || user[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { status } = req.body;
    if (!status || !['processed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "processed" or "failed"' });
    }

    const [withdrawalRows] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [req.params.id]);
    if (withdrawalRows.length === 0) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }
    const withdrawal = withdrawalRows[0];

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: `Withdrawal already ${withdrawal.status}` });
    }

    if (status === 'processed') {
      // Attempt Paystack transfer
      try {
        const driverName = await getDriverName(withdrawal.driver_id);

        let recipientCode;
        if (withdrawal.method === 'mpesa') {
          recipientCode = await createPaystackRecipient('mpesa', driverName, {
            phone: withdrawal.phone,
          });
        } else {
          recipientCode = await createPaystackRecipient('bank', driverName, {
            bank_account: withdrawal.bank_account,
            bank_code: withdrawal.bank_code,
          });
        }

        const transfer = await initiatePaystackTransfer(
          recipientCode,
          Number(withdrawal.amount),
          'Koyoo driver earnings withdrawal'
        );

        // Mark earnings as withdrawn (deduct from oldest first)
        const [availableEarnings] = await pool.query(
          'SELECT id, commission_amount FROM driver_earnings WHERE driver_id = ? AND status = ? ORDER BY created_at ASC',
          [withdrawal.driver_id, 'available']
        );
        let remaining = Number(withdrawal.amount);
        for (const earning of availableEarnings) {
          if (remaining <= 0) break;
          const toDeduct = Math.min(remaining, Number(earning.commission_amount));
          remaining -= toDeduct;
          await pool.query('UPDATE driver_earnings SET status = ? WHERE id = ?', ['withdrawn', earning.id]);
        }

        await pool.query(
          'UPDATE withdrawals SET status = ?, paystack_reference = ? WHERE id = ?',
          ['processed', transfer.reference || transfer.id || null, req.params.id]
        );
      } catch (paystackErr) {
        console.error('Paystack transfer failed:', paystackErr.message);
        await pool.query('UPDATE withdrawals SET status = ?, admin_notes = ? WHERE id = ?', [
          'failed',
          `Paystack error: ${paystackErr.message}`,
          req.params.id,
        ]);
        const [failedWithdrawal] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [req.params.id]);
        return res.status(200).json(failedWithdrawal[0]);
      }
    } else {
      // Rejected — just mark as failed, earnings stay available
      await pool.query('UPDATE withdrawals SET status = ? WHERE id = ?', ['failed', req.params.id]);
    }

    const [updated] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({ message: 'Failed to update withdrawal status' });
  }
});

export default router;
