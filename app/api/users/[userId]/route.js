import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { requireAuth } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  const { userId: authUserId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { userId } = await params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });
    const user = await User.findById(userId).select('name phone avatar about online lastSeen lastSeenPrivacy profilePhotoPrivacy aboutPrivacy');
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
    return Response.json(user);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
