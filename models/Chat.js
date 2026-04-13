import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groupName: { type: String, default: '' },
  groupDesc: { type: String, default: '' },
  groupAvatar: { type: String, default: '' },
  groupAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groupCreator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

chatSchema.index({ participants: 1, updatedAt: -1 });

export default mongoose.models.Chat || mongoose.model('Chat', chatSchema);
