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


const crypto = require('crypto');
const mailer = require('../config/mailer');

exports.forgotPassword = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  
  // Uvijek vrati isti odgovor — ne otkrivaj da li email postoji
  if (result.rows.length === 0) return;

  const user = result.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 sat

  await pool.query(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
    [token, expires, user.id]
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await mailer.sendMail({
    from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Resetovanje lozinke',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 12px;">
        <h2 style="color: #0d6efd;">Resetovanje lozinke</h2>
        <p>Primili smo zahtev za resetovanje lozinke za vaš nalog.</p>
        <p>Kliknite na dugme ispod — link važi <strong>1 sat</strong>:</p>
        <a href="${resetUrl}" 
           style="display:inline-block; margin: 16px 0; padding: 12px 28px; background:#0d6efd; color:white; border-radius:8px; text-decoration:none; font-weight:bold;">
          Resetuj lozinku
        </a>
        <p style="color:#999; font-size:12px;">Ako niste tražili resetovanje, ignorišite ovaj email.</p>
      </div>
    `
  });
};

exports.resetPassword = async (token, newPassword) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Token je nevažeći ili je istekao.');
  }

  const user = result.rows[0];
  const hashed = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [hashed, user.id]
  );
};