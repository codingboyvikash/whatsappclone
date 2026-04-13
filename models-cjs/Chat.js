const mongoose = require('mongoose');

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

module.exports = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
