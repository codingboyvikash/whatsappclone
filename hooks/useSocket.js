'use client';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
      if (err.message === 'Auth required' || err.message === 'Invalid token') {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return { socket: socketRef.current, connected };
}
