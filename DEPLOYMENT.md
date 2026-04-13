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
- MongoDB connection uses IPv4 in production
- JWT secret must be changed for production security
- Ensure all environment variables are set in production

## SSL/HTTPS
The application is configured to run on `https://youryory.site` with proper SSL certificates.
