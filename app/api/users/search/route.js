import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { requireAuth } from '@/middleware/authMiddleware';

export async function GET(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const query = { _id: { $ne: userId } };
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(query).select('name phone avatar about online lastSeen').limit(20);
    return Response.json(users);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
