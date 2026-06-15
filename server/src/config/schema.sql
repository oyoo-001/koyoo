CREATE DATABASE IF NOT EXISTS koyoo_taxi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE koyoo_taxi;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  role ENUM('rider', 'driver', 'admin') DEFAULT 'rider',
  email_verified BOOLEAN DEFAULT FALSE,
  avatar_url VARCHAR(500) DEFAULT NULL,
  is_restricted BOOLEAN DEFAULT FALSE,
  restriction_reason VARCHAR(255) DEFAULT NULL,
  restricted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- OTP codes for email verification
CREATE TABLE IF NOT EXISTS otp_codes (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type ENUM('verification', 'password_reset') DEFAULT 'verification',
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_code (email, code)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token)
);

-- Rider profiles
CREATE TABLE IF NOT EXISTS rider_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  default_payment_method ENUM('cash', 'card') DEFAULT 'cash',
  total_rides INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  discount_percent DECIMAL(5,2) DEFAULT 0.00,
  discount_eligible_rides INT DEFAULT 5,
  rides_since_discount INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Driver profiles
CREATE TABLE IF NOT EXISTS driver_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  vehicle_type ENUM('standard', 'premium', 'xl', 'boda') DEFAULT 'standard',
  vehicle_make VARCHAR(100) DEFAULT NULL,
  vehicle_model VARCHAR(100) DEFAULT NULL,
  vehicle_year INT DEFAULT NULL,
  vehicle_color VARCHAR(50) DEFAULT NULL,
  license_plate VARCHAR(20) DEFAULT NULL,
  license_url VARCHAR(500) DEFAULT NULL,
  insurance_url VARCHAR(500) DEFAULT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  documents_verified BOOLEAN DEFAULT FALSE,
  current_lat DECIMAL(10,7) DEFAULT NULL,
  current_lng DECIMAL(10,7) DEFAULT NULL,
  total_rides INT DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  rating DECIMAL(2,1) DEFAULT 5.0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_online (is_online),
  INDEX idx_verified (documents_verified),
  INDEX idx_vehicle_type (vehicle_type)
);

-- Driver documents
CREATE TABLE IF NOT EXISTS driver_documents (
  id VARCHAR(36) PRIMARY KEY,
  driver_profile_id VARCHAR(36) NOT NULL,
  document_type ENUM('license', 'insurance', 'identification', 'vehicle_registration', 'other') NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_profile_id) REFERENCES driver_profiles(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_profile_id)
);

