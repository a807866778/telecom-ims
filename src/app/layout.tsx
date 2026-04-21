import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "通讯施工团队进存销管理系统",
  description: "物料管理、入库出库、项目管理、收益报表",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
