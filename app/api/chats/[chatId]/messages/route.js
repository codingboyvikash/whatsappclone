import { connectDB } from '@/lib/mongoose';
import Message from '@/models/Message';
import { requireAuth } from '@/middleware/authMiddleware';

export async function GET(request, { params }) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $ne: userId },
    })
      .populate('sender', 'name phone avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return Response.json(messages.reverse());
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
