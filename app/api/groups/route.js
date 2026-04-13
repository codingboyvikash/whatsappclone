import { connectDB } from '@/lib/mongoose';
import Chat from '@/models/Chat';
import { requireAuth } from '@/middleware/authMiddleware';

export async function POST(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { name, description, members } = await request.json();
    if (!name) return Response.json({ error: 'Group name required' }, { status: 400 });
    const allMembers = [userId, ...(members || [])];
    const group = new Chat({
      isGroup: true, groupName: name, groupDesc: description || '',
      participants: allMembers, groupAdmins: [userId], groupCreator: userId,
    });
    await group.save();
    const populated = await Chat.findById(group._id)
      .populate('participants', 'name phone avatar about online lastSeen')
      .populate('groupAdmins', 'name phone avatar');
    return Response.json(populated, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
