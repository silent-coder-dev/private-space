import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLock } from "@/components/layout/AppLock";
import { useRoom } from "@/context/room";
import { RoomProvider } from "@/context/RoomProvider";
import { SpaceProvider } from "@/context/SpaceProvider";
import { LOCK_KEY, makeLock } from "@/lib/pin";
import { setStorageScope, writeStore } from "@/lib/storage";
import { utcDayKey, utcDayNumber } from "@/lib/time";
import Chat from "@/pages/Chat";
import { CallProvider } from "@/call/CallProvider";
import { MusicProvider } from "@/music/MusicProvider";
import Canvas from "@/pages/Canvas";
import Dashboard from "@/pages/Dashboard";
import Gallery from "@/pages/Gallery";
import Games from "@/pages/Games";
import Index from "@/pages/Index";
import MusicPlayer from "@/pages/MusicPlayer";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Start from "@/pages/Start";
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

const renderPage = async (page: ReactElement, path = "/", { inRoom = true, connect = false } = {}) => {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <RoomProvider autoConnect={connect}>
        <TooltipProvider>
          {inRoom ? (
            <SpaceProvider>
              <CallProvider>
                <MusicProvider>
                  <GrabEngine />
                  {page}
                </MusicProvider>
              </CallProvider>
            </SpaceProvider>
          ) : (
            page
          )}
        </TooltipProvider>
      </RoomProvider>
    </MemoryRouter>,
  );
  // The room loads its saved data first (async), then the page appears.
  await act(async () => {});
  return result;
};

