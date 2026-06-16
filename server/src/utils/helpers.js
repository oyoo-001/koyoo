import { v4 as uuidv4 } from 'uuid';

export const generateId = () => uuidv4();

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sanitizeUser = (user) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

export const calculateFare = (distanceKm, durationMin, vehicleMultiplier = 1, surgeMultiplier = 1) => {
  const BASE_RATE = 2.5;
  const PER_KM = 1.2;
  const PER_MIN = 0.15;

  const baseFare = BASE_RATE + (distanceKm * PER_KM) + (durationMin * PER_MIN);
  return parseFloat((baseFare * vehicleMultiplier * surgeMultiplier).toFixed(2));
};

export const counties = {
  muranga: {
    bounds: { lat: [-0.9, -0.4], lng: [36.8, 37.5] },
    name: 'Muranga'
  },
  kirinyaga: {
    bounds: { lat: [-0.6, -0.3], lng: [37.1, 37.6] },
    name: 'Kirinyaga'
  },
  nairobi: {
    bounds: { lat: [-1.45, -1.1], lng: [36.6, 37.1] },
    name: 'Nairobi'
  },
  mainRoad: {
    // The main A2 road connecting Nairobi to Muranga
    waypoints: [
      { lat: -1.2833, lng: 36.8167 }, // Nairobi
      { lat: -1.2167, lng: 36.8833 }, // Thika Road
      { lat: -1.0833, lng: 36.9833 }, // Thika
      { lat: -0.9833, lng: 37.0500 }, // Makutano
      { lat: -0.9000, lng: 37.0833 }, // Kenol
      { lat: -0.7833, lng: 37.1167 }, // Kabati
      { lat: -0.7167, lng: 37.1500 }, // Muranga
    ]
  }
};

export const isInServiceArea = (lat, lng) => {
  // Broader Nairobi area
  const inNairobi = lat >= -1.45 && lat <= -1.1 && lng >= 36.6 && lng <= 37.1;
  // Muranga area
  const inMuranga = lat >= -0.9 && lat <= -0.4 && lng >= 36.8 && lng <= 37.5;
  // Kirinyaga area
  const inKirinyaga = lat >= -0.6 && lat <= -0.3 && lng >= 37.1 && lng <= 37.6;

  // Also check if it's on the main road corridor between counties (wider buffer)
  const onMainRoad = counties.mainRoad.waypoints.some(
    wp => Math.abs(wp.lat - lat) < 0.15 && Math.abs(wp.lng - lng) < 0.15
  );

  return inNairobi || inMuranga || inKirinyaga || onMainRoad;
};

export const getRegion = (lat, lng) => {
  const inNairobi = lat >= -1.45 && lat <= -1.1 && lng >= 36.6 && lng <= 37.1;
  const inMuranga = lat >= -0.9 && lat <= -0.4 && lng >= 36.8 && lng <= 37.5;
  const inKirinyaga = lat >= -0.6 && lat <= -0.3 && lng >= 37.1 && lng <= 37.6;

  if (inNairobi) return 'nairobi';
  if (inMuranga) return 'muranga';
  if (inKirinyaga) return 'kirinyaga';
  return 'other';
};
