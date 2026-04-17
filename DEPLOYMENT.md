# Deployment Guide for https://youryory.site

## Environment Setup

### 1. Production Environment Variables
Create `.env.production` file with:
```
NEXT_PUBLIC_APP_URL=https://youryory.site
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-clone?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-for-production
NODE_ENV=production
PORT=3000

# WebRTC calls
NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
NEXT_PUBLIC_TURN_URLS=turn:your-turn-domain:3478,turns:your-turn-domain:5349
NEXT_PUBLIC_TURN_USERNAME=your-turn-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-turn-password
```

### 2. MongoDB Setup
- Replace `username:password` with your actual MongoDB Atlas credentials
- Ensure your MongoDB Atlas cluster allows connections from your deployment server
- Use the connection string provided by MongoDB Atlas

### 3. Build and Deploy Commands

#### Local Production Build
```bash
npm run build:prod
npm run start:prod
```

#### Deployment Steps
1. Push code to your repository
2. Set environment variables in your hosting platform
3. Run build command: `npm run build`
4. Start production server: `npm run start:prod`

## Important Notes

- The application uses a custom server with Socket.IO
- Audio/video calls need a TURN server in production. STUN-only calls may ring and show connected, but media can fail on mobile networks, carrier NAT, or strict routers.
- MongoDB connection uses IPv4 in production
- JWT secret must be changed for production security
- Ensure all environment variables are set in production

## SSL/HTTPS
The application is configured to run on `https://youryory.site` with proper SSL certificates.
