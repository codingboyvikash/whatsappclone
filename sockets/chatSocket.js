const path = require('path');
const Message = require(path.join(__dirname, '..', 'models-cjs', 'Message'));
const Chat = require(path.join(__dirname, '..', 'models-cjs', 'Chat'));
const User = require(path.join(__dirname, '..', 'models-cjs', 'User'));
const Call = require(path.join(__dirname, '..', 'models-cjs', 'Call'));
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-clone-secret-key-2024';

module.exports = function (io) {
  const onlineUsers = new Map();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.userId = decoded.userId.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.userId})`);
    onlineUsers.set(socket.userId, socket.id);
    socket.join(socket.userId);

    User.findByIdAndUpdate(socket.userId, { online: true, lastSeen: new Date() }).exec();
    io.emit('user_online', { userId: socket.userId });
    io.emit('user_status', { userId: socket.userId, online: true, lastSeen: new Date() });

    socket.on('join_chat', (chatId) => socket.join(chatId));
    socket.on('leave_chat', (chatId) => socket.leave(chatId));

    socket.on('send_message', async (data) => {
      try {
        const { chatId, text, type, media, mediaName, mediaSize, replyTo, forwarded, contactName, contactPhone, locationLat, locationLng } = data;
        const chat = await Chat.findById(chatId).populate('participants');
        if (!chat) return socket.emit('error', { message: 'Chat not found' });
        if (!chat.participants.some((p) => p._id.toString() === socket.userId)) {
          return socket.emit('error', { message: 'Not a participant' });
        }
        const message = new Message({
          sender: socket.userId,
          chat: chatId,
          text: text || '',
          type: type || 'text',
          media: media || '',
          mediaName: mediaName || '',
          mediaSize: mediaSize || 0,
          replyTo: replyTo || null,
          forwarded: forwarded || false,
          contactName: contactName || '',
          contactPhone: contactPhone || '',
          locationLat: locationLat || 0,
          locationLng: locationLng || 0,
          deliveredTo: [socket.userId],
        });
        await message.save();
        await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: new Date() });
        const populatedMsg = await Message.findById(message._id)
          .populate('sender', 'name phone avatar')
          .populate('replyTo');
        io.to(chatId).emit('receive_message', populatedMsg);
        chat.participants.forEach((p) => {
          const pid = p._id.toString();
          if (pid !== socket.userId) {
            io.to(pid).emit('new_chat_notification', { chatId, message: populatedMsg });
          }
        });
        socket.emit('message_sent', { messageId: message._id, chatId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('typing', ({ chatId }) => socket.to(chatId).emit('typing', { userId: socket.userId, chatId }));
    socket.on('stop_typing', ({ chatId }) => socket.to(chatId).emit('stop_typing', { userId: socket.userId, chatId }));

    socket.on('read_messages', async ({ chatId }) => {
      try {
        await Message.updateMany(
          { chat: chatId, sender: { $ne: socket.userId }, readBy: { $ne: socket.userId } },
          { $addToSet: { readBy: socket.userId } }
        );
        io.to(chatId).emit('messages_read', { chatId, userId: socket.userId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('delete_message_for_me', async ({ messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: socket.userId } });
        socket.emit('message_deleted_for_me', { messageId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('delete_message_for_everyone', async ({ messageId, chatId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.sender.toString() !== socket.userId) return;
        msg.deletedForEveryone = true;
        msg.deletedAt = new Date();
        await msg.save();
        io.to(chatId).emit('message_deleted_for_everyone', { messageId, chatId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('star_message', async ({ messageId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        msg.starred = !msg.starred;
        await msg.save();
        socket.emit('message_starred', { messageId, starred: msg.starred });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // WebRTC Signaling with Call History
    socket.on('call_user', async ({ calleeId, callType, callId, offer, isGroupCall, participantIds }) => {
      try {
        const chat = isGroupCall
          ? await Chat.findById(calleeId)
          : await Chat.findOne({
              participants: { $all: [socket.userId, calleeId] },
              isGroup: false
            });

        const call = new Call({
          caller: socket.userId,
          callee: calleeId,
          type: callType,
          status: 'ringing',
          chat: chat?._id,
          startTime: new Date(),
          isGroupCall: isGroupCall || false,
          participants: participantIds || [calleeId],
        });
        await call.save();

        if (isGroupCall && participantIds) {
          // Group call - notify all participants
          participantIds.forEach(pid => {
            if (onlineUsers.has(pid) && pid !== socket.userId) {
              io.to(pid).emit('incoming_call', {
                callerId: socket.userId,
                callerName: socket.user.name,
                callerAvatar: socket.user.avatar,
                callType,
                callId,
                offer,
                dbCallId: call._id,
                isGroupCall: true,
                participantIds,
              });
            }
          });
        } else if (onlineUsers.has(calleeId)) {
          // Individual call
          io.to(calleeId).emit('incoming_call', {
            callerId: socket.userId,
            callerName: socket.user.name,
            callerAvatar: socket.user.avatar,
            callType,
            callId,
            offer,
            dbCallId: call._id,
          });
        } else {
          call.status = 'missed';
          call.endTime = new Date();
          await call.save();
          socket.emit('call_unavailable', { callId, calleeId, dbCallId: call._id });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('call_answer', async ({ callerId, callId, answer, dbCallId }) => {
      try {
        if (dbCallId) {
          await Call.findByIdAndUpdate(dbCallId, {
            status: 'answered',
            startTime: new Date(),
          });
        }
        io.to(callerId).emit('call_answered', { callId, answer, calleeId: socket.userId, dbCallId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('call_ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('call_ice_candidate', { candidate, from: socket.userId });
    });

    socket.on('call_reject', async ({ callerId, callId, dbCallId }) => {
      try {
        if (dbCallId) {
          await Call.findByIdAndUpdate(dbCallId, {
            status: 'rejected',
            endTime: new Date(),
          });
        }
        io.to(callerId).emit('call_rejected', { callId, dbCallId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('call_end', async ({ to, callId, dbCallId, duration }) => {
      try {
        if (dbCallId) {
          await Call.findByIdAndUpdate(dbCallId, {
            status: 'ended',
            endTime: new Date(),
            duration: duration || 0,
          });
        }
        io.to(to).emit('call_ended', { callId, dbCallId, duration });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name}`);
      onlineUsers.delete(socket.userId);
      await User.findByIdAndUpdate(socket.userId, { online: false, lastSeen: new Date() });
      io.emit('user_offline', { userId: socket.userId });
      io.emit('user_status', { userId: socket.userId, online: false, lastSeen: new Date() });
    });
  });

  return onlineUsers;
};
