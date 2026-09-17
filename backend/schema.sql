CREATE DATABASE IF NOT EXISTS consumer_inspection_db;
USE consumer_inspection_db;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  image_path VARCHAR(500),
  product_name VARCHAR(255),
  brand_name VARCHAR(255),
  batch_number VARCHAR(100),
  manufacturer VARCHAR(255),
  manufacturing_date DATE,
  expiry_date DATE,
  inspection_status ENUM('pending', 'passed', 'failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inspections_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_inspections_user_created (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS inspection_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inspection_id INT UNSIGNED NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  expected_value TEXT,
  actual_value TEXT,
  status ENUM('passed', 'failed', 'pending') NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_inspection
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  INDEX idx_results_inspection (inspection_id)
);
