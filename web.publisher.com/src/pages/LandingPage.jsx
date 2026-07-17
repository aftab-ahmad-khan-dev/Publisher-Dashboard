import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PlatformIcon from "../components/PlatformIcon";

gsap.registerPlugin(ScrollTrigger);

/* ── Line icons (24x24 stroke) ─────────────────────────────── */
function Icon({ name, className = "h-6 w-6" }) {
  const paths = {
    compose: <path d='M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' />,
    schedule: (
      <>
        <rect x='3' y='4' width='18' height='18' rx='2' />
        <path d='M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4' />
      </>
    ),
    preview: (
      <>
        <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z' />
        <circle cx='12' cy='12' r='3' />
      </>
    ),
    email: (
      <>
        <rect x='2' y='4' width='20' height='16' rx='2' />
        <path d='m2 7 10 6 10-6' />
      </>
    ),
    bulk: (
      <>
        <path d='M12 3v12m0-12 4 4m-4-4-4 4' />
        <path d='M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' />
      </>
    ),
    workspace: (
      <>
        <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' />
        <path d='m9 12 2 2 4-4' />
      </>
    ),
    repeat: (
      <path d='M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3' />
    ),
    clock: (
      <>
        <circle cx='12' cy='12' r='9' />
        <path d='M12 7v5l3 2' />
      </>
    ),
    scattered: (
      <>
        <rect x='3' y='3' width='7' height='7' rx='1' />
        <rect x='14' y='3' width='7' height='7' rx='1' />
        <rect x='14' y='14' width='7' height='7' rx='1' />
        <rect x='3' y='14' width='7' height='7' rx='1' />
      </>
    ),
    inbox: (
      <>
        <path d='M22 12h-6l-2 3h-4l-2-3H2' />
        <path d='M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z' />
      </>
    ),
    check: <path d='M20 6 9 17l-5-5' />,
    shield: (
      <>
        <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' />
      </>
    ),
    bolt: <path d='M13 2 3 14h7l-1 8 10-12h-7l1-8Z' />,
  };
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

function GmailIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox='0 0 24 24' aria-hidden>
      <path
        fill='#EA4335'
        d='M5 5h14a1 1 0 0 1 1 1v.4l-8 5.6-8-5.6V6a1 1 0 0 1 1-1Z'
      />
      <path fill='#34A853' d='M4 8.2V18a1 1 0 0 0 1 1h2V10.1L4 8.2Z' />
      <path fill='#FBBC04' d='M17 10.1V19h2a1 1 0 0 0 1-1V8.2l-3 1.9Z' />
      <path fill='#4285F4' d='M7 19V10.1l5 3.5 5-3.5V19H7Z' />
    </svg>
  );
}

function Stars({ className = "text-amber-400", size = "text-sm" }) {
  return (
    <span
      className={`${className} ${size} tracking-wide`}
      aria-label='5 out of 5 stars'
    >
      ★★★★★
    </span>
  );
}

/* ── Platform theming (respective brand colors) ────────────── */
const PLATFORMS = [
  {
    key: "linkedin",
    label: "LinkedIn",
    solid: "#0A66C2",
    blurb: "Posts & articles",
  },
  { key: "facebook", label: "Facebook", solid: "#1877F2", blurb: "Page feed" },
  { key: "instagram", label: "Instagram", solid: "#E1306C", blurb: "Feed posts" },
  { key: "reddit", label: "Reddit", solid: "#FF4500", blurb: "Subreddit posts" },
  { key: "pinterest", label: "Pinterest", solid: "#E60023", blurb: "Image Pins" },
  { key: "threads", label: "Threads", solid: "#101010", blurb: "Text posts" },
  { key: "gmail", label: "Gmail", solid: "#EA4335", blurb: "Email campaigns" },
];

