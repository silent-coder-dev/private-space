import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Camera, Check, CheckCheck, Clock3, Heart, ImagePlus, Lock, MoreVertical, Phone, Send, Smile, Trash2, Video } from "lucide-react";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CameraCapture } from "@/components/chat/CameraCapture";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useCall } from "@/call/call";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { fireFrom } from "@/lib/burst";
import { CHAT_EMOJIS, REACTIONS } from "@/lib/content";
import { compressPhoto, readVideo } from "@/lib/media";
import { DEFAULT_READ } from "@/lib/seed";
import { uid } from "@/lib/storage";
import { formatClock, formatDayLabel, relativeTime } from "@/lib/time";
import type { ChatMessage, ReadDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePendingIds, useSyncedDoc, useSyncedList } from "@/sync/hooks";

const GROUP_GAP_MS = 5 * 60_000;
/** Only the newest messages are drawn at first; older ones load on demand (keeps long chats fast). */
const PAGE = 80;
const TYPING_EVERY_MS = 2500;
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;

const isEmojiOnly = (text?: string) => !!text && EMOJI_ONLY.test(text) && [...text.trim()].length <= 8;

type Delivery = "sending" | "sent" | "seen";

type Row =
  | { type: "day"; key: string; label: string }
  | { type: "msg"; key: string; msg: ChatMessage; startsGroup: boolean; endsGroup: boolean };

