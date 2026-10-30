import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { deriveKeys, generateCode, randomId } from "@/sync/crypto";
import { saveSession } from "@/sync/session";

const visit = (path: string) => {
  window.history.pushState({}, "", path);
  return render(<App />);
};

const enterRoom = () => {
  const code = generateCode();
  saveSession({
    v: 1,
    code,
    roomId: deriveKeys(code).roomId,
    device: randomId(),
    role: "creator",
    createdAt: Date.now(),
    lastSeq: 0,
    partnerJoined: true,
  });
};

describe("routing", () => {
  it("shows the landing page at /", async () => {
    visit("/");
    expect(await screen.findByText("feel at home.", undefined, { timeout: 4000 })).toBeInTheDocument();
  });

  it("keeps the private rooms locked until you create or join a room", async () => {
    visit("/chat");
    expect(await screen.findByText("Create a room", {}, { timeout: 15000 })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/start");
  }, 20000);

  it("opens the app inside the layout once this device is in a room", async () => {
    enterRoom();
    visit("/dashboard");
    expect(await screen.findByText("How are you feeling?", {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Gallery/ }).length).toBeGreaterThan(0);
  }, 20000);

  it("shows the 404 page for unknown links", () => {
    visit("/this-does-not-exist");
    expect(screen.getByText("This page wandered off")).toBeInTheDocument();
  });

  it("redirects /home to the dashboard", async () => {
    enterRoom();
    visit("/home");
    expect(await screen.findByText("How are you feeling?", {}, { timeout: 15000 })).toBeInTheDocument();
  }, 20000);
});
