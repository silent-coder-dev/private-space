import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, Loader2, LogOut, Send, X } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { ConnectFour } from "@/components/games/ConnectFour";
import { CoupleQuiz } from "@/components/games/CoupleQuiz";
import { MemoryMatch } from "@/components/games/MemoryMatch";
import { NeverHaveIEver } from "@/components/games/NeverHaveIEver";
import { newC4, newMemory, newNhie, newQuiz, newRps, newWyr } from "@/components/games/new-game";
import { RockPaperScissors } from "@/components/games/RockPaperScissors";
import { TicTacToe } from "@/components/games/TicTacToe";
import { TruthOrDare } from "@/components/games/TruthOrDare";
import { WouldYouRather } from "@/components/games/WouldYouRather";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { GAME_NAMES } from "@/lib/content";
import { EASE_OUT } from "@/lib/motion";
import { NEW_TTT } from "@/lib/seed";
import type { GameId, GameSession } from "@/lib/types";
import { useEngine, useSyncedDoc } from "@/sync/hooks";

const GAMES: { id: GameId; emoji: string; text: string }[] = [
  { id: "ttt", emoji: "❤️", text: "Hearts vs. purple hearts. Take turns, three in a row wins." },
  { id: "tod", emoji: "🎲", text: "Draw a card. You both see the same truth or dare." },
  { id: "memory", emoji: "🧠", text: "Take turns flipping cards. Find a pair, keep your turn." },
  { id: "wyr", emoji: "🤔", text: "Both pick secretly, then see if you match." },
  { id: "quiz", emoji: "💘", text: "One answers about themselves, the other guesses. Who knows who best?" },
  { id: "c4", emoji: "🔴", text: "Drop hearts in turn — four in a row wins." },
  { id: "rps", emoji: "✂️", text: "Rock, paper, scissors in secret. First to 3 wins the match." },
  { id: "nhie", emoji: "🙋", text: "Never have I ever… answer honestly, then see each other's answer." },
];

const NONE: GameSession | null = null;

/** Games start only when both of you are in: one invites, the other joins. */
const Games = () => {
  const { profile } = useSpace();
  const { presence, session, signal } = useRoom();
  const engine = useEngine();
  const [game, setGame] = useSyncedDoc<GameSession | null>("game", "doc", NONE);
  const [params, setParams] = useSearchParams();
  const partnerHere = presence.members >= 2 || !!session?.partnerJoined;

  const invite = (id: GameId) => {
    setGame({ game: id, status: "invited", by: "me", at: engine.now() });
    if (!presence.partnerOnline) toast(`${profile.partner} is offline — they'll see your invite when they're back.`);
    else signal("nudge");
  };

  const join = () => {
    if (!game) return;
    // Fresh board for a fresh game.
    if (game.game === "ttt") engine.put("ttt", "doc", { ...NEW_TTT, turn: "partner", starter: "partner" });
    if (game.game === "memory") engine.put("memory", "doc", newMemory("partner"));
    if (game.game === "wyr") engine.put("wyr", "doc", newWyr());
    if (game.game === "tod") engine.put("tod", "doc", null);
    if (game.game === "c4") engine.put("c4", "doc", newC4("partner"));
    if (game.game === "rps") engine.put("rps", "doc", newRps());
    if (game.game === "nhie") engine.put("nhie", "doc", newNhie());
    if (game.game === "quiz") engine.put("quiz", "doc", newQuiz("partner"));
    setGame({ ...game, status: "playing" });
  };

  const end = () => {
    setGame(null);
    toast("Game ended");
  };

  // Opened from the "Join game" button in an invite.
  useEffect(() => {
    if (params.get("join") !== "1") return;
    setParams({}, { replace: true });
    if (game?.status === "invited" && game.by === "partner") join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const name = game ? GAME_NAMES[game.game] : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Gamepad2}
        title="Games"
        subtitle="Invite your partner — the game starts when they join"
        actions={
          game?.status === "playing" ? (
            <Button variant="ghost" onClick={end} className="text-muted-foreground hover:text-destructive">
              <LogOut /> End game
            </Button>
          ) : undefined
        }
      />

      <AnimatePresence mode="wait">
        {!partnerHere ? (
          <Panel key="alone">
            <div className="glass-card p-8 text-center">
              <p className="text-4xl">💌</p>
              <p className="mt-3 font-heading text-lg font-semibold">Games need two players</p>
              <p className="text-sm text-muted-foreground">Invite your partner into your room first (your secret code is in Settings).</p>
            </div>
          </Panel>
        ) : game?.status === "playing" ? (
          <Panel key={`play-${game.game}-${game.at}`}>
            <div className="glass-card p-5 sm:p-8">
              <p className="mb-5 text-center font-heading text-sm uppercase tracking-[0.2em] text-primary">
                {name} · you & {profile.partner}
              </p>
              {game.game === "ttt" && <TicTacToe />}
              {game.game === "tod" && <TruthOrDare />}
              {game.game === "memory" && <MemoryMatch />}
              {game.game === "wyr" && <WouldYouRather />}
              {game.game === "c4" && <ConnectFour />}
              {game.game === "rps" && <RockPaperScissors />}
              {game.game === "nhie" && <NeverHaveIEver />}
              {game.game === "quiz" && <CoupleQuiz />}
            </div>
          </Panel>
        ) : game?.status === "invited" ? (
          <Panel key="invite">
            <div className="glass-card border-beam mx-auto max-w-md space-y-5 p-8 text-center [perspective:900px]">
              <motion.div className="text-6xl" animate={{ rotateY: [0, 180, 360] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                🎮
              </motion.div>
              {game.by === "me" ? (
                <>
                  <p className="font-heading text-xl font-bold">Invite sent for {name}</p>
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Waiting for {profile.partner} to join…
                  </p>
                  <Button variant="ghost" onClick={end}>
                    <X /> Cancel invite
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-heading text-xl font-bold">
                    {profile.partner} invites you to play {name}!
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button variant="ghost" onClick={end}>
                      Not now
                    </Button>
                    <Button variant="gradient" className="shine" onClick={join}>
                      <Gamepad2 /> Join game
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Panel>
        ) : (
          <Panel key="pick">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {GAMES.map((g, i) => (
                <motion.div key={g.id} initial={{ opacity: 0, y: 20, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: i * 0.04, ease: EASE_OUT }} style={{ transformPerspective: 1000 }}>
                  <SpotlightCard tilt className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-soft text-2xl ring-1 ring-primary/30">{g.emoji}</span>
                      <p className="font-heading text-lg font-semibold leading-tight">{GAME_NAMES[g.id]}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{g.text}</p>
                    <Button variant="gradient" className="mt-auto w-full" onClick={() => invite(g.id)}>
                      <Send /> Invite {profile.partner}
                    </Button>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
};

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      style={{ transformPerspective: 1200 }}
    >
      {children}
    </motion.section>
  );
}

export default Games;
