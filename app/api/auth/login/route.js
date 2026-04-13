import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  await connectDB();
  try {
    const { phone, password } = await request.json();
    if (!phone || !password) return Response.json({ error: 'Phone and password required' }, { status: 400 });
    const user = await User.findOne({ phone });
    if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 400 });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return Response.json({ error: 'Invalid credentials' }, { status: 400 });
    user.online = true;
    user.lastSeen = new Date();
    await user.save();
    const token = generateToken(user._id);
    return Response.json({ user, token });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