/** App-icon style tile: the platform's real logo in its brand-colored squircle. */
function PlatformTile({ p, size = "2xl" }) {
  if (p.key === "gmail") {
    const box = size === "2xl" ? "h-14 w-14" : "h-12 w-12";
    const ico = size === "2xl" ? "h-7 w-7" : "h-6 w-6";
    return (
      <span className={`inline-flex shrink-0 items-center justify-center rounded-[28%] bg-white shadow-md ring-2 ring-[#05060a]/80 ${box}`}>
        <GmailIcon className={ico} />
      </span>
    );
  }
  return <PlatformIcon platform={p.key} size={size} shape='squircle' />;
}

function PlatformCard({ p }) {
  return (
    <div
      className='group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center transition hover:-translate-y-1'
      style={{ "--c": p.solid }}
    >
      <div
        className='pointer-events-none absolute inset-x-0 -top-16 h-32 opacity-25 blur-2xl transition group-hover:opacity-50'
        style={{
          background: `radial-gradient(circle at 50% 100%, ${p.solid}, transparent 70%)`,
        }}
      />
      <div className='relative transition group-hover:scale-105'>
        <PlatformTile p={p} />
      </div>
      <div className='relative'>
        <p className='font-display text-sm font-bold text-white'>{p.label}</p>
        <p className='mt-0.5 text-[11px] text-slate-500'>{p.blurb}</p>
      </div>
    </div>
  );
}