-- Rides
CREATE TABLE IF NOT EXISTS rides (
  id VARCHAR(36) PRIMARY KEY,
  rider_id VARCHAR(36) NOT NULL,
  driver_id VARCHAR(36) DEFAULT NULL,
  rider_name VARCHAR(255) DEFAULT NULL,
  rider_email VARCHAR(255) DEFAULT NULL,
  driver_name VARCHAR(255) DEFAULT NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10,7) NOT NULL,
  destination_lng DECIMAL(10,7) NOT NULL,
  status ENUM('requested', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'requested',
  vehicle_type ENUM('standard', 'premium', 'xl', 'boda') DEFAULT 'standard',
  payment_method ENUM('cash', 'card') DEFAULT 'cash',
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  estimated_fare DECIMAL(10,2) DEFAULT NULL,
  final_fare DECIMAL(10,2) DEFAULT NULL,
  distance_km DECIMAL(10,2) DEFAULT NULL,
  duration_min DECIMAL(10,1) DEFAULT NULL,
  surge_multiplier DECIMAL(3,1) DEFAULT 1.0,
  paystack_reference VARCHAR(100) DEFAULT NULL,
  driver_rating DECIMAL(2,1) DEFAULT NULL,
  rider_rating DECIMAL(2,1) DEFAULT NULL,
  rider_comment TEXT DEFAULT NULL,
  driver_comment TEXT DEFAULT NULL,
  started_at TIMESTAMP NULL DEFAULT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  route_polyline TEXT DEFAULT NULL,
  rider_lat DECIMAL(10,7) DEFAULT NULL,
  rider_lng DECIMAL(10,7) DEFAULT NULL,
  driver_vehicle_make VARCHAR(100) DEFAULT NULL,
  driver_vehicle_model VARCHAR(100) DEFAULT NULL,
  driver_vehicle_color VARCHAR(50) DEFAULT NULL,
  driver_vehicle_plate VARCHAR(20) DEFAULT NULL,
  driver_vehicle_type VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rider_id (rider_id),
  INDEX idx_driver_id (driver_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  ride_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  sender_name VARCHAR(255) DEFAULT NULL,
  sender_role ENUM('rider', 'driver') NOT NULL,
  content TEXT NOT NULL,
  type ENUM('text', 'image', 'system') DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
  INDEX idx_ride_id (ride_id),
  INDEX idx_created (created_at)
);

-- App settings
CREATE TABLE IF NOT EXISTS app_settings (
  id VARCHAR(36) PRIMARY KEY,
  settings JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default app settings
INSERT INTO app_settings (id, settings) VALUES (
  'default',
  JSON_OBJECT(
    'app_name', 'Koyoo Taxi',
    'base_fare', 2.50,
    'per_km_rate', 1.20,
    'per_min_rate', 0.15,
    'vehicle_types', JSON_ARRAY(
      JSON_OBJECT('id', 'standard', 'name', 'Standard', 'multiplier', 1.0, 'icon', 'Car', 'seats', 4),
      JSON_OBJECT('id', 'premium', 'name', 'Premium', 'multiplier', 1.5, 'icon', 'Sparkles', 'seats', 4),
      JSON_OBJECT('id', 'xl', 'name', 'XL', 'multiplier', 2.0, 'icon', 'Truck', 'seats', 7),
      JSON_OBJECT('id', 'boda', 'name', 'Boda', 'multiplier', 0.7, 'icon', 'Bike', 'seats', 1)
    ),
    'allowed_counties', JSON_ARRAY('Muranga', 'Kirinyaga', 'Nairobi'),
    'support_phone', '+254700000000',
    'support_email', 'support@koyoo.com'
  )
) ON DUPLICATE KEY UPDATE settings = settings;

-- Driver applications (public submission → admin approval → account creation)
CREATE TABLE IF NOT EXISTS driver_applications (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  vehicle_type VARCHAR(50) DEFAULT NULL,
  vehicle_make VARCHAR(100) DEFAULT NULL,
  vehicle_model VARCHAR(100) DEFAULT NULL,
  vehicle_year INT DEFAULT NULL,
  license_plate VARCHAR(20) DEFAULT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  form_token VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_form_token (form_token)
);

-- Advertisement banners (admin-managed)
CREATE TABLE IF NOT EXISTS ads (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  link_url VARCHAR(500) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  position ENUM('banner', 'sidebar', 'popup') DEFAULT 'banner',
  priority INT DEFAULT 0,
  starts_at TIMESTAMP NULL DEFAULT NULL,
  ends_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_position (position),
  INDEX idx_priority (priority)
);

-- Driver earnings (commission tracking — 65% of total fare per completed ride)
CREATE TABLE IF NOT EXISTS driver_earnings (
  id VARCHAR(36) PRIMARY KEY,
  driver_id VARCHAR(36) NOT NULL,
  ride_id VARCHAR(36) NOT NULL,
  total_fare DECIMAL(10,2) NOT NULL,
  commission_percent DECIMAL(5,2) DEFAULT 65.00,
  commission_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'available', 'withdrawn') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id),
  INDEX idx_status (status)
);

-- Withdrawal requests (M-Pesa or Bank)
CREATE TABLE IF NOT EXISTS withdrawals (
  id VARCHAR(36) PRIMARY KEY,
  driver_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('mpesa', 'bank') NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  bank_account VARCHAR(100) DEFAULT NULL,
  bank_code VARCHAR(20) DEFAULT NULL,
  status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
  paystack_reference VARCHAR(100) DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id),
  INDEX idx_status (status)
);
