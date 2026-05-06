/**
 * 🗄️ Database Setup Script
 * Creates all tables and inserts sample users with hashed passwords.
 * Usage: node setupDatabase.js
 */

const bcrypt = require('bcryptjs');
const pool = require('./config/database');

async function setupDatabase() {
  console.log('\n🗄️  Setting up database...\n');

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id    SERIAL PRIMARY KEY,
        full_name  VARCHAR(100) NOT NULL,
        email      VARCHAR(100) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        role       VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
        roll_number   VARCHAR(20),
        employee_id   VARCHAR(20),
        is_active  BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ users table ready');

    // Create leaves table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        leave_id   SERIAL PRIMARY KEY,
        user_id    INT REFERENCES users(user_id) ON DELETE CASCADE,
        leave_type VARCHAR(30) NOT NULL,
        start_date DATE NOT NULL,
        end_date   DATE NOT NULL,
        reason     TEXT,
        status     VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by INT REFERENCES users(user_id),
        remarks    TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ leaves table ready');

    // Insert sample users if none exist
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      const studentPass  = await bcrypt.hash('student123', 10);
      const facultyPass  = await bcrypt.hash('faculty123', 10);
      const adminPass    = await bcrypt.hash('admin123', 10);

      await pool.query(`
        INSERT INTO users (full_name, email, password, role, roll_number, employee_id) VALUES
          ('Alex Johnson',   'student@demo.com', $1, 'student', 'CS2024001', NULL),
          ('Dr. Sarah Smith','faculty@demo.com', $2, 'faculty', NULL, 'FAC001'),
          ('Admin User',     'admin@demo.com',   $3, 'admin',   NULL, 'ADM001')
      `, [studentPass, facultyPass, adminPass]);

      console.log('\n👤 Sample users created:');
      console.log('   Student  → student@demo.com  / student123');
      console.log('   Faculty  → faculty@demo.com  / faculty123');
      console.log('   Admin    → admin@demo.com    / admin123');
    } else {
      console.log('ℹ️  Users already exist, skipping sample data.');
      // Still hash any plain-text passwords
      const { rows: users } = await pool.query('SELECT user_id, email, password FROM users');
      let fixed = 0;
      for (const user of users) {
        if (!user.password.startsWith('$2')) {
          const hashed = await bcrypt.hash(user.password, 10);
          await pool.query('UPDATE users SET password = $1 WHERE user_id = $2', [hashed, user.user_id]);
          console.log(`🔐 ${user.email} — password hashed`);
          fixed++;
        }
      }
      if (fixed > 0) console.log(`✅ ${fixed} password(s) hashed.`);
    }

    console.log('\n🎉 Database setup complete!');
    console.log('👉 Start your backend: npm run dev\n');
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message, '\n');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

setupDatabase();
