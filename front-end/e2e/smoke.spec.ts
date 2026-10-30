import type { Browser, Page } from "@playwright/test";
import { expect, test } from "../playwright-fixture";

/** Create a room in a fresh browser and return its page + secret code. */
async function createRoom(browser: Browser, name: string) {
  const context = await browser.newContext({ permissions: ["camera", "microphone"] });
  const page = await context.newPage();
  await page.goto("/start");
  await page.getByText("Create a room").click();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Create our room" }).click();
  const code = (await page.getByTestId("room-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
  return { context, page, code };
}

async function joinRoom(browser: Browser, code: string, name: string) {
  const context = await browser.newContext({ permissions: ["camera", "microphone"] });
  const page = await context.newPage();
  await page.goto("/start");
  await page.getByText("Join a room").click();
  await page.getByLabel("Secret code").fill(code);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join room" }).click();
  return { context, page };
}

const openChat = async (page: Page) => {
  await page.goto("/chat");
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
};

test("landing page leads to create or join", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("feel at home.")).toBeVisible();
  await page.getByRole("link", { name: /enter our space/i }).first().click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByText("Create a room")).toBeVisible();
});

test("private rooms are locked without a room", async ({ page }) => {
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/start$/);
});

test("two partners connect with a secret code and chat in real time", async ({ browser }) => {
  const riya = await createRoom(browser, "Riya");
  const kabir = await joinRoom(browser, riya.code, "Kabir");
  await expect(kabir.page).toHaveURL(/\/dashboard$/);

  // Riya sees Kabir join, live.
  await expect(riya.page.getByText("Kabir joined!")).toBeVisible();
  await riya.page.getByRole("button", { name: "Enter our space" }).click();
  await expect(riya.page).toHaveURL(/\/dashboard$/);

  await openChat(riya.page);
  await openChat(kabir.page);
  // Opening /chat reloads the page, so wait until both are connected again.
  await expect(riya.page.getByText("Online now")).toBeVisible();
  await expect(kabir.page.getByText("Online now")).toBeVisible();

  // Typing indicator + real-time message.
  await kabir.page.getByRole("textbox", { name: "Message" }).fill("Hey you 💕");
  await expect(riya.page.getByText("typing…")).toBeVisible();
  await kabir.page.keyboard.press("Enter");
  await expect(riya.page.getByText("Hey you 💕")).toBeVisible();

  await riya.page.getByRole("textbox", { name: "Message" }).fill("Dinner at 8?");
  await riya.page.keyboard.press("Enter");
  await expect(kabir.page.getByText("Dinner at 8?")).toBeVisible();

  // Kabir has the chat open, so Riya's message turns to "Seen".
  await expect(riya.page.getByRole("img", { name: "Seen" }).last()).toBeVisible();

  // Names sync too.
  await expect(kabir.page.locator("main").getByText("Riya", { exact: false }).first()).toBeVisible();

  // Everything is still there after a reload.
  await kabir.page.reload();
  await expect(kabir.page.getByText("Dinner at 8?")).toBeVisible();

  await riya.context.close();
  await kabir.context.close();
});

test("nobody else can get in: wrong code and full room", async ({ browser }) => {
  const riya = await createRoom(browser, "Riya");
  const kabir = await joinRoom(browser, riya.code, "Kabir");
  await expect(kabir.page).toHaveURL(/\/dashboard$/);

  const wrong = await joinRoom(browser, "ABCD-EFGH-JKMN-PQRS", "Stranger");
  await expect(wrong.page.getByRole("alert")).toContainText("couldn't find a room");

  const third = await joinRoom(browser, riya.code, "Stranger");
  await expect(third.page.getByRole("alert")).toContainText("already has two people");

  for (const c of [riya, kabir, wrong, third]) await c.context.close();
});