describe("public pages", () => {
  it("landing sends new visitors to create or join a room", async () => {
    await renderPage(<Index />, "/", { inRoom: false });
    expect(screen.getByText("feel at home.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /enter our space/i })[0]).toHaveAttribute("href", "/start");
  });

  it("start page offers create and join", async () => {
    await renderPage(<Start />, "/start", { inRoom: false });
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

  it("404", async () => {
    await renderPage(<NotFound />, "/nope", { inRoom: false });
    expect(screen.getByText("This page wandered off")).toBeInTheDocument();
    expect(screen.getByText("/nope")).toBeInTheDocument();
  });
});

describe("room pages", () => {
  it("dashboard invites the partner until they join", async () => {
    enterRoom({ partnerJoined: false });
    await renderPage(<Dashboard />, "/dashboard");
    expect(screen.getByText("Invite your partner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /you.re missing them/ })).toBeInTheDocument();
    expect(screen.getByText("Question of the day")).toBeInTheDocument();
    expect(screen.getByText("Next time together")).toBeInTheDocument();
  });

  it("gallery shows shared photos", async () => {
    enterRoom({ data: { "item:photos/p1": { id: "p1", src: "data:image/png;base64,iVBORw0KGgo=", at: 1, from: "partner" } } });
    await renderPage(<Gallery />, "/gallery");
    expect(screen.getByText(/1 shared photo/)).toBeInTheDocument();
    expect(screen.getAllByAltText("Shared photo")).toHaveLength(1);
  });

  it("canvas has its drawing tools and grows as the drawing grows", async () => {
    enterRoom();
    await renderPage(<Canvas />, "/canvas");
    expect(screen.getByLabelText("Drawing area")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Scroll/ })).toBeInTheDocument();
    expect(screen.queryByText(/Cartoon/)).toBeNull();
    const board = () => Number(screen.getByLabelText("Drawing area").parentElement?.dataset.height);
    expect(board()).toBe(750);
    // Your partner draws far down the page: the board grows so it fits, with room to spare.
    act(() => {
      engineRef?.receive({
        col: "strokes",
        id: "s1",
        data: { id: "s1", by: "me", at: 1, tool: "pen", color: "#000", size: 0.01, pts: [100, 1900, 200, 2000], v: 2 },
        ts: Date.now() + 1000,
        by: PARTNER_DEVICE,
      });
    });
    expect(board()).toBeGreaterThanOrEqual(2250);
    const before = board();
    fireEvent.click(screen.getByRole("button", { name: /More space/ }));
    expect(board()).toBeGreaterThan(before);
  });

  it("music explains where to put songs when the folder is empty", async () => {
    enterRoom();
    await renderPage(<MusicPlayer />, "/music");
    expect(await screen.findByText("Add your songs")).toBeInTheDocument();
  });
});

describe("home & profile", () => {
  it("question of the day keeps your partner's answer hidden until you answer", async () => {
    enterRoom();
    await renderPage(<Dashboard />, "/dashboard");
    const today = utcDayKey(utcDayNumber(engineRef!.now()));
    act(() => {
      engineRef?.receive({ col: "daily", id: "me", data: { answers: { [today]: { text: "Pizza night 🍕", at: Date.now() } } }, ts: Date.now() + 1000, by: PARTNER_DEVICE });
    });
    expect(screen.queryByText("Pizza night 🍕")).toBeNull();
    expect(screen.getByText(/answered ✓ — answer to see it/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Stargazing" } });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    // Both answers show once the form has slid away.
    expect(await screen.findByText("Pizza night 🍕", undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText("Stargazing", { selector: "p" })).toBeInTheDocument();
  });

  it("profile changes your name and offers photo, PIN and log out", async () => {
    enterRoom();
    await renderPage(<Profile />, "/profile");
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Riya" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("heading", { level: 1, name: "Riya" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Saved/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add a profile photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set a PIN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log out of this phone/ })).toBeInTheDocument();
  });

  it("the PIN lock closes the instant you leave the app and opens with the right PIN", { timeout: 20_000 }, async () => {
    enterRoom({ data: { [LOCK_KEY]: await makeLock("2580") } });
    await renderPage(
      <AppLock>
        <p>Our secret chat</p>
      </AppLock>,
      "/dashboard",
    );
    const hidden = () => !!screen.getByText("Our secret chat").closest("[inert]");
    const typePin = (pin: string) => {
      for (const key of pin) fireEvent.keyDown(window, { key });
    };
    // Locked when the app opens.
    expect(screen.getByRole("dialog", { name: "UsSpace is locked" })).toBeInTheDocument();
    expect(hidden()).toBe(true);
    typePin("1111");
    expect(await screen.findByText("That PIN isn't right. Try again.", undefined, { timeout: 8000 })).toBeInTheDocument();
    typePin("2580");
    await waitFor(() => expect(hidden()).toBe(false), { timeout: 8000 });

    // Switching tabs / minimising: locked before the page is even hidden.
    let lockedRightAway = false;
    act(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      lockedRightAway = !!screen.queryByRole("dialog", { name: "UsSpace is locked" });
    });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(lockedRightAway).toBe(true);
    expect(hidden()).toBe(true);
  });
});

describe("chat", () => {
  it("sends with Enter, saves it, and shows it as sending while offline", async () => {
    enterRoom();
    // Starts the real connection client; the test WebSocket never connects, like being offline.
    await renderPage(<Chat />, "/chat", { connect: true });
    const box = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(box, { target: { value: "Dinner at 8?" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByText("Dinner at 8?")).toBeInTheDocument();
    expect(screen.getByLabelText("Sending")).toBeInTheDocument();
    const saved = Object.keys(window.localStorage).some((k) => k.includes(":item:messages/") && window.localStorage.getItem(k)?.includes("Dinner at 8?"));
    expect(saved).toBe(true);
  });

  it("shows your partner's message the moment it arrives", async () => {
    enterRoom();
    await renderPage(<Chat />, "/chat");
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

  it("ignores empty messages", async () => {
    enterRoom();
    await renderPage(<Chat />, "/chat");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });
});

describe("games", { timeout: 15_000 }, () => {
  const filled = () => screen.queryAllByRole("button", { name: /^Square [0-9]/ });

  it("needs your partner in the room", async () => {
    enterRoom({ partnerJoined: false });
    await renderPage(<Games />, "/games");
    expect(screen.getByText("Games need two players")).toBeInTheDocument();
  });

  it("an invite waits until the partner joins", async () => {
    enterRoom();
    await renderPage(<Games />, "/games");
    fireEvent.click(screen.getAllByRole("button", { name: /Invite/ })[0]);
    expect(await screen.findByText(/Waiting for .* to join/)).toBeInTheDocument();
    // The partner taps "Join game" on their phone.
    act(() => {
      engineRef?.receive({ col: "game", id: "doc", data: { game: "ttt", status: "playing", by: "partner", at: 5 }, ts: Date.now() + 1000, by: PARTNER_DEVICE });
    });
    expect(await screen.findByRole("button", { name: "Play square 1" }, { timeout: 4000 })).toBeInTheDocument();
  });

  it("joining your partner's invite starts the game; moves arrive live and turns are kept", async () => {
    enterRoom();
    await renderPage(<Games />, "/games");
    act(() => {
      engineRef?.receive({ col: "game", id: "doc", data: { game: "ttt", status: "invited", by: "me", at: 5 }, ts: Date.now() + 1000, by: PARTNER_DEVICE });
    });
    fireEvent.click(await screen.findByRole("button", { name: /Join game/ }, { timeout: 4000 }));
    // The person who invited goes first, so tapping now does nothing.
    fireEvent.click(await screen.findByRole("button", { name: "Play square 1" }, { timeout: 4000 }));
    expect(filled()).toHaveLength(0);
    act(() => {
      engineRef?.receive({
        col: "ttt",
        id: "doc",
        data: { board: [null, null, null, null, "me", null, null, null, null], turn: "partner", starter: "me", round: 1 },
        ts: Date.now() + 100_000,
        by: PARTNER_DEVICE,
      });
    });
    expect(within(screen.getByRole("button", { name: /^Square 5,/ })).getByText("💜")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play square 1" }));
    expect(filled()).toHaveLength(2);
  });

  it("Connect Four: the inviter starts, then your heart drops into the column you tap", async () => {
    enterRoom();
    await renderPage(<Games />, "/games");
    act(() => {
      engineRef?.receive({ col: "game", id: "doc", data: { game: "c4", status: "invited", by: "me", at: 5 }, ts: Date.now() + 1000, by: PARTNER_DEVICE });
    });
    fireEvent.click(await screen.findByRole("button", { name: /Join game/ }, { timeout: 4000 }));
    const column4 = await screen.findByRole("button", { name: "Drop in column 4" }, { timeout: 4000 });
    expect(column4).toBeDisabled();
    // The partner drops a heart in column 1 (in their words it is "me").
    const board = Array(42).fill(null);
    board[35] = "me";
    act(() => {
      engineRef?.receive({
        col: "c4",
        id: "doc",
        data: { board, turn: "partner", starter: "me", round: 1, wins: { me: 0, partner: 0 }, draws: 0 },
        ts: Date.now() + 100_000,
        by: PARTNER_DEVICE,
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Drop in column 4" }));
    expect(within(screen.getByRole("button", { name: "Drop in column 4" })).getByText("💖")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Drop in column 1" })).getByText("💜")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drop in column 5" })).toBeDisabled();
  });

  it("every new game opens: quiz, rock paper scissors, never have I ever", async () => {
    enterRoom();
    await renderPage(<Games />, "/games");
    for (const [game, check] of [
      ["quiz", /Pick your real answer/],
      ["rps", /stays hidden until you.ve both picked/],
      ["nhie", /Never have I ever/],
    ] as const) {
      act(() => {
        engineRef?.receive({ col: "game", id: "doc", data: { game, status: "playing", by: "partner", at: Date.now() }, ts: Date.now() + 1000, by: PARTNER_DEVICE });
      });
      expect(await screen.findByText(check, undefined, { timeout: 4000 })).toBeInTheDocument();
    }
  });
});
