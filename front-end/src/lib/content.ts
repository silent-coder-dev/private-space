/** Words and lists used across the app, kept in one place so they are easy to edit. */

export const MOODS = [
  { emoji: "🥰", label: "Loved" },
  { emoji: "😊", label: "Happy" },
  { emoji: "🤗", label: "Cuddly" },
  { emoji: "😴", label: "Sleepy" },
  { emoji: "🥺", label: "Missing you" },
  { emoji: "🔥", label: "Excited" },
  { emoji: "😌", label: "Calm" },
  { emoji: "🤒", label: "Not great" },
] as const;

export const moodLabel = (emoji: string) => MOODS.find((m) => m.emoji === emoji)?.label ?? "Feeling something";

export const LOVE_NOTES = [
  "Every moment with you is a treasure I hold close to my heart.",
  "You are my favourite notification.",
  "Home isn't a place. It's you.",
  "I'd choose you in every lifetime, in every version of reality.",
  "You make ordinary days feel like little adventures.",
  "My heart still does a tiny dance every time I see your name.",
  "Thank you for being my calm and my chaos.",
  "Some days I can't believe you're really mine.",
  "You + me = my favourite equation.",
  "I love the way you laugh at your own jokes.",
  "If I had a flower for every time I thought of you, I'd walk in my garden forever.",
  "You are the best part of every single day.",
  "Near or far, you're always right here in my heart.",
  "I fall for you a little more every day.",
  "With you, even silence feels warm.",
  "You're my person. Always.",
  "Our story is my favourite one.",
  "Distance means so little when someone means so much.",
  "You make me want to be a better human.",
  "Can't wait to make a thousand more memories with you.",
];

export const STATUS_IDEAS = [
  "Thinking of you 💭",
  "At work, missing you 💼",
  "Making coffee ☕",
  "On my way home 🚗",
  "Watching our show 📺",
  "Can't sleep 🌙",
];

export const CHAT_EMOJIS = [
  "❤️", "🥰", "😘", "😍", "💕", "💖", "🤗", "😊",
  "😂", "🤭", "😉", "😎", "🥺", "😴", "🙈", "🫶",
  "🌹", "🌸", "✨", "🔥", "🎉", "🍕", "☕", "🍫",
  "🎵", "📸", "🌙", "☀️", "🌈", "💌", "🧸", "💍",
];

export const REACTIONS = ["❤️", "😂", "😮", "🥺", "🔥"];

export const TRUTHS = [
  "What's your favourite memory of us?",
  "When did you first know you loved me?",
  "What's something you've never told me?",
  "What do you love most about our relationship?",
  "What was your first impression of me?",
  "What's a small thing I do that makes you happy?",
  "Which song reminds you of us?",
  "What's one dream you have for our future?",
  "What's the silliest thing you've done because of me?",
  "When do you feel closest to me?",
  "What's something new you want us to try together?",
  "What's your favourite photo of us and why?",
  "What's a habit of mine you secretly find cute?",
  "If we could live anywhere for a year, where would it be?",
  "What's one thing you'd like me to know about you right now?",
];

export const DARES = [
  "Send me a voice note saying something sweet",
  "Write a short poem about us right now",
  "Share a song that reminds you of me",
  "Tell me your biggest dream for us",
  "Send me your silliest selfie",
  "Describe our first date in exactly five words",
  "Do your best impression of me",
  "Sing the chorus of 'our song'",
  "Send me three emojis that describe me",
  "Plan our next date in under one minute",
  "Give me a compliment you've never said before",
  "Change your status to something embarrassing for an hour",
  "Text me 'I love you' in three different languages",
  "Tell me a joke — if I don't laugh, you owe me a hug",
];

export const WOULD_YOU_RATHER: [string, string][] = [
  ["Have a cosy movie night in", "Go out dancing all night"],
  ["Travel to the mountains", "Travel to the beach"],
  ["Cook dinner together", "Order your favourite takeaway"],
  ["Get a surprise love letter", "Get a surprise gift"],
  ["Go on a road trip", "Take a long flight somewhere new"],
  ["Watch the sunrise together", "Watch the sunset together"],
  ["Have a pet cat", "Have a pet dog"],
  ["Slow-dance in the kitchen", "Karaoke in the car"],
  ["Breakfast in bed", "Midnight snacks on the floor"],
  ["Relive our first date", "Skip ahead to our next big trip"],
  ["Live in a big city", "Live in a quiet village"],
  ["Text all day", "Talk on the phone for an hour"],
  ["Have a picnic in the park", "Have a candle-lit dinner"],
  ["Explore a new country", "Revisit a favourite place"],
];

export const GAME_NAMES: Record<string, string> = {
  ttt: "Tic-Tac-Toe",
  tod: "Truth or Dare",
  memory: "Memory Match",
  wyr: "Would You Rather",
  c4: "Connect Four",
  rps: "Rock Paper Scissors",
  nhie: "Never Have I Ever",
  quiz: "How Well Do You Know Me?",
};

export const MEMORY_SYMBOLS = ["💖", "🌹", "🧸", "💌", "🍫", "🎵", "🌙", "💍"];



export const FEATURE_MARQUEE = [
  "🔐 End-to-end encrypted",
  "🔑 Secret room code",
  "⚡ Real-time sync",
  "💬 Live chat",
  "📸 Camera photos & videos",
  "📞 Voice & video calls",
  "🖼️ Shared gallery",
  "🎨 Draw together",
  "🎮 Games for two",
  "🎵 Music in sync",
  "💖 Missing-you hearts",
  "🧨 Close room = delete everything",
];

