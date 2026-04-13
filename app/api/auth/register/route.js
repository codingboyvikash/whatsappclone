import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  await connectDB();
  try {
    const { name, phone, password } = await request.json();
    if (!name || !phone || !password) return Response.json({ error: 'All fields required' }, { status: 400 });
    if (password.length < 6) return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    const existing = await User.findOne({ phone });
    if (existing) return Response.json({ error: 'Phone number already registered' }, { status: 400 });
    const user = new User({ name, phone, password });
    await user.save();
    const token = generateToken(user._id);
    return Response.json({ user, token }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
