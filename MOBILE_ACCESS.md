# Accessing the App from Mobile Device

## Setup Complete ✅

The app has been configured to be accessible on your local network.

## Your Local IP Address
- **Primary IP**: `192.168.1.13`
- **Alternative IP**: `192.168.56.1` (VirtualBox adapter)

## How to Access

1. **Make sure both servers are running:**
   - Backend: `http://192.168.1.13:5000` (or `http://localhost:5000` on your computer)
   - Frontend: `http://192.168.1.13:3000` (or `http://localhost:3000` on your computer)

2. **On your mobile device:**
   - Connect to the same Wi-Fi network as your computer
   - Open browser and go to: `http://192.168.1.13:3000`

## Important Notes

1. **Restart Required**: After making these changes, you MUST restart both servers:
   ```bash
   # Stop both servers (Ctrl+C)
   # Then restart them using start.bat or manually
   ```

2. **Firewall**: Windows Firewall might block incoming connections. If it doesn't work:
   - Open Windows Defender Firewall
   - Allow ports 3000 and 5000 for incoming connections
   - Or temporarily disable firewall for testing

3. **Network**: Make sure your mobile device is on the same Wi-Fi network as your computer

4. **If it still doesn't work:**
   - Check that both servers are actually running
   - Try accessing `http://192.168.1.13:5000/api/vehicle-types` from your mobile browser to test backend
   - Check browser console on mobile for any errors
   - Verify your computer's IP hasn't changed (run `ipconfig` again)

## Troubleshooting

### Backend not accessible
- Check if backend is listening on 0.0.0.0 (should see message in console)
- Check Windows Firewall settings
- Try accessing `http://192.168.1.13:5000` directly from mobile browser

### Frontend not accessible
- Check if frontend dev server started with HOST=0.0.0.0
- Verify .env file exists in frontend folder
- Check Windows Firewall settings

### API calls failing
- Check browser console on mobile for CORS errors
- Verify backend CORS settings allow your mobile IP
- Check network tab to see if requests are being made



