/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'start.gg',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'smash.gg',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.start.gg',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.smash.gg',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.start.gg',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.smash.gg',
        port: '',
        pathname: '/**',
      },
    ],
  },
}
 
module.exports = nextConfig 