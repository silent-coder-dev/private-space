import type { Browser, Page } from "@playwright/test";
import { expect, test } from "../playwright-fixture";

/** Create a room in a fresh browser and return its page + secret code. */
async function createRoom(browser: Browser, name: string) {
  const context = await browser.newContext();
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
  const context = await browser.newContext();
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
  for (const path of ["/dashboard", "/chat", "/presence", "/games", "/planner", "/music", "/letters", "/timeline"]) {
    await riya.page.goto(path);
    await expect(riya.page.locator("main h1, main p").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
  await riya.context.close();
});
