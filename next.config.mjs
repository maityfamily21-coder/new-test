/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep your existing build settings
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // --- THIS IS THE FIX FOR THE "addon.node" ERROR ---
  serverExternalPackages: ['pg'],
  webpack: (config) => {
    config.externals.push({
      'pg-native': 'pg-native',
    });
    return config;
  },
};

export default nextConfig;
