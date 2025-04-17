/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                os: false,
            };
        }
        return config;
    },
    transpilePackages: [
        '@solana/wallet-adapter-base',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
    ],
    async headers() {
        return [
            {
                // Apply these headers to all routes
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                ]
            }
        ]
    },
    output: 'standalone',
    reactStrictMode: true,
    swcMinify: true,
    eslint: {
        dirs: ['src'],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    typescript: {
        // Handle type checking in CI/CD pipeline
        ignoreBuildErrors: process.env.NODE_ENV === 'production',
    },
    experimental: {
        // Optimize server-side rendering performance
        serverComponentsExternalPackages: ['bcrypt'],
    }
};

module.exports = nextConfig;
