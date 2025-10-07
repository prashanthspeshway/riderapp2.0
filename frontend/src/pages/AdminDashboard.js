import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar
} from '@mui/material';
import {
  Person,
  DirectionsCar,
  CheckCircle,
  Cancel,
  Visibility,
  Refresh,
  Search,
  FilterList,
  LocalTaxi,
  Warning,
  TrendingUp,
  Security,
  Phone,
  Email,
  LocationOn,
  AccessTime,
  AttachMoney,
  Star,
  Image,
  Download,
  Schedule,
  Help
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';

export default function AdminDashboard() {
  const { auth } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [riders, setRiders] = useState([]);
  const [userRiders, setUserRiders] = useState([]);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOverview(),
        fetchRiders(),
        fetchUserRiders(),
        fetchUsers(),
        fetchRides(),
        fetchSOSAlerts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      console.log('🔍 Fetching overview...');
      const response = await api.getOverview();
      console.log('📊 Overview response:', response.data);
      if (response.data.success) {
        setOverview(response.data.data);
        console.log('✅ Set overview data:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching overview:', error);
    }
  };

  const fetchRiders = async () => {
    try {
      console.log('🔍 Fetching pending riders...');
      const response = await api.getAllRiders('pending');
      console.log('📊 Pending riders response:', response.data);
      if (response.data.success) {
        setRiders(response.data.riders || []);
        console.log('✅ Set pending riders:', response.data.riders?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching riders:', error);
    }
  };

  // Get pending riders from both collections
  const getPendingRiders = () => {
    const newRiders = riders.filter(rider => rider.status === 'pending');
    const oldRiders = userRiders.filter(rider => rider.approvalStatus === 'pending');
    
    // Convert old riders to new format
    const convertedOldRiders = oldRiders.map(rider => ({
      ...rider,
      firstName: rider.fullName?.split(' ')[0] || '',
      lastName: rider.fullName?.split(' ').slice(1).join(' ') || '',
      status: rider.approvalStatus,
      documents: rider.documents || {}
    }));
    
    return [...newRiders, ...convertedOldRiders];
  };

  const fetchApprovedRiders = async () => {
    try {
      const response = await api.getAllRiders('approved');
      if (response.data.success) {
        return response.data.riders || [];
      }
    } catch (error) {
      console.error('Error fetching approved riders:', error);
    }
    return [];
  };

  const fetchUsers = async () => {
    try {
      const response = await api.getAllUsers();
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserRiders = async () => {
    try {
      const response = await api.get('/admin/user-riders');
      if (response.data.success) {
        setUserRiders(response.data.riders || []);
      }
    } catch (error) {
      console.error('Error fetching user riders:', error);
    }
  };


  // Get only approved riders from both collections
  const getApprovedRiders = () => {
    const newRiders = riders.filter(rider => rider.status === 'approved');
    const oldRiders = userRiders.filter(rider => rider.approvalStatus === 'approved');
    
    // Convert old riders to new format
    const convertedOldRiders = oldRiders.map(rider => ({
      ...rider,
      firstName: rider.fullName?.split(' ')[0] || '',
      lastName: rider.fullName?.split(' ').slice(1).join(' ') || '',
      status: rider.approvalStatus,
      documents: rider.documents || {}
    }));
    
    return [...newRiders, ...convertedOldRiders];
  };

  // Get rejected riders from both collections
  const getRejectedRiders = () => {
    const newRiders = riders.filter(rider => rider.status === 'rejected');
    const oldRiders = userRiders.filter(rider => rider.approvalStatus === 'rejected');
    
    // Convert old riders to new format
    const convertedOldRiders = oldRiders.map(rider => ({
      ...rider,
      firstName: rider.fullName?.split(' ')[0] || '',
      lastName: rider.fullName?.split(' ').slice(1).join(' ') || '',
      status: rider.approvalStatus,
      documents: rider.documents || {}
    }));
    
    return [...newRiders, ...convertedOldRiders];
  };

  // Get all riders from both collections (for Total Riders tab)
  const getAllRiders = () => {
    const approvedRiders = getApprovedRiders();
    const pendingRiders = getPendingRiders();
    const rejectedRiders = getRejectedRiders();
    
    return [...approvedRiders, ...pendingRiders, ...rejectedRiders];
  };

  // Calculate combined overview stats
  const getCombinedOverview = () => {
    const approvedRiders = getApprovedRiders();
    const pendingRiders = getPendingRiders();
    const rejectedRiders = getRejectedRiders();
    const allRiders = getAllRiders();
    
    return {
      ...overview,
      approvedRiders: approvedRiders.length,
      pendingCaptains: pendingRiders.length,
      rejectedRiders: rejectedRiders.length,
      riders: allRiders.length
    };
  };

  const fetchRides = async () => {
    try {
      const response = await api.getAllRides();
      if (response.data.success) {
        setRides(response.data.rides || []);
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const fetchSOSAlerts = async () => {
    try {
      const response = await api.getSOSAlerts();
      if (response.data.success) {
        setSosAlerts(response.data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching SOS alerts:', error);
    }
  };

  const handleViewRider = (rider) => {
    setSelectedRider(rider);
    setViewDialogOpen(true);
  };

  const handleUpdateStatus = (rider, newStatus) => {
    setSelectedRider(rider);
    setStatusDialogOpen(true);
    setAdminNotes(rider.adminNotes || '');
    setRejectionReason(rider.rejectionReason || '');
  };

  const confirmStatusUpdate = async () => {
    try {
      const updateData = {
        status: selectedRider.status,
        adminNotes,
        rejectionReason: selectedRider.status === 'rejected' ? rejectionReason : ''
      };

      await api.updateRiderStatus(selectedRider._id, updateData);
      showSuccess(`Rider ${selectedRider.status} successfully`);
      setStatusDialogOpen(false);
      // Refresh both pending and approved riders
      fetchRiders();
      fetchUserRiders();
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Failed to update rider status');
    }
  };

  const filteredRiders = riders.filter(rider => {
    const matchesSearch = !searchTerm || 
      rider.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.mobile.includes(searchTerm) ||
      rider.panNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || rider.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FilterList />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return <Person />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage riders, users, rides, and monitor system activity
        </Typography>
      </Box>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card 
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white', 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
            onClick={() => setActiveTab(3)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {getCombinedOverview().users || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Users</Typography>
                </Box>
                <Person sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card 
            sx={{ 
              bgcolor: 'success.main', 
              color: 'white', 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
            onClick={() => setActiveTab(1)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {getCombinedOverview().approvedRiders || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Approved Riders</Typography>
                </Box>
                <DirectionsCar sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card 
            sx={{ 
              bgcolor: 'warning.main', 
              color: 'white', 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
            onClick={() => setActiveTab(0)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {getCombinedOverview().pendingCaptains || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Pending Riders</Typography>
                </Box>
                <Security sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card 
            sx={{ 
              bgcolor: 'info.main', 
              color: 'white', 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
            onClick={() => setActiveTab(4)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {getCombinedOverview().rides || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Rides</Typography>
                </Box>
                <LocalTaxi sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card 
            sx={{ 
              bgcolor: 'error.main', 
              color: 'white', 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
            onClick={() => setActiveTab(5)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {sosAlerts.length || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>SOS Alerts</Typography>
                </Box>
                <Warning sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card 
            sx={{ 
              bgcolor: 'secondary.main', 
              color: 'white', 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
            onClick={() => setActiveTab(2)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {getCombinedOverview().riders || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Riders</Typography>
                </Box>
                <LocalTaxi sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Pending Riders" />
            <Tab label="Approved Riders" />
            <Tab label="All Riders" />
            <Tab label="Users" />
            <Tab label="Rides" />
            <Tab label="SOS Alerts" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <RiderApplicationsTab
              riders={getPendingRiders()}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onViewRider={handleViewRider}
              onUpdateStatus={handleUpdateStatus}
              onRefresh={() => { fetchRiders(); fetchUserRiders(); }}
            />
          )}
          {activeTab === 1 && (
            <ApprovedRidersTab
              riders={getApprovedRiders()}
              onViewRider={handleViewRider}
              onRefresh={() => { fetchRiders(); fetchUserRiders(); }}
            />
          )}
          {activeTab === 2 && (
            <AllRidersTab
              riders={getAllRiders()}
              onViewRider={handleViewRider}
              onRefresh={() => { fetchRiders(); fetchUserRiders(); }}
            />
          )}
          {activeTab === 3 && (
            <UsersTab users={users} onRefresh={fetchUsers} />
          )}
          {activeTab === 4 && (
            <RidesTab rides={rides} onRefresh={fetchRides} />
          )}
          {activeTab === 5 && (
            <SOSAlertsTab alerts={sosAlerts} onRefresh={fetchSOSAlerts} />
          )}
        </Box>
      </Card>

      {/* View Rider Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          Rider Details - {selectedRider?.firstName} {selectedRider?.lastName}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedRider && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>Personal Information</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body1">{selectedRider.firstName} {selectedRider.lastName}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{selectedRider.email}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Mobile</Typography>
                  <Typography variant="body1">{selectedRider.mobile}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>Document Information</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">PAN Number</Typography>
                  <Typography variant="body1">{selectedRider.panNumber}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Aadhar Number</Typography>
                  <Typography variant="body1">{selectedRider.aadharNumber}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">License Number</Typography>
                  <Typography variant="body1">{selectedRider.licenseNumber}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Vehicle Number</Typography>
                  <Typography variant="body1">{selectedRider.vehicleNumber}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>Uploaded Documents</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(selectedRider.documents || {}).map(([key, url]) => (
                    <Card key={key} sx={{ p: 1, minWidth: 120 }}>
                      <CardContent sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Typography>
                        {url ? (
                          <Box>
                            <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                            <Button
                              size="small"
                              onClick={() => window.open(url, '_blank')}
                              sx={{ mt: 1 }}
                            >
                              View
                            </Button>
                          </Box>
                        ) : (
                          <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          Update Rider Status - {selectedRider?.status?.toUpperCase()}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            fullWidth
            label="Admin Notes"
            multiline
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Add any notes about this rider..."
          />
          {selectedRider?.status === 'rejected' && (
            <TextField
              fullWidth
              label="Rejection Reason"
              multiline
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmStatusUpdate}
            sx={{ bgcolor: 'success.main' }}
          >
            Confirm {selectedRider?.status}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// Tab Components
const RiderApplicationsTab = ({ riders, searchTerm, setSearchTerm, statusFilter, setStatusFilter, onViewRider, onUpdateStatus, onRefresh }) => {
  console.log('RiderApplicationsTab - riders:', riders);
  const filteredRiders = riders.filter(rider => {
    const matchesSearch = !searchTerm || 
      rider.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.mobile?.includes(searchTerm) ||
      rider.panNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || rider.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FilterList />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return <Person />;
    }
  };

  return (
    <Box>
      {/* Search and Filter */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
        <TextField
          placeholder="Search riders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select
          label="Status Filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </TextField>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRefresh}
          sx={{ borderColor: 'success.main', color: 'success.main' }}
        >
          Refresh
        </Button>
      </Box>

      {/* Riders Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRiders.map((rider) => (
              <TableRow key={rider._id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {rider.firstName} {rider.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rider.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{rider.mobile}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    PAN: {rider.panNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(rider.documents || {}).map(([key, url]) => (
                      url && (
                        <Chip
                          key={key}
                          label={key.replace(/([A-Z])/g, ' $1').trim()}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {Object.values(rider.documents || {}).filter(Boolean).length}/7 documents
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(rider.status)}
                    label={rider.status?.toUpperCase() || 'UNKNOWN'}
                    color={getStatusColor(rider.status)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(rider.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(rider.createdAt).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => onViewRider(rider)}
                        sx={{ color: 'primary.main' }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {rider.status === 'pending' && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            onClick={() => onUpdateStatus({ ...rider, status: 'approved' }, 'approved')}
                            sx={{ color: 'success.main' }}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            onClick={() => onUpdateStatus({ ...rider, status: 'rejected' }, 'rejected')}
                            sx={{ color: 'error.main' }}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const UsersTab = ({ users, onRefresh }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h6">Users ({users.length})</Typography>
      <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh}>
        Refresh
      </Button>
    </Box>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Mobile</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Joined</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {user.fullName?.charAt(0) || 'U'}
                  </Avatar>
                  <Typography variant="subtitle2">{user.fullName}</Typography>
                </Box>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.mobile}</TableCell>
              <TableCell>
                <Chip label={user.role} color="primary" size="small" />
              </TableCell>
              <TableCell>
                <Chip 
                  label={user.approvalStatus || 'Unknown'} 
                  color={user.approvalStatus === 'approved' ? 'success' : 'warning'} 
                  size="small" 
                />
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

const RidesTab = ({ rides, onRefresh }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h6">Rides ({rides.length})</Typography>
      <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh}>
        Refresh
      </Button>
    </Box>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Ride ID</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Rider</TableCell>
            <TableCell>Route</TableCell>
            <TableCell>Fare</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rides.map((ride) => (
            <TableRow key={ride._id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {String(ride._id).slice(-8)}
                </Typography>
              </TableCell>
              <TableCell>{ride.userId?.fullName || 'Unknown'}</TableCell>
              <TableCell>{ride.captainId?.fullName || 'Unknown'}</TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {ride.pickup}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    to {ride.drop}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  ₹{ride.fare?.toFixed(2) || '0.00'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={ride.status} 
                  color={ride.status === 'completed' ? 'success' : 'warning'} 
                  size="small" 
                />
              </TableCell>
              <TableCell>{new Date(ride.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

const SOSAlertsTab = ({ alerts, onRefresh }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h6">SOS Alerts ({alerts.length})</Typography>
      <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh}>
        Refresh
      </Button>
    </Box>
    <List>
      {alerts.map((alert, index) => (
        <ListItem key={index} divider={index < alerts.length - 1}>
          <ListItemIcon>
            <Warning color="error" />
          </ListItemIcon>
          <ListItemText
            primary={`Alert from ${alert.userName || 'Unknown User'}`}
            secondary={
              <Box>
                <Typography variant="body2">{alert.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(alert.timestamp).toLocaleString()}
                </Typography>
              </Box>
            }
          />
          <Button size="small" variant="outlined" color="error">
            Resolve
          </Button>
        </ListItem>
      ))}
      {alerts.length === 0 && (
        <ListItem>
          <ListItemText primary="No SOS alerts" />
        </ListItem>
      )}
    </List>
  </Box>
);

// All Riders Tab Component (for Total Riders)
const AllRidersTab = ({ riders = [], onViewRider, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing all riders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FilterList />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return <Person />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          All Riders ({riders.length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{ borderColor: 'primary.main', color: 'primary.main' }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* Riders Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Documents</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {riders.map((rider) => (
              <TableRow key={rider._id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {rider.firstName} {rider.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rider.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{rider.mobile}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      PAN: {rider.panNumber || 'N/A'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {rider.documents && Object.keys(rider.documents).length > 0 ? (
                      Object.keys(rider.documents).map((docType) => (
                        <Chip
                          key={docType}
                          label={docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No documents
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(rider.status)}
                    label={rider.status?.toUpperCase() || 'UNKNOWN'}
                    color={getStatusColor(rider.status)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {rider.approvedAt ? new Date(rider.approvedAt).toLocaleDateString() : 
                     rider.rejectedAt ? new Date(rider.rejectedAt).toLocaleDateString() :
                     new Date(rider.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => onViewRider(rider)}
                        sx={{ color: 'primary.main' }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Call">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`tel:${rider.mobile}`)}
                        sx={{ color: 'success.main' }}
                      >
                        <Phone />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Email">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`mailto:${rider.email}`)}
                        sx={{ color: 'info.main' }}
                      >
                        <Email />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {riders.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No riders found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Approved Riders Tab Component
const ApprovedRidersTab = ({ riders = [], onViewRider, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing approved riders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Schedule />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return <Help />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
          Approved Riders ({riders.length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{ borderColor: 'success.main', color: 'success.main' }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* Riders Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'success.light', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Approved Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {riders.map((rider) => (
              <TableRow key={rider._id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {rider.firstName} {rider.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rider.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{rider.mobile}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    PAN: {rider.panNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(rider.documents || {}).map(([key, url]) => (
                      url && (
                        <Chip
                          key={key}
                          label={key.replace(/([A-Z])/g, ' $1').trim()}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {Object.values(rider.documents || {}).filter(Boolean).length}/7 documents
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(rider.status)}
                    label={rider.status?.toUpperCase() || 'UNKNOWN'}
                    color={getStatusColor(rider.status)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {rider.approvedAt ? new Date(rider.approvedAt).toLocaleDateString() : 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {rider.approvedAt ? new Date(rider.approvedAt).toLocaleTimeString() : ''}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => onViewRider(rider)}
                        sx={{ color: 'primary.main' }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Contact">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`tel:${rider.mobile}`)}
                        sx={{ color: 'success.main' }}
                      >
                        <Phone />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Email">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`mailto:${rider.email}`)}
                        sx={{ color: 'info.main' }}
                      >
                        <Email />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {riders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <DirectionsCar sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Approved Riders
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Approved riders will appear here once they are approved by admin.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
