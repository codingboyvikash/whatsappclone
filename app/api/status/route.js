import { connectDB } from '@/lib/mongoose';
import Status from '@/models/Status';
import User from '@/models/User';
import { requireAuth } from '@/middleware/authMiddleware';

export async function GET(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const user = await User.findById(userId);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const contactIds = user.contacts || [];
    const statuses = await Status.find({
      user: { $in: [...contactIds, userId] },
      createdAt: { $gte: twentyFourHoursAgo },
      privacy: { $ne: 'nobody' },
    }).populate('user', 'name phone avatar').sort({ createdAt: -1 });

    const grouped = {};
    statuses.forEach((s) => {
      const uid = s.user._id.toString();
      if (!grouped[uid]) grouped[uid] = { user: s.user, statuses: [] };
      grouped[uid].statuses.push(s);
    });
    return Response.json(Object.values(grouped));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { type, text, media, bgColor, textColor, font, privacy } = await request.json();
    const status = new Status({
      user: userId, type: type || 'text', text: text || '',
      media: media || '', bgColor: bgColor || '#25D366',
      textColor: textColor || '#ffffff', font: font || 'default',
      privacy: privacy || 'everyone',
    });
    await status.save();
    return Response.json(status, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('id');
    if (!statusId) {
      return Response.json({ error: 'Status ID required' }, { status: 400 });
    }
    const status = await Status.findById(statusId);
    if (!status) {
      return Response.json({ error: 'Status not found' }, { status: 404 });
    }
    if (status.user.toString() !== userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await Status.findByIdAndDelete(statusId);
    return Response.json({ message: 'Status deleted' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  await connectDB();
  try {
    const { statusId } = await request.json();
    if (!statusId) {
      return Response.json({ error: 'Status ID required' }, { status: 400 });
    }
    const status = await Status.findById(statusId);
    if (!status) {
      return Response.json({ error: 'Status not found' }, { status: 404 });
    }
    if (!status.viewedBy.includes(userId)) {
      status.viewedBy.push(userId);
      await status.save();
    }
    return Response.json({ message: 'Status marked as viewed' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
