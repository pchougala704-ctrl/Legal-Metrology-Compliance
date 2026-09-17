const fs = require('fs/promises');
const path = require('path');
const { validationResult } = require('express-validator');
const pool = require('../config/db');

function parseOptionalJson(value, fieldName) {
  if (!value) return [];
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const validationError = new Error(`${fieldName} must be valid JSON array data`);
    validationError.statusCode = 400;
    throw validationError;
  }

  if (!Array.isArray(parsed)) {
    const validationError = new Error(`${fieldName} must be an array`);
    validationError.statusCode = 400;
    throw validationError;
  }
  for (const item of parsed) {
    if (!item || !item.rule_id || !item.field_name) {
      const validationError = new Error(`${fieldName} items require rule_id and field_name`);
      validationError.statusCode = 400;
      throw validationError;
    }
    if (item.status && !['passed', 'failed', 'pending'].includes(item.status)) {
      const validationError = new Error(`${fieldName} item status must be passed, failed or pending`);
      validationError.statusCode = 400;
      throw validationError;
    }
  }
  return parsed;
}

function getImagePath(file) {
  return file ? `/uploads/${file.filename}` : null;
}

async function createInspection(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const {
      product_name: productName,
      brand_name: brandName,
      batch_number: batchNumber,
      manufacturer,
      manufacturing_date: manufacturingDate,
      expiry_date: expiryDate,
      inspection_status: inspectionStatus = 'pending'
    } = req.body;
    const results = parseOptionalJson(req.body.results, 'results');
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [inspectionResult] = await connection.execute(
        `INSERT INTO inspections
          (user_id, image_path, product_name, brand_name, batch_number, manufacturer,
           manufacturing_date, expiry_date, inspection_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, getImagePath(req.file), productName || null, brandName || null,
          batchNumber || null, manufacturer || null, manufacturingDate || null,
          expiryDate || null, inspectionStatus]
      );

      for (const result of results) {
        await connection.execute(
          `INSERT INTO inspection_results
            (inspection_id, rule_id, field_name, expected_value, actual_value, status, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [inspectionResult.insertId, result.rule_id, result.field_name,
            result.expected_value || null, result.actual_value || null,
            result.status || 'pending', result.remarks || null]
        );
      }

      await connection.commit();
      return res.status(201).json({
        success: true,
        message: 'Inspection created successfully',
        data: {
          id: inspectionResult.insertId,
          image_path: getImagePath(req.file),
          product_name: productName || null,
          brand_name: brandName || null,
          inspection_status: inspectionStatus,
          results
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    next(error);
  }
}

async function getInspectionById(req, res, next) {
  try {
    const [inspections] = await pool.execute(
      'SELECT id, user_id, image_path, product_name, brand_name, batch_number, manufacturer, manufacturing_date, expiry_date, inspection_status, created_at FROM inspections WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (inspections.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    const [results] = await pool.execute(
      'SELECT id, inspection_id, rule_id, field_name, expected_value, actual_value, status, remarks, created_at FROM inspection_results WHERE inspection_id = ? ORDER BY id',
      [req.params.id]
    );

    return res.json({ success: true, message: 'Inspection retrieved successfully', data: { ...inspections[0], results } });
  } catch (error) {
    next(error);
  }
}

async function listInspections(req, res, next) {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const [[countResult], [inspections]] = await Promise.all([
      pool.execute('SELECT COUNT(*) AS total FROM inspections WHERE user_id = ?', [req.user.id]),
      pool.execute(
        'SELECT id, image_path, product_name, brand_name, batch_number, inspection_status, created_at FROM inspections WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [req.user.id, limit, offset]
      )
    ]);

    return res.json({
      success: true,
      message: 'Inspections retrieved successfully',
      data: { inspections, pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteInspection(req, res, next) {
  try {
    const [inspections] = await pool.execute(
      'SELECT image_path FROM inspections WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (inspections.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    await pool.execute('DELETE FROM inspections WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (inspections[0].image_path) {
      const filePath = path.join(__dirname, '..', inspections[0].image_path.replace(/^\//, ''));
      await fs.unlink(filePath).catch(() => {});
    }

    return res.json({ success: true, message: 'Inspection deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { createInspection, getInspectionById, listInspections, deleteInspection };
