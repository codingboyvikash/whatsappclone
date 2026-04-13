import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-clone-secret-key-2024';

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
