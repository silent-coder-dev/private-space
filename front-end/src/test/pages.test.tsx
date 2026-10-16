import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRoom } from "@/context/room";
import { RoomProvider } from "@/context/RoomProvider";
import { SpaceProvider } from "@/context/SpaceProvider";
import { daysFromToday } from "@/lib/time";
import { setStorageScope, writeStore } from "@/lib/storage";
import Chat from "@/pages/Chat";
import Dashboard from "@/pages/Dashboard";
import Games from "@/pages/Games";
import Index from "@/pages/Index";
import Letters from "@/pages/Letters";
import MusicPlayer from "@/pages/MusicPlayer";
import NotFound from "@/pages/NotFound";
import Planner from "@/pages/Planner";
import Presence from "@/pages/Presence";
import Start from "@/pages/Start";
import Timeline from "@/pages/Timeline";
import { deriveKeys, generateCode, randomId } from "@/sync/crypto";
import type { SyncEngine } from "@/sync/engine";
import { saveSession, type RoomSession } from "@/sync/session";

const PARTNER_DEVICE = "f".repeat(32);

/** Put this test device into a room (offline), with optional data already saved. */
function enterRoom({ partnerJoined = true, data = {} as Record<string, unknown> } = {}) {
  const code = generateCode();
  const session: RoomSession = {
    v: 1,
    code,
    roomId: deriveKeys(code).roomId,
    device: randomId(),
    role: "creator",
    createdAt: Date.now(),
    lastSeq: 0,
    partnerJoined,
  };
  saveSession(session);
  setStorageScope(session.roomId);
  for (const [key, value] of Object.entries(data)) writeStore(key, value);
  return session;
}

let engineRef: SyncEngine | null = null;
function GrabEngine() {
  engineRef = useRoom().engine;
  return null;
}

const renderPage = (page: ReactElement, path = "/", { inRoom = true, connect = false } = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <RoomProvider autoConnect={connect}>
        <TooltipProvider>
          {inRoom ? (
            <SpaceProvider>
              <GrabEngine />
              {page}
            </SpaceProvider>
          ) : (
            page
          )}
        </TooltipProvider>
      </RoomProvider>
    </MemoryRouter>,
  );

