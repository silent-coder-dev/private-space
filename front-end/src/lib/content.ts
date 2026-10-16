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

export const MEMORY_SYMBOLS = ["💖", "🌹", "🧸", "💌", "🍫", "🎵", "🌙", "💍"];

export const EVENT_EMOJIS = ["💕", "🎬", "🍽️", "✈️", "🎂", "🎁", "☕", "🌹", "🎉", "🏖️", "🎵", "📞"];

export const MEMORY_EMOJIS = ["💫", "☕", "❤️", "✈️", "🏠", "💍", "🎉", "📸", "🌅", "🐶", "🎓", "🌹"];

export const FEATURE_MARQUEE = [
  "🔐 End-to-end encrypted",
  "🔑 Secret room code",
  "⚡ Real-time sync",
  "💬 Private chat",
  "💌 Time-locked letters",
  "🎮 Games for two",
  "📅 Shared planner",
  "🎵 Our playlist",
  "🕰️ Memory timeline",
  "💗 Mood check-ins",
  "✨ Heart bursts",
  "🔒 Locked to 2 devices",
  "⌨️ Quick search (Ctrl + K)",
];
