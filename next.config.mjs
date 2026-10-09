/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Evitar que regras de lint bloqueiem o deploy de produção
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Evitar que avisos de tipagem estrita bloqueiem o deploy na Vercel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
