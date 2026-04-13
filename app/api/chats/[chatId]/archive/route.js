import { connectDB } from '@/lib/mongoose';
import Chat from '@/models/Chat';
import { requireAuth } from '@/middleware/authMiddleware';

export async function PUT(request, { params }) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { chatId } = await params;
    await Chat.findByIdAndUpdate(chatId, { $addToSet: { archivedBy: userId } });
    return Response.json({ message: 'Chat archived' });
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
    await Chat.findByIdAndUpdate(chatId, { $pull: { archivedBy: userId } });
    return Response.json({ message: 'Chat unarchived' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
