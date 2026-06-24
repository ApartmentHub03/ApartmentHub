/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable CSS Modules with .module.css pattern (default in Next.js)
    // Images from external domains if needed
    images: {
        domains: [],
    },
    eslint: {
        // Temporary: unblock `next build` while ESLint 9 + legacy config is stabilized
        ignoreDuringBuilds: true,
    },

    webpack(config) {
        // Allow importing videos/other binary assets from src/ (Vite-style)
        config.module.rules.push({
            test: /\.(mp4|webm|ogg|mp3|wav|flac|aac|pdf)$/i,
            type: 'asset/resource',
        });

        return config;
    },
    // Redirect non-www to www and strip BOM characters
    async redirects() {
        return [
            // Strip %EF%BB%BF (Zero Width No-Break Space / BOM) from the end of URLs
            {
                source: '/:path*%EF%BB%BF',
                destination: '/:path*',
                permanent: true,
            },
            {
                source: '/:path*%E2%80%8B',
                destination: '/:path*',
                permanent: true,
            },
            // Redirect old sell/verkoop URLs to new paths
            {
                source: '/sell',
                destination: '/sell-intake',
                permanent: true,
            },
            {
                source: '/sell/login',
                destination: '/sell-intake/login',
                permanent: true,
            },
            {
                source: '/en/sell-lead',
                destination: '/en/sell',
                permanent: true,
            },
            {
                source: '/nl/verkoop-aanvraag',
                destination: '/verkoop',
                permanent: true,
            },
            {
                source: '/nl/verkoop',
                destination: '/verkoop',
                permanent: true,
            },
            {
                source: '/nl/waardebepaling',
                destination: '/waardebepaling',
                permanent: true,
            },
            // Redirect old root pages to canonical locale versions
            {
                source: '/landlords',
                destination: '/en/rent-out',
                permanent: true,
            },
            {
                source: '/tenants',
                destination: '/en/rent-in',
                permanent: true,
            },
            {
                source: '/about',
                destination: '/en/about-us',
                permanent: true,
            },
            {
                source: '/meta-leadform-b',
                destination: '/nl/meta-leadform-b',
                permanent: true,
            },
        ];
    },
    async rewrites() {
        return [
            { source: '/nl/meta-leadform', destination: '/meta-ads/meta-leadform.html' },
            { source: '/en/meta-leadform', destination: '/meta-ads/meta-leadform.html' },
            { source: '/meta-leadform', destination: '/meta-ads/meta-leadform.html' },
            { source: '/nl/thank-you', destination: '/meta-ads/thank-you.html' },
            { source: '/en/thank-you', destination: '/meta-ads/thank-you.html' },
            { source: '/thank-you', destination: '/meta-ads/thank-you.html' },
        ];
    },
    // Headers for robots.txt, sitemap.xml etc.
    async headers() {
        return [
            {
                source: '/robots.txt',
                headers: [
                    { key: 'Content-Type', value: 'text/plain' },
                ],
            },
            {
                source: '/sitemap.xml',
                headers: [
                    { key: 'Content-Type', value: 'application/xml' },
                ],
            },
        ];
    },
};

export default nextConfig;
