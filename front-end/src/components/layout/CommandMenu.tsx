import { CalendarPlus, Gamepad2, Heart, House, PenLine, Settings2, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { fireHearts } from "@/lib/burst";
import { NAV_ITEMS } from "@/lib/nav";

/** Ctrl/⌘ + K quick search for pages and actions. */
export function CommandMenu() {
  const { commandOpen, setCommandOpen, setSettingsOpen, profile } = useSpace();
  const { signal } = useRoom();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, setCommandOpen]);

  const run = (action: () => void) => {
    setCommandOpen(false);
    // Let the dialog close first so focus returns cleanly.
    window.setTimeout(action, 60);
  };

  const actions = [
    {
      label: "Send a heart",
      hint: `to ${profile.partner}`,
      icon: Heart,
      action: () => {
        fireHearts({ count: 24 });
        signal("heart");
        toast.success(`Heart sent to ${profile.partner} 💖`);
      },
    },
    { label: "Write a love letter", hint: "Letters", icon: PenLine, action: () => navigate("/letters?compose=1") },
    { label: "Add a plan", hint: "Planner", icon: CalendarPlus, action: () => navigate("/planner?new=1") },
    { label: "Add a memory", hint: "Timeline", icon: Sparkles, action: () => navigate("/timeline?new=1") },
    { label: "Play a game", hint: "Games", icon: Gamepad2, action: () => navigate("/games") },
    { label: "Profile, room code & settings", hint: "Settings", icon: Settings2, action: () => setSettingsOpen(true) },
    { label: "Open the welcome page", hint: "Landing", icon: House, action: () => navigate("/") },
  ];

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>Nothing found. Try “chat” or “letter”.</CommandEmpty>
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.url}
              value={`${item.title} ${item.description}`}
              onSelect={() => run(() => navigate(item.url))}
              className="gap-3"
            >
              <item.icon className="h-4 w-4 text-primary" />
              <span>{item.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          {actions.map((a) => (
            <CommandItem key={a.label} value={`${a.label} ${a.hint}`} onSelect={() => run(a.action)} className="gap-3">
              <a.icon className="h-4 w-4 text-blush" />
              <span>{a.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{a.hint}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
