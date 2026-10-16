import {
  Calendar,
  Clock,
  Gamepad2,
  LayoutDashboard,
  Mail,
  MessageCircleHeart,
  Music,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
  group: "Our space" | "Together" | "Memories";
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard, description: "Your daily overview", group: "Our space" },
  { title: "Chat", url: "/chat", icon: MessageCircleHeart, description: "Private messages", group: "Our space" },
  { title: "Presence", url: "/presence", icon: Users, description: "Moods and status", group: "Our space" },
  { title: "Games", url: "/games", icon: Gamepad2, description: "Play together", group: "Together" },
  { title: "Planner", url: "/planner", icon: Calendar, description: "Dates and countdowns", group: "Together" },
  { title: "Music", url: "/music", icon: Music, description: "Our shared playlist", group: "Together" },
  { title: "Letters", url: "/letters", icon: Mail, description: "Time-locked love letters", group: "Memories" },
  { title: "Timeline", url: "/timeline", icon: Clock, description: "Our story so far", group: "Memories" },
];

export const NAV_GROUPS = ["Our space", "Together", "Memories"] as const;

/** Items shown in the bottom bar on phones (the rest live under "More"). */
export const MOBILE_NAV_URLS = ["/dashboard", "/chat", "/games", "/planner"];

export const findNavItem = (pathname: string) => NAV_ITEMS.find((item) => item.url === pathname);
