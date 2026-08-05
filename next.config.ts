import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出：v0.3 公网部署用
  // 不需要服务器，所有数据用 localStorage
  output: "export",
  // 静态导出时如果遇到 dynamic params 警告可以忽略
  trailingSlash: false,
  // 客户端组件不要预渲染报错
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
