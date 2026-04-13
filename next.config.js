/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs', 'multer'],
  allowedDevOrigins: ['192.168.50.211'],
  // Production configuration
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://youryory.site' : '',
  // Simple webpack config for production
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Environment variables for production
  env: {
    CUSTOM_KEY: process.env.NODE_ENV === 'production' ? 'production-value' : 'development-value',
  },
};

module.exports = nextConfig;
