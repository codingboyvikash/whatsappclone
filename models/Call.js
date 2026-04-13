import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  callee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['voice', 'video'], required: true },
  status: { type: String, enum: ['ringing', 'answered', 'missed', 'rejected', 'ended'], default: 'ringing' },
  duration: { type: Number, default: 0 },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  startTime: { type: Date },
  endTime: { type: Date },
  isGroupCall: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  recordingUrl: { type: String, default: '' },
  videoQuality: { type: String, enum: ['SD', 'HD', 'FHD'], default: 'HD' },
  screenShared: { type: Boolean, default: false },
  networkQuality: { type: String, enum: ['poor', 'fair', 'good', 'excellent'], default: 'good' },
}, { timestamps: true });

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ callee: 1, createdAt: -1 });

export default mongoose.models.Call || mongoose.model('Call', callSchema);
