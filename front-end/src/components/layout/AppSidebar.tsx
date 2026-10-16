import { motion } from "framer-motion";
import { Heart } from "lucide-react";
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
import { useSpace } from "@/context/space";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav";
import { SPRING } from "@/lib/motion";
import { daysBetween, nextAnniversary, parseLocalDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { profile } = useSpace();
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
          <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-primary/10" title={`${daysTogether} days together`}>
            <Heart className="h-4 w-4 fill-primary text-primary" />
          </div>
        ) : (
          <div className="glass-card space-y-2 p-3.5">
            <p className="text-xs text-muted-foreground">
              {profile.me} & {profile.partner}
            </p>
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
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
