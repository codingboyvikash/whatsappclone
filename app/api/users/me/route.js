import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { requireAuth } from '@/middleware/authMiddleware';

export async function GET(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const user = await User.findById(userId);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
    return Response.json(user);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const body = await request.json();
    const updates = {};
    if (body.name) updates.name = body.name;
    if (body.about) updates.about = body.about;
    if (body.avatar) updates.avatar = body.avatar;
    if (body.theme) updates.theme = body.theme;
    if (body.lastSeenPrivacy) updates.lastSeenPrivacy = body.lastSeenPrivacy;
    if (body.profilePhotoPrivacy) updates.profilePhotoPrivacy = body.profilePhotoPrivacy;
    if (body.aboutPrivacy) updates.aboutPrivacy = body.aboutPrivacy;
    if (body.readReceipts !== undefined) updates.readReceipts = body.readReceipts;
    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    return Response.json(user);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
