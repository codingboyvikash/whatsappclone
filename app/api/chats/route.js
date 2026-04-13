import { connectDB } from '@/lib/mongoose';
import Chat from '@/models/Chat';
import Message from '@/models/Message';
import { requireAuth } from '@/middleware/authMiddleware';

export async function GET(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name phone avatar about online lastSeen')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name' } })
      .populate('groupAdmins', 'name phone avatar')
      .sort({ updatedAt: -1 });

    const chatList = await Promise.all(chats.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        sender: { $ne: userId },
        readBy: { $ne: userId },
        deletedFor: { $ne: userId },
        deletedForEveryone: false,
      });
      return { ...chat.toObject(), unreadCount };
    }));

    return Response.json(chatList);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { userId: targetId } = await request.json();
    if (!targetId) return Response.json({ error: 'userId required' }, { status: 400 });

    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [userId, targetId], $size: 2 },
    }).populate('participants', 'name phone avatar about online lastSeen');

    if (!chat) {
      chat = new Chat({ participants: [userId, targetId] });
      await chat.save();
      chat = await chat.populate('participants', 'name phone avatar about online lastSeen');
    }
    return Response.json(chat);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
