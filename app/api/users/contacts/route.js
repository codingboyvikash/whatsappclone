import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { requireAuth } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';

export async function GET(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const user = await User.findById(userId).populate('contacts', 'name phone avatar about online lastSeen');
    return Response.json(user.contacts || []);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
