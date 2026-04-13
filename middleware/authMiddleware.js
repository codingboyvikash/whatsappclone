import { verifyToken } from '@/lib/auth';

export function getAuthUserId(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch {
    return null;
  }
}

export function requireAuth(request) {
  const userId = getAuthUserId(request);
  if (!userId) {
    return { userId: null, error: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  return { userId, error: null };
}
