import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  text: { type: String, default: '' },
  media: { type: String, default: '' },
  bgColor: { type: String, default: '#25D366' },
  textColor: { type: String, default: '#ffffff' },
  font: { type: String, default: 'default' },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  privacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
}, { timestamps: true });

statusSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Status || mongoose.model('Status', statusSchema);
