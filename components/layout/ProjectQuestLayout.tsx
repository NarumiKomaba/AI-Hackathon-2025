"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  bgType?: "guild" | "guildCounter";
};

export default function ProjectQuestLayout({
  children,
  bgType = "guild",
}: Props) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/board",
      normal: "/images/board-dark.png",
      active: "/images/board-red.png",
    },
    {
      href: "/quests",
      normal: "/images/quest-dark.png",
      active: "/images/quest-red.png",
    },
    {
      href: "/status",
      normal: "/images/status-dark.png",
      active: "/images/status-red.png",
    },
  ];

  const bgImage =
    bgType === "guild"
      ? "/images/thumbnail_guild.jpg"
      : "/images/thumbnail_guildCounter.jpg";

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center flex flex-col items-center pt-6"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* ===================== */}
      {/*  ヘッダー（巻物より上） */}
      {/* ===================== */}
      <header className="w-full max-w-[1600px] flex items-center justify-between px-6 mb-4">
        {/* 左上の大きいロゴ（文字含む画像） */}
        <div className="relative w-64 h-20">
          <Image
            src="/images/Group 53.png"
            alt="Project Quest Logo"
            fill
            className="object-contain"
          />
        </div>

        {/* 右上のボタン */}
        <nav className="flex gap-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const src = active ? item.active : item.normal;

            return (
              <Link key={item.href} href={item.href} className="relative block">
                <div className="relative w-40 h-12">
                  <Image src={src} alt="" fill className="object-contain" />
                </div>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ===================== */}
      {/* 巻物ボード（背景ボード） */}
      {/* ===================== */}
      <div className="relative w-[1600px] h-[820px]">
        {/* 巻物（背景ボード） */}
        <Image
          src="/images/back.png"
          alt="背景ボード"
          fill
          className="object-contain"
        />

        {/* 中身（children） */}
        <main className="absolute inset-0 px-16 py-14 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
