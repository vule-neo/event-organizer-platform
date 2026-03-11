const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

exports.register = async ({ email,password,first_name,last_name,phone,role}) => {

  if (!email || !password) {
    throw new Error('Email and password required');
  }

  // check if user exists
  const existing = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error('User already exists');
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // insert user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, role, first_name, last_name, phone`,
    [email, hashedPassword, first_name, last_name, phone, role || 'customer']
  );

  const user = result.rows[0];

  // GENERIŠI TOKEN I OVDE!
  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token, // DODATO
    user
  };
};

exports.login = async ({ email, password }) => {

  if (!email || !password) {
    throw new Error('Email and password required');
  }

  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name, // DODATO
        last_name: user.last_name,   // DODATO
        phone: user.phone            // DODATO
    }
};
};


exports.updateUserProfile = async (userId, userData) => {
    const { first_name, last_name, phone } = userData;
    
    const result = await pool.query(
        `UPDATE users 
         SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW() 
         WHERE id = $4 
         RETURNING id, email, first_name, last_name, phone, role`,
        [first_name, last_name, phone, userId]
    );

    return result.rows[0];
};

exports.getUserById = async (userId) => {
    const result = await pool.query(
        'SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0];
};