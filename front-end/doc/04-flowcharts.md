# 4 · Flowcharts of Everything

Every important flow in UsSpace, drawn as a picture.
The diagrams use **Mermaid**, which GitHub and VS Code (with a Mermaid preview extension) draw automatically.

**Contents**

| Getting in | Every room | Safety & running |
| --- | --- | --- |
| [4.1 The big picture](#41-the-big-picture-user-journey) | [4.12 Chat: typing, sending and ticks](#412-chat-typing-sending-and-ticks) | [4.22 PIN lock and privacy blur](#422-pin-lock-and-privacy-blur) |
| [4.2 Create a room](#42-create-a-room) | [4.13 Camera: photo or video](#413-camera-photo-or-video) | [4.23 Close room = delete everything](#423-close-room--delete-everything) |
| [4.3 Join a room](#43-join-a-room) | [4.14 I'm missing you](#414-im-missing-you) | [4.24 Leave on this phone only](#424-leave-on-this-phone-only) |
| [4.4 Four keys from one code](#44-four-keys-from-one-secret-code) | [4.15 Voice and video call](#415-voice-and-video-call) | [4.25 Quick search (Ctrl + K)](#425-quick-search-ctrl--k) |
| [4.5 How one message travels](#45-how-one-message-travels) | [4.16 Call screen states](#416-call-screen-states) | [4.26 Phone navigation](#426-phone-navigation) |
| [4.6 Server checks on join](#46-what-the-server-checks-when-someone-joins) | [4.17 Gallery: share, show, talk](#417-gallery-share-show-and-talk) | [4.27 Running it for real](#427-running-it-for-real-deployment) |
| [4.7 Offline and catch-up](#47-offline-reconnect-and-catch-up) | [4.18 Canvas: draw and cartoon](#418-canvas-draw-stickers-and-cartoons) | |
| [4.8 How the app starts](#48-how-the-app-starts) | [4.19 Game invites](#419-game-invites) | |
| [4.9 Page map](#49-page-map-and-the-room-guard) | [4.20 Playing the games](#420-playing-the-games) | |
| [4.10 Component tree](#410-screen-layout-component-tree) | [4.21 Music: one player, in sync](#421-music-one-player-in-sync) | |
| [4.11 Newest wins + pop-ups](#411-shared-data-newest-wins-and-pop-ups) | | |

---

## 4.1 The big picture (user journey)

```mermaid
flowchart TD
    Start(["👤 Visitor opens UsSpace"]) --> Landing["🌌 Landing page"]
    Landing -->|"Enter our space"| Gate{"Is this phone<br/>in a room?"}
    Gate -->|"Yes"| Lock{"PIN lock on?"}
    Lock -->|"Yes"| Pin["🔒 Enter PIN"] --> Home
    Lock -->|"No"| Home["🏠 Home"]
    Gate -->|"No"| Choose["🔐 Start page<br/>Create a room · Join a room"]
    Choose -->|"Create"| Create["Name + together since"] --> Code["🔑 Secret code<br/>Copy · Share · QR"]
    Code -->|"Partner joins"| Joined["💞 Partner joined!<br/>room locks to 2 phones"]
    Code -->|"Enter now"| Home
    Joined --> Home
    Choose -->|"Join"| Join["Code + name"] --> Home
    Home --> Rooms["💬 Chat + 📞 calls · 🖼️ Gallery · 🎨 Canvas<br/>🎮 Games · 🎵 Music · 💖 Missing you"]
    Rooms <-->|"⚡ live, encrypted"| Partner["📱 Partner's phone"]
    Rooms -->|"Close room"| Gone["🧨 Everything deleted<br/>server + both phones"]
```

---

## 4.2 Create a room

```mermaid
sequenceDiagram
    actor Riya
    participant App as Riya's phone
    participant Relay as Relay server
    Riya->>App: Name + together-since, then Create our room
    App->>App: Make a random 16-letter code (80 bits)
    App->>App: Work out room id, auth key, encryption key from the code
    App->>App: Open this room's storage (IndexedDB)
    App->>Relay: create (room id, hash of auth key, device id)
    Relay->>Relay: New and not closed? Keep it in memory, Riya is member 1
    Relay-->>App: welcome (members 1)
    App->>App: Save the session, share Riya's name and the date (encrypted)
    App-->>Riya: Show the secret code + Copy, Share, QR
    Note over App,Relay: The code itself never leaves Riya's phone
```

---

## 4.3 Join a room

```mermaid
sequenceDiagram
    actor Kabir
    participant App as Kabir's phone
    participant Relay as Relay server
    participant Riya as Riya's phone
    Kabir->>App: Type or scan the code, add a name
    App->>App: Fix typos, check 16 characters
    App->>App: Work out the same room id and keys
    App->>Relay: join (room id, auth key, device id)
    Relay->>Relay: Checks (see 4.6)
    Relay-->>App: welcome (members 2) + everything shared so far
    App->>App: Decrypt, save, share Kabir's name
    Relay-->>Riya: presence (members 2, partner online)
    Riya->>Riya: 💞 Kabir joined! (heart burst + pop-up)
```

---

## 4.4 Four keys from one secret code

```mermaid
flowchart LR
    Code["🔑 Secret code<br/>NJ4Q-0JPY-9BBC-ASCS"] --> N["Normalise<br/>(upper-case, fix O/0, I/1)"]
    N --> H{"HKDF-SHA256"}
    H -->|"room-id"| R["Room id<br/>→ server knows which room"]
    H -->|"auth"| A["Auth key<br/>→ server stores only its SHA-256 hash"]
    H -->|"e2e-encryption"| E["Encryption key<br/>→ XChaCha20-Poly1305<br/>never leaves the phone"]
    H -->|"item-key"| M["Item key<br/>→ anonymous labels for items"]
```

---

## 4.5 How one message travels

```mermaid
sequenceDiagram
    participant A as Riya's phone
    participant S as Relay server
    participant B as Kabir's phone
    A->>A: Show the message now (🕓 sending), save it in the outbox
    A->>A: Encrypt the message (text, photo or video, time, sender)
    A->>S: put (anonymous label, locked box)
    S->>S: Keep the box in memory as event number N
    S-->>A: ack N
    A->>A: Remove from outbox (✓ sent)
    S-->>B: event N (locked box)
    B->>B: Decrypt and check. "me" becomes "partner"
    B->>B: Show the message live, save it in IndexedDB
    B->>S: put read-receipt (encrypted)
    S-->>A: event (read-receipt)
    A->>A: ✓✓ seen
```

---

## 4.6 What the server checks when someone joins

```mermaid
flowchart TD
    J["join request"] --> V{"Valid format?"}
    V -->|"No"| E1["bad_request"]
    V -->|"Yes"| C0{"Room was closed?"}
    C0 -->|"Yes"| EC["closed<br/>(phone wipes its copy)"]
    C0 -->|"No"| T{"This IP has<br/>tries left?"}
    T -->|"No"| E2["rate_limited"]
    T -->|"Yes"| F{"Room exists?"}
    F -->|"No"| X1["use 1 try → not_found"]
    F -->|"Yes"| L{"Room locked after<br/>10 wrong tries?"}
    L -->|"Yes"| E3["rate_limited"]
    L -->|"No"| K{"hash(auth key)<br/>matches?"}
    K -->|"No"| X2["use 1 try, count a failure → denied"]
    K -->|"Yes"| M{"Device already a member?"}
    M -->|"Yes"| OK["welcome + catch-up<br/>(no try used)"]
    M -->|"No"| C{"Fewer than 2 members?"}
    C -->|"Yes"| ADD["add member 2 → welcome<br/>(room is now locked)"]
    C -->|"No"| FULL["full"]
```

---

## 4.7 Offline, reconnect and catch-up

```mermaid
flowchart TD
    A["Connection drops<br/>(train, Wi-Fi, phone asleep)"] --> B["Pill: Offline · changes saved"]
    B --> C["You keep using the app<br/>changes wait in the outbox (saved)"]
    C --> D{"Back online,<br/>tab visible,<br/>or retry timer"}
    D --> E["Reconnect with backoff<br/>0.5s → 1s → 2s … max 15s"]
    E --> F["join (since = last event number)"]
    F --> G{"What does the server say?"}
    G -->|"Room found"| H["Receive everything after that number"]
    G -->|"Room lost (server restarted)"| I["Re-create the room<br/>with the same code"]
    G -->|"Room closed"| W["Wipe this phone's copy<br/>→ back to the start"]
    I --> J["Re-upload this phone's whole copy"]
    H --> K["Send the outbox"]
    J --> K
    K --> L["Pill: Live / Kabir is here"]
```

---

## 4.8 How the app starts

```mermaid
flowchart TD
    A["index.html"] --> B["main.tsx"]
    B --> C["App.tsx"]
    C --> D["MotionConfig + Tooltip + Toaster"]
    D --> E["BrowserRouter"]
    E --> F["RoomProvider"]
    F --> G{"Saved session<br/>on this phone?"}
    G -->|"Yes"| H["Open this room's IndexedDB<br/>(r:room-id: …)"]
    H --> H2["Load every saved item<br/>→ SyncEngine"]
    H2 --> H3["Start SyncClient<br/>(connect, catch up, send outbox)"]
    G -->|"No"| I["No room yet"]
    H3 --> J["Routes"]
    I --> J
    C --> K["BurstLayer (heart bursts)"]
    C --> L["Pre-load all pages when idle"]
```

---

## 4.9 Page map and the room guard

```mermaid
flowchart LR
    Root["/"] --> Landing["Landing"]
    StartP["/start"] --> Start["Create / Join / Secret code"]
    Guard{"RequireRoom"}
    Guard -->|"no room"| StartP
    Guard -->|"in a room"| Layout["SpaceProvider → AppLock → CallProvider<br/>→ MusicProvider → AppLayout"]
    Layout --> D["/dashboard (Home)"]
    Layout --> C["/chat"]
    Layout --> G["/gallery (?look=1)"]
    Layout --> CV["/canvas"]
    Layout --> GM["/games (?join=1)"]
    Layout --> M["/music"]
    HomeAlias["/home"] -->|"redirect"| D
    Star["* (unknown)"] --> NF["404"]
```

---

## 4.10 Screen layout (component tree)

```mermaid
flowchart TD
    RR["RequireRoom<br/>(+ room problem dialog)"] --> SP["SpaceProvider<br/>me · partner · couple"]
    SP --> LK["AppLock<br/>PIN screen + privacy blur"]
    LK --> CP["CallProvider<br/>ringing · WebRTC"]
    CP --> MP["MusicProvider<br/>one audio player for the whole app"]
    MP --> AL["AppLayout"]
    AL --> AB["AuroraBackground + particles"]
    AL --> AS["AppSidebar"]
    AL --> TB["Topbar<br/>ConnectionPill · search · 🎵 · 💖 · calls"]
    AL --> MAIN["main id=main"]
    MAIN --> PAGE["Current page (3D page turn)"]
    AL --> MN["MobileNav"]
    AL --> CM["CommandMenu"]
    AL --> SD["SettingsDialog<br/>name · since · code · PIN · close room"]
    AL --> CO["CallOverlay<br/>ringing · full screen · mini bar"]
```

---

## 4.11 Shared data: newest wins and pop-ups

```mermaid
flowchart TD
    P["A put arrives<br/>(column, id, data, time, by)"] --> W{"From my own device?"}
    W -->|"No"| F["Swap me ↔ partner<br/>(messages, photos, strokes, game, …)"]
    W -->|"Yes"| N
    F --> N{"Newer than what<br/>I have for this item?"}
    N -->|"No (older or same)"| I["Ignore"]
    N -->|"Yes"| A["Apply: add, replace or delete<br/>(remember deletes)"]
    A --> U["Tell the pages to redraw"]
    A --> S["Save the item + 'caught up to N'<br/>in ONE IndexedDB step"]
    A --> T{"From my partner,<br/>while live?"}
    T -->|"New message, not on Chat"| T1["💬 Kabir · Reply"]
    T -->|"New photo, not on Gallery"| T2["🖼️ Added a photo · See"]
    T -->|"Game invite"| T3["🎮 Invites you to play · Join game"]
    T -->|"Show a photo, not on Gallery"| T4["👀 Wants to show you a photo · Look"]
```

---

## 4.12 Chat: typing, sending and ticks

```mermaid
flowchart TD
    A["You type"] --> B{"More than 2.5 s<br/>since the last signal?"}
    B -->|"Yes"| C["Send 'typing' signal<br/>(live, not stored)"]
    C --> D["Partner sees typing… for 4 s"]
    A --> E{"Enter pressed<br/>(not Shift, not IME)"}
    E -->|"Text not empty"| F["Add message instantly · 🕓"]
    F --> G["Server confirms · ✓"]
    G --> H{"Partner's chat is open<br/>and visible?"}
    H -->|"Yes"| I["They save 'read up to time T'"]
    I --> J["Your message · ✓✓ Seen"]
    K["📎 Pick a photo"] --> L["Shrink to a 1280 px JPEG"] --> F
    K2["📎 Pick a video"] --> L2{"Max 2.5 MB?"}
    L2 -->|"Yes"| F
    L2 -->|"No"| L3["'Record a shorter clip'"]
    CAM["📷 Camera (see 4.13)"] --> F
    M["Double-click a bubble"] --> N["Toggle ❤️ (synced)"]
```

---

## 4.13 Camera: photo or video

```mermaid
flowchart TD
    A["Tap 📷 in the chat"] --> B["Ask for camera + mic<br/>(getUserMedia)"]
    B -->|"Not allowed"| X["Friendly message"]
    B -->|"Allowed"| C["Live preview<br/>(front camera, flip button)"]
    C --> D{"Photo or Video?"}
    D -->|"Photo"| E["Snap → 1280 px JPEG"]
    D -->|"Video"| F["Record (MediaRecorder, 600 kbps)<br/>red ring counts to 20 s"]
    F -->|"Stop or 20 s"| G{"Max 2.5 MB?"}
    G -->|"No"| X2["'Too big, record a shorter clip'"]
    G -->|"Yes"| H["Preview"]
    E --> H
    H -->|"Retake"| C
    H -->|"Send"| I["Encrypted message with<br/>the photo or video"]
    I --> J["Camera turns off"]
```

---

## 4.14 I'm missing you

```mermaid
flowchart TD
    A["Tap 💖 (top bar, Home or Ctrl + K)"] --> B["22 hearts burst from the button"]
    B --> C{"Partner online?"}
    C -->|"Yes"| D["Send a live 'heart' signal<br/>(encrypted, not stored)"]
    D --> E["Partner: 30 hearts burst +<br/>'💖 Riya is missing you'"]
    D --> F["You: 'Kabir knows you're missing them 💖'"]
    C -->|"No"| G["Save a '💖 I'm missing you'<br/>chat message"]
    G --> H["They see it as soon as they're back"]
```

---

## 4.15 Voice and video call

```mermaid
sequenceDiagram
    participant A as Riya's phone
    participant S as Relay (encrypted signals)
    participant B as Kabir's phone
    A->>A: Tap 📞 or 🎥, check Kabir is online
    A->>A: Turn on mic (and camera)
    loop every 3 s, for up to 40 s
        A->>S: call ring (id, voice or video)
        S-->>B: ring
    end
    B->>B: Ringtone + vibration + Accept / Decline
    B->>B: Accept → turn on mic (and camera)
    B->>S: call accept
    S-->>A: accept
    A->>A: Create offer, gather all network routes (STUN / TURN)
    A->>S: call offer (one message)
    S-->>B: offer
    B->>B: Create answer, gather routes
    B->>S: call answer
    S-->>A: answer
    A-->>B: 🔊 🎥 Audio and video flow DIRECTLY phone to phone (DTLS-SRTP)
    Note over A,B: Either side can mute, turn the camera off, flip it, minimise, or hang up (end)
```

**Special cases:** no answer in 40 s → "Kabir didn't answer". Decline → "Kabir can't talk right now". Already on a call → "busy". Both call at the same moment → the phone with the smaller device id answers the other call automatically. Closing the page → the call ends.

---

## 4.16 Call screen states

```mermaid
flowchart LR
    Idle(["idle"]) -->|"Call"| Out["outgoing<br/>Calling…"]
    Idle -->|"ring arrives"| In["incoming<br/>ripples + Accept / Decline"]
    Out -->|"accept arrives"| Con["connecting"]
    In -->|"Accept"| Con
    Con -->|"media flows"| Live["live<br/>timer m:ss"]
    Live -->|"Minimise"| Mini["floating call bar<br/>(keep browsing)"]
    Mini -->|"Open call"| Live
    Out -->|"no answer / decline / busy"| Idle
    In -->|"Decline / caller hangs up"| Idle
    Live -->|"End"| Idle
    Mini -->|"End"| Idle
```

---

## 4.17 Gallery: share, show and talk

```mermaid
flowchart TD
    A["Add photos (many at once)"] --> B["Each → 1600 px JPEG"]
    B --> C["Shared item in 'photos'<br/>(encrypted)"]
    C --> D["Both phones: masonry grid updates live"]
    C --> E["Partner elsewhere:<br/>'🖼️ Riya added a photo · See'"]
    F["Open a photo"] --> G["Full-screen viewer<br/>swipe · arrows · save · delete + Undo"]
    G -->|"Show Kabir"| H["Shared 'gview' = this photo"]
    H --> I{"Kabir on the Gallery?"}
    I -->|"Yes"| J["Photo opens on Kabir's screen"]
    I -->|"No"| K["'👀 Riya wants to show you a photo · Look'"]
    K --> J
    V["🎙️ Voice chat"] --> W["Voice call, minimised<br/>→ talk while you both look"]
```

---

## 4.18 Canvas: draw, stickers and cartoons

```mermaid
flowchart TD
    A["Finger / mouse down"] --> B{"Tool?"}
    B -->|"Pen / Neon / Eraser"| C["Draw live on the top layer<br/>(points 0–1000)"]
    C -->|"Finger up"| D["Save the stroke as a shared item"]
    B -->|"Sticker"| E["Stamp the emoji → shared item"]
    D & E --> F["Both phones redraw<br/>paper + photos → ink → live stroke"]
    P["Add photo"] --> Q["Shrink to 900 px"]
    Q --> R{"Cartoon on?"}
    R -->|"Yes"| S["Cartoon filter:<br/>colour bands + dark outlines"]
    R -->|"No"| T["Place the photo"]
    S --> T --> F
    U["Undo"] --> U2["Remove MY last stroke,<br/>sticker or photo"]
    X["Clear"] --> X2{"Sure? Clears for both"} -->|"Yes"| X3["Delete all strokes, stickers, photos"]
    Y["Save"] --> Y2["Download a PNG"]
```

---

## 4.19 Game invites

```mermaid
sequenceDiagram
    actor Riya
    participant G as Shared "game" item
    actor Kabir
    Riya->>G: Invite (game = Tic-Tac-Toe, status = invited)
    Riya->>Riya: "Waiting for Kabir to join…" (or Cancel invite)
    G-->>Kabir: Pop-up anywhere in the app: "🎮 Riya invites you to play Tic-Tac-Toe" + Join game
    Kabir->>G: Join → fresh board, status = playing
    G-->>Riya: "🎮 Kabir joined your game!" and the board opens
    Note over Riya,Kabir: The game starts only when the partner joins
    Riya->>G: End game → back to the game list
```

If Kabir is offline, Riya sees "Kabir is offline, they'll see your invite when they're back".

---

## 4.20 Playing the games

```mermaid
flowchart LR
    subgraph TTT["❌⭕ Tic-Tac-Toe"]
      A1["My turn? Tap an empty square"] --> A2["Check the 8 lines"]
      A2 -->|"Win / draw"| A3["Score + 🎉 on both phones"]
      A2 -->|"No"| A4["Turn → partner"]
      A3 --> A5["New round: the other person starts"]
    end
    subgraph MEM["🧠 Memory Match"]
      M1["My turn: flip 2 cards"] --> M2{"Pair?"}
      M2 -->|"Yes"| M3["+1 point, keep your turn"]
      M2 -->|"No"| M4["Flip back → partner's turn"]
      M3 --> M5{"All pairs found?"}
      M5 -->|"Yes"| M6["Most points wins 🎉"]
    end
    subgraph TOD["🎲 Truth or Dare"]
      T1["Truth / Dare / Surprise"] --> T2["Random prompt"] --> T3["Card flips on BOTH phones"]
    end
    subgraph WYR["🤔 Would You Rather"]
      W1["Both pick secretly"] --> W2["Both answers shown<br/>(match or not)"] --> W3["Next question<br/>(same order on both phones)"]
    end
```

---

## 4.21 Music: one player, in sync

```mermaid
flowchart TD
    F["📁 front-end/public/music<br/>(your mp3, m4a, ogg, wav, flac…)"] --> MF["Server lists it at<br/>/music/manifest.json"]
    MF --> SONGS["MusicProvider: song list<br/>(one player for the whole app)"]
    D["Shared player item<br/>{song, playing, position, at}"] --> N["Each phone: now = server time"]
    N --> P{"playing?"}
    P -->|"Yes"| Q["position + (now − at)"]
    P -->|"No"| R["position"]
    Q & R --> AU["Own audio element<br/>(corrects if more than 1.5 s off)"]
    SONGS --> AU
    AU --> RNG["Server sends only the<br/>needed part (Range 206)"]
    C1["Music page · 🎵 top-bar pop-up<br/>lock screen / headphones"] -->|"Play · Pause · Seek · Next · Prev"| S["Write {position at now, at = now}"]
    S --> D
    E{"Song ended?"} -->|"repeat one"| S1["position 0"]
    E -->|"last song, repeat off"| S2["stop"]
    E -->|"otherwise"| S3["next (or random with shuffle)"]
    AU -.->|"browser blocks autoplay"| TAP["'Tap to hear it here'"]
```

Volume is **per phone** (saved on this phone only). Changing pages never stops the music.

---

## 4.22 PIN lock and privacy blur

```mermaid
flowchart TD
    S["Settings → PIN lock on"] --> H["PIN → PBKDF2-SHA256<br/>150 000 rounds + random salt"]
    H --> K["Save only the hash on this phone"]
    O["App opens"] --> L{"PIN set?"}
    L -->|"Yes"| LS["🔒 UsSpace is locked"]
    L -->|"No"| APP["App"]
    LS --> E{"Correct PIN?"}
    E -->|"Yes"| APP
    E -->|"No"| F{"5 wrong tries?"}
    F -->|"Yes"| W["Wait 30 seconds"]
    F -->|"No"| SH["Card shakes, try again"]
    APP --> BG["App goes to the background"]
    BG --> BL["Blur the whole app<br/>(app switcher, screen share)"]
    BG --> BK{"Back after more than 30 s<br/>and PIN set?"}
    BK -->|"Yes"| LS
    BK -->|"No"| APP
```

---

## 4.23 Close room = delete everything

```mermaid
sequenceDiagram
    actor Riya
    participant A as Riya's phone
    participant S as Relay
    participant B as Kabir's phone
    Riya->>A: Settings → Close room & delete everything → Confirm
    A->>S: close
    S->>S: Delete the room from memory, remember "closed" for 30 days
    S-->>A: closed
    S-->>B: closed
    A->>A: Wipe IndexedDB + local storage for this room
    B->>B: Wipe IndexedDB + local storage for this room
    A-->>Riya: "🔒 The room was closed. Everything was deleted."
    B-->>B: Same message, back to the start
    Note over S,B: If Kabir was offline, Kabir's phone gets "closed" on reconnect and wipes then. Nobody can re-create a closed room.
```

---

## 4.24 Leave on this phone only

```mermaid
flowchart TD
    A["Settings → Leave on this phone only"] --> B{"Confirm"}
    B -->|"Stay"| Z["Nothing changes"]
    B -->|"Leave"| C["Tell the server: leave"]
    C --> D["Server frees this seat<br/>(the room stays for your partner)"]
    C --> E["Wipe this phone's copy + session"]
    E --> F["Back to the landing page"]
    D --> G["You can join again later with the code"]
```

---

## 4.25 Quick search (Ctrl + K)

```mermaid
flowchart LR
    A["Ctrl/⌘ + K"] --> B["Command menu"]
    B --> C{"Choice"}
    C -->|"A room"| D["Go there"]
    C -->|"I'm missing you"| E["💖 (see 4.14)"]
    C -->|"Video call / Voice call"| F["📞 (see 4.15)"]
    C -->|"Add photos"| G["/gallery"]
    C -->|"Draw together"| H["/canvas"]
    C -->|"Invite to a game"| I["/games"]
    C -->|"Profile, room code & settings"| J["Settings dialog"]
```

---

## 4.26 Phone navigation

```mermaid
flowchart LR
    A["Bottom dock"] --> H["Home"]
    A --> C["Chat"]
    A --> G["Gallery"]
    A --> GM["Games"]
    A --> M["More"]
    M --> S["Slide-in menu with every room<br/>(Canvas, Music, …)"]
    T["Top bar (every page)"] --> T1["🎵 music pop-up"]
    T --> T2["💖 missing you"]
    T --> T3["Connection pill"]
```

---

## 4.27 Running it for real (deployment)

```mermaid
flowchart LR
    Dev["npm run dev<br/>(site + relay + music on :8080)"] --> Build["npm run build → dist/<br/>(+ dist/music)"]
    Build --> Start["npm start<br/>server/index.mjs"]
    Start --> Serve["Serves dist/ with security headers,<br/>gzip and seekable music"]
    Start --> WS["Relay on /ws<br/>rooms in memory only"]
    Docker["Dockerfile"] --> Start
    Serve & WS --> HTTPS["Behind HTTPS<br/>(Render free, Railway, Fly.io, a VPS…)"]
    HTTPS --> Phones["📱 📱 Both phones open the same address"]
    TURN["Optional TURN server<br/>VITE_TURN_*"] -.-> Phones
```

**Back:** [← 3 · Design](03-design.md) · **Next:** [5 · Directory Map →](05-directory-map.md)
