const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = async (req, res) => {
  const { email, password, role } = req.body;

  // Check all fields are provided
  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: '⚠️ Please fill in your email, password, and select a role.'
    });
  }

  try {
    // Find user by email + role
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1 AND LOWER(role) = LOWER($2) AND is_active = true`,
      [email, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '❌ No account found with this email and role. Please check and try again.'
      });
    }

    const user = result.rows[0];

    // Support both hashed and plain-text passwords (auto-detects)
    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
      // Auto-hash the plain-text password for next time
      if (isMatch) {
        const hashed = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password = $1 WHERE user_id = $2', [hashed, user.user_id]);
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '❌ Wrong password. Please try again.'
      });
    }

    // Generate token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return res.json({
      success: true,
      message: `👋 Welcome back, ${user.full_name}!`,
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        roll_number: user.roll_number || null,
        employee_id: user.employee_id || null
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: '🚨 Something went wrong on our end. Please try again in a moment.'
    });
  }
};
