import { motion } from "framer-motion";
import { Heart, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useSpace } from "@/context/space";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav";
import { SPRING } from "@/lib/motion";
import { daysBetween, nextAnniversary, parseLocalDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { profile, setLogoutOpen } = useSpace();
  const collapsed = state === "collapsed" && !isMobile;

  const today = new Date();
  const daysTogether = Math.max(0, daysBetween(parseLocalDate(profile.since), today));
  const daysToAnniversary = daysBetween(today, nextAnniversary(profile.since, today));
  const yearProgress = 1 - daysToAnniversary / 365;

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/5 [&_[data-sidebar=sidebar]]:bg-sidebar/75 [&_[data-sidebar=sidebar]]:backdrop-blur-2xl"
    >
      <SidebarHeader className="pt-4">
        <Link to="/" onClick={closeOnMobile} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5" aria-label="UsSpace home">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary glow-primary">
            <Heart className="h-5 w-5 animate-heartbeat fill-white text-white" />
          </div>
          {!collapsed && <span className="font-heading text-xl font-bold text-gradient">UsSpace</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
              {group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                  const active = pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="relative h-10 transition-colors hover:bg-white/5 data-[active=true]:bg-transparent data-[active=true]:text-foreground"
                      >
                        <Link to={item.url} onClick={closeOnMobile} aria-current={active ? "page" : undefined}>
                          {active && (
                            <motion.span
                              layoutId="sidebar-active"
                              transition={SPRING}
                              className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/25 via-primary/10 to-transparent ring-1 ring-inset ring-primary/30"
                            />
                          )}
                          <item.icon className={cn("relative transition-colors", active && "text-primary")} />
                          <span className="relative">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="pb-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link to="/profile" onClick={closeOnMobile} aria-label="Your profile" title={`${daysTogether} days together`}>
              <UserAvatar who="me" size="sm" />
            </Link>
            <button type="button" onClick={() => setLogoutOpen(true)} aria-label="Log out" title="Log out" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="glass-card space-y-2.5 p-3.5">
            <Link to="/profile" onClick={closeOnMobile} className="-m-1 flex items-center gap-2.5 rounded-xl p-1 transition-colors hover:bg-white/5" aria-label="Your profile">
              <span className="flex">
                <UserAvatar who="me" size="sm" />
                <UserAvatar who="partner" size="sm" className="-ml-2.5" />
              </span>
              <span className="min-w-0 text-xs">
                <span className="block truncate font-semibold text-foreground">{profile.me}</span>
                <span className="block truncate text-muted-foreground">with {profile.partner}</span>
              </span>
            </Link>
            <p className="font-heading text-lg font-bold leading-none">
              <span className="text-gradient">{daysTogether.toLocaleString()}</span>{" "}
              <span className="text-sm font-medium text-muted-foreground">days together</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(yearProgress * 100)}%` }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {daysToAnniversary === 0 ? "Happy anniversary! 🎉" : `${daysToAnniversary} days to your anniversary`}
            </p>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
