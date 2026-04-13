import { connectDB } from '@/lib/mongoose';
import Call from '@/models/Call';
import { requireAuth } from '@/middleware/authMiddleware';

export async function GET(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const calls = await Call.find({ $or: [{ caller: userId }, { callee: userId }] })
      .populate('caller', 'name phone avatar')
      .populate('callee', 'name phone avatar')
      .sort({ createdAt: -1 }).limit(50);
    return Response.json(calls);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { callee, type, chat } = await request.json();
    const call = new Call({ caller: userId, callee, type, chat });
    await call.save();
    return Response.json(call, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
