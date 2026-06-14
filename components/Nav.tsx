"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  PlusCircle,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job Board", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/add-job", label: "Add Job", icon: PlusCircle },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-bold text-indigo-600 text-lg mr-4">
          Pragya Jobs
        </span>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded transition-colors ${
              path === href
                ? "text-indigo-600 bg-indigo-50"
                : "text-slate-600 hover:text-indigo-600"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
