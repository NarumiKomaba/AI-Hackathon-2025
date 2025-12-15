"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function ProjectQuestLayout({ children }: Props) {
  const pathname = usePathname();

  const navItems = [
    { href: "/board", label: "掲示板" },
    { href: "/quests", label: "クエスト管理" },
    { href: "/status", label: "ステータス" },
  ];

  return (
    <div className="min-h-screen bg-gray-300 flex items-center justify-center">
      {/* 1440 x 720 キャンバス */}
      <div className="w-[1600px] h-[1200px] bg-gray-200 flex flex-col">
        {/* ヘッダー（共通） */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-sm border border-yellow-300" />
              <span className="text-3xl font-serif font-bold text-gray-900">
                Project Quest
              </span>
            </div>

            <nav className="flex gap-4">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      "px-6 py-2 rounded-full text-sm transition " +
                      (active
                        ? "bg-black text-white"
                        : "bg-gray-300 text-gray-700 hover:bg-gray-400")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* 各画面の中身 */}
        <main className="flex-1 overflow">{children}</main>
      </div>
    </div>
  );
}
