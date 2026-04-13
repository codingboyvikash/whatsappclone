import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  await connectDB();
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (token) {
      const decoded = verifyToken(token);
      await User.findByIdAndUpdate(decoded.userId, { online: false, lastSeen: new Date() });
    }
  } catch {}
  return Response.json({ message: 'Logged out' });
}