const Chat = () => {
  const { profile } = useSpace();
  const { presence, partnerTyping, signal, engine } = useRoom();
  const [messages, chat] = useSyncedList<ChatMessage>("messages");
  const pending = usePendingIds("messages");
  const [myRead, setMyRead] = useSyncedDoc<ReadDoc>("read", "me", DEFAULT_READ);
  const [partnerRead] = useSyncedDoc<ReadDoc>("read", "partner", DEFAULT_READ);
  const [input, setInput] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [viewer, setViewer] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const call = useCall();
  const now = useNow(30_000);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const lastTyping = useRef(0);
  const stickToBottom = useRef(true);

  const sorted = useMemo(() => [...messages].sort((a, b) => a.at - b.at), [messages]);
  const shown = sorted.length > visible ? sorted.slice(sorted.length - visible) : sorted;
  const hiddenCount = sorted.length - shown.length;
  const newestFromPartner = useMemo(
    () => sorted.reduce((max, m) => (m.sender === "partner" && m.at > max ? m.at : max), 0),
    [sorted],
  );

  // Keep the newest message in view (unless you scrolled up to read older ones).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: sorted.length <= 1 ? "auto" : "smooth" });
  }, [sorted.length, partnerTyping]);

  // Open at the newest message, before anything is painted.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Photos and videos load after the chat opens and push the messages down:
  // while you're at the bottom, stay pinned to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // Read receipts: tell your partner you've seen their newest message.
  useEffect(() => {
    if (newestFromPartner <= myRead.chat) return;
    const markRead = () => {
      if (document.visibilityState === "visible") setMyRead({ chat: newestFromPartner });
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [newestFromPartner, myRead.chat, setMyRead]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = "";
    shown.forEach((msg, i) => {
      const day = formatDayLabel(msg.at, now);
      if (day !== lastDay) {
        out.push({ type: "day", key: `day-${msg.id}`, label: day });
        lastDay = day;
      }
      const prev = shown[i - 1];
      const next = shown[i + 1];
      const sameAsPrev = prev && prev.sender === msg.sender && msg.at - prev.at < GROUP_GAP_MS && formatDayLabel(prev.at, now) === day;
      const sameAsNext = next && next.sender === msg.sender && next.at - msg.at < GROUP_GAP_MS && formatDayLabel(next.at, now) === day;
      out.push({ type: "msg", key: msg.id, msg, startsGroup: !sameAsPrev, endsGroup: !sameAsNext });
    });
    return out;
  }, [shown, now]);

  const add = (msg: Pick<ChatMessage, "text" | "image" | "video">) => {
    stickToBottom.current = true;
    chat.upsert({ ...msg, id: uid(), sender: "me", at: engine?.now() ?? Date.now(), reactions: [] });
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    add({ text });
    setInput("");
    lastTyping.current = 0;
    if (inputRef.current) inputRef.current.style.height = "";
    if (/love|❤|💕|💖/i.test(text)) fireFrom(sendRef.current, { count: 12 });
    inputRef.current?.focus();
  };

  const sendHeart = (e: React.MouseEvent<HTMLButtonElement>) => {
    add({ text: "❤️" });
    fireFrom(e.currentTarget, { count: 18 });
  };

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      add(file.type.startsWith("video/") ? { video: await readVideo(file) } : { image: await compressPhoto(file) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that photo.");
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? input.length;
    setInput(input.slice(0, start) + emoji + input.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const toggleReaction = useCallback(
    (msg: ChatMessage, emoji: string) =>
      chat.upsert({
        ...msg,
        reactions: msg.reactions.includes(emoji) ? msg.reactions.filter((r) => r !== emoji) : [...msg.reactions, emoji],
      }),
    [chat],
  );

  const onType = (value: string, el: HTMLTextAreaElement) => {
    setInput(value);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    const t = Date.now();
    // Only count it as sent if it really went out (right after opening the app we may still be connecting).
    if (value && t - lastTyping.current > TYPING_EVERY_MS && signal("typing")) lastTyping.current = t;
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (stickToBottom.current !== atBottom) setAtBottom(stickToBottom.current);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = true;
    setAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const showEarlier = () => {
    const el = scrollRef.current;
    const before = el?.scrollHeight ?? 0;
    setVisible((v) => v + PAGE);
    requestAnimationFrame(() => {
      if (el) el.scrollTop += el.scrollHeight - before;
    });
  };

  const deliveryOf = (msg: ChatMessage): Delivery =>
    pending.has(msg.id) ? "sending" : partnerRead.chat >= msg.at ? "seen" : "sent";

  const partnerHere = presence.members >= 2;
  const statusLine = partnerTyping
    ? "typing…"
    : !partnerHere
      ? "Hasn't joined yet"
      : presence.partnerOnline && !profile.partnerAway
        ? "Online now"
        : presence.partnerSeen
          ? `Last seen ${relativeTime(presence.partnerSeen, now)}`
          : "Offline";

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3 sm:px-6">
        <UserAvatar who="partner" online={partnerHere ? presence.partnerOnline && !profile.partnerAway : undefined} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-semibold">
            {profile.partner} <span className="ml-0.5">{profile.partnerMood}</span>
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={statusLine}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn(
                "text-xs",
                partnerTyping ? "text-blush" : statusLine === "Online now" ? "text-success" : "text-muted-foreground",
              )}
            >
              {statusLine}
            </motion.p>
          </AnimatePresence>
        </div>
        <Button variant="ghost" size="icon" onClick={() => call.start("audio")} aria-label="Voice call" disabled={call.phase !== "idle"}>
          <Phone />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => call.start("video")} aria-label="Video call" disabled={call.phase !== "idle"}>
          <Video />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={sendHeart}
          className="text-primary hover:bg-primary/10 hover:text-primary"
          aria-label="Send a heart"
        >
          <Heart className="fill-primary" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Chat options">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={() => setConfirmClear(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Clear chat for both of us
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
          aria-live="polite"
          aria-label="Messages"
        >
          <div ref={contentRef}>
            <p className="mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Messages are end-to-end encrypted. Only you two can read them.
            </p>

            {hiddenCount > 0 && (
              <div className="mb-2 flex justify-center">
                <Button variant="glass" size="sm" onClick={showEarlier}>
                  Show {Math.min(PAGE, hiddenCount)} earlier messages
                </Button>
              </div>
            )}

            {sorted.length === 0 && (
              <div className="grid min-h-[50vh] place-items-center text-center">
                <div className="space-y-2">
                  <motion.p
                    className="text-5xl"
                    animate={{ rotate: [0, 14, -8, 14, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
                  >
                    👋
                  </motion.p>
                  <p className="font-heading font-semibold">Say hello to {profile.partner}</p>
                  <p className="text-sm text-muted-foreground">Your first message starts the story.</p>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {rows.map((row) =>
                row.type === "day" ? (
                  <motion.div key={row.key} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-4 flex justify-center">
                    <span className="glass rounded-full px-3 py-1 text-[11px] text-muted-foreground">{row.label}</span>
                  </motion.div>
                ) : (
                  <MessageBubble
                    key={row.key}
                    msg={row.msg}
                    startsGroup={row.startsGroup}
                    endsGroup={row.endsGroup}
                    delivery={row.msg.sender === "me" ? deliveryOf(row.msg) : undefined}
                    onReact={toggleReaction}
                    onOpenImage={setViewer}
                  />
                ),
              )}
            </AnimatePresence>

            <AnimatePresence>
              {partnerTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-2 flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-card/80 px-4 py-3"
                  aria-label={`${profile.partner} is typing`}
                >
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce-dot rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.16}s` }} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              type="button"
              onClick={jumpToLatest}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              className="glass absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-xl"
            >
              <ArrowDown className="h-4 w-4 text-primary" /> Latest messages
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-white/5 bg-background/40 p-3 backdrop-blur-xl sm:p-4"
      >
        <div className="glass flex items-end gap-1 rounded-[1.6rem] p-1.5 transition-shadow focus-within:ring-1 focus-within:ring-primary/50">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full text-muted-foreground hover:text-primary"
            onClick={() => fileRef.current?.click()}
            aria-label="Send a photo or video"
          >
            <ImagePlus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full text-muted-foreground hover:text-primary"
            onClick={() => setCameraOpen(true)}
            aria-label="Open camera"
          >
            <Camera />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-primary" aria-label="Add an emoji">
                <Smile />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="glass-card w-72 border-white/10 bg-popover/95 p-2">
              <div className="grid grid-cols-8 gap-0.5">
                {CHAT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="rounded-lg p-1 text-xl transition-transform hover:scale-125 hover:bg-white/10"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={4000}
            onChange={(e) => onType(e.target.value, e.target)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type something sweet…"
            aria-label="Message"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-5 placeholder:text-muted-foreground focus-visible:outline-none"
          />
          <motion.button
            ref={sendRef}
            type="submit"
            whileTap={{ scale: 0.88 }}
            disabled={!input.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-primary text-white glow-primary transition-opacity disabled:opacity-40 disabled:shadow-none"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pickImage} />
        <CameraCapture open={cameraOpen} onOpenChange={setCameraOpen} onSend={(shot) => add(shot)} />
        <p className="mt-1.5 hidden text-center text-[11px] text-muted-foreground/60 sm:block">
          Enter to send · Shift + Enter for a new line · Double-click a message to ❤️ it
        </p>
      </form>

      <Dialog open={!!viewer} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-popover/95 p-2" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {viewer && <img src={viewer} alt="Shared photo" className="max-h-[80vh] w-full rounded-xl object-contain" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the chat for both of you?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages and photos are deleted on your phone and on {profile.partner}'s phone. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                chat.removeAll();
                toast("Chat cleared");
              }}
            >
              Clear chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const DELIVERY_ICON = {
  sending: { Icon: Clock3, label: "Sending", className: "text-muted-foreground" },
  sent: { Icon: Check, label: "Sent", className: "text-muted-foreground" },
  seen: { Icon: CheckCheck, label: "Seen", className: "text-blush" },
} as const;

/** One chat bubble. Memoised so a new message doesn't re-draw the whole conversation. */
const MessageBubble = memo(function MessageBubble({
  msg,
  startsGroup,
  endsGroup,
  delivery,
  onReact,
  onOpenImage,
}: {
  msg: ChatMessage;
  startsGroup: boolean;
  endsGroup: boolean;
  delivery?: Delivery;
  onReact: (msg: ChatMessage, emoji: string) => void;
  onOpenImage: (src: string) => void;
}) {
  const mine = msg.sender === "me";
  const media = msg.image || msg.video;
  const big = !media && isEmojiOnly(msg.text);
  const status = delivery ? DELIVERY_ICON[delivery] : null;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={cn("group flex", mine ? "justify-end" : "justify-start", startsGroup ? "mt-3" : "mt-0.5")}
    >
      <div className={cn("relative flex max-w-[80%] flex-col sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "pointer-events-none absolute -top-9 z-10 flex gap-0.5 rounded-full border border-white/10 bg-popover/95 p-1 opacity-0 shadow-xl backdrop-blur transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100",
            mine ? "right-0" : "left-0",
          )}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(msg, emoji)}
              className="rounded-full px-1 text-base transition-transform hover:scale-125"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div
          onDoubleClick={() => {
            window.getSelection()?.removeAllRanges(); // a double-click also selects a word — clear it
            onReact(msg, "❤️");
          }}
          className={cn(
            "select-text whitespace-pre-wrap break-words text-sm leading-relaxed",
            big ? "text-5xl leading-none" : media ? "overflow-hidden rounded-2xl p-1" : "rounded-2xl px-4 py-2.5",
            !big && (mine ? "gradient-primary text-white shadow-lg shadow-primary/20" : "border border-white/10 bg-card/80 backdrop-blur"),
            !big && mine && endsGroup && "rounded-br-md",
            !big && !mine && endsGroup && "rounded-bl-md",
            delivery === "sending" && "opacity-80",
          )}
        >
          {msg.video ? (
            <video src={msg.video} controls playsInline preload="metadata" className="max-h-80 w-full max-w-[280px] rounded-xl bg-black" />
          ) : msg.image ? (
            <button type="button" onClick={() => onOpenImage(msg.image!)} className="block" aria-label="Open photo">
              <img src={msg.image} alt="Shared photo" loading="lazy" className="max-h-72 w-full max-w-[260px] rounded-xl object-cover" />
            </button>
          ) : (
            msg.text
          )}
        </div>

        {(endsGroup || msg.reactions.length > 0) && (
          <div className={cn("mt-1 flex items-center gap-1.5 px-1", mine && "flex-row-reverse")}>
            {endsGroup && <span className="text-[10px] text-muted-foreground">{formatClock(msg.at)}</span>}
            {endsGroup && status && (
              <span role="img" aria-label={status.label} title={status.label} className="inline-flex">
                <status.Icon className={cn("h-3 w-3", status.className)} aria-hidden />
              </span>
            )}
            <AnimatePresence>
              {msg.reactions.map((r) => (
                <motion.button
                  key={r}
                  type="button"
                  onClick={() => onReact(msg, r)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="rounded-full border border-white/10 bg-card px-1.5 text-xs"
                  aria-label={`Remove ${r}`}
                >
                  {r}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default Chat;
