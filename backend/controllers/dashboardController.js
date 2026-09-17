const pool = require('../config/db');

async function getDashboard(req, res, next) {
  try {
    const [[summaryRows], [recentInspections], [statusRows]] = await Promise.all([
      pool.execute(
        `SELECT
          COUNT(*) AS total_inspections,
          SUM(inspection_status = 'passed') AS passed_inspections,
          SUM(inspection_status = 'failed') AS failed_inspections,
          SUM(inspection_status = 'pending') AS pending_inspections
         FROM inspections
         WHERE user_id = ?`,
        [req.user.id]
      ),
      pool.execute(
        `SELECT id, image_path, product_name, brand_name, inspection_status, created_at
         FROM inspections
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [req.user.id]
      ),
      pool.execute(
        `SELECT inspection_status AS status, COUNT(*) AS count
         FROM inspections
         WHERE user_id = ?
         GROUP BY inspection_status`,
        [req.user.id]
      )
    ]);

    const summary = summaryRows[0];
    return res.json({
      success: true,
      message: 'Dashboard retrieved successfully',
      data: {
        summary: {
          total_inspections: Number(summary.total_inspections),
          passed_inspections: Number(summary.passed_inspections || 0),
          failed_inspections: Number(summary.failed_inspections || 0),
          pending_inspections: Number(summary.pending_inspections || 0)
        },
        recent_inspections: recentInspections,
        status_summary: statusRows
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
