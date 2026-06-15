---
name: Enterprise Logic
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#23005c'
  on-tertiary-container: '#9466ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  grid_columns: '12'
  grid_gutter: 24px
  grid_margin: 32px
---

## Brand & Style
The design system is engineered for high-scale enterprise environments where data density and clarity are paramount. The brand personality is **authoritative, efficient, and precise**, evoking a sense of institutional stability blended with modern technological agility.

The aesthetic follows a **Modern Corporate** direction. It prioritizes functional minimalism, utilizing a modular card-based architecture to organize complex HR workflows. Visual interest is generated through purposeful use of whitespace, refined typography, and subtle Zia AI-inspired accents—characterized by soft gradients and intelligent highlights—that signify AI-driven insights without distracting from core tasks. The goal is to reduce cognitive load while maintaining a sophisticated, premium feel.

## Colors
The palette is rooted in **Deep Slate (#0F172A)** and **Indigo Blue (#3B82F6)** to establish trust and professional rigor. 

- **Primary & Secondary:** Used for high-level branding, primary actions, and active navigation states.
- **Zia Accent:** A vibrant Violet (#8B5CF6) is reserved exclusively for AI-augmented features and predictive insights.
- **Neutrals:** A sophisticated range of Cool Greys handles borders, secondary text, and background layering.
- **Status Indicators:** High-saturation colors are used for immediate semantic recognition (e.g., "Active," "Pending," "Action Required") against the neutral backdrop.

## Typography
**Inter** is the sole typeface for the design system, selected for its exceptional legibility in data-heavy interfaces. 

The hierarchy relies on weight contrast rather than excessive size shifts. **Labels** use uppercase styling with slight letter spacing to differentiate metadata from body content. **Body-md** (14px) is the workhorse for most UI elements, while **Body-sm** (12px) is used for dense data tables and captions. For mobile devices, "Display" and "Headline-lg" styles scale down by 20% to maintain comfortable reading widths.

## Layout & Spacing
The design system employs a **12-column fluid grid** for desktop and tablet, transitioning to a single-column stack for mobile. 

A **4px baseline shift** governs all spacing increments. Layouts should prioritize "Card-Grouping": related information lives inside white containers with 24px internal padding. 

**Breakpoints:**
- **Desktop:** 1280px+ (12 columns, 24px gutter)
- **Tablet:** 768px - 1279px (8 columns, 16px gutter)
- **Mobile:** <767px (4 columns, 16px margin)

## Elevation & Depth
Depth is created through **Tonal Layering** and **Subtle Ambient Shadows**. 

The base page uses a light grey background (`#F8FAFC`). Primary content sits on white cards with a very soft, diffused shadow (0px 1px 3px rgba(0,0,0,0.05)). 

Interactive elements like dropdowns or modals use a higher elevation tier with a more pronounced shadow to indicate they are floating above the workspace. "Zia AI" components may feature a subtle, colored glow (Violet) to distinguish them from standard system outputs.

## Shapes
The design system uses a **Soft (0.25rem)** roundedness profile. This provides a professional balance—sharp enough to feel efficient and technical, but soft enough to remain approachable.

- **Standard Buttons/Inputs:** 4px (0.25rem)
- **Cards & Modals:** 8px (0.5rem)
- **Badges/Chips:** 12px (0.75rem) for a distinct pill-like shape that differentiates them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Deep Slate or Indigo with white text.
- **Secondary:** White background with a Slate border and text.
- **Ghost:** No border or background until hover; used for tertiary actions.
- **Zia Action:** Features a subtle Indigo-to-Violet gradient border.

### Inputs & Form Fields
Fields use a 1px Slate-200 border that darkens to Indigo-500 on focus. Labels are consistently placed above the input using the `label-md` type style. Error states must include both a red border and an assistive icon/text.

### Data Tables
The core of the HRMS. Tables use `body-sm` for high information density, alternating row backgrounds (Zebra striping) in very light grey, and sticky headers for long scroll contexts.

### Cards
Cards are the primary container. They must include a clear header area with `title-md` typography and optional action icons (e.g., "Expand," "Filter").

### Status Chips
Small, high-contrast badges with background opacities of 10-15% of the status color and 100% opacity for the text (e.g., Light Green bg with Dark Green text).

### Zia Insights
A specialized component—usually a card with a subtle Violet left-border accent—used to present AI-generated suggestions, such as "Candidate match score" or "Retention risk alert."