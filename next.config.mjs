/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages 配置 - 将所有 @libsql 相关包标记为外部依赖
  serverExternalPackages: [
    '@libsql/client',
    '@libsql/core',
    '@libsql/hrana-client',
    '@libsql/isomorphic-fetch',
    '@libsql/isomorphic-ws',
    'drizzle-orm',
  ],
};

export default nextConfig;
