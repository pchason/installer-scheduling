/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'pino',
        'pino-pretty',
        '@anush008/tokenizers',
        '@anush008/tokenizers-darwin-universal',
        'fastembed',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
