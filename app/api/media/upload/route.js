import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/middleware/authMiddleware';

export async function POST(request) {
  const { userId, error } = requireAuth(request);
  if (error) return error;
  try {
    const formData = await request.formData();
    const file = formData.get('file') || formData.get('avatar');
    const isProfileAvatar = formData.get('isProfileAvatar') === 'true';
    
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), 'public', 'assets', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || '';
    let fileName;
    
    if (isProfileAvatar) {
      // Use consistent filename for profile avatars
      fileName = `profile-${userId}${ext}`;
      
      // Delete old profile avatar if it exists
      const fs = require('fs');
      const oldFiles = fs.readdirSync(uploadsDir).filter(f => f.startsWith(`profile-${userId}`) && f !== fileName);
      for (const oldFile of oldFiles) {
        try {
          await unlink(path.join(uploadsDir, oldFile));
        } catch (err) {
          console.log('Failed to delete old profile avatar:', err);
        }
      }
    } else {
      // Generate unique name for other files
      fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    }
    
    await writeFile(path.join(uploadsDir, fileName), buffer);

    return Response.json({
      url: `/assets/uploads/${fileName}`,
      name: file.name,
      size: buffer.length,
      type: file.type,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
