import training from "../../data/chat-training.json";
import { nichesForPrompt, PLATFORM_OPTIONS, type ServiceAnalysis } from "./outcomes";
import type { ChatLocale } from "./reply-locale";
import { normalizeUserText } from "./text-normalize";

export type { ChatLocale };

/**
 * Local chat training — meta questions never call /api/analyze.
 * To add behavior: extend ChatIntent, add a matcher in classifyUserInput,
 * add reply in replyForIntent(), optional chip in data/chat-training.json.
 */
export type ChatIntent =
  | "greeting"
  | "help"
  | "list_services"
  | "pricing"
  | "platform_help"
  | "common_needs_help"
  | "ecommerce_help"
  | "quote_capability"
  | "start_over"
  | "thanks"
  | "unclear"
  | "service";

export interface ChatQuickAction {
  label: string;
  message: string;
}

export const CHAT_QUICK_ACTIONS = training.quickActions as ChatQuickAction[];

export const SERVICE_SUGGESTIONS = [
  "Coffee shop",
  "Bakery",
  "Salon",
  "Clinic",
  "Gym",
  "Yoga studio",
  "Tuition centre",
  "Real estate",
  "Courier / logistics",
  "Temple trust",
  "Mens PG",
  "Fashion store",
] as const;

const GREETING =
  /^(hi|hello|hey|hiya|howdy|good\s+(morning|afternoon|evening)|namaste|vanakkam|sup|yo|epdi\s+iruka(?:nga)?|kaise\s+ho|namaskar|hola)[\s!.?]*$/i;

const HELP =
  /^(help|\?|what\s+can\s+you\s+do|how\s+does\s+this\s+work|how\s+to\s+use|guide|start|menu|madad|madath|help\s+karo|help\s+me)[\s!.?]*$/i;

const ECOMMERCE =
  /^(?:do\s+you\s+(?:do|build|make|offer)\s+)?e-?commerce(?:\s+(?:website|site|shop|store|for\s+(?:me|my\s+shop)))?[\s!.?]*$|^(?:online\s+shop|online\s+store|shopping\s+cart)(?:\s+(?:website|site))?[\s!.?]*$/i;

const QUOTE_CAPABILITY =
  /^(?:can\s+(?:i|we|you)\s+quote\s+for\s+.+|do\s+you\s+(?:quote|cover|support|handle)\s+.+|is\s+.+supported)[\s!.?]*$/i;

const LIST_SERVICES =
  /^(?:list|show|see|display|give|tell)(?:\s+me)?(?:\s+all)?(?:\s+the)?\s+(?:services?|business(?:es)?|types?|niches?|options?|examples?)(?:\s+you\s+(?:have|support|do|offer|quote\s+for))?[\s!.?]*$|^(?:what|which)\s+(?:services?|business(?:es)?|types?|niches?)(?:\s+(?:do\s+you\s+(?:have|support|quote\s+for)|can\s+i\s+quote\s+for))?(?:\s+are\s+there)?[\s!.?]*$|^(?:all|available)\s+(?:services?|business(?:es)?|types?|options?)[\s!.?]*$/i;

