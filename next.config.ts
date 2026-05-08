import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow any host in development — needed for mobile devices on local network.
  // Has no effect in production.
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['*'],
  }),
}

export default nextConfig
