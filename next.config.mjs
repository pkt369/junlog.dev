/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true }, // 이미지 최적화 기능 제거
  trailingSlash: true,           // 각 경로 뒤에 `/` 붙여야 GitHub Pages에서 잘 동작
};

export default nextConfig;
