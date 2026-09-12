import {
  LayoutDashboard,
  MessagesSquare,
  MessageCircleQuestion,
  BookOpen,
  Zap,
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
  { label: "Assistant", href: "/assistant", icon: MessagesSquare },
  { label: "Chat", href: "/chat", icon: MessageCircleQuestion },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Automations", href: "/automations", icon: Zap },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];
