import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { sendEmail, buildRideReceiptEmail } from '../utils/email.js';
import { generateId } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${generateId()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
});

const router = Router();

router.post('/send-email', authenticate, async (req, res) => {
  try {
    const { to, subject, body, html, template, templateData } = req.body;
    if (!to) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    if (template === 'ride-receipt' && templateData) {
      const { riderName, pickup, destination, driverName, distanceKm, durationMin, fare } = templateData;
      if (!pickup || !destination) {
        return res.status(400).json({ message: 'Pickup and destination are required for receipt template' });
      }
      const email = buildRideReceiptEmail({
        riderName: riderName || 'there',
        pickup,
        destination,
        driverName,
        distanceKm: distanceKm || '—',
        durationMin: durationMin || '—',
        fare: fare || '—',
      });
      await sendEmail({ to, subject: email.subject, html: email.html });
      return res.json({ message: 'Receipt sent' });
    }

    await sendEmail({ to, subject: subject || 'Koyoo', body, html });
    res.json({ message: 'Email sent' });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

router.post('/upload-file', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ file_url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

export default router;
