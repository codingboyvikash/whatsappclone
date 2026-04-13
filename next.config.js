/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs', 'multer'],
  allowedDevOrigins: ['192.168.50.211'],
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Production configuration
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://youryory.site' : '',
  // Disable Turbopack temporarily to avoid panic errors
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Disable HMR in production
    if (!dev) {
      config.devServer = {
        ...config.devServer,
        hot: false,
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
