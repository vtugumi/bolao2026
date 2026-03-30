/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'jsonwebtoken'],
};

export default nextConfig;
