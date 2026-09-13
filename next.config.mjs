/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep database/cache drivers out of the server bundle so their runtime
  // type checks (e.g. `value instanceof Date` in postgres-js) keep working.
  experimental: {
    serverComponentsExternalPackages: ['postgres', 'ioredis'],
  },
};

export default nextConfig;
