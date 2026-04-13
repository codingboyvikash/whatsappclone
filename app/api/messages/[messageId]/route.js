import { connectDB } from '@/lib/mongoose';
import Message from '@/models/Message';
import { requireAuth } from '@/middleware/authMiddleware';

export async function DELETE(request, { params }) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { messageId } = await params;
    await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });
    return Response.json({ message: 'Deleted for you' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { messageId } = await params;
    const body = await request.json();
    if (body.action === 'star') {
      const msg = await Message.findById(messageId);
      if (!msg) return Response.json({ error: 'Not found' }, { status: 404 });
      msg.starred = !msg.starred;
      await msg.save();
      return Response.json({ starred: msg.starred });
    }
    if (body.action === 'delete-everyone') {
      const msg = await Message.findById(messageId);
      if (!msg) return Response.json({ error: 'Not found' }, { status: 404 });
      if (msg.sender.toString() !== userId) return Response.json({ error: 'Not your message' }, { status: 403 });
      msg.deletedForEveryone = true;
      msg.deletedAt = new Date();
      await msg.save();
      return Response.json({ message: 'Deleted for everyone' });
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
