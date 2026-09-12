import {
  LayoutDashboard,
  MessagesSquare,
  BookOpen,
  Zap,
  ClipboardList,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chat", href: "/assistant", icon: MessagesSquare },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Automations", href: "/automations", icon: Zap },
  { label: "Forms", href: "/forms", icon: ClipboardList },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];
