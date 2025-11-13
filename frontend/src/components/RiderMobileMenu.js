import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Typography,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  Person,
  History,
  Settings,
  Logout
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const RiderMobileMenu = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Hamburger Menu - Only visible on mobile */}
      <Box sx={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 1300,
        display: { xs: 'block', md: 'none' },
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)'
      }}>
        <IconButton
          onClick={() => setDrawerOpen(true)}
          sx={{
            color: '#4caf50',
            p: 1.5,
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.1)'
            }
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            backgroundColor: '#ffffff',
          }
        }}
      >
        {/* Profile Section */}
        <Box sx={{ 
          p: 3, 
          backgroundColor: '#4caf50',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar 
            src={auth?.user?.profilePicture || auth?.user?.documents?.profilePicture}
            sx={{ 
              width: 60, 
              height: 60,
              border: '3px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {auth?.user?.fullName?.charAt(0) || auth?.user?.firstName?.charAt(0) || 'R'}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              {auth?.user?.fullName || `${auth?.user?.firstName || ''} ${auth?.user?.lastName || ''}`.trim() || 'Rider'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.9rem' }}>
              {auth?.user?.mobile || 'Rider'}
            </Typography>
          </Box>
        </Box>

        <List sx={{ pt: 1 }}>
          {/* Home/Dashboard */}
          <ListItem 
            button 
            onClick={() => { 
              setDrawerOpen(false); 
              navigate('/rider-dashboard');
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon><Home sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText 
              primary="Home" 
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItem>

          {/* Profile */}
          <ListItem 
            button 
            onClick={() => { 
              setDrawerOpen(false); 
              navigate('/profile');
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon><Person sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText 
              primary="Profile" 
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItem>
          
          {/* Ride History */}
          <ListItem 
            button 
            onClick={() => { 
              setDrawerOpen(false); 
              navigate('/history');
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon><History sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText 
              primary="Ride History" 
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItem>
          
          {/* Settings */}
          <ListItem 
            button 
            onClick={() => { 
              setDrawerOpen(false); 
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon><Settings sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText 
              primary="Settings" 
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItem>

          <Divider sx={{ my: 1 }} />
          
          {/* Logout */}
          <ListItem 
            button 
            onClick={async () => { 
              setDrawerOpen(false);
              await logout();
              navigate('/rider-login');
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon><Logout sx={{ color: '#f44336' }} /></ListItemIcon>
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ fontWeight: 500, color: '#f44336' }}
            />
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default RiderMobileMenu;