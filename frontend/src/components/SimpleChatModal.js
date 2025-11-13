import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Send,
  Close,
  Phone,
  Person
} from '@mui/icons-material';
import io from 'socket.io-client';
import { API_BASE } from '../services/api';

// Notification sound function
const playNotificationSound = () => {
  try {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    console.log('Could not play notification sound:', error);
  }
};

const SimpleChatModal = ({ open, onClose, ride, userRole, socket, auth }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && ride && ride._id) {
      console.log('💬 Chat modal opened with ride:', ride);
      console.log('💬 Ride ID:', ride._id);
      console.log('💬 User role:', userRole);
      console.log('💬 Socket received:', socket);
      console.log('💬 Socket connected:', socket?.connected);
      
      // Load previous messages from database
      const loadMessages = async () => {
        try {
          setLoading(true);
          console.log('💬 Loading messages for ride:', ride._id);
          
          const response = await fetch(`${API_BASE}/api/chat/messages/${ride._id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('💬 Messages loaded from API:', data);
            
            if (data.success && data.messages) {
              const formattedMessages = data.messages.map(msg => ({
                id: msg._id,
                text: msg.message,
                sender: msg.sender,
                timestamp: new Date(msg.timestamp)
              }));
              
              console.log('💬 Formatted messages:', formattedMessages);
              setMessages(formattedMessages);
              
              // Save to localStorage
              localStorage.setItem(`chat_${ride._id}`, JSON.stringify(formattedMessages));
            } else {
              console.log('💬 No messages found, trying localStorage');
              // Try to load from localStorage as fallback
              const savedMessages = localStorage.getItem(`chat_${ride._id}`);
              if (savedMessages) {
                const parsedMessages = JSON.parse(savedMessages);
                console.log('💬 Loaded from localStorage:', parsedMessages);
                setMessages(parsedMessages);
              } else {
                console.log('💬 No saved messages found');
                setMessages([]);
              }
            }
          } else {
            console.error('💬 Failed to load messages:', response.status);
            // Try to load from localStorage as fallback
            const savedMessages = localStorage.getItem(`chat_${ride._id}`);
            if (savedMessages) {
              const parsedMessages = JSON.parse(savedMessages);
              console.log('💬 Loaded from localStorage fallback:', parsedMessages);
              setMessages(parsedMessages);
            }
          }
        } catch (error) {
          console.error('💬 Error loading messages:', error);
          // Try to load from localStorage as fallback
          const savedMessages = localStorage.getItem(`chat_${ride._id}`);
          if (savedMessages) {
            const parsedMessages = JSON.parse(savedMessages);
            console.log('💬 Loaded from localStorage error fallback:', parsedMessages);
            setMessages(parsedMessages);
          }
        } finally {
          setLoading(false);
        }
      };

      loadMessages();

      if (socket) {
        // Join chat room
        const roomId = `ride_${ride._id}`;
        console.log('💬 Socket available, joining chat room:', roomId);
        console.log('💬 Socket connected status:', socket.connected);
        socket.emit('joinChatRoom', roomId);
        console.log('💬 joinChatRoom event emitted');

        // Listen for messages
        const handleMessage = (messageData) => {
          console.log('💬 Received message:', messageData);
          
          // Play notification sound for incoming messages (only if not from current user)
          if (messageData.sender !== userRole) {
            playNotificationSound();
          }
          
          setMessages(prev => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(msg => 
              msg.text === messageData.text && 
              msg.sender === messageData.sender && 
              Math.abs(new Date(msg.timestamp) - new Date(messageData.timestamp)) < 1000
            );
            
            if (exists) {
              console.log('💬 Duplicate message ignored');
              return prev;
            }
            
            const newMessage = {
              id: messageData.id || Date.now() + Math.random(),
              text: messageData.text,
              sender: messageData.sender,
              timestamp: new Date(messageData.timestamp)
            };
            
            console.log('💬 Adding new message to state:', newMessage);
            const newMessages = [...prev, newMessage];
            
            // Save to localStorage
            localStorage.setItem(`chat_${ride._id}`, JSON.stringify(newMessages));
            
            return newMessages;
          });
        };

        // Listen for room join confirmation
        const handleJoinedRoom = (data) => {
          console.log('💬 Joined room confirmation:', data);
        };

        socket.on('message', handleMessage);
        socket.on('joinedRoom', handleJoinedRoom);

        return () => {
          console.log('💬 Cleaning up chat listeners');
          socket.off('message', handleMessage);
          socket.off('joinedRoom', handleJoinedRoom);
        };
      }
    }
  }, [open, ride, socket, userRole]);

  const handleSendMessage = () => {
    console.log('💬 handleSendMessage called');
    console.log('💬 Message:', message);
    console.log('💬 Socket:', socket);
    console.log('💬 Ride:', ride);
    console.log('💬 User role:', userRole);
    
    if (message.trim() && socket && ride && ride._id) {
      const token = auth?.token || localStorage.getItem('token');
      const userData = auth?.user || JSON.parse(localStorage.getItem('user') || '{}');
      
      // Get senderId based on user role and ride data
      let senderId;
      if (userRole === 'user') {
        // For user, use their own ID from userData or ride.riderId
        senderId = userData?._id || ride.riderId?._id || ride.riderId;
      } else {
        // For rider, use their own ID from userData or ride.captainId
        senderId = userData?._id || ride.captainId?._id || ride.captainId;
      }
      
      console.log('💬 User data:', userData);
      console.log('💬 Ride data:', ride);
      console.log('💬 SenderId:', senderId);
      console.log('💬 User role:', userRole);
      console.log('💬 Ride riderId:', ride.riderId);
      console.log('💬 Ride captainId:', ride.captainId);
      
      // Validate senderId before sending
      if (!senderId) {
        console.error('💬 No valid senderId found');
        console.error('💬 Available data:', { userData, ride, userRole });
        alert('Unable to send message: User ID not found. Please refresh and try again.');
        return;
      }

      const messageData = {
        text: message.trim(),
        sender: userRole,
        senderId: senderId,
        timestamp: new Date().toISOString(),
        rideId: ride._id
      };
      
      // Send message via socket
      const roomId = `ride_${ride._id}`;
      console.log('💬 Sending message via socket:', messageData);
      console.log('💬 Socket connected:', socket.connected);
      socket.emit('sendMessage', { roomId, message: messageData });
      
      // Add message to local state immediately (optimistic update)
      const tempMessage = {
        id: Date.now() + Math.random(),
        text: message.trim(),
        sender: userRole,
        timestamp: new Date()
      };
      
      setMessages(prev => {
        const newMessages = [...prev, tempMessage];
        // Save to localStorage
        localStorage.setItem(`chat_${ride._id}`, JSON.stringify(newMessages));
        return newMessages;
      });
      
      setMessage('');
    } else {
      console.log('💬 Cannot send message - missing requirements:');
      console.log('💬 Message trimmed:', message.trim());
      console.log('💬 Socket available:', !!socket);
      console.log('💬 Ride available:', !!ride);
      console.log('💬 Ride ID:', ride?._id);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    try {
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString();
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleTimeString();
      } else {
        console.warn('Invalid timestamp format:', timestamp);
        return new Date().toLocaleTimeString();
      }
    } catch (error) {
      console.warn('Error formatting timestamp:', error);
      return new Date().toLocaleTimeString();
    }
  };

  const getDisplayName = () => {
    if (userRole === 'user') {
      return ride?.captainId?.fullName || 'Driver';
    } else {
      return ride?.riderId?.fullName || 'Passenger';
    }
  };

  const getDisplayPhone = () => {
    if (userRole === 'user') {
      return ride?.captainId?.mobile || 'Contact not available';
    } else {
      return ride?.riderId?.mobile || 'Contact not available';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '500px',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1.5
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
            <Person />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              {getDisplayName()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.8rem' }}>
              {getDisplayPhone()}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            size="small" 
            sx={{ color: 'white' }}
            onClick={() => {/* Handle call */}}
          >
            <Phone />
          </IconButton>
          <IconButton 
            size="small" 
            sx={{ color: 'white' }}
            onClick={onClose}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '400px' }}>
        {/* Messages Area */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress size={40} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: 2
            }}>
              <Typography variant="body2" color="text.secondary">
                No messages yet. Start the conversation!
              </Typography>
            </Box>
          ) : (
            messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: msg.sender === userRole ? 'flex-end' : 'flex-start',
                  mb: 1
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    bgcolor: msg.sender === userRole ? 'primary.main' : 'grey.100',
                    color: msg.sender === userRole ? 'white' : 'text.primary',
                    borderRadius: msg.sender === userRole ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    boxShadow: 1
                  }}
                >
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {msg.text}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      textAlign: 'right',
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: '0.7rem'
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </Typography>
                </Paper>
              </Box>
            ))
          )}
        </Box>

        {/* Message Input Area */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          alignItems: 'center'
        }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
            variant="outlined"
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            startIcon={<Send />}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            Send
          </Button>
          
          {/* Debug button - remove in production */}
          <Button
            variant="outlined"
            onClick={() => {
              console.log('💬 Debug: Socket connected:', socket?.connected);
              console.log('💬 Debug: Socket ID:', socket?.id);
              console.log('💬 Debug: Ride data:', ride);
              console.log('💬 Debug: User role:', userRole);
              playNotificationSound();
            }}
            sx={{ ml: 1, minWidth: 80, fontSize: '0.7rem' }}
          >
            Debug
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleChatModal;