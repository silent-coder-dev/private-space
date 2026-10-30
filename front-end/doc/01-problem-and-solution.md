# 1 · The Problem, the Website, the Solution and the Users

> **In one line:** UsSpace is a private, locked room for two people who love each other. You chat, call, share photos, draw, play and listen to music together, live on both phones, and when you close the room, everything is deleted.

---

## 1.1 What is the problem?

Couples share many small, special moments every day, but those moments are spread across many apps:

| What couples do | Where it usually happens | What goes wrong |
| --- | --- | --- |
| Send sweet messages, photos, videos | WhatsApp, Instagram, SMS | Love notes get lost between work chats and groups, and the company may be able to read them. |
| Call each other | Phone, WhatsApp | Fine, but it's yet another app, and it's not "your" space. |
| Share photos | Gallery, Drive | No shared album that only the two of you can see, and no way to look at them *together*. |
| Doodle, play little games | Separate apps | They are made for strangers, not for two people in love. |
| Listen to "our songs" | Spotify, YouTube | You can't easily play the same song together at the same second. |
| Say "I miss you" | A text | It feels small and easy to miss. |
| Feel close every day | Paid couple apps | The nice extras (daily questions, countdowns, thumb kiss) are often behind a subscription, and need an account. |

So the **problem** is:

1. **Too many apps.** The relationship has no single "home" online.
2. **No real privacy.** Public apps are noisy, and your words go through other companies.
3. **No warmth.** Most tools are built for work, not for love.
4. **No control.** It's hard to truly delete everything when you want to.

---

## 1.2 What is the website?

**UsSpace** is a web app made for **two people at a time**. It works like a private room with a lock:

1. One of you **creates a room** and gets a **secret code** (like `NJ4Q-0JPY-9BBC-ASCS`) and a QR code.
2. Your partner **joins** by typing the code or scanning the QR.
3. The room **locks** to your two devices. Nobody else can ever get in.
4. Everything you do shows up **live on both phones**.
5. When you **close the room**, everything is deleted: on the server and on both phones.

**Many couples can use the same website at once.** Every couple creates its own room with its own code, and each room holds exactly two people.

Inside the room:

| Room | What it does |
| --- | --- |
| 🏠 **Home** | Days together with **milestones** (1,000 days, 1,500 days…), a turning 3D heart, a **question of the day**, a **countdown to your next time together**, **notes for each other**, your mood, the love note of the day, and big buttons for "Missing you", "Thumb kiss", video and voice calls. |
| ❓ **Question of the day** | The same question on both phones each day (50 questions, then they repeat). You each answer; your partner's answer **opens only after you answer too**, so you can't copy. Past answers are kept for 2 months. |
| 📅 **Next time together** | Set the date of your next meeting ("Dinner date in Goa ✈️") and both phones count down the days, hours, minutes and seconds. |
| 📝 **Notes for each other** | Leave a short sticky note on your partner's Home ("Proud of you today 💛"). They get a pop-up when it arrives. |
| 💋 **Thumb kiss** | Both put a thumb on the screen. You see where your partner's thumb is; when they meet, both phones buzz and show a kiss. Your partner gets a "join" invite. |
| 👤 **Profile** | Add a **profile photo**, change your name and your together-since date, see and share your secret code, set a **PIN lock**, turn on notifications, **log out** of this phone, or close the room. |
| 💬 **Chat** | Real-time messages, **photos and videos up to 2 minutes from your camera**, emoji, reactions, *typing…* and ticks (🕓 sending · ✓ sent · ✓✓ seen). It always opens at your **newest message**. |
| 📞 **Calls** | **Voice and video calls that work on every network.** Phone to phone when possible; if a mobile network blocks that, the call goes through the UsSpace server instead (still encrypted). Mute, camera on/off, switch camera, minimise and keep talking. |
| 💖 **Missing you** | One tap: hearts and "💖 Riya is missing you" pop up on your partner's phone, or a 💖 message waits in the chat if they're offline. |
| 🖼️ **Gallery** | Share as many photos as you like. Both see them live. "Show Kabir" opens the photo on the other phone, and you can **voice chat while you look**. |
| 🎨 **Canvas** | Draw together with pen, neon and eraser, add stickers and photos. The board **grows by itself** when you draw near the bottom, so you never run out of space. |
| 🎮 **Games** | **8 games for two:** Tic-Tac-Toe, Connect Four, How Well Do You Know Me?, Rock Paper Scissors, Never Have I Ever, Truth or Dare, Memory Match and Would You Rather. You **invite** your partner, and the game starts **only when they join**. |
| 🎵 **Music** | Your own songs from the `music` folder, playing **in sync on both phones**. It keeps playing on every page, and you can control it from the 🎵 button at the top. |
| 🔔 **Notifications** | Add UsSpace to your home screen and turn on notifications: calls, messages and hearts reach you even when the app is in the background. They never show what a message says. |

