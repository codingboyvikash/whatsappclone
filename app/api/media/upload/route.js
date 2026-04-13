import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/middleware/authMiddleware';

export async function POST(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  try {
    const formData = await request.formData();
    const file = formData.get('file') || formData.get('avatar');
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), 'public', 'assets', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || '';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    await writeFile(path.join(uploadsDir, uniqueName), buffer);

    return Response.json({
      url: `/assets/uploads/${uniqueName}`,
      name: file.name,
      size: buffer.length,
      type: file.type,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
