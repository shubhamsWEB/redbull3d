# Visual identity: Kinetic Precision

Broadcast telemetry meets editorial grit. A visitor should feel a high-speed sports broadcast, a cockpit HUD and an underground culture magazine at once, never "a beverage site".

This is the design direction for this unofficial pitch concept, not Red Bull's own brand guideline.

## Vocabulary

- **Kinetic brutalism:** oversized type that feels in motion when static; high-contrast structural grids.
- **Telemetry and HUD:** F1 dashboards, aviation instruments, action-cam overlays. Monospace micro-data, crosshair dividers, sharp status indicators.
- **Editorial authority:** magazine rhythm, full-bleed action photography, subjects breaking the frame, punchy headlines.
- **High-velocity contrast:** nocturnal surfaces cut by saturated accents, like stadium lights.
- **Visceral immersion:** POV, ambient sound, human grit over sterile studio shots.

## Tokens

| Token | Value | Use |
|---|---|---|
| `carbon` | `#0B0E14` | Primary surface |
| `asphalt` | `#121824` | Alternate section surface |
| `paper` | `#F8F9FA` | Editorial sections, sharp alternation only |
| `crimson` | `#E21B4D` | Signal only: CTA, live badge, progress, active state |
| `sun` | `#FFD100` | Signal only: kickers, hover, progress |
| `silver` | `#A5B4C4` | Secondary text, cold aluminium |
| `ice` | `#004C97` | Cold balance |
| `--hairline` | `rgba(255,255,255,.12)` | 1px structural lines |
| `--ballistic` | `cubic-bezier(.16,1,.3,1)` | All UI motion. GSAP equivalent: `expo.out` |

**Crimson and yellow are never passive background washes.**

## Type

- **Display:** Bull Bold, all caps, tight tracking, line-height 0.9 to 1. Multi-line headlines lock like a brick.
- **Micro-copy:** JetBrains Mono, 10 to 12px, uppercase, tracking 0.1em or wider. Format: `LOC: 19.0760° N // ALT: 39,000 M`.

## Layout

- Radius 0 to 4px, or a 45° chamfer (`.chamfer`). No pills, no soft shadows.
- Exposed 1px hairline grids dividing the screen into compartments.
- The can or athlete breaks across type and grid lines.

## Motion

- Fast in, hard stop, zero bounce.
- Scroll scrubs: frames, 3D rotation, live counters.
- Hover is a diagonal wipe (`.btn-signal`) or instant invert, never a slow fade.

## Texture

Carbon weave (`.carbon`), brushed aluminium, halftone, asphalt grain. Environmental FX: condensation, heat haze, motion trails, sun flare.

## Component translation

| Component | Rule |
|---|---|
| Hero | Full viewport, frame-breaking 3D subject, massive stacked headline, bottom HUD bar with live data |
| CTA | Sharp or chamfered crimson, diagonal wipe, snapping `->` |
| Image card | 0px corners, 1px border, dark vignette, oversized index numeral, zoom-cut on hover |
| Stats | Giant tabular numerals, mono unit labels, segmented LED bars |

## Motifs

Soda bubbles, cans, wings, bulls. Take principles from award sites, never a specific site's design or animation.
