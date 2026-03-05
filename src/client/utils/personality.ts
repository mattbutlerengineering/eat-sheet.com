// Score personality labels — maps score ranges to fun descriptors
export function scorePersonality(score: number): { readonly label: string; readonly emoji: string } {
  if (score === 10) return { label: "Chef's kiss", emoji: "💋" };
  if (score >= 8) return { label: "Stellar", emoji: "✨" };
  if (score >= 6) return { label: "Solid", emoji: "👍" };
  if (score >= 4) return { label: "Meh", emoji: "😐" };
  return { label: "Yikes", emoji: "😬" };
}

// Slider personality — live feedback as score changes
export function sliderPersonality(score: number): string {
  if (score <= 2) return "Yikes...";
  if (score <= 4) return "Getting there...";
  if (score <= 6) return "Not bad!";
  if (score <= 8) return "Now we're talking!";
  if (score === 9) return "Almost perfect!";
  return "Chef's kiss! 💋";
}

// Rotating loading messages with Slurms energy
const LOADING_MESSAGES: readonly string[] = [
  "Checking the menu...",
  "Asking the chef...",
  "Warming up the kitchen...",
  "Setting the table...",
  "Uncorking the wine...",
  "Lighting the candles...",
  "Polishing the silverware...",
  "Tasting the specials...",
];

export function randomLoadingMessage(): string {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]!;
}

// Slurms quotes for different contexts
export const SLURMS_QUOTES = {
  welcome: "Wimmy wam wam wozzle! Join the party.",
  empty: "Even Slurms needs restaurants to party at.",
  emptyList: "Your list is emptier than a Monday night buffet.",
  perfect10: "Party on, dude!",
  celebrate: "Wimmy wam wam wozzle!",
  error: "Slurms partied too hard. Try again.",
  noResults: "Slurms looked everywhere. Nada.",
  pickerWin: "Now THAT'S a party!",
  offline: "Looks like the WiFi took a dinner break.",
} as const;

const OFFLINE_MESSAGES: readonly string[] = [
  "Looks like the WiFi took a dinner break",
  "The internet ghosted us",
  "We're off the grid — showing cached data",
  "Signal's out to lunch",
];

export function randomOfflineMessage(): string {
  return OFFLINE_MESSAGES[Math.floor(Math.random() * OFFLINE_MESSAGES.length)]!;
}

// Avatar color from member name — deterministic hash to warm palette
const AVATAR_COLORS: readonly string[] = [
  "bg-orange-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-rose-500",
  "bg-pink-500",
  "bg-violet-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-cyan-500",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function avatarColor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length]!;
}
