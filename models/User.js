import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  about: { type: String, default: 'Hey there! I am using WhatsApp' },
  lastSeen: { type: Date, default: Date.now },
  online: { type: Boolean, default: false },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastSeenPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  profilePhotoPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  aboutPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
  readReceipts: { type: Boolean, default: true },
  theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.models.User || mongoose.model('User', userSchema);
