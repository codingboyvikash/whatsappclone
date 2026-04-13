import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { requireAuth } from '@/middleware/authMiddleware';

export async function POST(request, { params }) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { userId: targetId } = await params;
    if (targetId === userId) return Response.json({ error: 'Cannot add yourself' }, { status: 400 });
    const targetUser = await User.findById(targetId);
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });
    await User.findByIdAndUpdate(userId, { $addToSet: { contacts: targetId } });
    return Response.json({ message: 'Contact added' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
