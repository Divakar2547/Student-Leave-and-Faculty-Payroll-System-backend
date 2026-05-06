const db = require('../config/database');

exports.getLeaves = async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'student') {
      query = 'SELECT * FROM leaves WHERE student_id = $1 ORDER BY id DESC';
      params = [req.user.user_id];
    } else {
      query = `SELECT l.*, u.full_name, u.roll_number 
               FROM leaves l 
               JOIN users u ON l.student_id = u.user_id 
               ORDER BY l.id DESC`;
    }

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createLeave = async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;

  try {
    const query = `INSERT INTO leaves (student_id, leave_type, from_date, to_date) 
                   VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await db.query(query, [req.user.user_id, leave_type, start_date, end_date]);

    res.status(201).json({ success: true, message: 'Leave application submitted', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  const { leave_id } = req.params;
  const { status } = req.body;

  try {
    const query = `UPDATE leaves SET status = $1 WHERE id = $2 RETURNING *`;
    const result = await db.query(query, [status, leave_id]);

    res.json({ success: true, message: `Leave ${status}`, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};