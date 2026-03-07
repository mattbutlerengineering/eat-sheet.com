// Score personality labels — maps score ranges to fun descriptors
export function scorePersonality(score: number): { readonly label: string; readonly emoji: string } {
  if (score === 10) return { label: "Chef's kiss", emoji: "💋" };
  if (score >= 8) return { label: "Stellar", emoji: "✨" };
  if (score >= 6) return { label: "Solid", emoji: "👍" };
  if (score >= 4) return { label: "Meh", emoji: "😐" };
  return { label: "Yikes", emoji: "😬" };
}

// Slider personality — live feedback as score changes
const SLIDER_LINES: Record<string, readonly string[]> = {
  low: [
    "Yikes...",
    "Brian's been here. You can tell.",
    "Did someone microwave this?",
    "Bold of them to charge money for this.",
    "Even Chomps wouldn't party here.",
  ],
  mid_low: [
    "Getting there...",
    "It's giving cafeteria.",
    "Brian said it was fine. Brian lies.",
    "Acceptable if you're very hungry.",
    "Not a crime, but close.",
  ],
  mid: [
    "Not bad!",
    "Solid Tuesday night energy.",
    "Would eat here again if nothing else was open.",
    "Brian would approve, for what that's worth.",
    "Perfectly adequate. The highest of mid praise.",
  ],
  mid_high: [
    "Now we're talking!",
    "Okay I see you.",
    "Tell Brian he's missing out.",
    "Save me a seat.",
    "This is the kind of place you lie about finding first.",
  ],
  high: [
    "Almost perfect!",
    "One point away from glory.",
    "Brian could never.",
    "So close to the promised land.",
    "Don't fumble this, chef.",
  ],
  perfect: [
    "Chef's kiss! 💋",
    "Flawless. Immaculate. No notes.",
    "Even Brian couldn't ruin this.",
    "Shut it down. We found the one.",
    "Tell the chef I love them.",
  ],
};

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function sliderPersonality(score: number): string {
  if (score <= 2) return randomFrom(SLIDER_LINES.low!);
  if (score <= 4) return randomFrom(SLIDER_LINES.mid_low!);
  if (score <= 6) return randomFrom(SLIDER_LINES.mid!);
  if (score <= 8) return randomFrom(SLIDER_LINES.mid_high!);
  if (score === 9) return randomFrom(SLIDER_LINES.high!);
  return randomFrom(SLIDER_LINES.perfect!);
}

// Rotating loading messages — Chomps is doing important work
const LOADING_MESSAGES: readonly string[] = [
  "Checking the menu...",
  "Asking the chef...",
  "Warming up the kitchen...",
  "Setting the table...",
  "Uncorking the wine...",
  "Lighting the candles...",
  "Polishing the silverware...",
  "Tasting the specials...",
  "Bribing the host for a good table...",
  "Pretending to understand the wine list...",
  "Googling what 'al dente' means...",
  "Brian's parking the car. He'll be a while.",
  "Convincing Brian that sushi is safe...",
  "Chomps is freshening up...",
  "Judging the font on the menu...",
  "Sniffing the bread basket...",
  "Counting Brian's complaints so far...",
  "Rehearsing our fake Yelp review...",
  "Wondering if the waiter hates us...",
  "Calculating the tip in advance...",
];

export function randomLoadingMessage(): string {
  return randomFrom(LOADING_MESSAGES);
}

// Chomps quotes — randomized per context for variety
const QUOTE_POOL: Record<string, readonly string[]> = {
  welcome: [
    "Wimmy wam wam wozzle! Join the party.",
    "Chomps approves of your appetite.",
    "Another mouth to feed. Excellent.",
    "Brian said you'd show up eventually.",
    "Pull up a chair. Chomps saved you a seat.",
    "The party doesn't start 'til you walk in. Okay it started already. But still.",
  ],
  empty: [
    "Even Chomps needs restaurants to party at.",
    "It's quiet... too quiet.",
    "Brian ate all the content.",
    "Nothing here but vibes and sadness.",
    "This is what the inside of Brian's fridge looks like.",
    "Tumbleweeds. Literal tumbleweeds.",
  ],
  emptyList: [
    "Your list is emptier than a Monday night buffet.",
    "Brian's restaurant suggestions aren't here either.",
    "Chomps has been to more places than this. And Chomps is a monster.",
    "Zero restaurants? Even Brian's done better than this.",
    "The void stares back. Add a restaurant.",
    "This list is giving 'new phone who dis' energy.",
  ],
  perfect10: [
    "Party on, dude!",
    "A PERFECT TEN. Brian could never.",
    "Chomps is doing backflips right now.",
    "Chef deserves a standing ovation and a hug.",
    "This is the peak. It's all downhill from here.",
    "10 out of 10. Tell Brian we found it.",
    "Immaculate. Legendary. Put it on the fridge.",
  ],
  celebrate: [
    "Wimmy wam wam wozzle!",
    "Now we're cooking!",
    "Chomps stamps this with the monster of approval.",
    "Brian's gonna be jealous.",
    "That's what I'm talking about!",
  ],
  error: [
    "Chomps partied too hard. Try again.",
    "Something broke. Blame Brian.",
    "The kitchen is on fire. Metaphorically.",
    "Brian unplugged the server again.",
    "Error 🍝: Spaghetti code. Not the good kind.",
    "Chomps needs a nap. And a fix.",
  ],
  noResults: [
    "Chomps looked everywhere. Nada.",
    "Not a single match. Brian's filter game is too strong.",
    "Nothing. Zilch. The void.",
    "Try a different search? Or blame Brian.",
    "Even Chomps can't find what doesn't exist.",
    "Results machine broke.",
  ],
  pickerWin: [
    "Now THAT'S a party!",
    "The monster has spoken.",
    "Destiny has chosen. Don't question it.",
    "Brian wouldn't have picked this. That's how you know it's good.",
    "Chomps has decreed it. So it shall be.",
    "The universe provides. You're welcome.",
    "Trust the monster. The monster knows.",
  ],
  offline: [
    "Looks like the WiFi took a dinner break.",
    "Brian forgot to pay the internet bill.",
    "We're flying blind. Showing what we've got cached.",
    "The cloud is... elsewhere right now.",
    "No signal. Chomps blames Brian.",
  ],
};

export function randomQuote(key: keyof typeof QUOTE_POOL): string {
  return randomFrom(QUOTE_POOL[key]!);
}

// CHOMPS_QUOTES picks randomly from QUOTE_POOL via Proxy
export const CHOMPS_QUOTES = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    const pool = QUOTE_POOL[prop];
    if (pool) return randomFrom(pool);
    return "";
  },
});

/** @deprecated Use CHOMPS_QUOTES instead */
export const SLURMS_QUOTES = CHOMPS_QUOTES;

const OFFLINE_MESSAGES: readonly string[] = [
  "Looks like the WiFi took a dinner break",
  "The internet ghosted us",
  "We're off the grid — showing cached data",
  "Signal's out to lunch",
  "Brian probably tripped over the router",
  "No bars. Not even the drinking kind.",
  "Houston, we have a connectivity problem",
  "The WiFi left the chat",
];

export function randomOfflineMessage(): string {
  return randomFrom(OFFLINE_MESSAGES);
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
