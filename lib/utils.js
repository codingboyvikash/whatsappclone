export const Utils = {
  getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
  getUser: () => {
    if (typeof window === 'undefined') return null;
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  async apiFetch(url, options = {}) {
    const token = this.getToken();
    const isFormData = options.body instanceof FormData;
    const headers = { ...options.headers };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const fetchOptions = { ...options, headers };
    if (!isFormData && options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, fetchOptions);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
  formatDate(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  formatLastSeen(dateStr) {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `last seen today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `last seen ${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  },
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  },
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },
  escapeHtml(text) {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (!div) return text ?? '';
    div.textContent = text ?? '';
    return div.innerHTML;
  },
  linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return this.escapeHtml(text).replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#53bdeb">$1</a>');
  },
  EMOJIS: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😏','😒','🙄','😬','🤥','😌','😔','😪','😷','🤒','🤕','🤢','🥵','🥶','😵','🤯','🥳','😎','🤓','😕','😟','🙁','😮','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾','🤖','👋','🤚','🖐️','✋','👌','✌️','🤞','👍','👎','✊','👊','👏','🙌','🙏','💪','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💘','🔥','⭐','✨','🎉','🎊','🎈','🎁','🏆','🥇','🎯','💯','✅','❌','⚠️','🔔','📱','💻','🖥️','📷','🎵','🎶','🎤','🎧','🎮','🚀','✈️','🌍','🌟','🌈','⚽','🏀','🎾','⚡','🌊','🍕','🍔','🍟','🍣','🍜','🍺','🍷','☕','🧃','🥤'],
  STATUS_COLORS: ['#25D366','#075e54','#128c7e','#34b7f1','#00a884','#5475e5','#7f66ff','#009de2','#ea4335','#fbbc04','#ff6d6d','#4caf50','#e91e63','#9c27b0','#ff9800'],
};
