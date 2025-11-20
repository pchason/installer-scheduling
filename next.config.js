/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'pino', 'pino-pretty'];
    }
    return config;
  },
};

module.exports = nextConfig;