test("every room opens without errors", async ({ browser }) => {
  const riya = await createRoom(browser, "Riya");
  const errors: string[] = [];
  riya.page.on("pageerror", (err) => errors.push(err.message));
  await riya.page.getByRole("button", { name: "Enter our space" }).click();
  for (const path of ["/dashboard", "/chat", "/gallery", "/canvas", "/games", "/music", "/profile"]) {
    await riya.page.goto(path);
    await expect(riya.page.locator("main h1, main p").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
  await riya.context.close();
});

/** A 1×1 picture, enough to test the profile photo. */
const TINY_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

test("photo, today's question and a thumb kiss reach your partner; the PIN locks the moment you leave", async ({ browser }) => {
  const riya = await createRoom(browser, "Riya");
  const kabir = await joinRoom(browser, riya.code, "Kabir");
  await expect(kabir.page).toHaveURL(/\/dashboard$/);
  await riya.page.getByRole("button", { name: "Enter our space" }).click();
  await expect(riya.page).toHaveURL(/\/dashboard$/);

  // Profile photo: chosen on Riya's phone, shown on Kabir's.
  await riya.page.goto("/profile");
  await riya.page.locator('input[type="file"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG, "base64") });
  await expect(kabir.page.getByRole("img", { name: "Riya" }).first()).toBeVisible();

  // Question of the day: Kabir only sees Riya's answer after answering too.
  await riya.page.goto("/dashboard");
  await riya.page.getByLabel("Your answer").fill("Stargazing");
  await riya.page.getByRole("button", { name: "Share" }).click();
  await expect(kabir.page.getByText("Riya answered ✓ — answer to see it")).toBeVisible();
  await expect(kabir.page.getByText("Stargazing")).toHaveCount(0);
  await kabir.page.getByLabel("Your answer").fill("Pizza night");
  await kabir.page.getByRole("button", { name: "Share" }).click();
  await expect(kabir.page.getByText("Stargazing")).toBeVisible();
  await expect(riya.page.getByText("Pizza night")).toBeVisible();

  // Thumb kiss: both thumbs on the same spot.
  await riya.page.getByRole("button", { name: "Thumb kiss" }).first().click();
  await kabir.page.getByRole("button", { name: "Join" }).click();
  for (const p of [riya.page, kabir.page]) {
    const pad = await p.getByLabel("Touch pad — put your thumb here").boundingBox();
    if (!pad) throw new Error("no touch pad");
    await p.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2);
    await p.mouse.down();
  }
  for (const p of [riya.page, kabir.page]) await expect(p.getByText("Thumb kiss! 💞")).toBeVisible();
  for (const p of [riya.page, kabir.page]) {
    await p.mouse.up();
    await p.getByRole("button", { name: "Close thumb kiss" }).click();
  }

  // PIN: set it, then switching tabs locks at once; the right PIN opens it again.
  await riya.page.goto("/profile");
  await riya.page.getByRole("button", { name: "Set a PIN" }).click();
  for (const d of "2580") await riya.page.keyboard.press(d);
  await riya.page.keyboard.press("Enter");
  for (const d of "2580") await riya.page.keyboard.press(d);
  await expect(riya.page.getByRole("button", { name: "Lock now" })).toBeVisible();
  const setVisibility = (state: string) =>
    riya.page.evaluate((s) => {
      Object.defineProperty(document, "visibilityState", { value: s, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);
  await setVisibility("hidden");
  await setVisibility("visible");
  const lock = riya.page.getByRole("dialog", { name: "UsSpace is locked" });
  await expect(lock).toBeVisible();
  for (const d of "2580") await riya.page.keyboard.press(d);
  await expect(lock).toHaveCount(0);

  await riya.context.close();
  await kabir.context.close();
});

test("game invite starts only when the partner joins, and a video call connects", async ({ browser }) => {
  const riya = await createRoom(browser, "Riya");
  const kabir = await joinRoom(browser, riya.code, "Kabir");
  await expect(kabir.page).toHaveURL(/\/dashboard$/);
  await riya.page.getByRole("button", { name: "Enter our space" }).click();

  // Game invite
  await riya.page.goto("/games");
  await riya.page.getByRole("button", { name: /Invite Kabir/ }).first().click();
  await expect(riya.page.getByText(/Waiting for Kabir to join/)).toBeVisible();
  await kabir.page.goto("/games");
  await kabir.page.getByRole("button", { name: "Join game" }).click();
  await expect(riya.page.getByRole("button", { name: "Play square 1" })).toBeVisible();
  await riya.page.getByRole("button", { name: "Play square 5" }).click();
  await expect(kabir.page.getByRole("button", { name: /^Square 5,/ })).toBeVisible();

  // Video call, phone to phone
  await riya.page.goto("/chat");
  await kabir.page.goto("/chat");
  await expect(riya.page.getByText("Online now")).toBeVisible();
  await riya.page.getByRole("button", { name: "Video call" }).click();
  await kabir.page.getByRole("button", { name: "Accept" }).click();
  await expect(riya.page.getByRole("button", { name: "End call" })).toBeVisible();
  await expect(riya.page.getByText(/Kabir · 0:0[1-9]/)).toBeVisible({ timeout: 15_000 });
  await riya.page.getByRole("button", { name: "End call" }).click();
  await expect(kabir.page.getByText("Call ended")).toBeVisible();

  await riya.context.close();
  await kabir.context.close();
});

test("a call still connects when the phones can't reach each other directly (through the server)", async ({ browser }) => {
  const riya = await createRoom(browser, "Riya");
  const kabir = await joinRoom(browser, riya.code, "Kabir");
  await expect(kabir.page).toHaveURL(/\/dashboard$/);
  await riya.page.getByRole("button", { name: "Enter our space" }).click();
  // Pretend the networks block a direct line.
  for (const p of [riya.page, kabir.page]) await p.evaluate(() => localStorage.setItem("usspace:call-path", "relay"));

  await riya.page.goto("/chat");
  await kabir.page.goto("/chat");
  await expect(riya.page.getByText("Online now")).toBeVisible();
  await expect(kabir.page.getByText("Online now")).toBeVisible();
  await riya.page.getByRole("button", { name: "Video call" }).click();
  await kabir.page.getByRole("button", { name: "Accept" }).click();
  for (const p of [riya.page, kabir.page]) await expect(p.getByText("Connected through UsSpace · encrypted")).toBeVisible();

  // Voice goes both ways, and Kabir sees Riya's video.
  const stats = (p: typeof riya.page) => p.evaluate(() => (window as unknown as { __usspaceCallStats: () => Record<string, number> | null }).__usspaceCallStats());
  await expect.poll(async () => (await stats(kabir.page))?.audioIn ?? 0, { timeout: 15_000 }).toBeGreaterThan(10);
  await expect.poll(async () => (await stats(riya.page))?.audioIn ?? 0, { timeout: 15_000 }).toBeGreaterThan(10);
  await expect
    .poll(() => kabir.page.getByTestId("relay-video").locator("canvas").evaluate((c: HTMLCanvasElement) => c.width), { timeout: 15_000 })
    .toBeGreaterThan(0);

  await kabir.page.getByRole("button", { name: "End call" }).click();
  await expect(riya.page.getByText("Call ended")).toBeVisible();
  await riya.context.close();
  await kabir.context.close();
});

test("a call switches to the server by itself when no direct line works", async ({ browser }) => {
  const riya = await createRoom(browser, "Riya");
  const kabir = await joinRoom(browser, riya.code, "Kabir");
  await expect(kabir.page).toHaveURL(/\/dashboard$/);
  await riya.page.getByRole("button", { name: "Enter our space" }).click();
  for (const p of [riya.page, kabir.page]) await p.evaluate(() => localStorage.setItem("usspace:call-path", "no-direct"));
  await riya.page.goto("/chat");
  await kabir.page.goto("/chat");
  await expect(riya.page.getByText("Online now")).toBeVisible();
  await expect(kabir.page.getByText("Online now")).toBeVisible();
  await riya.page.getByRole("button", { name: "Voice call" }).click();
  await kabir.page.getByRole("button", { name: "Accept" }).click();
  await expect(riya.page.getByText("Connecting…")).toBeVisible();
  for (const p of [riya.page, kabir.page]) await expect(p.getByText("Connected through UsSpace · encrypted")).toBeVisible({ timeout: 30_000 });
  await riya.page.getByRole("button", { name: "End call" }).click();
  await kabir.context.close();
  await riya.context.close();
});
