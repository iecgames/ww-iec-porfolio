import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'
import { redirects } from './redirects'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.__NEXT_PRIVATE_ORIGIN || 'http://localhost:3000'

const nextConfig: NextConfig = {
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  images: {
    // Ảnh đi qua Next image optimizer: resize theo viewport + convert WebP/AVIF.
    // Đổi lại VPS tốn CPU (sharp) và đĩa cho cache — cache được gắn volume
    // `image_cache` trong docker-compose để sống sót qua mỗi lần deploy.
    //
    // `getMediaUrl` gắn `?<updatedAt>` vào URL nên ảnh đổi là URL đổi; nhờ đó
    // TTL dài không làm editor thấy ảnh cũ.
    minimumCacheTTL: 2592000, // 30 ngày
    // Mặc định của Next kết thúc ở 3840. Không ô nào trên site rộng quá 1152 CSS
    // px (hero bài viết, chỗ rộng nhất), nên bản 3840 chỉ tồn tại để đốt CPU của
    // sharp và chỗ trên đĩa. Bỏ nó làm lưới an toàn: nếu về sau có call site
    // quên truyền `size`, cái giá phải trả bị chặn ở 2048 thay vì 3840.
    //
    // Lưu ý khi deploy: đổi danh sách này làm đổi URL ảnh, nên cache trong volume
    // `image_cache` thành vô dụng và lần deploy đầu VPS phải sinh lại. Một lần.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      {
        pathname: '/mascot/**',
      },
      {
        pathname: '/page_404/**',
      },
    ],
    qualities: [80],
    remotePatterns: [
      {
        hostname: 'storage.googleapis.com',
        protocol: 'https',
      },
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
        }
      }),
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  output: 'standalone',
  reactStrictMode: true,
  redirects,
  // Next ignores dot-prefixed app dirs, so the RFC 9728/8414 discovery docs
  // are served from api/well-known/* and surfaced at their canonical paths.
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-protected-resource',
        destination: '/api/well-known/oauth-protected-resource',
      },
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/well-known/oauth-authorization-server',
      },
    ]
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
