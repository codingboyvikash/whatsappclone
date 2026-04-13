const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  text: { type: String, default: '' },
  type: { type: String, enum: ['text','image','video','audio','document','contact','location','voice'], default: 'text' },
  media: { type: String, default: '' },
  mediaName: { type: String, default: '' },
  mediaSize: { type: Number, default: 0 },
  contactName: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  locationLat: { type: Number, default: 0 },
  locationLng: { type: Number, default: 0 },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  forwarded: { type: Boolean, default: false },
  starred: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedForEveryone: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
