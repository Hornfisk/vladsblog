---
title: A home for the audio tools
slug: hyperfocus-dsp
excerpt: I've been making plugins on the side for a while. They finally got a site.
published: false
---

I've been writing audio plugins on and off for a couple of years — not full time, not for money, just the kind of thing you end up doing when you're a beat maker who also likes code.

What came out of that, so far:

- **squelchbox** — a TB-303-style acid bassline synth. Rust, [nih-plug](https://github.com/robbert-vdh/nih-plug), egui. FOSS.
- **niner** — a three-layer synthesized kick with a parallel 909 clap voice. Five flavors of distortion, tilt/low/notch master EQ. Also FOSS. *(Shipped originally as `slammer`; renamed in April 2026 after a trademark conflict surfaced.)*
- **drawdio** — a mockup tool for plugin UIs. Sketch knobs, faders, meters, sequencers; export to PNG/SVG/JSON for JUCE, nih-plug, iPlug2, whatever you're building against. Also FOSS.
- **squelch_pro** — the JUCE/C++ sibling of squelchbox. Same idea, different lane.
- A couple more on the bench.

For a long time this was just a list of GitHub repos — clone-and-build instructions, a README screenshot if you were lucky, nothing else. Fine for me; rough for anyone else.

So: **[hyperfocusdsp.com](https://hyperfocusdsp.com)**. One place for all of it — plugin pages, downloads, devlog, docs as they land. Astro + Cloudflare Pages, binaries on R2. Plugin versions auto-pull from the release repos at build time, so I never have to remember to bump a number by hand.

The posture: most of what's there stays open source. The free plugins will always be free. One or two commercial ones fund the time, and even those run alongside a FOSS sibling — no rug-pulls, no "community edition" trick.

I wanted the tools to have a home before they had a marketing push. That's all this is.

![hyperfocusdsp.com — the homepage, with Niner as the first plugin card](/posts/hyperfocus-screenshot.webp)

There's also a shorter version of this on the [/work](/work) page.

