import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box
} from "@mui/material";

// Common cancel reasons inspired by Rapido/Uber
const DEFAULT_REASONS = [
  "Driver taking too long",
  "Driver not moving towards pickup",
  "Changed my mind",
  "Wrong pickup/drop location",
  "Found alternate transport",
  "Price too high",
  "Safety concerns",
  "Other"
];

export default function CancelTripModal({ open, onClose, onConfirm, reasons = DEFAULT_REASONS }) {
  const [selected, setSelected] = useState(reasons[0] || "");

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cancel Ride</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Please select a reason for cancelling. This helps us improve matching and service quality.
        </Typography>
        <RadioGroup value={selected} onChange={(e) => setSelected(e.target.value)}>
          {reasons.map((reason) => (
            <FormControlLabel key={reason} value={reason} control={<Radio />} label={reason} />
          ))}
        </RadioGroup>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Cancellation may include platform fee depending on ride status.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button color="error" variant="contained" onClick={handleConfirm}>
          Confirm Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}