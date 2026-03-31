import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.STANDALONE_BUILD === '1' ? 'standalone' : undefined,
  transpilePackages: ['mathml2omml', 'pptxgenjs'],
  serverExternalPackages: [],
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
};

export default nextConfig;
