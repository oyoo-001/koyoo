import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

router.post('/directions', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination || !Array.isArray(origin) || !Array.isArray(destination)) {
      return res.status(400).json({ message: 'origin and destination must be [lat, lng] arrays' });
    }

    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

    if (mapboxToken) {
      const q = `${destination[1]},${destination[0]}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
      const mapRes = await fetch(url);
      const data = await mapRes.json();

      if (data.code === 'Ok' && data.routes?.[0]) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        return res.json({
          coordinates: coords,
          distance: data.routes[0].distance / 1000,
          duration: data.routes[0].duration / 60,
          provider: 'mapbox',
        });
      }
    }

    const osmUrl = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
    const osmRes = await fetch(osmUrl);
    const osmData = await osmRes.json();

    if (osmData.code === 'Ok' && osmData.routes?.[0]) {
      const coords = osmData.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      return res.json({
        coordinates: coords,
        distance: osmData.routes[0].distance / 1000,
        duration: osmData.routes[0].duration / 60,
        provider: 'osrm',
      });
    }

    const d = calcDistance(origin[0], origin[1], destination[0], destination[1]);
    res.json({
      coordinates: [origin, destination],
      distance: d,
      duration: (d / 40) * 60,
      provider: 'fallback',
    });
  } catch (err) {
    console.error('Directions error:', err.message);
    res.status(500).json({ message: 'Failed to fetch directions' });
  }
});

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
