import { Gamepad2, Image, LayoutDashboard, MessageCircleHeart, Music, Palette, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
  group: "Us" | "Create" | "Play";
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard, description: "Your daily overview", group: "Us" },
  { title: "Chat", url: "/chat", icon: MessageCircleHeart, description: "Messages, photos, videos & calls", group: "Us" },
  { title: "Gallery", url: "/gallery", icon: Image, description: "Shared photos + voice chat", group: "Create" },
  { title: "Canvas", url: "/canvas", icon: Palette, description: "Draw together on a board that grows", group: "Create" },
  { title: "Games", url: "/games", icon: Gamepad2, description: "Invite and play together", group: "Play" },
  { title: "Music", url: "/music", icon: Music, description: "Your songs, in sync", group: "Play" },
];

export const NAV_GROUPS = ["Us", "Create", "Play"] as const;

/** Items shown in the bottom bar on phones (the rest live under "More"). */
export const MOBILE_NAV_URLS = ["/dashboard", "/chat", "/gallery", "/games"];

export const findNavItem = (pathname: string) => NAV_ITEMS.find((item) => item.url === pathname);