/** "Never have I ever…" — gentle, couple-friendly prompts. */
export const NEVER_HAVE_I_EVER = [
  "fallen asleep on a video call",
  "checked your profile before our first date",
  "practised what to say before calling you",
  "saved a screenshot of our chat",
  "laughed at a joke I didn't get",
  "cried at a movie",
  "worn your clothes when you weren't around",
  "re-read our old messages",
  "said \"5 minutes\" when I meant 30",
  "forgotten an important date",
  "sung loudly in the shower",
  "eaten the last slice and blamed someone else",
  "pretended to like a gift",
  "danced alone in my room",
  "had a crush on a cartoon character",
  "sent a text to the wrong person",
  "believed in love at first sight",
  "written a love note I never sent",
  "imagined our wedding",
  "searched for cute date ideas online",
  "been jealous for no reason",
  "made a playlist about us",
  "stayed up all night talking to you",
  "got lost on the way to a date",
  "cooked something that went terribly wrong",
  "pretended to be busy to look cool",
  "kept a ticket or a wrapper from a date",
  "dreamed about you",
  "smiled at my phone because of your message",
  "walked into a glass door",
  "already picked a name for our future pet",
  "watched a whole series in one weekend",
  "told a friend everything about our first date",
  "missed you within an hour of saying goodbye",
  "planned a surprise for you",
  "used your toothbrush",
];

/** "How well do you know me?" — each question has four answers to choose from. */
export const QUIZ_QUESTIONS: { q: string; options: [string, string, string, string] }[] = [
  { q: "Favourite time of the day?", options: ["Morning ☀️", "Afternoon 🌤️", "Evening 🌇", "Late night 🌙"] },
  { q: "The perfect date?", options: ["Dinner out 🍝", "Movie night at home 🍿", "An adventure outside 🏞️", "A long drive 🚗"] },
  { q: "Dessert pick?", options: ["Chocolate 🍫", "Ice cream 🍦", "Cake 🎂", "Fruit 🍓"] },
  { q: "Dream holiday?", options: ["Beach 🏖️", "Mountains 🏔️", "Big city 🌆", "Somewhere quiet 🏡"] },
  { q: "Best way to relax?", options: ["Sleeping 😴", "Music 🎧", "Shows & movies 📺", "Going out 🚶"] },
  { q: "Love language?", options: ["Sweet words 💬", "Hugs & touch 🤗", "Quality time ⏳", "Gifts 🎁"] },
  { q: "First drink of the day?", options: ["Coffee ☕", "Tea 🍵", "Water 💧", "Juice 🧃"] },
  { q: "Pet of choice?", options: ["Dog 🐶", "Cat 🐱", "Bird 🐦", "No pets 🙅"] },
  { q: "Favourite season?", options: ["Summer ☀️", "Monsoon 🌧️", "Autumn 🍂", "Winter ❄️"] },
  { q: "When upset, what helps most?", options: ["A hug 🤗", "Some space 🫥", "Talking it out 💬", "Food 🍕"] },
  { q: "Go-to music?", options: ["Romantic 💞", "Party 🎉", "Old classics 📻", "Whatever's trending 📈"] },
  { q: "Biggest fear?", options: ["Spiders 🕷️", "Heights 🧗", "The dark 🌑", "Losing you 🥺"] },
  { q: "Ideal weekend morning?", options: ["Sleep in 🛌", "Breakfast together 🥞", "A workout 🏃", "Phone in bed 📱"] },
  { q: "Superpower of choice?", options: ["Flying 🕊️", "Invisibility 👻", "Teleporting ✨", "Reading minds 🧠"] },
  { q: "Comfort food?", options: ["Pizza 🍕", "Biryani 🍛", "Noodles 🍜", "Burgers 🍔"] },
  { q: "Photo style?", options: ["Selfies 🤳", "Scenery 🌄", "Food 📸", "Hates photos 🙈"] },
  { q: "Dream home?", options: ["City flat 🏙️", "Beach house 🏖️", "Cosy cottage 🏡", "Big villa 🏰"] },
  { q: "Notices first in people?", options: ["Eyes 👀", "Smile 😊", "Style 👗", "Voice 🗣️"] },
  { q: "Movie pick?", options: ["Romance 💘", "Comedy 😂", "Horror 👻", "Action 💥"] },
  { q: "Biggest habit?", options: ["Being late ⏰", "Overthinking 🤔", "Snacking 🍪", "Scrolling 📱"] },
  { q: "Favourite way to show love?", options: ["Cute texts 💌", "Surprises 🎁", "Cooking 🍳", "Cuddles 🫶"] },
  { q: "Would rather be right now?", options: ["In bed 🛏️", "With you 💑", "On a trip ✈️", "At a party 🎉"] },
  { q: "Favourite colours?", options: ["Reds & pinks ❤️", "Blues 💙", "Greens 🌿", "Black & white 🖤"] },
  { q: "A lottery win would go to…", options: ["Travelling the world 🌍", "A dream house 🏠", "Savings 💰", "Spoiling you 🎁"] },
  { q: "Social battery?", options: ["Always on 🔋", "Needs breaks 🪫", "Depends on the day 🌗", "Only charges with you 🔌"] },
  { q: "Morning person or night owl?", options: ["Early bird 🐦", "Night owl 🦉", "Neither 😵", "Depends on you 💕"] },
];