describe("public pages", () => {
  it("landing sends new visitors to create or join a room", () => {
    renderPage(<Index />, "/", { inRoom: false });
    expect(screen.getByText("feel at home.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /enter our space/i })[0]).toHaveAttribute("href", "/start");
  });

  it("start page offers create and join", async () => {
    renderPage(<Start />, "/start", { inRoom: false });
    expect(screen.getByText("Create a room")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Join a room"));
    const code = await screen.findByLabelText("Secret code");
    fireEvent.change(code, { target: { value: "kx7p9m2q" } });
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Kabir" } });
    expect(code).toHaveValue("KX7P-9M2Q");
    expect(screen.getByRole("button", { name: /join room/i })).toBeDisabled();
    fireEvent.change(code, { target: { value: "kx7p9m2qabcdefgh" } });
    expect(code).toHaveValue("KX7P-9M2Q-ABCD-EFGH");
    expect(screen.getByRole("button", { name: /join room/i })).toBeEnabled();
  });

  it("404", () => {
    renderPage(<NotFound />, "/nope", { inRoom: false });
    expect(screen.getByText("This page wandered off")).toBeInTheDocument();
    expect(screen.getByText("/nope")).toBeInTheDocument();
  });
});

describe("room pages", () => {
  it("dashboard invites the partner until they join", () => {
    enterRoom({ partnerJoined: false });
    renderPage(<Dashboard />, "/dashboard");
    expect(screen.getByText("Invite your partner")).toBeInTheDocument();
    expect(screen.getByText("How are you feeling?")).toBeInTheDocument();
  });

  it("presence", () => {
    enterRoom();
    renderPage(<Presence />, "/presence");
    expect(screen.getByText("Thinking of you")).toBeInTheDocument();
  });

  it("planner shows a live countdown for the next plan", () => {
    enterRoom({ data: { events: [{ id: "e1", title: "Movie Night", date: daysFromToday(3), time: "20:00", note: "", emoji: "🎬" }] } });
    renderPage(<Planner />, "/planner");
    expect(screen.getByText("Next up")).toBeInTheDocument();
    expect(screen.getAllByText(/Movie Night/).length).toBeGreaterThan(0);
  });

  it("music plays the shared timeline", () => {
    enterRoom({ data: { songs: [{ id: "s1", title: "Perfect", artist: "Ed Sheeran", duration: 263 }] } });
    renderPage(<MusicPlayer />, "/music");
    expect(screen.getAllByText("Perfect").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("letters keep sealed letters secret", () => {
    enterRoom({
      data: {
        letters: [
          { id: "l1", title: "Just because 💕", content: "You are my everything", unlockOn: daysFromToday(-1), createdAt: 1, from: "partner" },
          { id: "l2", title: "Later", content: "Forever yours", unlockOn: daysFromToday(30), createdAt: 1, from: "partner" },
        ],
      },
    });
    renderPage(<Letters />, "/letters");
    expect(screen.getByText("Just because 💕")).toBeInTheDocument();
    expect(screen.queryByText(/Forever yours/)).not.toBeInTheDocument();
  });

  it("timeline", () => {
    enterRoom({ data: { milestones: [{ id: "t1", title: "First Met", date: daysFromToday(-100), desc: "", emoji: "💫" }] } });
    renderPage(<Timeline />, "/timeline");
    expect(screen.getByText("First Met")).toBeInTheDocument();
  });
});

describe("chat", () => {
  it("sends with Enter, saves it, and shows it as sending while offline", () => {
    enterRoom();
    // Starts the real connection client; the test WebSocket never connects, like being offline.
    renderPage(<Chat />, "/chat", { connect: true });
    const box = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(box, { target: { value: "Dinner at 8?" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByText("Dinner at 8?")).toBeInTheDocument();
    expect(screen.getByLabelText("Sending")).toBeInTheDocument();
    const saved = Object.keys(window.localStorage).some((k) => k.endsWith(":messages") && window.localStorage.getItem(k)?.includes("Dinner at 8?"));
    expect(saved).toBe(true);
  });

  it("shows your partner's message the moment it arrives", () => {
    enterRoom();
    renderPage(<Chat />, "/chat");
    act(() => {
      engineRef?.receive({
        col: "messages",
        id: "p1",
        data: { id: "p1", sender: "me", text: "Miss you 🥺", at: Date.now(), reactions: [] },
        ts: Date.now() + 10,
        by: PARTNER_DEVICE,
      });
    });
    expect(screen.getByText("Miss you 🥺")).toBeInTheDocument();
  });

  it("ignores empty messages", () => {
    enterRoom();
    renderPage(<Chat />, "/chat");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });
});

describe("games", () => {
  const filled = () => screen.queryAllByRole("button", { name: /^Square [0-9]/ });

  it("before the partner joins: pass-and-play, with a winner and a locked board", async () => {
    enterRoom({ partnerJoined: false });
    renderPage(<Games />, "/games");
    const play = (n: number) => fireEvent.click(screen.getByRole("button", { name: `Play square ${n}` }));
    play(1);
    play(4);
    play(2);
    play(5);
    play(3);
    expect(await screen.findByText(/won this round/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play square 6" }));
    expect(within(screen.getByRole("button", { name: "Play square 6" })).queryByText("💜")).not.toBeInTheDocument();
  });

  it("together: you can only play on your turn, and your partner's move appears live", async () => {
    enterRoom({ partnerJoined: true });
    renderPage(<Games />, "/games");
    fireEvent.click(screen.getByRole("button", { name: "Play square 1" }));
    expect(filled()).toHaveLength(1);
    // Not my turn now — clicking does nothing.
    fireEvent.click(screen.getByRole("button", { name: "Play square 2" }));
    expect(filled()).toHaveLength(1);
    expect(await screen.findByText(/Waiting for/)).toBeInTheDocument();

    // The partner plays square 5 on their phone (their "me" is our "partner").
    act(() => {
      engineRef?.receive({
        col: "ttt",
        id: "doc",
        data: { board: ["partner", null, null, null, "me", null, null, null, null], turn: "partner", starter: "partner", round: 1 },
        ts: Date.now() + 100_000,
        by: PARTNER_DEVICE,
      });
    });
    expect(filled()).toHaveLength(2);
    expect(within(screen.getByRole("button", { name: /^Square 5,/ })).getByText("💜")).toBeInTheDocument();
    expect(await screen.findByText(/Your move/)).toBeInTheDocument();
  });
});