There is also a **welcome page**, the **Create / Join** page, an **account menu** (tap your photo at the top: Profile, Lock now, Log out), **quick search** (`Ctrl + K`) and a friendly **404 page**.

### Ideas from popular couple apps, free here

Before building v5 we looked at what couples love in well-known couple apps and long-distance guides (Paired, Between, Couple, Agapé and others). The favourites were a **daily question**, a **thumb kiss**, a **countdown to the next visit**, **notes** and **milestones**. Many apps keep these behind a paid plan or an account. In UsSpace they are free, need no sign-up and are end-to-end encrypted like everything else.

---

## 1.3 How does UsSpace solve the problem?

| Problem | How UsSpace solves it |
| --- | --- |
| Too many apps | **Everything in one place**: chat, calls, photos, drawing, games and music. |
| No real privacy | **A locked room for two.** Everything is **end-to-end encrypted** on your phone, so the server only passes along locked boxes it can't open. It even **forgets** each message as soon as both phones have saved it. |
| No warmth | **Made to feel romantic**: a night-sky theme, glowing gradients, a 3D heart, floating hearts and gentle 3D animations. |
| No control | **Close room = delete everything**, from the server and from both phones, even a phone that was offline at the time. An optional **PIN lock** closes the app **the moment you switch tabs or minimise it**. **Log out** removes it from one phone only. |
| Being far apart | **Real time**: messages, typing, hearts, games, drawings and music move between your phones instantly. Calls work on every network. If one of you is offline, things wait (still encrypted) and arrive later. |

### What makes it special

- 🔑 **No email, no password.** Just a secret code that only the two of you know.
- 🔐 **End-to-end encrypted.** Your words, photos, drawings and even call set-up are locked before they leave your phone.
- 🚪 **Locked to two devices.** Even if the code leaks, nobody else can join.
- 🧨 **Nothing left behind.** The server keeps rooms only in memory, keeps each message only until it's delivered, and closing a room wipes everything.
- ⚡ **Live.** Typing, seen ticks, hearts, game moves and music all happen in real time.
- 📞 **Calls that connect.** Voice and video, with no extra app, on Wi-Fi and mobile data.
- 🔒 **Locks instantly.** With a PIN, UsSpace locks the moment you leave it, on a phone or a computer.
- 🖼️ **Your photo, not in a database.** Profile photos go only to your partner, encrypted, and live on your two phones until the room is closed.
- ⚡ **Feels like an app.** Pages switch in a blink, and it installs on your home screen.
- 💸 **Free to run.** It runs on free hosting (Render), with optional free extras for even better calls and stronger deletion.

---

## 1.4 Who are the users?

| User | Their situation | What they love about UsSpace |
| --- | --- | --- |
| ✈️ **Long-distance couples** | Live in different cities | Video calls, the countdown to the next visit, thumb kisses, "missing you" hearts, music together, games at night. |
| 💑 **Couples living together** | Busy days | Quick chat with photos, notes on each other's Home, the question of the day over breakfast, doodling together. |
| 💍 **Newly engaged / married** | Collecting memories | A private shared album, music from their wedding playlist, the "How well do you know me?" quiz. |
| 🌱 **New couples** | Getting to know each other | Never Have I Ever, Would You Rather, Truth or Dare, drawing silly comics. |

> **Priya & Arjun (long distance)**
> Priya creates the room and sends Arjun the QR. Every evening they video call (it works even on Arjun's strict mobile network), answer the question of the day, play Connect Four, and play *their* songs from the music folder at the same time. The Home page counts down to their next weekend together. Whenever Priya misses Arjun, one tap on 💖 says it, or they meet for a thumb kiss.

> **Sam & Alex (living together)**
> They fill the gallery with trip photos and look at them on a voice chat, then draw a long comic strip about the trip on the canvas, which keeps growing as they draw.

### Who is it *not* for?

- Groups or families. A room holds exactly **two** devices.
- People who want long-term cloud backup. UsSpace is built to be private and easy to delete.

---

## 1.5 Quick summary

```
Problem  → Couple moments are scattered, not private, and hard to delete.
Website  → UsSpace: a locked, end-to-end encrypted room for two (any number of couples, one room each).
Solution → Chat with camera (videos up to 2 min), calls that work on every network, missing-you hearts,
           question of the day, thumb kiss, countdown, notes, milestones, profile with photo,
           gallery + voice chat, a canvas that grows, 8 invite-to-play games, music in sync,
           instant PIN lock, notifications, log out, close room = delete all.
Users    → Couples: long-distance, living together, new or married.
```

**Next:** [2 · Approaches →](02-approaches.md)
