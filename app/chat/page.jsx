'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Utils } from '@/lib/utils';

// ─── Avatar Helper ───────────────────────────────────────────────────────────
function Avatar({ user, size = '', style = {} }) {
  
  const cls = `avatar${size ? ` avatar-${size}` : ''}`;
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `${Utils.getBaseUrl()}${avatar}`;
  };
  
  return (
    <div className={cls} style={style}>
      {user?.avatar ? (
        <img src={getAvatarUrl(user.avatar)} alt="" />
      ) : (
        <div className="avatar-default" style={{ display: 'flex' }}>
          {Utils.getInitials(user?.name || '?')}
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, currentUser, onContextMenu }) {
  const isSent = msg.sender?._id === currentUser?._id || msg.sender === currentUser?._id;
  let content = null;

  if (msg.deletedForEveryone) {
    content = <span className="message-deleted">🚫 This message was deleted</span>;
  } else {
    const inner = [];
    if (msg.forwarded) inner.push(<div key="fwd" className="message-forwarded">↩ Forwarded</div>);
    if (msg.replyTo) {
      const rn = msg.replyTo.sender?.name || 'Unknown';
      const rt = msg.replyTo.text || msg.replyTo.type;
      inner.push(
        <div key="reply" className="message-reply-preview">
          <div className="reply-name">{rn}</div>
          <div className="reply-text">{rt}</div>
        </div>
      );
    }
    if (msg.type === 'text') {
      inner.push(<span key="t" dangerouslySetInnerHTML={{ __html: Utils.linkify(msg.text) }} />);
    } else if (msg.type === 'image') {
      if (msg.media) {
        inner.push(
          <div key="img" className="message-media">
            <img src={msg.media} alt="Photo" onClick={() => window.open(msg.media)} />
          </div>
        );
      }
      if (msg.text) inner.push(<span key="cap" dangerouslySetInnerHTML={{ __html: Utils.linkify(msg.text) }} />);
    } else if (msg.type === 'video') {
      if (msg.media) {
        inner.push(<div key="vid" className="message-media"><video src={msg.media} controls /></div>);
      }
    } else if (msg.type === 'voice' || msg.type === 'audio') {
      if (msg.media) {
        inner.push(
          <div key="voice" className="message-voice" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="voice-play-btn">▶</button>
            <audio src={msg.media} controls style={{ flex: 1, height: 32 }} />
          </div>
        );
      }
    } else if (msg.type === 'document') {
      inner.push(
        <div key="doc" className="message-document" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="doc-icon">📄</div>
          <div>
            <div className="doc-name">{Utils.escapeHtml(msg.mediaName || 'Document')}</div>
            <div className="doc-size" style={{ fontSize: 12, opacity: 0.7 }}>{Utils.formatFileSize(msg.mediaSize)}</div>
          </div>
        </div>
      );
    } else if (msg.type === 'contact') {
      inner.push(
        <div key="con" style={{ display: 'flex', gap: 10 }}>
          <div>👤</div>
          <div>
            <div>{msg.contactName}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{msg.contactPhone}</div>
          </div>
        </div>
      );
    } else if (msg.type === 'location') {
      inner.push(
        <div key="loc" style={{ display: 'flex', gap: 10 }}>
          <div>📍</div>
          <div>
            <div>Location</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{msg.locationLat}, {msg.locationLng}</div>
          </div>
        </div>
      );
    }
    content = inner;
  }

  const readIcon = isSent
    ? (msg.readBy?.length > 1 ? <span className="read-receipt">✓✓</span> : msg.deliveredTo?.length > 1 ? '✓✓' : '✓')
    : null;

  return (
    <div className={`message ${isSent ? 'sent' : 'received'}`} data-message-id={msg._id}>
      <div className="message-bubble" onContextMenu={(e) => onContextMenu(e, msg, isSent)}>
        {content}
        <span className="message-time">{Utils.formatTime(msg.createdAt)} {readIcon}</span>
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [replyTo, setReplyTo] = useState(null);

  // Modals
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [callHistory, setCallHistory] = useState([]);

  // New group
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [newChatSearch, setNewChatSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMsg, setContextMsg] = useState(null);

  // Settings
  const [settingsName, setSettingsName] = useState('');
  const [settingsAbout, setSettingsAbout] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditAbout, setProfileEditAbout] = useState('');
  const [profileEditAvatar, setProfileEditAvatar] = useState('');
  const [showProfileImageViewer, setShowProfileImageViewer] = useState(false);
  const profileFileInputRef = useRef(null);

  // Status
  const [statuses, setStatuses] = useState([]);
  const [statusText, setStatusText] = useState('');
  const [statusType, setStatusType] = useState('text');
  const [statusMediaFile, setStatusMediaFile] = useState(null);
  const [statusMediaPreview, setStatusMediaPreview] = useState('');
  const [showStatusCreate, setShowStatusCreate] = useState(false);
  const [selectedStatusColor, setSelectedStatusColor] = useState(Utils.STATUS_COLORS[0]);
  const [statusPrivacy, setStatusPrivacy] = useState('everyone');
  const [statusViewer, setStatusViewer] = useState(null);

  // Call
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState('voice');
  const [callName, setCallName] = useState('');
  const [callStatus, setCallStatus] = useState('Calling...');
  const [callId, setCallId] = useState(null);
  const [callPeerId, setCallPeerId] = useState(null);
  const [callMuted, setCallMuted] = useState(false);
  const [callSpeakerOn, setCallSpeakerOn] = useState(false);
  const [callCameraOn, setCallCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callDbId, setCallDbId] = useState(null);
  const [callVideoQuality, setCallVideoQuality] = useState('HD');
  const [callNetworkQuality, setCallNetworkQuality] = useState('good');
  const [incomingCall, setIncomingCall] = useState(null);
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [screenSharing, setScreenSharing] = useState(false);
  const [callRecording, setCallRecording] = useState(false);
  const [videoFilter, setVideoFilter] = useState('none');
  const [closedCaptions, setClosedCaptions] = useState(false);
  const [captionsText, setCaptionsText] = useState('');
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const remoteAudioSourceRef = useRef(null);
  const ringtoneContextRef = useRef(null);
  const ringtoneTimersRef = useRef([]);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callDurationRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const bufferedIceCandidatesRef = useRef([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const statusFileInputRef = useRef(null);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const statusViewerRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const statusTimerRef = useRef(null);
  const statusPausedRef = useRef(false);

  const { socket } = useSocket(token);

  const playMediaElement = useCallback((element) => {
    if (!element) return;
    const playPromise = element.play?.();
    if (playPromise?.catch) {
      playPromise.catch((err) => {
        console.warn('Media autoplay was blocked or interrupted:', err);
      });
    }
  }, []);

  const unlockCallAudio = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        console.warn('Could not unlock call audio:', err);
      }
    }
  }, []);

  const stopIncomingRingtone = useCallback(() => {
    ringtoneTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    ringtoneTimersRef.current = [];

    if (ringtoneContextRef.current) {
      ringtoneContextRef.current.close().catch(() => {});
      ringtoneContextRef.current = null;
    }

    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  const startIncomingRingtone = useCallback(async () => {
    if (typeof window === 'undefined') return;

    stopIncomingRingtone();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      const ctx = new AudioContext();
      ringtoneContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const playTone = (frequency, startTime, duration = 0.18) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.02);
      };

      const playPattern = () => {
        if (!ringtoneContextRef.current) return;
        const now = ctx.currentTime + 0.02;
        const notes = [880, 1174.66, 1046.5, 1318.51, 1174.66, 880];
        notes.forEach((note, index) => playTone(note, now + index * 0.16, 0.12));

        if (navigator.vibrate) {
          navigator.vibrate([220, 120, 220]);
        }

        const timerId = setTimeout(playPattern, 1350);
        ringtoneTimersRef.current.push(timerId);
      };

      playPattern();
    } catch (err) {
      console.warn('Incoming ringtone could not start:', err);
    }
  }, [stopIncomingRingtone]);

  const connectRemoteAudioOutput = useCallback((remoteStream) => {
    if (!remoteStream?.getAudioTracks().length || !audioContextRef.current) return;

    try {
      remoteAudioSourceRef.current?.disconnect();
      remoteAudioSourceRef.current = audioContextRef.current.createMediaStreamSource(remoteStream);
      remoteAudioSourceRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.warn('Could not connect remote audio output:', err);
    }
  }, []);

  const getIceServers = useCallback(() => {
    const stunUrls = (process.env.NEXT_PUBLIC_STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
    const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const iceServers = [];
    if (stunUrls.length) iceServers.push({ urls: stunUrls });
    if (turnUrls.length) {
      iceServers.push({
        urls: turnUrls,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
      });
    }

    return iceServers;
  }, []);

  const createCallPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceCandidatePoolSize: 10,
    });

    pc.onconnectionstatechange = () => {
      console.log('Call connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('Connected');
      } else if (pc.connectionState === 'failed') {
        setCallStatus('Connection failed. TURN server required.');
      } else if (pc.connectionState === 'disconnected') {
        setCallStatus('Connection interrupted...');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('Call ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallStatus('Connected');
      } else if (pc.iceConnectionState === 'failed') {
        setCallStatus('Media connection failed. Add TURN server.');
      }
    };

    return pc;
  }, [getIceServers]);

  const startRemoteAudio = useCallback(async (remoteStream) => {
    if (!remoteStream?.getAudioTracks().length) {
      console.warn('No remote audio track available to play');
      return;
    }

    await unlockCallAudio();

    const remoteAudio = remoteAudioRef.current;
    if (remoteAudio) {
      try {
        remoteAudio.autoplay = true;
        remoteAudio.muted = false;
        remoteAudio.volume = 1;
        remoteAudio.srcObject = remoteStream;

        if (typeof remoteAudio.setSinkId === 'function') {
          await remoteAudio.setSinkId('default');
        }

        await remoteAudio.play();
        console.log('Remote audio playback started:', remoteStream.getAudioTracks().map((track) => ({
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        })));
      } catch (err) {
        console.warn('Remote audio element playback failed:', err);
      }
    }

    connectRemoteAudioOutput(remoteStream);
  }, [connectRemoteAudioOutput, unlockCallAudio]);

  const attachCallStreams = useCallback(() => {
    const localStream = localStreamRef.current;
    const remoteStream = remoteStreamRef.current;

    if (localStream) {
      setLocalVideoReady(localStream.getVideoTracks().some((track) => track.readyState === 'live'));
      if (callType === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        playMediaElement(localVideoRef.current);
      }
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
        playMediaElement(localAudioRef.current);
      }
    }

    if (remoteStream) {
      setRemoteVideoReady(remoteStream.getVideoTracks().some((track) => track.readyState === 'live'));
      if (remoteVideoRef.current && remoteStream.getVideoTracks().length > 0) {
        remoteVideoRef.current.srcObject = remoteStream;
        playMediaElement(remoteVideoRef.current);
      }
      if (remoteAudioRef.current && remoteStream.getAudioTracks().length > 0) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1;
        remoteAudioRef.current.srcObject = remoteStream;
        playMediaElement(remoteAudioRef.current);
        startRemoteAudio(remoteStream);
      }
    }
  }, [callType, playMediaElement, startRemoteAudio]);

  const handleRemoteTrack = useCallback((event, label) => {
    const remoteStream = event.streams?.[0] || remoteStreamRef.current || new MediaStream();
    if (event.track && !remoteStream.getTracks().some((track) => track.id === event.track.id)) {
      remoteStream.addTrack(event.track);
    }

    event.track.onunmute = () => {
      console.log(`${label} remote track unmuted:`, event.track.kind);
      attachCallStreams();
    };

    console.log(`${label} remote audio tracks:`, remoteStream.getAudioTracks().map((track) => ({
      id: track.id,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    })));
    console.log(`${label} remote video tracks:`, remoteStream.getVideoTracks().map((track) => ({
      id: track.id,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    })));

    remoteStreamRef.current = remoteStream;
    attachCallStreams();
  }, [attachCallStreams]);

  useEffect(() => {
    if (!callActive) return;
    attachCallStreams();
  }, [callActive, callType, attachCallStreams]);

  useEffect(() => {
    return () => {
      if (statusMediaPreview && statusMediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(statusMediaPreview);
      }
    };
  }, [statusMediaPreview]);

  // Keyboard navigation for status viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!statusViewer) return;
      if (e.key === 'ArrowLeft') showPrevStatus();
      if (e.key === 'ArrowRight') showNextStatus();
      if (e.key === 'Escape') closeStatusViewer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [statusViewer]);

  // Auto-advance timer for status viewer (WhatsApp style - 5 seconds per status)
  useEffect(() => {
    if (!statusViewer || statusPausedRef.current) {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
      return;
    }

    statusTimerRef.current = setInterval(() => {
      if (!statusPausedRef.current) {
        const nextIndex = statusViewer.index + 1;
        if (nextIndex < statusViewer.group.statuses.length) {
          setStatusViewer({ ...statusViewer, index: nextIndex });
        } else {
          closeStatusViewer();
        }
      }
    }, 5000);

    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, [statusViewer]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.replace('/'); return; }
    setToken(t);
    fetchMe(t);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const pushSameRoute = () => {
      window.history.pushState(null, '', window.location.href);
    };

    pushSameRoute();
    const handlePopState = () => {
      pushSameRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  async function fetchMe(t) {
    try {
      console.log('Fetching user data with token:', t?.substring(0, 20) + '...');
      const user = await apiFetch('/api/users/me', {}, t);
      console.log('User data received:', user);
      setCurrentUser(user);
      setSettingsName(user.name || '');
      setSettingsAbout(user.about || '');
      localStorage.setItem('user', JSON.stringify(user));
      loadChats(t);
      loadContacts(t);
    } catch (error) {
      console.error('fetchMe failed:', error);
      localStorage.removeItem('token');
      router.replace('/');
    }
  }

  function apiFetch(url, opts = {}, t) {
    const tk = t || token;
    const isFormData = opts.body instanceof FormData;
    const headers = { ...opts.headers };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (tk) headers.Authorization = `Bearer ${tk}`;
    const fetchOpts = { ...opts, headers };
    if (!isFormData && opts.body && typeof opts.body === 'object') {
      fetchOpts.body = JSON.stringify(opts.body);
    }
    return fetch(url, fetchOpts).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
  }

  async function loadChats(t) {
    try { setChats(await apiFetch('/api/chats', {}, t)); } catch {}
  }

  async function loadContacts(t) {
    try { setContacts(await apiFetch('/api/users/contacts', {}, t)); } catch {}
  }

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.on('receive_message', (msg) => {
      if (msg.chat === currentChatId || msg.chat?._id === currentChatId) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('read_messages', { chatId: currentChatId });
      }
      setChats((prev) => {
        const chat = prev.find((c) => c._id === (msg.chat?._id || msg.chat));
        if (chat) {
          const updated = { ...chat, lastMessage: msg, updatedAt: msg.createdAt };
          return [updated, ...prev.filter((c) => c._id !== updated._id)];
        }
        loadChats();
        return prev;
      });
    });

    socket.on('typing', ({ chatId, userId }) => {
      if (userId !== currentUser._id) {
        setTypingUsers((prev) => ({ ...prev, [chatId]: true }));
      }
    });

    socket.on('stop_typing', ({ chatId }) => {
      setTypingUsers((prev) => { const n = { ...prev }; delete n[chatId]; return n; });
    });

    socket.on('messages_read', ({ chatId, userId }) => {
      if (chatId === currentChatId) {
        setMessages((prev) => prev.map((m) =>
          m.sender?._id === currentUser._id && !m.readBy?.includes(userId)
            ? { ...m, readBy: [...(m.readBy || []), userId] } : m
        ));
      }
    });

    socket.on('message_deleted_for_everyone', ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m._id === messageId ? { ...m, deletedForEveryone: true } : m
      ));
    });

    socket.on('user_status', ({ userId, online, lastSeen }) => {
      setChats((prev) => prev.map((c) => ({
        ...c,
        participants: c.participants?.map((p) =>
          p._id === userId ? { ...p, online, lastSeen } : p
        ),
      })));
    });

    socket.on('incoming_call', ({ callerId, callerName, callerAvatar, callType, callId: cid, offer, dbCallId }) => {
      setIncomingCall({ callerId, callerName, callerAvatar, callType, callId: cid, offer, dbCallId });
      startIncomingRingtone();
    });

    socket.on('call_answered', async ({ callId, answer, calleeId, dbCallId }) => {
      try {
        if (peerConnectionRef.current && answer) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          // Process any buffered ICE candidates
          if (bufferedIceCandidatesRef.current.length > 0) {
            console.log('Processing buffered ICE candidates (caller):', bufferedIceCandidatesRef.current.length);
            for (const candidate of bufferedIceCandidatesRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error('Error adding buffered ICE candidate:', err);
              }
            }
            bufferedIceCandidatesRef.current = [];
          }
        }
        setCallStatus('Connected');
        setCallDbId(dbCallId);
      } catch (err) {
        console.error('Error handling call answered:', err);
      }
    });

    socket.on('call_ice_candidate', async ({ candidate, from }) => {
      try {
        if (peerConnectionRef.current && candidate) {
          // Check if remote description is set before adding ICE candidate
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            console.log('Remote description not set yet, buffering ICE candidate');
            // Buffer the candidate until remote description is set
            bufferedIceCandidatesRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    socket.on('call_rejected', () => {
      stopIncomingRingtone();
      endCall({ notifyPeer: false });
      alert('Call rejected');
    });

    socket.on('call_ended', () => {
      stopIncomingRingtone();
      endCall({ notifyPeer: false });
    });

    socket.on('call_unavailable', () => {
      stopIncomingRingtone();
      endCall({ notifyPeer: false });
      alert('User unavailable');
    });

    return () => {
      stopIncomingRingtone();
      socket.off('receive_message');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('messages_read');
      socket.off('message_deleted_for_everyone');
      socket.off('user_status');
      socket.off('incoming_call');
      socket.off('call_answered');
      socket.off('call_ice_candidate');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('call_unavailable');
    };
  }, [socket, currentUser, currentChatId, startIncomingRingtone, stopIncomingRingtone]);

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Open chat ──────────────────────────────────────────────────────────────
  async function openChat(chatId) {
    setCurrentChatId(chatId);
    socket?.emit('join_chat', chatId);
    socket?.emit('read_messages', { chatId });
    try {
      const msgs = await apiFetch(`/api/chats/${chatId}/messages`);
      setMessages(msgs);
    } catch {}
  }

  // ── Send message ───────────────────────────────────────────────────────────
  function sendMessage() {
    const text = inputText.trim();
    if (!text || !currentChatId || !socket) return;
    const msgData = { chatId: currentChatId, text, type: 'text' };
    if (replyTo) { msgData.replyTo = replyTo._id; setReplyTo(null); }
    socket.emit('send_message', msgData);
    setInputText('');
    socket.emit('stop_typing', { chatId: currentChatId });
  }

  function handleInputKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); return; }
    if (!currentChatId || !socket) return;
    socket.emit('typing', { chatId: currentChatId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket?.emit('stop_typing', { chatId: currentChatId }), 2000);
  }

  // ── New chat / group ───────────────────────────────────────────────────────
  async function searchUsers(q) {
    if (!token) return;
    try { setSearchedUsers(await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`, {}, token)); } catch {}
  }

  useEffect(() => { searchUsers(newChatSearch); }, [newChatSearch, token]);
  useEffect(() => { if (showNewGroup) searchUsers(groupSearch); }, [groupSearch, showNewGroup, token]);

  async function startNewChat(userId) {
    try {
      const chat = await apiFetch('/api/chats', { method: 'POST', body: { userId } });
      await apiFetch(`/api/users/contacts/${userId}`, { method: 'POST' });
      setChats((prev) => {
        const exists = prev.find((c) => c._id === chat._id);
        if (exists) return prev;
        return [chat, ...prev];
      });
      setShowNewChat(false);
      openChat(chat._id);
    } catch (err) { console.error(err); }
  }

  async function createGroup() {
    if (!groupName) return alert('Group name required');
    if (!selectedGroupMembers.length) return alert('Add at least one member');
    try {
      const group = await apiFetch('/api/groups', { method: 'POST', body: { name: groupName, members: selectedGroupMembers } });
      setChats((prev) => [group, ...prev]);
      setShowNewGroup(false);
      setGroupName('');
      setSelectedGroupMembers([]);
      openChat(group._id);
    } catch (err) { alert(err.message); }
  }

  // ── File upload ────────────────────────────────────────────────────────────
  async function handleFileUpload(file, accept) {
    if (!file || !currentChatId) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await apiFetch('/api/media/upload', { method: 'POST', body: formData });
      let msgType = 'document';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';
      else if (file.type.startsWith('audio/')) msgType = 'audio';
      socket?.emit('send_message', {
        chatId: currentChatId, type: msgType,
        media: result.url, mediaName: result.name, mediaSize: result.size, text: '',
      });
    } catch (err) { alert(err.message); }
  }

  function handleLocationShare() {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition((pos) => {
      socket?.emit('send_message', {
        chatId: currentChatId, type: 'location',
        locationLat: pos.coords.latitude, locationLng: pos.coords.longitude, text: '',
      });
    });
  }

  // ── Calls ──────────────────────────────────────────────────────────────────
  // Test microphone access
  async function testMicrophone() {
    console.log('=== MICROPHONE TEST ===');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      console.log('Stream:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Test playing audio
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        console.log('Audio stream set to localAudioRef');
      } else {
        console.log('localAudioRef.current is null');
      }
      
      // Stop test after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        console.log('Test stream stopped');
      }, 3000);
      
      return true;
    } catch (err) {
      console.error('Microphone test failed:', err);
      return false;
    }
  }

  async function initiateCall(type) {
    console.log('=== CALL DEBUG: initiateCall started ===');
    console.log('Call type:', type);
    console.log('Current chat ID:', currentChatId);
    console.log('Socket available:', !!socket);
    
    if (!currentChatId || !socket) return;
    const chat = chats.find((c) => c._id === currentChatId);
    if (!chat || chat.isGroup) return;
    const other = chat.participants.find((p) => p._id?.toString() !== currentUser._id?.toString());
    if (!other) return;

    console.log('Other user:', other);

    try {
      await unlockCallAudio();

      // Get local media stream
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false
      };

      console.log('Media constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Local stream obtained:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      console.log('Video tracks:', stream.getVideoTracks());
      
      localStreamRef.current = stream;
      setLocalVideoReady(stream.getVideoTracks().some((track) => track.readyState === 'live'));

      // Set local media streams immediately
      if (type === 'video') {
        console.log('Video call - checking localVideoRef:', localVideoRef.current);
        if (localVideoRef.current) {
          console.log('Setting video stream to localVideoRef');
          localVideoRef.current.srcObject = stream;
        } else {
          console.log('ERROR: localVideoRef.current is null for video call');
        }
      } else if (type === 'voice' && localAudioRef.current) {
        console.log('Setting audio stream to localAudioRef');
        console.log('localAudioRef.current:', localAudioRef.current);
        localAudioRef.current.srcObject = stream;
        console.log('Audio stream set to localAudioRef');
      } else {
        console.log('ERROR: Could not find audio element for', type, 'call');
        console.log('localAudioRef.current:', localAudioRef.current);
      }

      // Create peer connection
      const pc = createCallPeerConnection();

      peerConnectionRef.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('=== VOICE CALL DEBUG: ontrack event ===');
        console.log('Event:', event);
        console.log('Event streams:', event.streams);
        handleRemoteTrack(event, 'Caller');
      };

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call_ice_candidate', {
            to: other._id,
            candidate: event.candidate
          });
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const cid = Date.now().toString();
      setCallActive(true);
      setCallType(type);
      setCallName(other.name);
      setCallStatus('Calling...');
      setCallId(cid);
      setCallPeerId(other._id);
      setCallDuration(0);

      // Start duration timer
      startCallDurationTimer();

      socket.emit('call_user', {
        calleeId: other._id,
        callType: type,
        callId: cid,
        offer: pc.localDescription
      });

    } catch (err) {
      console.error('Error initiating call:', err);
      alert('Could not start call. Please check camera/microphone permissions.');
    }
  }

  async function answerCall(callerId, callerName, callType, callId, offer, dbCallId) {
    console.log('=== VOICE CALL DEBUG: answerCall started ===');
    console.log('Caller ID:', callerId);
    console.log('Caller Name:', callerName);
    console.log('Call Type:', callType);
    console.log('Call ID:', callId);
    
    try {
      stopIncomingRingtone();
      await unlockCallAudio();

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false
      };

      console.log('Answer call constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Answer call stream obtained:', stream);
      console.log('Answer call audio tracks:', stream.getAudioTracks());
      
      localStreamRef.current = stream;
      setLocalVideoReady(stream.getVideoTracks().some((track) => track.readyState === 'live'));

      // Set local media streams immediately
      if (callType === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      } else if (callType === 'voice' && localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      const pc = createCallPeerConnection();

      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log('=== VOICE CALL DEBUG: answer ontrack event ===');
        handleRemoteTrack(event, 'Receiver');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call_ice_candidate', {
            to: callerId,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any buffered ICE candidates
      if (bufferedIceCandidatesRef.current.length > 0) {
        console.log('Processing buffered ICE candidates:', bufferedIceCandidatesRef.current.length);
        for (const candidate of bufferedIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding buffered ICE candidate:', err);
          }
        }
        bufferedIceCandidatesRef.current = [];
      }
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setCallActive(true);
      setCallType(callType);
      setCallName(callerName);
      setCallStatus('Connected');
      setCallId(callId);
      setCallPeerId(callerId);
      setCallDbId(dbCallId);
      setCallDuration(0);
      setIncomingCall(null);

      startCallDurationTimer();

      socket.emit('call_answer', {
        callerId,
        callId,
        answer: pc.localDescription,
        dbCallId
      });

    } catch (err) {
      console.error('Error answering call:', err);
      alert('Could not answer call. Please check camera/microphone permissions.');
    }
  }

  function endCall({ notifyPeer = true } = {}) {
    stopIncomingRingtone();

    if (callDurationRef.current) {
      clearInterval(callDurationRef.current);
      callDurationRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioSourceRef.current) {
      remoteAudioSourceRef.current.disconnect();
      remoteAudioSourceRef.current = null;
    }

    // Clear buffered ICE candidates
    bufferedIceCandidatesRef.current = [];

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (notifyPeer && callPeerId) {
      socket?.emit('call_end', {
        to: callPeerId,
        callId,
        dbCallId: callDbId,
        duration: callDuration
      });
    }

    setCallActive(false);
    setCallStatus('Calling...');
    setCallDuration(0);
    setCallDbId(null);
    setCallMuted(false);
    setCallCameraOn(true);
    setCallSpeakerOn(false);
    setLocalVideoReady(false);
    setRemoteVideoReady(false);
    setScreenSharing(false);
    setCallRecording(false);
    setClosedCaptions(false);
    setCaptionsText('');
    setVideoFilter('none');
  }

  function startCallDurationTimer() {
    if (callDurationRef.current) {
      clearInterval(callDurationRef.current);
    }
    callDurationRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallMuted(!audioTrack.enabled);
      }
    }
  }

  function toggleCamera() {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallCameraOn(videoTrack.enabled);
      }
    }
  }

  async function switchCamera() {
    if (!localStreamRef.current) return;

    try {
      const oldStream = localStreamRef.current;
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      const getVideoStream = async (exactMode) => {
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: { exact: exactMode },
            },
          });
        } catch (err) {
          console.warn(`Exact ${exactMode} camera unavailable, trying ideal mode`, err);
          return navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: { ideal: exactMode },
            },
          });
        }
      };

      const videoOnlyStream = await getVideoStream(newFacingMode);
      const newVideoTrack = videoOnlyStream.getVideoTracks()[0];
      if (!newVideoTrack) throw new Error('No camera track found');

      const audioTracks = oldStream.getAudioTracks();
      const newStream = new MediaStream([...audioTracks, newVideoTrack]);

      // Replace video track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Stop only the old camera track. Keep microphone alive.
      oldStream.getVideoTracks().forEach(track => track.stop());

      // Update local video
      localStreamRef.current = newStream;
      setFacingMode(newFacingMode);
      setCallCameraOn(true);
      setLocalVideoReady(newStream.getVideoTracks().some((track) => track.readyState === 'live'));
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
        localVideoRef.current.play?.().catch((err) => console.warn('Local camera preview play failed:', err));
      }

    } catch (err) {
      console.error('Error switching camera:', err);
      alert('Could not switch camera');
    }
  }

  async function toggleSpeaker() {
    await unlockCallAudio();
    attachCallStreams();

    if (remoteStreamRef.current?.getAudioTracks().length) {
      await startRemoteAudio(remoteStreamRef.current);
      setCallSpeakerOn(true);
      return;
    }

    console.warn('Speaker requested, but no remote audio stream is available yet');
    setCallSpeakerOn((prev) => !prev);
  }

  async function toggleScreenShare() {
    if (!peerConnectionRef.current || !callActive) return;

    try {
      if (screenSharing) {
        // Stop screen sharing
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        setScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          setScreenSharing(false);
        };

        setScreenSharing(true);
      }
    } catch (err) {
      console.error('Error toggling screen share:', err);
      alert('Could not toggle screen sharing');
    }
  }

  function toggleCallRecording() {
    if (!remoteStreamRef.current) return;

    if (callRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setCallRecording(false);
    } else {
      // Start recording
      try {
        recordedChunksRef.current = [];
        const stream = new MediaStream([
          ...localStreamRef.current.getAudioTracks(),
          ...localStreamRef.current.getVideoTracks(),
          ...remoteStreamRef.current.getTracks()
        ]);

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `call-recording-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        recorder.start(1000);
        setCallRecording(true);
      } catch (err) {
        console.error('Error starting recording:', err);
        alert('Could not start recording');
      }
    }
  }

  function toggleClosedCaptions() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (closedCaptions) {
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setClosedCaptions(false);
      setCaptionsText('');
    } else {
      // Start speech recognition
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          setCaptionsText(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setClosedCaptions(false);
        };

        recognition.onend = () => {
          if (closedCaptions) {
            recognition.start();
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setClosedCaptions(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        alert('Could not start captions');
      }
    }
  }

  function formatCallDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Network quality monitoring
  useEffect(() => {
    if (!peerConnectionRef.current || !callActive) return;

    const monitorNetworkQuality = setInterval(async () => {
      try {
        if (!peerConnectionRef.current) {
          console.log('Peer connection is null, skipping network quality check');
          return;
        }
        const stats = await peerConnectionRef.current.getStats();
        let totalBitrate = 0;
        let totalPacketLoss = 0;
        let statsCount = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.bitrate) totalBitrate += report.bitrate;
            if (report.packetsLost !== undefined && report.packetsReceived) {
              totalPacketLoss += (report.packetsLost / report.packetsReceived) * 100;
            }
            statsCount++;
          }
        });

        if (statsCount > 0) {
          const avgPacketLoss = totalPacketLoss / statsCount;
          if (avgPacketLoss < 1 && totalBitrate > 1000000) {
            setCallNetworkQuality('excellent');
          } else if (avgPacketLoss < 3 && totalBitrate > 500000) {
            setCallNetworkQuality('good');
          } else if (avgPacketLoss < 5) {
            setCallNetworkQuality('fair');
          } else {
            setCallNetworkQuality('poor');
          }
        }
      } catch (err) {
        console.error('Error monitoring network quality:', err);
      }
    }, 2000);

    return () => clearInterval(monitorNetworkQuality);
  }, [callActive]);

  // ── Context menu ───────────────────────────────────────────────────────────
  function showCtxMenu(e, msg, isSent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, isSent });
    setContextMsg(msg);
  }

  function handleContextAction(action) {
    if (!contextMsg) return;
    if (action === 'reply') { setReplyTo(contextMsg); }
    else if (action === 'copy') { navigator.clipboard.writeText(contextMsg.text || ''); }
    else if (action === 'delete-me') { socket?.emit('delete_message_for_me', { messageId: contextMsg._id }); setMessages((p) => p.filter((m) => m._id !== contextMsg._id)); }
    else if (action === 'delete-everyone') { socket?.emit('delete_message_for_everyone', { messageId: contextMsg._id, chatId: currentChatId }); }
    else if (action === 'star') { socket?.emit('star_message', { messageId: contextMsg._id }); }
    setContextMenu(null); setContextMsg(null);
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  async function saveSettings() {
    try {
      const user = await apiFetch('/api/users/me', { method: 'PUT', body: { name: settingsName, about: settingsAbout } });
      setCurrentUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      setShowSettings(false);
    } catch (err) { alert(err.message); }
  }

  async function logout() {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/');
  }

  async function loadUserProfile(userId) {
    try {
      return await apiFetch(`/api/users/${userId}`);
    } catch (err) {
      console.error('Profile load failed', err);
      return null;
    }
  }

  async function openProfile(user) {
    if (!user) return;
    setShowSettings(false);
    setShowProfile(true);
    setProfileEditMode(false);
    setProfileEditName(user.name || '');
    setProfileEditAbout(user.about || '');
    setProfileEditAvatar(user.avatar || '');

    let profile = user;
    if (user._id?.toString() !== currentUser?._id?.toString() || !user.avatar || !user.about) {
      const fullProfile = await loadUserProfile(user._id?.toString());
      if (fullProfile) {
        profile = fullProfile;
        setProfileEditName(fullProfile.name || '');
        setProfileEditAbout(fullProfile.about || '');
        setProfileEditAvatar(fullProfile.avatar || '');
      }
    }

    setProfileUser(profile);
  }

  function closeProfile() {
    setShowProfile(false);
    setProfileUser(null);
    setProfileEditMode(false);
    setProfileEditAvatar('');
    setShowProfileImageViewer(false);
  }

  async function loadCallHistory() {
    try {
      const history = await apiFetch('/api/calls');
      setCallHistory(history);
    } catch (err) {
      console.error('Failed to load call history:', err);
    }
  }

  async function uploadProfileAvatar(file) {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isProfileAvatar', 'true');
      const result = await apiFetch('/api/media/upload', { method: 'POST', body: formData });
      setProfileEditAvatar(result.url);
    } catch (err) {
      alert(err.message);
    }
  }

  function openMyProfile() {
    openProfile(currentUser);
  }

  async function saveProfileChanges() {
    if (!profileEditName.trim()) return alert('Name is required');
    try {
      const updateBody = {
        name: profileEditName.trim(),
        about: profileEditAbout.trim(),
      };
      if (profileEditAvatar) updateBody.avatar = profileEditAvatar;
      const user = await apiFetch('/api/users/me', {
        method: 'PUT',
        body: updateBody,
      });
      setCurrentUser(user);
      setProfileUser(user);
      setSettingsName(user.name || '');
      setSettingsAbout(user.about || '');
      setProfileEditAvatar(user.avatar || '');
      setProfileEditMode(false);
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Status ─────────────────────────────────────────────────────────────────
  async function loadStatuses() {
    try { setStatuses(await apiFetch('/api/status')); } catch {}
  }

  function handleStatusFileChange(file) {
    if (!file) return;
    setStatusMediaFile(file);
    setStatusMediaPreview(URL.createObjectURL(file));
    if (file.type.startsWith('video/')) setStatusType('video');
    else if (file.type.startsWith('image/')) setStatusType('image');
  }

  function clearStatusDraft() {
    setStatusText('');
    setStatusType('text');
    setStatusMediaFile(null);
    setStatusMediaPreview('');
    setSelectedStatusColor(Utils.STATUS_COLORS[0]);
  }

  function openStatusViewer(group, index = 0) {
    setStatusViewer({ group, index });
    markStatusAsViewed(group.statuses[index]);
  }

  async function markStatusAsViewed(status) {
    if (!status || status.user._id?.toString() === currentUser?._id?.toString()) return;
    if (status.viewedBy?.includes(currentUser._id)) return;
    try {
      await apiFetch('/api/status', {
        method: 'PUT',
        body: { statusId: status._id },
      });
      loadStatuses();
    } catch (err) {
      console.error('Failed to mark status as viewed:', err);
    }
  }

  function closeStatusViewer() {
    setStatusViewer(null);
  }

  function showPrevStatus() {
    if (!statusViewer) return;
    if (statusViewer.index > 0) {
      setStatusViewer({ ...statusViewer, index: statusViewer.index - 1 });
    }
  }

  function showNextStatus() {
    if (!statusViewer) return;
    const nextIndex = statusViewer.index + 1;
    if (nextIndex < statusViewer.group.statuses.length) {
      setStatusViewer({ ...statusViewer, index: nextIndex });
    }
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) showNextStatus();
    if (diff < -50) showPrevStatus();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = () => {
    statusPausedRef.current = true;
  };

  const handleMouseUp = () => {
    statusPausedRef.current = false;
  };

  async function deleteStatus(statusId) {
    if (!confirm('Delete this status?')) return;
    try {
      await apiFetch(`/api/status?id=${statusId}`, { method: 'DELETE' });
      loadStatuses();
      closeStatusViewer();
    } catch (err) {
      alert(err.message);
    }
  }

  async function postStatus() {
    if (statusType === 'text' && !statusText.trim()) {
      return alert('Type a status message before posting.');
    }
    if ((statusType === 'image' || statusType === 'video') && !statusMediaFile) {
      return alert(`Please select a ${statusType} for your status.`);
    }

    try {
      let mediaUrl = '';
      if (statusMediaFile) {
        const formData = new FormData();
        formData.append('file', statusMediaFile);
        const result = await apiFetch('/api/media/upload', { method: 'POST', body: formData });
        mediaUrl = result.url;
      }

      await apiFetch('/api/status', {
        method: 'POST',
        body: {
          type: statusType,
          text: statusText,
          media: mediaUrl,
          bgColor: selectedStatusColor,
          textColor: '#ffffff',
          privacy: statusPrivacy,
        },
      });

      clearStatusDraft();
      setShowStatusCreate(false);
      loadStatuses();
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentChat = chats.find((c) => c._id?.toString() === currentChatId?.toString());
  const currentChatOther = currentChat && !currentChat.isGroup
    ? currentChat.participants?.find((p) => p._id?.toString() !== currentUser?._id?.toString())
    : null;
  const chatName = currentChat ? (currentChat.isGroup ? currentChat.groupName : currentChatOther?.name || 'Unknown') : '';
  const chatStatusText = currentChat
    ? (currentChat.isGroup
      ? `${currentChat.participants?.length || 0} participants`
      : (currentChatOther?.online ? 'online' : Utils.formatLastSeen(currentChatOther?.lastSeen)))
    : '';
  const isTyping = currentChatId && typingUsers[currentChatId];

  const myStatusGroup = statuses.find((group) => group.user._id?.toString() === currentUser?._id?.toString());
  const otherStatusGroups = statuses.filter((group) => group.user._id?.toString() !== currentUser?._id?.toString());

  const filteredChats = chats.filter((c) => {
    const name = c.isGroup
      ? c.groupName
      : c.participants?.find((p) => p._id?.toString() !== currentUser?._id?.toString())?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <div style={{ display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',color:'var(--text-secondary)' }}>Loading...</div>;
  }

  return (
    <div className={`app${currentChatId ? ' chat-open' : ''}`} onClick={() => { setShowDropdown(false); setShowEmoji(false); setShowAttach(false); setContextMenu(null); }}>

      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-left" title="My profile" onClick={openMyProfile}>
            <Avatar user={currentUser} />
            <div className="sidebar-header-user">
              <span>My profile</span>
            </div>
          </div>
          <div className="sidebar-header-right">
            <button className="icon-btn" id="btn-status" title="Status" onClick={(e) => { e.stopPropagation(); setShowStatus(true); loadStatuses(); }}>
              <svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <button className="icon-btn" id="btn-new-chat" title="New chat" onClick={(e) => { e.stopPropagation(); setShowNewChat(true); setNewChatSearch(''); searchUsers(''); }}>
              <svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
            </button>
            <button className="icon-btn" id="btn-menu" title="Menu" onClick={(e) => { e.stopPropagation(); setShowDropdown((v) => !v); }}>
              <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" fill="currentColor"/></svg>
            </button>
          </div>
        </div>

        <div className="sidebar-search">
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7s-6.7 3-6.7 6.7 3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.1zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6S7.1 5.1 9.7 5.1s4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z" fill="currentColor"/></svg>
            <input id="search-input" type="text" placeholder="Search or start new chat" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="chat-list" id="chat-list">
          {filteredChats.length === 0 && <div className="chat-list-empty"><p>No conversations yet</p></div>}
          {filteredChats.map((chat) => {
            const other = chat.isGroup ? null : chat.participants?.find((p) => p._id?.toString() !== currentUser._id?.toString());
            const name = chat.isGroup ? chat.groupName : (other?.name || 'Unknown');
            const lm = chat.lastMessage;
            let preview = '';
            if (lm) {
              if (lm.deletedForEveryone) preview = '🚫 This message was deleted';
              else if (lm.type === 'text') preview = (chat.isGroup && lm.sender?.name ? lm.sender.name.split(' ')[0] + ': ' : '') + (lm.text || '');
              else if (lm.type === 'image') preview = '📷 Photo';
              else if (lm.type === 'video') preview = '🎥 Video';
              else if (lm.type === 'voice') preview = '🎤 Voice message';
              else if (lm.type === 'document') preview = '📄 Document';
              else if (lm.type === 'location') preview = '📍 Location';
            }
            const unread = chat.unreadCount || 0;
            return (
              <div key={chat._id} className={`chat-item${chat._id?.toString() === currentChatId?.toString() ? ' active' : ''}`} onClick={() => openChat(chat._id)}>
                {chat.isGroup ? (
                  <div className="avatar"><div className="avatar-default">👥</div></div>
                ) : (
                  <div title="View profile" onClick={(e) => { e.stopPropagation(); openProfile(other); }} style={{ cursor: 'pointer' }}>
                    <Avatar user={other} />
                  </div>
                )}
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="chat-item-name">{name}</span>
                    <span className={`chat-item-time${unread ? ' unread' : ''}`}>{lm ? Utils.formatTime(lm.createdAt) : ''}</span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-preview">{preview}</span>
                    {unread > 0 && <span className="chat-item-unread">{unread}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CHAT ── */}
      <div className="main-chat">
        {!currentChatId ? (
          <div className="welcome-screen">
            <div className="welcome-content">
              <svg viewBox="0 0 303 172" width="280" height="160">
                <path fill="none" stroke="#25D366" strokeWidth="3" d="M229.565 160.229c32.647-12.996 50.818-41.968 54.335-73.236C290.008 42.863 254.548 8.6 210.727 4.797c-43.822-3.803-85.59 24.019-108.79 60.327C78.737 101.432 71.23 147.59 98.325 170.94c27.096 23.35 73.424 8.773 108.313-2.726"/>
              </svg>
              <h1>WhatsApp Web</h1>
              <p>Send and receive messages without keeping your phone online.</p>
            </div>
          </div>
        ) : (
          <div className="chat-view" style={{ display: 'flex' }}>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-left" id="chat-header-info"
                style={{ cursor: currentChat?.isGroup ? 'default' : 'pointer' }}
                title={currentChat?.isGroup ? 'Group info' : 'View profile'}
                onClick={(e) => {
                  if (!currentChat?.isGroup && currentChatOther) {
                    e.stopPropagation();
                    openProfile(currentChatOther);
                  }
                }}>
                <button className="icon-btn chat-back-btn" aria-label="Back" title="Back" onClick={(e) => { e.stopPropagation(); setCurrentChatId(null); }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 11H7.83l5.58-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
                  </svg>
                </button>
                {currentChat?.isGroup
                  ? <div className="avatar"><div className="avatar-default">👥</div></div>
                  : <Avatar user={currentChatOther} />
                }
                <div className="chat-header-info">
                  <div className="chat-header-name" id="chat-name">{chatName}</div>
                  <div className={`chat-header-status${currentChatOther?.online ? ' online' : ''}`} id="chat-status">{chatStatusText}</div>
                </div>
              </div>
              <div className="chat-header-right">
                <button className="icon-btn" id="btn-video-call" title="Video call" onClick={() => initiateCall('video')}>
                  <svg viewBox="0 0 24 24" width="24" height="24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/></svg>
                </button>
                <button className="icon-btn" id="btn-voice-call" title="Voice call" onClick={() => initiateCall('voice')}>
                  <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.12-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" fill="currentColor"/></svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-area" id="messages-area">
              <div className="messages-container" id="messages-container">
                {messages.reduce((acc, msg, i) => {
                  const dateStr = Utils.formatDate(msg.createdAt);
                  const prevDate = i > 0 ? Utils.formatDate(messages[i-1].createdAt) : null;
                  if (dateStr !== prevDate) {
                    acc.push(<div key={`d-${i}`} className="date-divider"><span>{dateStr}</span></div>);
                  }
                  acc.push(<MessageBubble key={msg._id} msg={msg} currentUser={currentUser} onContextMenu={showCtxMenu} />);
                  return acc;
                }, [])}
                {isTyping && (
                  <div className="typing-indicator">
                    <span className="typing-text">typing</span>
                    <span className="typing-dots"><span/><span/><span/></span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className="reply-preview" id="reply-preview">
                <div className="reply-preview-content">
                  <div className="reply-preview-name">{replyTo.sender?.name || 'Unknown'}</div>
                  <div className="reply-preview-text">{replyTo.text || replyTo.type}</div>
                </div>
                <button className="icon-btn" id="close-reply-preview" onClick={() => setReplyTo(null)}>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="message-input-area" id="message-input-area" >
              {/* Emoji picker */}
              {showEmoji && (
                <div className="emoji-picker" id="emoji-picker" onClick={(e) => e.stopPropagation()}>
                  <div className="emoji-grid" id="emoji-grid">
                    {Utils.EMOJIS.map((e) => (
                      <span key={e} onClick={() => { setInputText((t) => t + e); setShowEmoji(false); inputRef.current?.focus(); }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Attach menu */}
              {showAttach && (
                <div className="attachment-menu" id="attachment-menu" onClick={(e) => e.stopPropagation()}>
                  <button className="attach-option" onClick={() => { fileInputRef.current.accept='image/*,video/*'; fileInputRef.current.click(); setShowAttach(false); }}>
                    <div className="attach-icon" style={{ background:'#7f66ff' }}><svg viewBox="0 0 24 24" width="24" height="24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg></div>
                    <span>Photos &amp; Videos</span>
                  </button>
                  <button className="attach-option" onClick={() => { fileInputRef.current.accept='*'; fileInputRef.current.click(); setShowAttach(false); }}>
                    <div className="attach-icon" style={{ background:'#5475e5' }}><svg viewBox="0 0 24 24" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="currentColor"/></svg></div>
                    <span>Document</span>
                  </button>
                  <button className="attach-option" onClick={() => { handleLocationShare(); setShowAttach(false); }}>
                    <div className="attach-icon" style={{ background:'#016d5b' }}><svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg></div>
                    <span>Location</span>
                  </button>
                </div>
              )}

              <div className="input-left">
                <button className="icon-btn" id="btn-emoji" title="Emoji" onClick={(e) => { e.stopPropagation(); setShowEmoji((v) => !v); setShowAttach(false); }}>
                  <svg viewBox="0 0 24 24" width="24" height="24"><path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.694 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM11.984 2C6.486 2 2 6.486 2 11.984c0 5.498 4.486 9.984 9.984 9.984 5.498 0 9.984-4.486 9.984-9.984C21.968 6.486 17.482 2 11.984 2zm0 18.168c-4.512 0-8.184-3.672-8.184-8.184S7.472 3.8 11.984 3.8s8.184 3.672 8.184 8.184-3.672 8.184-8.184 8.184zm2.856-5.856c-.372-.12-.768.072-.888.444-.696 2.1-2.64 3.42-4.824 3.42s-4.128-1.32-4.824-3.42c-.12-.372-.516-.564-.888-.444-.372.12-.564.516-.444.888.912 2.76 3.456 4.5 6.156 4.5s5.244-1.74 6.156-4.5c.12-.372-.072-.768-.444-.888z" fill="currentColor"/></svg>
                </button>
                <button className="icon-btn" id="btn-attach" title="Attach" onClick={(e) => { e.stopPropagation(); setShowAttach((v) => !v); setShowEmoji(false); }}>
                  <svg viewBox="0 0 24 24" width="24" height="24"><path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.501.501 1.096.788 1.676.844.576.056 1.12-.116 1.518-.514l5-5a.75.75 0 0 0-1.06-1.06l-5 5a.252.252 0 0 1-.198.072c-.168-.016-.362-.128-.538-.304-.378-.378-.417-.826-.097-1.146l7.916-7.915c.807-.807 2.127-.718 3.226.38.501.501.819 1.092.872 1.637.044.449-.116.878-.467 1.229l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.172 3.975 3.975 0 0 1-2.83-1.172 3.977 3.977 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211a.75.75 0 0 0-1.06-1.06L3.463 12.35c-1.062 1.062-1.645 2.472-1.647 3.974v.232z" fill="currentColor"/></svg>
                </button>
                <input ref={fileInputRef} type="file" id="file-input" style={{ display:'none' }} onChange={(e) => { handleFileUpload(e.target.files[0]); e.target.value=''; }} />
              </div>

              <div className="input-middle">
                <textarea
                  ref={inputRef}
                  id="message-input"
                  className="message-input"
                  rows={1}
                  placeholder="Type a message"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleInputKey}
                  style={{ resize:'none', minHeight:42, maxHeight:120 }}
                />
              </div>

              <div className="input-right">
                {inputText.trim() ? (
                  <button className="icon-btn send-btn" id="btn-send" title="Send" onClick={sendMessage}>
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" fill="currentColor"/></svg>
                  </button>
                ) : (
                  <button className="icon-btn" id="btn-voice" title="Voice message">
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M11.999 14.942c2.001 0 3.592-1.579 3.592-3.571V5.585c0-1.992-1.591-3.585-3.592-3.585-2.001 0-3.592 1.593-3.592 3.585v5.786c0 1.992 1.591 3.571 3.592 3.571zm-5.5-3.571c0-3.029 2.449-5.486 5.5-5.486s5.5 2.457 5.5 5.486a.75.75 0 0 0 1.5 0c0-3.677-2.832-6.713-6.4-7.122V2.75a.75.75 0 0 0-1.5 0v1.499c-3.568.409-6.4 3.445-6.4 7.122a.75.75 0 0 0 1.5 0z" fill="currentColor"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── DROPDOWN ── */}
      {showDropdown && (
        <div className="dropdown-menu" id="dropdown-menu" style={{ position:'absolute', top:60, right:8 }} onClick={(e) => e.stopPropagation()}>
          <button className="dropdown-item" id="dd-new-group" onClick={() => { setShowDropdown(false); setShowNewGroup(true); searchUsers(''); }}>New group</button>
          <button className="dropdown-item" id="dd-profile" onClick={() => { setShowDropdown(false); openMyProfile(); }}>My profile</button>
          <button className="dropdown-item" id="dd-settings" onClick={() => { setShowDropdown(false); setShowSettings(true); loadCallHistory(); }}>Settings</button>
          <button className="dropdown-item" id="dd-logout" onClick={logout}>Log out</button>
        </div>
      )}

      {/* ── CONTEXT MENU ── */}
      {contextMenu && (
        <div className="context-menu" id="context-menu" style={{ left:contextMenu.x, top:contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button className="context-item" onClick={() => handleContextAction('reply')}>Reply</button>
          <button className="context-item" onClick={() => handleContextAction('copy')}>Copy</button>
          <button className="context-item" onClick={() => handleContextAction('star')}>Star</button>
          <button className="context-item" onClick={() => handleContextAction('delete-me')}>Delete for me</button>
          {contextMsg?.sender?._id === currentUser?._id && (
            <button className="context-item" onClick={() => handleContextAction('delete-everyone')}>Delete for everyone</button>
          )}
        </div>
      )}

      {/* ── NEW CHAT MODAL ── */}
      {showNewChat && (
        <div className="modal-overlay" id="new-chat-modal" onClick={() => setShowNewChat(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="icon-btn back-btn" id="close-new-chat" onClick={() => setShowNewChat(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8 8-8z" fill="currentColor"/></svg>
              </button>
              <h3>New chat</h3>
            </div>
            <div className="modal-search">
              <input type="text" id="new-chat-search" placeholder="Search contacts" value={newChatSearch} onChange={(e) => setNewChatSearch(e.target.value)} />
            </div>
            <div className="modal-body" id="contact-list">
              {searchedUsers.map((u) => (
                <div key={u._id} className="contact-item" onClick={() => startNewChat(u._id)}>
                  <Avatar user={u} />
                  <div><div className="contact-item-name">{u.name}</div><div className="contact-item-about">{u.about || ''}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEW GROUP MODAL ── */}
      {showNewGroup && (
        <div className="modal-overlay" id="new-group-modal" onClick={() => setShowNewGroup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="icon-btn back-btn" id="close-new-group" onClick={() => setShowNewGroup(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8 8-8z" fill="currentColor"/></svg>
              </button>
              <h3>New group</h3>
            </div>
            <div className="modal-body" style={{ padding: '0 16px 16px' }}>
              <div className="input-group" style={{ marginBottom: 12, marginTop: 12 }}>
                <input type="text" id="group-name-input" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} style={{ width:'100%',padding:'10px 14px' }} />
              </div>
              <div id="group-members-selected" style={{ display:'flex',flexWrap:'wrap',marginBottom:8 }}>
                {selectedGroupMembers.map((uid) => {
                  const u = searchedUsers.find((x) => x._id === uid);
                  return <div key={uid} className="member-chip">{u?.name || uid} <span className="remove-chip" onClick={() => setSelectedGroupMembers((p) => p.filter((id) => id !== uid))}>×</span></div>;
                })}
              </div>
              <input type="text" id="group-member-search" placeholder="Search contacts" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} style={{ width:'100%',padding:'8px 12px',marginBottom:8 }} />
              <div id="group-contact-list">
                {searchedUsers.map((u) => (
                  <div key={u._id} className="contact-item" onClick={() => setSelectedGroupMembers((p) => p.includes(u._id) ? p.filter((id) => id !== u._id) : [...p, u._id])} style={{ background: selectedGroupMembers.includes(u._id) ? 'var(--bg-active)' : '' }}>
                    <Avatar user={u} />
                    <div><div className="contact-item-name">{u.name}</div></div>
                    {selectedGroupMembers.includes(u._id) && <span style={{ marginLeft:'auto', color:'var(--green)' }}>✓</span>}
                  </div>
                ))}
              </div>
              <button className="auth-btn" id="create-group-btn" style={{ marginTop:16 }} onClick={createGroup}>Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS MODAL ── */}
      {showStatus && (
        <div className="modal-overlay" id="status-modal" onClick={() => setShowStatus(false)}>
          <div className="modal status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="icon-btn back-btn" id="close-status" onClick={() => setShowStatus(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8 8-8z" fill="currentColor"/></svg>
              </button>
              <h3>Status</h3>
            </div>
            <div className="modal-body">
              <input
                ref={statusFileInputRef}
                type="file"
                accept={statusType === 'video' ? 'video/*' : 'image/*'}
                style={{ display: 'none' }}
                onChange={(e) => handleStatusFileChange(e.target.files?.[0])}
              />
              <div className="my-status" id="my-status" onClick={() => {
                if (myStatusGroup) {
                  openStatusViewer(myStatusGroup, 0);
                } else {
                  setShowStatusCreate(true);
                  setStatusType('text');
                }
              }}>
                <div className="status-avatar-ring status-avatar-ring-large">
                  <Avatar user={currentUser} size="lg" />
                  {!myStatusGroup && <span className="status-add-icon">+</span>}
                </div>
                <div>
                  <div className="status-name">My Status</div>
                  <div className="status-time">
                    {myStatusGroup ? 'Tap to view your status' : 'Tap to add status update'}
                  </div>
                </div>
                <button
                  className="status-add-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStatusCreate(true);
                    setStatusType('image');
                    setStatusMediaFile(null);
                    setStatusMediaPreview('');
                    setStatusText('');
                  }}
                >
                  +
                </button>
              </div>
              {showStatusCreate && (
                <div className="status-create">
                  <div className="status-create-actions">
                    <button
                      className={`status-create-action${statusType === 'text' ? ' active' : ''}`}
                      type="button"
                      onClick={() => {
                        setStatusType('text');
                        setStatusMediaFile(null);
                        setStatusMediaPreview('');
                      }}
                    >
                      Aa
                    </button>
                    <button
                      className={`status-create-action${statusType !== 'text' ? ' active' : ''}`}
                      type="button"
                      onClick={() => {
                        setStatusType('image');
                        statusFileInputRef.current?.click();
                      }}
                    >
                      📷
                    </button>
                  </div>

                  {statusType !== 'text' && (
                    <button
                      className="auth-btn status-upload-btn"
                      type="button"
                      onClick={() => statusFileInputRef.current?.click()}
                    >
                      {statusMediaFile ? `Change ${statusType}` : `Upload photo or video`}
                    </button>
                  )}

                  {statusMediaPreview && (
                    <div className="status-media-preview-wrapper">
                      {statusType === 'video' ? (
                        <video src={statusMediaPreview} controls preload="metadata" />
                      ) : (
                        <img src={statusMediaPreview} alt="Status preview" />
                      )}
                      <button
                        className="icon-btn status-remove-media"
                        type="button"
                        onClick={() => {
                          setStatusMediaFile(null);
                          setStatusMediaPreview('');
                        }}
                        aria-label="Remove media"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <textarea
                    id="status-text"
                    placeholder={statusType === 'text' ? 'Type a status...' : 'Add a caption...'}
                    rows={3}
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                  />

                  {statusType === 'text' && (
                    <div className="status-colors" id="status-colors">
                      {Utils.STATUS_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`status-color-btn${selectedStatusColor === c ? ' active' : ''}`}
                          style={{ background: c }}
                          type="button"
                          onClick={() => setSelectedStatusColor(c)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="status-privacy-selector">
                    <label>Privacy:</label>
                    <select value={statusPrivacy} onChange={(e) => setStatusPrivacy(e.target.value)}>
                      <option value="everyone">Everyone</option>
                      <option value="contacts">My contacts</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>

                  <button className="auth-btn" id="post-status-btn" onClick={postStatus}>Post Status</button>
                </div>
              )}
              <h4 className="status-section-title">Recent updates</h4>
              <div id="status-list">
                {otherStatusGroups.map((group) => {
                  const latest = group.statuses[0];
                  const previewLabel = latest?.type === 'text'
                    ? (latest.text ? `${latest.text.slice(0, 40)}${latest.text.length > 40 ? '…' : ''}` : 'Text status')
                    : latest?.type === 'image'
                      ? '📷 Photo status'
                      : latest?.type === 'video'
                        ? '🎥 Video status'
                        : 'Status update';
                  return (
                    <div key={group.user._id} className="contact-item status-group-item" onClick={() => openStatusViewer(group, 0)}>
                      <div className="status-avatar-ring">
                        <Avatar user={group.user} />
                      </div>
                      <div>
                        <div className="contact-item-name">{group.user.name}</div>
                        <div className="contact-item-about">{group.statuses.length} update{group.statuses.length !== 1 ? 's' : ''}</div>
                        <div className="status-group-preview">{previewLabel}</div>
                    <div className="status-last-updated">{latest?.createdAt ? Utils.formatLastSeen(latest.createdAt) : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {statusViewer && (
                <div
                  className="status-viewer status-viewer-fullscreen"
                  ref={statusViewerRef}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div className="status-viewer-header">
                    <div className="status-viewer-user">
                      <Avatar user={statusViewer.group.user} size="sm" />
                      <div>
                        <div className="contact-item-name">{statusViewer.group.user.name}</div>
                        <div className="status-viewer-count">{statusViewer.index + 1} of {statusViewer.group.statuses.length}</div>
                      </div>
                    </div>
                    <button className="icon-btn back-btn" type="button" onClick={closeStatusViewer}>×</button>
                  </div>
                  <div className="status-progress-bar">
                    {statusViewer.group.statuses.map((_, idx) => (
                      <span key={idx} className={`status-progress-segment${idx <= statusViewer.index ? ' active' : ''}`} />
                    ))}
                  </div>
                  <div className="status-viewer-body">
                    <div className="status-viewer-side status-viewer-side-left" onClick={showPrevStatus} />
                    <div className="status-viewer-content">
                      {(() => {
                        const active = statusViewer.group.statuses[statusViewer.index];
                        if (!active) return null;
                        if (active.type === 'text') {
                          return (
                            <div className="status-card" style={{ background: active.bgColor || '#25D366', color: active.textColor || '#fff' }}>
                              <p>{active.text || 'Status'}</p>
                            </div>
                          );
                        }
                        if (active.type === 'image') {
                          return <img className="status-media-full" src={active.media} alt="Status image" />;
                        }
                        if (active.type === 'video') {
                          return <video className="status-media-full" src={active.media} controls preload="metadata" />;
                        }
                        return <div className="status-card">{active.text || 'Status'}</div>;
                      })()}
                    </div>
                    <div className="status-viewer-side status-viewer-side-right" onClick={showNextStatus} />
                  </div>
                  {statusViewer.group.statuses[statusViewer.index]?.text && statusViewer.group.statuses[statusViewer.index]?.type !== 'text' && (
                    <div className="status-caption">{statusViewer.group.statuses[statusViewer.index].text}</div>
                  )}
                  <div className="status-viewer-footer">
                    <div className="status-viewer-footer-left">
                      <span>{Utils.formatTime(statusViewer.group.statuses[statusViewer.index]?.createdAt)}</span>
                      {statusViewer.group.user._id?.toString() === currentUser?._id?.toString() && (
                        <span className="status-view-count">
                          👁 {statusViewer.group.statuses[statusViewer.index]?.viewedBy?.length || 0} views
                        </span>
                      )}
                    </div>
                    {statusViewer.group.user._id?.toString() === currentUser?._id?.toString() && (
                      <button
                        className="icon-btn"
                        type="button"
                        onClick={() => deleteStatus(statusViewer.group.statuses[statusViewer.index]._id)}
                        title="Delete status"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {showProfile && profileUser && (
        <div className="modal-overlay" id="profile-modal" onClick={closeProfile}>
          <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="icon-btn back-btn" id="close-profile" aria-label="Back" title="Back" onClick={closeProfile}>
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
              </button>
              <h3>Profile</h3>
            </div>
            <div className={`modal-body profile-modal-body ${profileUser._id?.toString() === currentUser?._id?.toString() ? 'my-profile-body' : 'contact-profile-body'}`}>
              <div className="profile-hero">
                <div
                  onClick={() => !profileEditMode && (profileEditAvatar || profileUser.avatar) && setShowProfileImageViewer(true)}
                  className="profile-photo-button"
                >
                  <div className="profile-avatar-xl">
                    <Avatar user={{ ...profileUser, avatar: profileEditAvatar || profileUser.avatar }} />
                    {profileEditMode && (
                      <button
                        type="button"
                        className="profile-camera-overlay"
                        onClick={(e) => { e.stopPropagation(); profileFileInputRef.current?.click(); }}
                        title="Change photo"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 3 7.17 5H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 14.5A4.5 4.5 0 1 1 12 8a4.5 4.5 0 0 1 0 9.5zm0-2A2.5 2.5 0 1 0 12 10a2.5 2.5 0 0 0 0 5.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={profileFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadProfileAvatar(file);
                  }}
                />
                <div className="profile-hero-name">
                  {profileEditMode ? (
                    <input
                      type="text"
                      value={profileEditName}
                      onChange={(e) => setProfileEditName(e.target.value)}
                      className="profile-inline-input profile-name-input"
                      placeholder="Your name"
                    />
                  ) : (
                    profileUser.name || 'Unknown'
                  )}
                </div>
                <div className="profile-hero-subtitle">
                  {profileUser._id?.toString() === currentUser?._id?.toString() ? 'My profile' : (profileUser.online ? 'online' : profileUser.lastSeen ? Utils.formatLastSeen(profileUser.lastSeen) : 'Contact info')}
                </div>
              </div>

              {profileUser._id?.toString() !== currentUser?._id?.toString() && (
                <div className="profile-action-grid">
                  <button className="profile-icon-action" onClick={() => { closeProfile(); initiateCall('voice'); }}>
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg>
                    <span>Audio</span>
                  </button>
                  <button className="profile-icon-action" onClick={() => { closeProfile(); initiateCall('video'); }}>
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/></svg>
                    <span>Video</span>
                  </button>
                  <button className="profile-icon-action" onClick={closeProfile}>
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/></svg>
                    <span>Message</span>
                  </button>
                </div>
              )}

              <div className="profile-info-card">
                <div className="profile-info-label">About</div>
                <div className="profile-info-value">
                  {profileEditMode ? (
                    <textarea
                      value={profileEditAbout}
                      onChange={(e) => setProfileEditAbout(e.target.value)}
                      className="profile-inline-input profile-about-input"
                      placeholder="Hey there! I am using WhatsApp"
                      rows={2}
                    />
                  ) : (
                    profileUser.about || 'Hey there! I am using WhatsApp'
                  )}
                </div>
              </div>

              {profileUser.phone && (
                <div className="profile-info-card">
                  <div className="profile-info-label">Phone</div>
                  <div className="profile-phone-row">
                    <span>{profileUser.phone}</span>
                    {profileUser._id?.toString() !== currentUser?._id?.toString() && (
                      <div className="profile-phone-actions">
                        <button className="icon-btn" title="Audio call" onClick={() => { closeProfile(); initiateCall('voice'); }}>
                          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg>
                        </button>
                        <button className="icon-btn" title="Video call" onClick={() => { closeProfile(); initiateCall('video'); }}>
                          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="profile-bottom-actions">
                {profileUser._id?.toString() === currentUser?._id?.toString() ? (
                  profileEditMode ? (
                    <div className="profile-save-row">
                      <button className="profile-primary-btn" onClick={saveProfileChanges}>
                        Save
                      </button>
                      <button className="profile-secondary-btn" onClick={() => setProfileEditMode(false)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="profile-secondary-btn" onClick={() => setProfileEditMode(true)}>
                      Edit profile
                    </button>
                  )
                ) : (
                  <button className="profile-danger-row">
                    Block {profileUser.name || 'contact'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileImageViewer && (profileEditAvatar || profileUser.avatar) && (
        <div className="image-viewer-overlay" onClick={() => setShowProfileImageViewer(false)}>
          <div className="image-viewer-frame" onClick={(e) => e.stopPropagation()}>
            <img src={profileEditAvatar || profileUser.avatar} alt={profileUser.name || 'Profile'} />
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL ── */}
      {showSettings && (
        <div className="modal-overlay" id="settings-modal" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="icon-btn back-btn" id="close-settings" onClick={() => setShowSettings(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8 8-8z" fill="currentColor"/></svg>
              </button>
              <h3>Settings</h3>
            </div>
            <div className="modal-body" style={{ padding: 16 }}>
              <div className="settings-profile">
                <Avatar user={currentUser} size="lg" />
                <div className="settings-profile-info">
                  <input type="text" id="settings-name" placeholder="Your name" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} />
                  <input type="text" id="settings-about" placeholder="About" value={settingsAbout} onChange={(e) => setSettingsAbout(e.target.value)} />
                </div>
              </div>
              <button className="auth-btn" id="save-settings-btn" style={{ marginTop:16 }} onClick={saveSettings}>Save</button>
              
              <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                <h4 style={{ marginBottom: 12, fontSize: 16 }}>Call History</h4>
                {callHistory.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No calls yet</p>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {callHistory.map((call) => {
                      const isOutgoing = call.caller?._id === currentUser?._id;
                      const otherUser = isOutgoing ? call.callee : call.caller;
                      const statusColors = {
                        answered: '#25D366',
                        missed: '#ea4335',
                        rejected: '#ea4335',
                        ringing: '#FFC107',
                        ended: '#25D366'
                      };
                      return (
                        <div key={call._id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: 10, 
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          gap: 12
                        }}>
                          <Avatar user={otherUser} size="sm" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{otherUser?.name || 'Unknown'}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                              {isOutgoing ? 'Outgoing' : 'Incoming'} {call.type} call
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: statusColors[call.status] || '#fff' }}>
                              {call.status}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                              {call.duration > 0 ? formatCallDuration(call.duration) : Utils.formatTime(call.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INCOMING CALL OVERLAY ── */}
      {incomingCall && (
        <div className={`call-overlay incoming-call-overlay ${incomingCall.callType === 'video' ? 'video-incoming' : ''}`}>
          <div className="call-screen incoming-call-screen whatsapp-call-screen">
            <div className="incoming-call-badge">
              {incomingCall.callType === 'video' ? (
                <svg viewBox="0 0 24 24" width="22" height="22"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/></svg>
              )}
            </div>
            <div className="call-avatar incoming-avatar">
              {incomingCall.callerAvatar ? (
                <img src={incomingCall.callerAvatar} alt="" />
              ) : (
                <div className="avatar avatar-xl">
                  <div className="avatar-default" style={{ fontSize: 32 }}>
                    {Utils.getInitials(incomingCall.callerName)}
                  </div>
                </div>
              )}
            </div>
            <div className="call-name">{incomingCall.callerName}</div>
            <div className="call-status-text">Incoming {incomingCall.callType} call...</div>
            <div className="call-controls incoming-controls">
              <button className="call-btn call-answer" onClick={() => answerCall(
                incomingCall.callerId,
                incomingCall.callerName,
                incomingCall.callType,
                incomingCall.callId,
                incomingCall.offer,
                incomingCall.dbCallId
              )}>
                <svg viewBox="0 0 24 24" width="32" height="32"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 0 9.39 7.61 17 17 17 .75 0 1.01-.65 1.01-1.19v-3.44c0-.54-.44-.99-.99-.99z" fill="currentColor"/></svg>
              </button>
              <button className="call-btn call-reject" onClick={() => {
                stopIncomingRingtone();
                socket?.emit('call_reject', { callerId: incomingCall.callerId, callId: incomingCall.callId, dbCallId: incomingCall.dbCallId });
                setIncomingCall(null);
              }}>
                <svg viewBox="0 0 24 24" width="32" height="32"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVE CALL OVERLAY ── */}
      {callActive && (
        <div className={`call-overlay ${callType === 'video' ? 'video-call-overlay' : 'voice-call-overlay'}`} id="call-overlay">
          <div className={`call-screen whatsapp-call-screen ${callType === 'video' ? 'video-call-screen' : 'voice-call-screen'}`}>
            {callType === 'video' ? (
              <div className="video-call-container">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`remote-video${remoteVideoReady ? ' ready' : ''}`}
                />
                {!remoteVideoReady && (
                  <div className="video-placeholder remote-placeholder">
                    <div className="avatar avatar-xl">
                      <div className="avatar-default" style={{ fontSize: 32 }}>
                        {Utils.getInitials(callName)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="local-video-wrap">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`local-video filter-${videoFilter}${localVideoReady && callCameraOn ? ' ready' : ''}`}
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {(!localVideoReady || !callCameraOn) && (
                    <div className="local-video-off">
                      <svg viewBox="0 0 24 24" width="24" height="24"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" fill="currentColor"/></svg>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="call-avatar">
                <div className="avatar avatar-xl">
                  <div className="avatar-default" style={{ fontSize: 32 }}>
                    {Utils.getInitials(callName)}
                  </div>
                </div>
                {/* Hidden video refs for voice calls (needed for ontrack handler) */}
                <video ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
                <video ref={remoteVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
              </div>
            )}
            {/* Audio elements for all call types */}
            <audio ref={localAudioRef} autoPlay muted style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
            <div className={`call-info ${callType === 'video' ? 'video-call-info' : ''}`}>
              <div className="call-name" id="call-name">{callName}</div>
              <div className="call-status-text" id="call-status-text">{callStatus}</div>
              {callDuration > 0 && (
                <div className="call-duration">{formatCallDuration(callDuration)}</div>
              )}
              <div className="network-quality-indicator">
                <span className={`network-dot network-${callNetworkQuality}`} />
                <span>{callNetworkQuality}</span>
              </div>
              {callType === 'video' && (
                <>
                  <div className="video-quality-selector call-floating-select">
                    <select
                      value={callVideoQuality}
                      onChange={(e) => setCallVideoQuality(e.target.value)}
                      className="quality-select"
                    >
                      <option value="SD">SD</option>
                      <option value="HD">HD</option>
                      <option value="FHD">FHD</option>
                    </select>
                  </div>
                  <div className="video-filter-selector call-floating-select">
                    <select
                      value={videoFilter}
                      onChange={(e) => setVideoFilter(e.target.value)}
                      className="quality-select"
                    >
                      <option value="none">No Filter</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="sepia">Sepia</option>
                      <option value="blur">Blur</option>
                      <option value="brightness">Brightness</option>
                      <option value="contrast">Contrast</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            {closedCaptions && captionsText && (
              <div className="captions-overlay">
                <div className="captions-text">{captionsText}</div>
              </div>
            )}
            <div className={`call-controls ${callType === 'video' ? 'video-call-controls' : ''}`}>
              <button
                className={`call-btn call-mute${callMuted ? ' active' : ''}`}
                id="call-mute-btn"
                onClick={toggleMute}
                title={callMuted ? 'Unmute' : 'Mute'}
              >
                {callMuted ? (
                  <svg viewBox="0 0 24 24" width="28" height="28"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.48 0-4.5-2.02-4.5-4.5 0-.32.04-.64.11-.94L2.81 2.81 1.39 4.22l2.88 2.88c-.18.41-.27.86-.27 1.4 0 2.48 2.02 4.5 4.5 4.5 1.25 0 2.38-.51 3.2-1.32l3.28 3.28 1.42-1.42L4.27 3z" fill="currentColor"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/></svg>
                )}
              </button>
              <button
                className={`call-btn call-speaker${callSpeakerOn ? ' active' : ''}`}
                onClick={toggleSpeaker}
                title={callSpeakerOn ? 'Speaker on' : 'Speaker off'}
              >
                <svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg>
              </button>
              {callType === 'video' && (
                <>
                  <button
                    className={`call-btn call-camera${callCameraOn ? ' active' : ''}`}
                    onClick={toggleCamera}
                    title={callCameraOn ? 'Camera on' : 'Camera off'}
                  >
                    {callCameraOn ? (
                      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="28" height="28"><path d="M9.56 8l-2-2-4.15-4.14L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21l1.41-1.41L20.57 18H22v-2h-2.43l-2.9-2.9c.52-.55.83-1.27.83-2.07 0-1.61-1.31-2.92-2.92-2.92-1.61 0-2.92 1.31-2.92 2.92 0 .8.31 1.52.83 2.07L9.56 8zM5 17h3l-1.29-1.29C6.6 15.92 6.32 16 6 16c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-1l-2 2H5z" fill="currentColor"/></svg>
                    )}
                  </button>
                  <button
                    className="call-btn"
                    onClick={switchCamera}
                    title="Switch camera"
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28"><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z" fill="currentColor"/></svg>
                  </button>
                </>
              )}
              <button className="call-btn call-end" id="call-end-btn" onClick={endCall} title="End call">
                <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
