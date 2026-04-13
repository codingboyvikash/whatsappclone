import { connectDB } from '@/lib/mongoose';
import Chat from '@/models/Chat';
import Message from '@/models/Message';
import { requireAuth } from '@/middleware/authMiddleware';

export async function GET(request, { params }) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { chatId } = await params;
    const chat = await Chat.findById(chatId)
      .populate('participants', 'name phone avatar about online lastSeen')
      .populate('groupAdmins', 'name phone avatar');
    if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });
    if (!chat.participants.some((p) => p._id.toString() === userId))
      return Response.json({ error: 'Not a participant' }, { status: 403 });
    return Response.json(chat);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { chatId } = await params;
    await Message.updateMany({ chat: chatId }, { $addToSet: { deletedFor: userId } });
    return Response.json({ message: 'Chat deleted for you' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
