"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { path: "/", label: "指挥中心" },
  { path: "/job", label: "秋招战情室" },
  { path: "/knowledge", label: "知识与技能库" },
  { path: "/thesis", label: "毕业倒计时" },
  { path: "/tutor", label: "错题私教" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <h2>我的工作台</h2>
        <p>AI Workspace</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
