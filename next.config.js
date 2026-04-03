/** @type {import('next').NextConfig} */
const SUPABASE_PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?.replace('https://', '').split('.')[0] ?? ''

const nextConfig = {
  images: {
    remotePatterns: [
      ...(SUPABASE_PROJECT_ID ? [{
        protocol: 'https',
        hostname: `${SUPABASE_PROJECT_ID}.supabase.co`,
        pathname: '/storage/v1/object/public/**',
      }] : []),
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

module.exports = nextConfig