/* ── Content ───────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "compose",
    title: "Compose once, publish everywhere",
    body: "Write a single post and push it to LinkedIn, Meta, and Reddit, each formatted natively, with live previews per platform.",
    tag: "Core",
  },
  {
    icon: "schedule",
    title: "Schedule & auto-publish",
    body: "Queue posts for the perfect time. The built-in scheduler fires automatically, no manual posting, no missed windows.",
    tag: "Automation",
  },
  {
    icon: "preview",
    title: "Pixel-accurate previews",
    body: "See exactly how your post looks on each network before it ships, Facebook, Instagram, LinkedIn, and Reddit.",
    tag: "Confidence",
  },
  {
    icon: "email",
    title: "Email campaigns",
    body: "Run merge-tagged email blasts with open tracking and batching, straight from your own inbox. Newsletters without the SaaS tax.",
    tag: "Email",
  },
  {
    icon: "bulk",
    title: "Bulk upload",
    body: "Drop a CSV or a folder of images and schedule a month of content in minutes, one post per day, fully automated.",
    tag: "Scale",
  },
  {
    icon: "workspace",
    title: "Isolated workspaces",
    body: "Every team gets its own workspace with separate connections, drafts, and history. Your data never bleeds across tenants.",
    tag: "Multi-tenant",
  },
];

const PAINS = [
  {
    icon: "repeat",
    title: "Copy-paste chaos",
    body: "Reformat the same post five times for five networks, every single time.",
  },
  {
    icon: "clock",
    title: "Missed prime time",
    body: "Manually posting means you miss the windows that actually drive reach.",
  },
  {
    icon: "scattered",
    title: "Scattered drafts",
    body: "Notes here, images there, nothing in one place you can schedule.",
  },
  {
    icon: "inbox",
    title: "Email lives elsewhere",
    body: "Your newsletter tool is yet another subscription, disconnected from social.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Cut our posting time from two hours to ten minutes across five networks. The per-platform previews mean nothing ships looking broken.",
    name: "Marcus R.",
    role: "Marketing Lead, B2B SaaS",
    avatar: "MR",
    color: "#E84118",
    source: "trustpilot",
  },
  {
    quote:
      "I run eight client brands in separate workspaces, fully isolated connections and history. This replaced two tools and a spreadsheet.",
    name: "Sara P.",
    role: "Agency Owner",
    avatar: "SP",
    color: "#7C3AED",
    source: "google",
  },
  {
    quote:
      "Scheduled a full month of content in one afternoon with bulk upload. The scheduler just fires while I sleep.",
    name: "James L.",
    role: "Solopreneur",
    avatar: "JL",
    color: "#0D9F6E",
    source: "trustpilot",
  },
  {
    quote:
      "Reddit, LinkedIn, and email from one composer, finally. The community-content checks saved me from a subreddit ban too.",
    name: "Aisha K.",
    role: "Growth, Early-stage Startup",
    avatar: "AK",
    color: "#0A66C2",
    source: "google",
  },
  {
    quote:
      "The email campaigns send from my own Gmail with open tracking. I cancelled a $40/mo newsletter tool the same day.",
    name: "Tom M.",
    role: "Founder & Creator",
    avatar: "TM",
    color: "#FF4500",
    source: "trustpilot",
  },
  {
    quote:
      'Previews for every platform before publishing is the feature I didn\'t know I needed. Zero "why does this look wrong" moments now.',
    name: "Nina B.",
    role: "Content Manager",
    avatar: "NB",
    color: "#B92B27",
    source: "google",
  },
];

const STATS = [
  ["6", "networks in one place"],
  ["3,000+", "creators & teams"],
  ["1M+", "posts published"],
  ["~10 min", "saved per post"],
];

const PLATFORM_SEO = [
  {
    key: "linkedin",
    h: "Schedule LinkedIn posts & articles",
    p: "Plan a week of LinkedIn content, preview it exactly as your network will see it, and auto-publish at peak engagement times, no manual posting.",
  },
  {
    key: "facebook",
    h: "Publish to your Facebook Page",
    p: "Push updates to your Facebook Page feed with image previews and scheduling, from the same composer you use for every other channel.",
  },
  {
    key: "instagram",
    h: "Plan Instagram feed posts",
    p: "Draft Instagram captions and visuals, see a pixel-accurate feed preview, and queue posts on your content calendar.",
  },
  {
    key: "reddit",
    h: "Auto-post to Reddit subreddits",
    p: "Share to the subreddits that matter with built-in community-content checks that keep your posts compliant and ban-safe.",
  },
  {
    key: "pinterest",
    h: "Publish Pins to Pinterest",
    p: "Push image Pins to your boards with title and description, scheduled alongside the rest of your content.",
  },
  {
    key: "threads",
    h: "Post to Threads",
    p: "Share text posts to Threads from the same composer, with live preview, scheduling, and auto-publish.",
  },
  {
    key: "gmail",
    h: "Send email campaigns from Gmail",
    p: "Run merge-tagged email blasts with open tracking and batching from your own inbox, newsletters without another subscription.",
  },
];

const COMPETITORS = {
  cols: ["Publisher Suite", "Buffer", "Hootsuite", "Later"],
  rows: [
    ["LinkedIn, Facebook & Instagram", [true, true, true, true]],
    ["Reddit posting", [true, false, false, false]],
    ["Per-platform live previews", [true, true, true, true]],
    ["Email campaigns built in", [true, false, false, false]],
    ["Auto-publish scheduler", [true, true, true, true]],
    ["Isolated team workspaces", [true, false, true, false]],
    ["From $19.99/mo", [true, true, false, true]],
  ],
};

const FAQS = [
  {
    q: "Which platforms does Publisher Suite support?",
    a: "LinkedIn, Facebook & Instagram (Meta), Reddit, Pinterest, and Threads for posts, plus Gmail for email campaigns. Connect each in a couple of clicks from your workspace settings.",
  },
  {
    q: "Do I need separate accounts for my team?",
    a: "No. Each workspace supports your whole team. Invite members, switch between workspaces, and keep every client or brand fully isolated.",
  },
  {
    q: "Is scheduling really automatic?",
    a: "Yes. The scheduler checks for due posts every few seconds and publishes them live, even if your browser is closed.",
  },
  {
    q: "How are my credentials stored?",
    a: "Platform tokens live encrypted against your workspace in the database, scoped to your tenant only. Authentication is handled by Clerk.",
  },
  {
    q: "Can I try it before committing?",
    a: "Absolutely, create a free account, connect a platform, and publish your first post in under five minutes.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className='overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        className='flex w-full items-center justify-between gap-4 px-6 py-5 text-left'
      >
        <span className='font-display text-[15px] font-bold text-white'>{q}</span>
        <span
          className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ⌄
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className='overflow-hidden'
          >
            <p className='px-6 pb-5 text-sm leading-relaxed text-slate-400'>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrustpilotMark() {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span className='flex h-5 w-5 items-center justify-center rounded-[3px] bg-[#00B67A] text-xs text-white'>
        ★
      </span>
      <span className='font-display text-sm font-bold text-white'>Trustpilot</span>
    </span>
  );
}

function GoogleMark() {
  const letters = [
    ["G", "#4285F4"],
    ["o", "#EA4335"],
    ["o", "#FBBC05"],
    ["g", "#4285F4"],
    ["l", "#34A853"],
    ["e", "#EA4335"],
  ];
  return (
    <span className='font-display text-sm font-bold tracking-tight'>
      {letters.map(([l, c], i) => (
        <span key={i} style={{ color: c }}>
          {l}
        </span>
      ))}
    </span>
  );
}

function ReviewCard({ t }) {
  return (
    <div className='flex flex-col rounded-3xl border border-white/[0.08] bg-[#0b0d16] p-7 transition hover:-translate-y-1 hover:border-indigo-500/30'>
      <div className='flex items-center justify-between'>
        <Stars />
        <span className='text-[11px] font-semibold text-slate-500'>
          {t.source === "trustpilot" ? (
            <span className='text-[#00B67A]'>★ Trustpilot</span>
          ) : (
            <span className='text-[#4285F4]'>G Review</span>
          )}
        </span>
      </div>
      <p className='mt-4 flex-1 text-sm leading-relaxed text-slate-300'>
        “{t.quote}”
      </p>
      <div className='mt-5 flex items-center gap-3'>
        <span
          className='flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-bold text-white'
          style={{ background: t.color }}
        >
          {t.avatar}
        </span>
        <div>
          <p className='text-[13px] font-bold text-white'>{t.name}</p>
          <p className='text-[11px] text-slate-500'>{t.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const rootRef = useRef(null);

  useEffect(() => {
    // Keep timelines progressing smoothly (avoids frames stalling under rAF jumps)
    gsap.ticker.lagSmoothing(0);
    const ctx = gsap.context((self) => {
      // Hero: motion only — never hide with opacity (that reads as a loading blank).
      gsap.from("[data-hero] > *", {
        y: 18,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.08,
        clearProps: "transform",
      });
      // Scroll-reveal: slight rise only so content stays readable if GSAP stalls.
      self.selector("section").forEach((el) => {
        gsap.from(el, {
          y: 28,
          duration: 0.55,
          ease: "power2.out",
          clearProps: "transform",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className='text-slate-200'>
      {/* Hero */}
      <header className='relative mx-auto max-w-4xl px-6 pb-16 pt-24 text-center'>
        <div className='pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-sky-600/15 blur-[120px]' />
        <div className='pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-indigo-600/15 blur-[100px]' />
        <div data-hero className='relative'>
          <span className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-semibold text-slate-300'>
            One composer for every channel
          </span>
          <h1 className='font-display mt-7 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl'>
            Publish once.
            <span className='mt-1 block bg-gradient-to-r from-sky-400 via-indigo-400 to-indigo-300 bg-clip-text text-transparent'>
              Reach everywhere.
            </span>
          </h1>
          <p className='mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg'>
            Publisher Suite unifies LinkedIn, Meta, Reddit, Pinterest, Threads, and
            email into a single workspace, compose, preview, schedule, and
            auto-publish across every channel from one screen.
          </p>
          <div className='mt-9 flex flex-col items-center gap-5'>
            <Link
              to='/sign-up'
              className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-4 font-display text-base font-bold text-white shadow-xl shadow-sky-500/20 transition hover:-translate-y-0.5'
            >
              Start with a plan
            </Link>
            {/* Social proof strip */}
            <div className='flex flex-col items-center gap-2'>
              <div className='flex items-center gap-3'>
                <div className='flex -space-x-2.5'>
                  {[
                    { i: "MR", g: "linear-gradient(135deg,#fb923c,#ea580c)" },
                    { i: "SP", g: "linear-gradient(135deg,#c084fc,#7c3aed)" },
                    { i: "JL", g: "linear-gradient(135deg,#34d399,#059669)" },
                    { i: "AK", g: "linear-gradient(135deg,#60a5fa,#2563eb)" },
                    { i: "TM", g: "linear-gradient(135deg,#fb7185,#e11d48)" },
                  ].map((a) => (
                    <span
                      key={a.i}
                      className='flex h-8 w-8 items-center justify-center rounded-full font-display text-[10px] font-bold text-white ring-2 ring-[#05060a]'
                      style={{ background: a.g }}
                    >
                      {a.i}
                    </span>
                  ))}
                </div>
                <div className='text-left'>
                  <Stars size='text-xs' />
                  <p className='text-[11px] text-slate-500'>
                    Loved by 3,000+ creators & teams
                  </p>
                </div>
              </div>
              <p className='flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500'>
                <span className='text-emerald-400'>Bank transfer</span>
                <span className='h-1 w-1 rounded-full bg-slate-600' />
                From $19.99/mo
                <span className='h-1 w-1 rounded-full bg-slate-600' />
                Set up in 5 minutes
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Platform showcase, respective brand themes */}
      <section id='platforms' className='mx-auto max-w-5xl px-6 pb-8'>
        <p className='text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-600'>
          Publish natively to
        </p>
        <div className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7'>
          {PLATFORMS.map((p) => (
            <PlatformCard key={p.key} p={p} />
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className='border-y border-white/[0.06] bg-white/[0.015] py-6'>
        <div className='mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 text-sm'>
          <div className='flex items-center gap-2'>
            <TrustpilotMark />
            <Stars size='text-xs' />
            <strong className='text-white'>4.9</strong>
          </div>
          <div className='hidden h-5 w-px bg-white/10 sm:block' />
          <div className='flex items-center gap-2'>
            <GoogleMark />
            <Stars size='text-xs' />
            <strong className='text-white'>4.8</strong>
          </div>
          <div className='hidden h-5 w-px bg-white/10 sm:block' />
          <div className='flex items-center gap-2 text-slate-400'>
            <Icon name='shield' className='h-4 w-4 text-emerald-400' /> 30-day
            money-back
          </div>
          <div className='hidden h-5 w-px bg-white/10 sm:block' />
          <div className='flex items-center gap-2 text-slate-400'>
            <Icon name='bolt' className='h-4 w-4 text-amber-400' /> 3,000+ creators
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className='mx-auto max-w-5xl px-6 py-16'>
        <div className='grid grid-cols-2 gap-6 sm:grid-cols-4'>
          {STATS.map(([n, l]) => (
            <div key={l} className='text-center'>
              <p className='font-display bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl'>
                {n}
              </p>
              <p className='mt-1 text-xs text-slate-500'>{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pain */}
      <section className='mx-auto max-w-5xl px-6 py-24'>
        <p className='text-center text-xs font-bold uppercase tracking-[0.12em] text-indigo-400'>
          The old way is exhausting
        </p>
        <h2 className='font-display mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
          Five tabs, five logins, five formats, for one idea.
        </h2>
        <div className='mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          {PAINS.map((p) => (
            <div
              key={p.title}
              className='rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6'
            >
              <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] text-slate-300'>
                <Icon name={p.icon} className='h-5 w-5' />
              </div>
              <h3 className='font-display mt-4 text-base font-bold text-white'>
                {p.title}
              </h3>
              <p className='mt-2 text-sm leading-relaxed text-slate-400'>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id='features'
        className='border-t border-white/[0.06] bg-white/[0.015] py-24'
      >
        <div className='mx-auto max-w-5xl px-6'>
          <p className='text-center text-xs font-bold uppercase tracking-[0.12em] text-indigo-400'>
            Everything included
          </p>
          <h2 className='font-display mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
            One workspace for your entire publishing workflow.
          </h2>
          <div className='mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className='group rounded-3xl border border-white/[0.07] bg-[#0b0d16] p-7 transition hover:-translate-y-1 hover:border-indigo-500/30'
              >
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-indigo-600/15 text-indigo-300'>
                  <Icon name={f.icon} className='h-6 w-6' />
                </div>
                <h3 className='font-display mt-5 text-lg font-bold text-white'>
                  {f.title}
                </h3>
                <p className='mt-2 text-sm leading-relaxed text-slate-400'>
                  {f.body}
                </p>
                <span className='mt-4 inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-300'>
                  {f.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Per-platform SEO content */}
      <section className='mx-auto max-w-5xl px-6 py-24'>
        <p className='text-center text-xs font-bold uppercase tracking-[0.12em] text-indigo-400'>
          One tool, every network
        </p>
        <h2 className='font-display mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
          A social media scheduler for LinkedIn, Meta, Reddit, Pinterest, Threads & email.
        </h2>
        <div className='mt-14 grid gap-5 md:grid-cols-2'>
          {PLATFORM_SEO.map((row) => {
            const p = PLATFORMS.find((pl) => pl.key === row.key);
            return (
              <div
                key={row.key}
                className='flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6'
              >
                <PlatformTile p={p} size='xl' />
                <div>
                  <h3 className='font-display text-base font-bold text-white'>
                    {row.h}
                  </h3>
                  <p className='mt-1.5 text-sm leading-relaxed text-slate-400'>
                    {row.p}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Social proof, ratings + reviews */}
      <section id='reviews' className='mx-auto max-w-6xl px-6 py-24'>
        <p className='text-center text-xs font-bold uppercase tracking-[0.12em] text-indigo-400'>
          Don't take our word for it
        </p>
        <h2 className='font-display mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
          Trusted by creators & teams worldwide.
        </h2>

        {/* Rating badges */}
        <div className='mx-auto mt-10 flex max-w-2xl flex-col gap-4 sm:flex-row'>
          <div className='flex flex-1 items-center justify-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5'>
            <TrustpilotMark />
            <div className='text-left'>
              <div className='flex items-center gap-2'>
                <span className='font-display text-2xl font-extrabold text-white'>
                  4.9
                </span>
                <Stars />
              </div>
              <p className='text-[11px] text-slate-500'>
                Excellent · 1,800+ reviews
              </p>
            </div>
          </div>
          <div className='flex flex-1 items-center justify-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5'>
            <GoogleMark />
            <div className='text-left'>
              <div className='flex items-center gap-2'>
                <span className='font-display text-2xl font-extrabold text-white'>
                  4.8
                </span>
                <Stars />
              </div>
              <p className='text-[11px] text-slate-500'>Excellent · 600+ reviews</p>
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div className='mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {TESTIMONIALS.map((t) => (
            <ReviewCard key={t.name} t={t} />
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section
        id='compare'
        className='border-t border-white/[0.06] bg-white/[0.015] py-24'
      >
        <div className='mx-auto max-w-3xl px-6'>
          <p className='text-center text-xs font-bold uppercase tracking-[0.12em] text-indigo-400'>
            How we compare
          </p>
          <h2 className='font-display mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
            The Buffer & Hootsuite alternative with more in the box.
          </h2>
          <div className='mt-12 overflow-x-auto rounded-2xl border border-white/[0.08]'>
            <table className='w-full min-w-[360px] border-collapse text-xs sm:text-sm'>
              <thead>
                <tr className='border-b border-white/[0.08]'>
                  <th className='p-2.5 text-left font-medium text-slate-500 sm:p-4'></th>
                  {COMPETITORS.cols.map((c, i) => (
                    <th key={c} className='p-2.5 text-center sm:p-4'>
                      {i === 0 ? (
                        <span className='rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-1 font-display text-xs font-bold text-white'>
                          {c}
                        </span>
                      ) : (
                        <span className='font-display text-sm font-bold text-slate-400'>
                          {c}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.rows.map(([label, vals], r) => (
                  <tr key={label} className={r % 2 ? "bg-white/[0.015]" : ""}>
                    <td className='p-2.5 text-left text-slate-300 sm:p-4'>{label}</td>
                    {vals.map((v, ci) => (
                      <td
                        key={ci}
                        className={`p-2.5 text-center sm:p-4 ${ci === 0 ? "bg-indigo-500/[0.06]" : ""}`}
                      >
                        {v ? (
                          <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400'>
                            <Icon name='check' className='h-4 w-4' />
                          </span>
                        ) : (
                          <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04] text-slate-600'>
                            <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={3}><path strokeLinecap='round' strokeLinejoin='round' d='M6 18 18 6M6 6l12 12' /></svg>
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className='mt-4 text-center text-[11px] text-slate-600'>
            Comparison reflects typical entry-level plans and is for illustration.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className='mx-auto max-w-4xl px-6 py-24'>
        <p className='text-center text-xs font-bold uppercase tracking-[0.12em] text-indigo-400'>
          How it works
        </p>
        <h2 className='font-display mt-3 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
          Three steps to everywhere.
        </h2>
        <div className='mt-14 grid gap-8 sm:grid-cols-3'>
          {[
            [
              "1",
              "Connect",
              "Link LinkedIn, Meta, Reddit, Pinterest, Threads, and Gmail to your workspace.",
            ],
            [
              "2",
              "Compose",
              "Write once. Watch live previews shape your post for each network.",
            ],
            [
              "3",
              "Schedule",
              "Publish now or queue it, Publisher Suite fires it automatically, on time.",
            ],
          ].map(([n, title, body]) => (
            <div key={n} className='text-center'>
              <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 font-display text-lg font-bold text-white'>
                {n}
              </div>
              <h3 className='font-display mt-4 text-lg font-bold text-white'>
                {title}
              </h3>
              <p className='mt-2 text-sm leading-relaxed text-slate-400'>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      {/* Pricing preview */}
      <section id='pricing' className='mx-auto max-w-5xl px-6 py-24'>
        <div className='text-center'>
          <p className='text-xs font-bold uppercase tracking-[0.12em] text-indigo-400'>Pricing</p>
          <h2 className='font-display mt-3 text-3xl font-extrabold text-white sm:text-4xl'>
            $19.99 · $39.99 · $49.99
          </h2>
          <p className='mx-auto mt-3 max-w-lg text-sm text-slate-400'>
            Starter (Compose + Bulk), Growth (+ Mail Box), or Pro (full platform). Pay by bank
            transfer and upload your receipt.
          </p>
        </div>
        <div className='mt-10 grid gap-4 sm:grid-cols-3'>
          {[
            { name: 'Starter', price: '$19.99', detail: 'Compose + Bulk' },
            { name: 'Growth', price: '$39.99', detail: '+ Mail Box', hot: true },
            { name: 'Pro', price: '$49.99', detail: 'Full platform' },
          ].map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl border p-6 text-center ${
                t.hot ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <p className='text-sm font-semibold text-slate-300'>{t.name}</p>
              <p className='font-display mt-2 text-3xl font-extrabold text-white'>
                {t.price}
                <span className='text-sm font-medium text-slate-500'>/mo</span>
              </p>
              <p className='mt-2 text-xs text-slate-400'>{t.detail}</p>
            </div>
          ))}
        </div>
        <div className='mt-8 text-center'>
          <Link
            to='/pricing'
            className='inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5'
          >
            See full pricing
          </Link>
        </div>
      </section>

      <section
        id='faq'
        className='border-t border-white/[0.06] bg-white/[0.015] py-24'
      >
        <div className='mx-auto max-w-2xl px-6'>
          <h2 className='font-display text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl'>
            Questions, answered.
          </h2>
          <div className='mt-12 flex flex-col gap-3'>
            {FAQS.map((f) => (
              <FaqItem key={f.q} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className='relative overflow-hidden px-6 py-28 text-center'>
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-600/10 to-transparent' />
        <div className='relative'>
          <h2 className='font-display mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl'>
            Stop posting five times.
            <span className='block bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent'>
              Start publishing once.
            </span>
          </h2>
          <Link
            to='/sign-up'
            className='mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-9 py-4 font-display text-base font-bold text-white shadow-xl shadow-sky-500/25 transition hover:-translate-y-0.5'
          >
            Create your workspace
          </Link>
          <p className='mt-4 text-xs text-slate-600'>
            Bank transfer · From $19.99/mo · Activate after receipt review
          </p>
        </div>
      </section>
    </div>
  );
}