const PRICING =
  /^(?:how\s+(?:do|does)\s+)?(?:packages?|pricing|prices?|rates?|costs?)(?:\s+work)?[\s!.?]*$|^(?:what(?:'s|\s+is)\s+the\s+)?(?:price|cost|rate)(?:\s+of|\s+for)?(?:\s+packages?)?[\s!.?]*$|^(?:package|pricing)\s+(?:info|details?|help)[\s!.?]*$/i;

const PLATFORM_HELP =
  /^(?:website\s+vs\.?\s+app|web\s+vs\.?\s+app|website\s+or\s+app|difference\s+between\s+(?:website|web)\s+and\s+app)[\s!.?]*$|^(?:what\s+(?:is|are)\s+)?(?:a\s+)?(?:website|web|mobile\s+app|app)(?:\s+for\s+this)?[\s!.?]*$|^(?:should\s+i\s+(?:pick|choose)\s+)?(?:website|app|web)[\s!.?]*$/i;

const COMMON_NEEDS_HELP =
  /^(?:what\s+are\s+)?common\s+(?:needs|requirements?|features?)(?:\s+mean)?[\s!.?]*$|^(?:explain\s+)?(?:requirements?|deliverables?)[\s!.?]*$/i;

const START_OVER =
  /^(?:start\s+over|new\s+quote|reset|cancel|change\s+business|different\s+(?:client|business))[\s!.?]*$/i;

const THANKS =
  /^(?:thanks?|thank\s+you|thx|ok(?:ay)?|got\s+it|cool|great|bye|goodbye|see\s+ya)[\s!.?]*$/i;

const MIN_SERVICE_CHARS = 3;

const NICHE_GUIDE: Record<string, string> = {
  cafe:
    "Food & drink businesses usually need a menu online, location/maps, WhatsApp orders, and sometimes table booking or delivery links.",
  salon:
    "Salons and beauty studios often need service lists, gallery, booking or contact, maps, and WhatsApp for appointments.",
  clinic:
    "Clinics and health practices typically need services/doctors, appointment forms, maps, hours, and patient-friendly contact.",
  shop:
    "Retail and shops usually need product or category pages, contact, maps, SEO, and WhatsApp for enquiries.",
  gym:
    "Gyms and fitness brands often need class or plan info, timings, contact, maps, and sign-up or enquiry forms.",
  education:
    "Education and coaching centres usually need courses, schedules, enquiry forms, maps, and trust content (results, faculty).",
  realestate:
    "Real estate usually needs listings or projects, enquiry forms, maps, SEO, and strong contact/WhatsApp for leads.",
  bakery:
    "Bakeries usually need a cake/product menu, custom order form, WhatsApp, maps, and festive offers.",
  yoga:
    "Yoga / wellness studios often need class schedules, trial/join forms, maps, and teacher profiles.",
  logistics:
    "Logistics and courier businesses typically need service types, quote forms, WhatsApp booking, hubs/maps, and tracking.",
  temple:
    "Temples and trusts usually need info pages, festival events, donation/seva forms, maps, and WhatsApp contact.",
  pg:
    "PG / hostels often need room types & rents, vacancy enquire, photos, maps, and WhatsApp.",
};

const FALLBACK_GUIDE =
  "Most small businesses need a clear offer online, contact/WhatsApp, Google Maps, and a few pages that explain what they sell or do.";

export interface ClassifiedInput {
  intent: ChatIntent;
  /** Text sent to analyze / shown as the business */
  serviceText: string;
  /** What the user typed */
  original: string;
  /** Typo / Tanglish fix note for the chat bubble */
  correctionNote: string | null;
  /** Reply in English or Tanglish to match the user */
  locale: ChatLocale;
}

export function classifyUserInput(raw: string): ClassifiedInput {
  const { original, normalized, note, locale } = normalizeUserText(raw);
  const forIntent = normalized || original;

  if (!original) {
    return {
      intent: "unclear",
      serviceText: "",
      original: "",
      correctionNote: null,
      locale: "en",
    };
  }

  const withLocale = (
    intent: ChatIntent,
    serviceText: string,
    correctionNote: string | null = note,
  ): ClassifiedInput => ({
    intent,
    serviceText,
    original,
    correctionNote,
    locale,
  });

  // Match intents against corrected + Tanglish-mapped text
  if (GREETING.test(forIntent)) return withLocale("greeting", forIntent);
  if (HELP.test(forIntent)) return withLocale("help", forIntent);
  if (ECOMMERCE.test(forIntent) || ECOMMERCE.test(original)) {
    return withLocale("ecommerce_help", forIntent);
  }
  if (QUOTE_CAPABILITY.test(forIntent) || QUOTE_CAPABILITY.test(original)) {
    return withLocale("quote_capability", forIntent);
  }
  if (LIST_SERVICES.test(forIntent)) return withLocale("list_services", forIntent);
  if (PRICING.test(forIntent)) return withLocale("pricing", forIntent);
  if (PLATFORM_HELP.test(forIntent)) return withLocale("platform_help", forIntent);
  if (COMMON_NEEDS_HELP.test(forIntent)) return withLocale("common_needs_help", forIntent);
  if (START_OVER.test(forIntent)) return withLocale("start_over", forIntent);
  if (THANKS.test(forIntent)) return withLocale("thanks", forIntent);

  // Also try original in case normalize over-corrected a brand name
  if (LIST_SERVICES.test(original) || HELP.test(original) || GREETING.test(original)) {
    const intent = LIST_SERVICES.test(original)
      ? "list_services"
      : HELP.test(original)
        ? "help"
        : "greeting";
    return withLocale(intent, original, null);
  }

  const letters = forIntent.replace(/[^a-zA-Z\u0080-\uFFFF]/g, "");
  if (letters.length < MIN_SERVICE_CHARS) {
    return withLocale("unclear", forIntent);
  }

  return withLocale("service", forIntent);
}

export function isGuideIntent(intent: ChatIntent): boolean {
  return intent !== "service";
}

export function replyForIntent(intent: ChatIntent, locale: ChatLocale = "en"): string {
  const t = locale === "tanglish";
  switch (intent) {
    case "greeting":
      return t ? replyGreetingTl() : replyGreetingEn();
    case "help":
      return t ? replyHelpTl() : replyHelpEn();
    case "list_services":
      return t ? replyListTl() : replyListEn();
    case "pricing":
      return t ? replyPricingTl() : replyPricingEn();
    case "platform_help":
      return t ? replyPlatformTl() : replyPlatformEn();
    case "common_needs_help":
      return t ? replyNeedsTl() : replyNeedsEn();
    case "ecommerce_help":
      return t ? replyEcommerceTl() : replyEcommerceEn();
    case "quote_capability":
      return t ? replyQuoteCapTl() : replyQuoteCapEn();
    case "start_over":
      return t ? replyStartOverTl() : replyStartOverEn();
    case "thanks":
      return t ? replyThanksTl() : replyThanksEn();
    case "unclear":
      return t ? replyUnclearTl() : replyUnclearEn();
    default:
      return t ? replyUnclearTl() : replyUnclearEn();
  }
}

function replyGreetingEn(): string {
  return [
    "Hi — I’m Nemora’s quote assistant.",
    "",
    "Tell me the client’s business (e.g. Coffee shop, Dental clinic, Gym).",
    "Or tap Help / List all services below — those are guides, not a business name.",
    "",
    "Flow: business → common needs → Website or App → packages → PDF. Prices come from our catalog, not AI.",
  ].join("\n");
}

function replyGreetingTl(): string {
  return [
    "Vanakkam — naan Nemora quote assistant.",
    "",
    "Client business type sollunga (e.g. Coffee shop, Dental clinic, Gym).",
    "Help / List all services chips — adhu guide thaan, business name illa.",
    "",
    "Flow: business → common needs → Website illa App → packages → PDF. Price catalog la irukku — AI invent pannathu.",
  ].join("\n");
}

function replyHelpEn(): string {
  return [
    "How Nemora Quote chat works:",
    "",
    "1. Name the client’s business (one line).",
    "2. I match a niche and explain what they usually need online.",
    "3. You choose Website, App, or Both, then tweak requirements.",
    "4. Packages open with fixed rates; you edit and print PDF.",
    "",
    "Useful commands (type or tap chips):",
    "• list all services — niches & examples",
    "• website vs app — when to pick each",
    "• how do packages work — pricing rules",
    "",
    "Then type a real business or tap an example chip.",
  ].join("\n");
}

function replyHelpTl(): string {
  return [
    "Nemora Quote epdi work aagum:",
    "",
    "1. Client business type onnu type pannunga.",
    "2. Naan niche match panni, online la usually enna venumo explain panren.",
    "3. Website / App / Both choose panni requirements adjust pannunga.",
    "4. Package open aagum — rate fixed; edit panni PDF print pannalam.",
    "",
    "Useful commands:",
    "• list all services / ella services — niche list",
    "• website vs app — ethu edhukku",
    "• how do packages work — price rules",
    "",
    "Inga business name type pannunga illa chip tap pannunga.",
  ].join("\n");
}

function replyListEn(): string {
  return [
    "Pick a business type or quick example below to start a quote.",
    "",
    "Or type a client business (e.g. Salon in Adyar).",
  ].join("\n");
}

function replyListTl(): string {
  return [
    "Kela business type illa example chip tap panni quote start pannunga.",
    "",
    "Illa client business type pannunga (e.g. Adyar la Salon).",
  ].join("\n");
}

/** Example text used when user taps a niche from the list picker. */
export const NICHE_PICK_EXAMPLES: Record<string, string> = {
  cafe: "Coffee shop",
  salon: "Salon",
  clinic: "Clinic",
  shop: "Fashion store",
  gym: "Gym",
  education: "Tuition centre",
  realestate: "Real estate",
  bakery: "Bakery",
  yoga: "Yoga studio",
  logistics: "Courier / logistics",
  temple: "Temple trust",
  pg: "Mens PG",
};

function replyPricingEn(): string {
  return [
    "Packages & pricing (source of truth):",
    "",
    "• Basic, Standard, Premium — default amounts live in data/packages.json.",
    "• Admin can override rates in the browser; saved quotes keep your edits.",
    "• This chat and AI never invent prices — only suggest requirements.",
    "",
    "Start a quote by naming a business, then pick requirements and a package.",
  ].join("\n");
}

function replyPricingTl(): string {
  return [
    "Package & price details:",
    "",
    "• Basic, Standard, Premium — default amount catalog la irukku.",
    "• Admin browser la rate change panna mudiyum; save panna quote la edit nikkum.",
    "• Chat / AI price invent pannathu — requirements suggest mattum.",
    "",
    "Business name solli start pannunga, aprom requirements + package choose pannunga.",
  ].join("\n");
}

function replyPlatformEn(): string {
  const lines = PLATFORM_OPTIONS.map((p) => `• ${p.label} — ${p.hint}`).join("\n");
  return [
    "Website vs app — what we mean:",
    "",
    lines,
    "",
    "Most local businesses start with Website. App fits repeat orders, bookings, or loyalty.",
    "You’ll choose this after we know the business type.",
  ].join("\n");
}

function replyPlatformTl(): string {
  const lines = PLATFORM_OPTIONS.map((p) => `• ${p.label} — ${p.hint}`).join("\n");
  return [
    "Website vs app — meaning:",
    "",
    lines,
    "",
    "Local business mostly Website la start aagum. Repeat order / booking / loyalty ku App use aagum.",
    "Business type therinja apram idha choose pannalam.",
  ].join("\n");
}

function replyNeedsEn(): string {
  return [
    "Common requirements = deliverables clients in that niche usually want.",
    "",
    "Examples: menu & maps for cafes, appointment forms for clinics, gallery & WhatsApp for salons.",
    "They’re pre-selected from our catalog; you add/remove before packages.",
    "",
    "Name a business to see the list for that niche.",
  ].join("\n");
}

function replyNeedsTl(): string {
  return [
    "Common requirements = antha niche clients usually kekura deliverables.",
    "",
    "Example: cafe ku menu + maps, clinic ku appointment form, salon ku gallery + WhatsApp.",
    "Catalog la pre-select aagirukum — package munadi add/remove pannalam.",
    "",
    "Business name sollunga — antha niche list kaaten.",
  ].join("\n");
}

function replyEcommerceEn(): string {
  return [
    "Yes — we quote websites/apps that sell or take orders online.",
    "",
    "For shops, bakeries, and cafes we usually suggest catalog/menu, WhatsApp or order form, maps, and SEO.",
    "Full cart + payment gateways sit in higher packages — rates stay in our catalog (never AI-invented).",
    "",
    "Type the client business (e.g. Fashion store or Bakery) to start the quote.",
  ].join("\n");
}

function replyEcommerceTl(): string {
  return [
    "Aama — online sell / order edukka website-app quote panrom.",
    "",
    "Shop, bakery, cafe ku usually catalog/menu, WhatsApp illa order form, maps, SEO suggest panrom.",
    "Full cart + payment gateways higher package la — rate catalog la thaan (AI invent pannathu).",
    "",
    "Client business type pannunga (e.g. Fashion store illa Bakery) — quote start aagum.",
  ].join("\n");
}

function replyQuoteCapEn(): string {
  return [
    "We can quote most local businesses — tap a type or example below.",
    "",
    "If it’s unusual, we still quote as General business with adjustable needs.",
  ].join("\n");
}

function replyQuoteCapTl(): string {
  return [
    "Most local business ku quote panna mudiyum — kela type / example tap pannunga.",
    "",
    "Unusual ah irundha General business nu quote panni needs adjust pannalam.",
  ].join("\n");
}

function replyStartOverEn(): string {
  return [
    "Starting a new quote — your previous chat stays in this thread.",
    "",
    "Tell me the new client business (e.g. Gym · Bakery · Dental clinic).",
    "Type list all services if you want the full example list again.",
  ].join("\n");
}

function replyStartOverTl(): string {
  return [
    "Puthu quote start — old chat history delete aagala, same thread la continue.",
    "",
    "Puthu client business type sollunga (e.g. Gym · Bakery · Dental clinic).",
    "Full list venumna list all services type pannunga.",
  ].join("\n");
}

function replyThanksEn(): string {
  return [
    "You’re welcome. When you’re ready, send the client business name and we’ll build the quote.",
  ].join("\n");
}

function replyThanksTl(): string {
  return [
    "Nandri! Ready ah irundha client business name anupunga — quote ready panrom.",
  ].join("\n");
}

function replyUnclearEn(): string {
  return [
    "I need a business name or type to start the quote.",
    "",
    "Examples: Coffee shop · Pet grooming · Real estate agency",
    "",
    "Not sure? Tap List all services or type help.",
  ].join("\n");
}

function replyUnclearTl(): string {
  return [
    "Quote start panna business name / type venum.",
    "",
    "Examples: Coffee shop · Pet grooming · Real estate agency",
    "",
    "Theriyala? List all services chip tap pannunga illa help type pannunga.",
  ].join("\n");
}

const NICHE_GUIDE_TL: Record<string, string> = {
  cafe:
    "Food / cafe ku usually menu, maps, WhatsApp order, sometimes table booking venum.",
  salon:
    "Salon / beauty ku services list, gallery, booking, maps, WhatsApp appointment common.",
  clinic:
    "Clinic / health ku services, appointment form, maps, timing, contact important.",
  shop:
    "Shop / retail ku product pages, contact, maps, SEO, WhatsApp enquiry common.",
  gym:
    "Gym ku plans, class schedule, join form, maps, WhatsApp enquire usual.",
  education:
    "Tuition / coaching ku courses, fees, enquiry form, maps, trust content venum.",
  realestate:
    "Real estate ku listings, site-visit form, maps, SEO, WhatsApp leads.",
  bakery:
    "Bakery ku cake menu, custom order form, WhatsApp, maps, festive offers.",
  yoga:
    "Yoga studio ku class schedule, trial form, maps, teacher profile common.",
  logistics:
    "Courier / logistics ku services, quote form, WhatsApp booking, hub maps, tracking.",
  temple:
    "Temple / trust ku info, events, donation form, maps, WhatsApp contact.",
  pg:
    "PG / hostel ku room types, rent, vacancy enquire, photos, maps, WhatsApp.",
};

export function explainAfterAnalysis(
  service: string,
  analysis: ServiceAnalysis,
  locale: ChatLocale = "en",
): string {
  if (locale === "tanglish") {
    const guide =
      (analysis.nicheId && NICHE_GUIDE_TL[analysis.nicheId]) ||
      "Most small business ku online offer, WhatsApp, Maps, few pages venum.";
    const confidenceLine =
      analysis.confidence === "high"
        ? `Ungal description la irundhu ${analysis.nicheLabel} nu match aachu.`
        : analysis.confidence === "medium"
          ? `Idhu ${analysis.nicheLabel} maadhiri theriyudhu — requirements adjust pannalam.`
          : `Exact niche illa — ${analysis.nicheLabel} general needs use panrom.`;
    const sourceLine =
      analysis.source === "nvidia"
        ? "Classification: AI + catalog."
        : "Classification: catalog keywords (fast).";
    return [
      `“${service}”`,
      "",
      confidenceLine,
      "",
      guide,
      "",
      sourceLine,
      "",
      "Inga enna build pannanum choose pannunga:",
    ].join("\n");
  }

  const guide =
    (analysis.nicheId && NICHE_GUIDE[analysis.nicheId]) || FALLBACK_GUIDE;

  const confidenceLine =
    analysis.confidence === "high"
      ? `I matched this to ${analysis.nicheLabel} from your description.`
      : analysis.confidence === "medium"
        ? `This looks like ${analysis.nicheLabel} — adjust requirements if needed.`
        : `No exact niche match — treating as ${analysis.nicheLabel} with general needs.`;

  const sourceLine =
    analysis.source === "nvidia"
      ? "Classification: AI + catalog."
      : "Classification: catalog keywords (fast).";

  return [
    `“${service}”`,
    "",
    confidenceLine,
    "",
    guide,
    "",
    sourceLine,
    "",
    "Choose what we should build:",
  ].join("\n");
}

export function nicheConfirmPrompt(nicheLabelText: string, locale: ChatLocale): string {
  if (locale === "tanglish") {
    return `“${nicheLabelText}” correct ah irukka? Confirm pannunga illa vera niche choose pannunga — catalog improve aagum.`;
  }
  return `Was “${nicheLabelText}” the right type for this client? Confirm or pick another niche — this improves our catalog.`;
}

export function analyzingMessage(service: string, locale: ChatLocale): string {
  if (locale === "tanglish") {
    return `“${service}” ku common needs analyze panren…`;
  }
  return `Analyzing “${service}” for common client needs…`;
}
