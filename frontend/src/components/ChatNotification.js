import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { Chat } from '@mui/icons-material';
import socket from '../services/socket';

const ChatNotification = ({ ride, onChatOpen, userRole }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatSocket, setChatSocket] = useState(null);

  useEffect(() => {
    if (ride && ride._id) {
      // Initialize socket connection
      const newSocket = socket;
      setChatSocket(newSocket);

      // Join chat room
      const roomId = `ride_${ride._id}`;
      newSocket.emit('joinChatRoom', roomId);

      // Listen for new messages
      newSocket.on('message', (messageData) => {
        // Only count messages from other users
        if (messageData.sender !== userRole) {
          setUnreadCount(prev => prev + 1);
          
          // Play notification sound
          playNotificationSound();
        }
      });

      // Load initial unread count
      loadUnreadCount();

      return () => {
        // shared socket remains open; remove listeners for this component
        if (newSocket && newSocket.off) {
          newSocket.off('message');
        }
      };
    }
  }, [ride, userRole]);

  const loadUnreadCount = async () => {
    try {
      // Temporarily without auth header for testing
      const base = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000');
      const response = await fetch(`${base}/api/chat/messages/${ride._id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Count unread messages (messages not from current user)
          const unread = data.messages.filter(msg => 
            msg.sender !== userRole && !msg.isRead
          ).length;
          setUnreadCount(unread);
        }
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const handleChatClick = () => {
    setUnreadCount(0); // Reset unread count when opening chat
    onChatOpen();
  };

  if (!ride) return null;

  return (
    <Tooltip title={unreadCount > 0 ? `${unreadCount} unread messages` : 'Open chat'}>
      <IconButton 
        onClick={handleChatClick}
        sx={{ 
          color: unreadCount > 0 ? 'primary.main' : 'inherit',
          position: 'relative'
        }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          max={99}
        >
          <Chat />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default ChatNotification;
