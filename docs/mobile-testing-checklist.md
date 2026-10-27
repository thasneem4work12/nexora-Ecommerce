# NEXORA Commerce — Pilot Mobile Testing Checklist

**Date**: October 28, 2026  
**Document Status**: Official Quality Assurance Reference  
**Applicability**: Technical Pilot & Remote Mobile Testing Sessions  
**Host Platform**: Mobile Devices (iOS Safari, Android Chrome, iPadOS)

---

## 1. Overview & Objective

During the Zero-Cost External Pilot, invited stakeholders and prospective brand owners will access NEXORA Commerce primarily from their mobile smartphones and tablets. 

This checklist provides a structured, repeatable test protocol to ensure a flawless luxury commerce experience across varying screen viewports, mobile operating systems, touch interactions, and cellular network conditions.

---

## 2. Test Device & Browser Matrix

| Device Profile | Operating System | Primary Browser | Target Viewport | Screen Density |
| :--- | :--- | :--- | :--- | :--- |
| **iPhone 15 / 16 Pro** | iOS 17 / 18 | Safari 17+ | 393 x 852 pt | 3x Retina |
| **iPhone SE (3rd Gen)** | iOS 17 / 18 | Safari 17+ | 375 x 667 pt | 2x Retina |
| **Samsung Galaxy S24** | Android 14 / 15 | Google Chrome | 412 x 915 dp | ~3x xx-hdpi |
| **Google Pixel 8 / 9** | Android 14 / 15 | Google Chrome | 412 x 892 dp | ~2.7x |
| **iPad Air / Pro** | iPadOS 17 / 18 | Mobile Safari | 820 x 1180 pt | 2x Retina |

---

## 3. Pre-Flight Connection & Gate Unlock

- [ ] **Secure Protocol**: Verify connection begins with `https://` (Cloudflare edge certificate).
- [ ] **Gate Redirection**: Verify initial request without cookie immediately redirects to `/pilot-access`.
- [ ] **Passkey Entry**:
  - Keypad opens smoothly on mobile without auto-capitalization or intrusive autocomplete.
  - Passkey verification completes in under 1 second.
  - Success message confirms unlock and sets `nexora_pilot_session` HttpOnly cookie.
  - Automatic redirect lands on the intended target route (or `/` if root).
- [ ] **Session Persistence**:
  - Backgrounding browser app and switching back retains session.
  - Opening a secondary tab retains authenticated pilot access without re-prompting.

---

## 4. Navigation & Layout Verification

- [ ] **Header & Announcement**:
  - Top demo banner (`DEMO ENVIRONMENT`) displays legibly without overlapping store navigation.
  - Store logo renders crisply on high-DPI displays without distortion.
  - Hamburger menu icon has at least 44x44px touch target.
- [ ] **Mobile Drawer Navigation**:
  - Tapping hamburger triggers smooth slide-out transition without horizontal jank.
  - Body scroll lock is engaged while drawer is open (prevents background content dragging).
  - Category and multi-store selector links respond immediately without 300ms tap delay.
  - Tapping backdrop or 'X' closes drawer smoothly.
- [ ] **Viewport & Typography**:
  - All form inputs use `text-base` (16px) or larger to prevent iOS Safari auto-zoom on focus.
  - Horizontal viewport overflow is strictly 0px (no accidental horizontal page scrollbar).
  - Editorial Luxury typography scales down gracefully on narrow screens (375px).

---

## 5. Multi-Store Brand Experience

- [ ] **NEXORA Haute Couture (`/store/nexora`)**:
  - Editorial Luxury serif typography, gold accents, and dark canvas render with correct contrast.
  - High-resolution hero imagery loads with progressive optimization.
- [ ] **Lumina Audio & Tech (`/store/lumina-tech`)**:
  - Modern Minimal clean sans-serif layout and monochrome accents display correctly.
  - Technical specifications table fits within viewport with horizontal swipe if necessary.
- [ ] **Apex Kicks & Streetwear (`/store/apex-kicks`)**:
  - Orange Energy high-contrast vibrant styling and bold typography render accurately.
  - Drop status badges and urgency indicators scale appropriately.

---

## 6. Catalog, Cart & Checkout Flow

- [ ] **Product Catalog Browsing**:
  - Infinite scroll / pagination triggers reliably on mobile touch drag.
  - Product cards display price in clean format, title, and stock indicator (`In Stock`, `Low Stock`, `Sold Out`).
- [ ] **Product Detail Page (PDP)**:
  - Swipeable image gallery or stacked imagery scrolls smoothly without gesture collision.
  - Variant selector pills (Size, Color) have minimum 44px tap targets.
  - Out-of-stock variants are disabled with clear visual strike-through.
- [ ] **Slide-Over Cart Drawer**:
  - 'Add to Bag' updates cart badge count immediately.
  - Cart drawer slides from right/bottom with item thumbnails, quantities, and subtotal.
  - Quantity increment/decrement buttons (`+` / `-`) have sufficient spacing to prevent accidental mis-taps.
- [ ] **Mobile Simulated Checkout**:
  - Simulated payment flow completes cleanly on mobile screen without iframe clipping.
  - Order confirmation screen displays full order number, items, and atelier dispatch note.

---

## 7. Account Portal & Support Interaction

- [ ] **Order Timeline**:
  - Order status progress bar wraps neatly on narrow screens without truncation.
- [ ] **Support Concierge**:
  - Ticket submission form fields are easily navigable with mobile soft keyboard.
  - Message bubble chat displays client messages and concierge replies with distinct alignments.
  - Textarea allows fluid input and does not push send button outside visible viewport.

---

## 8. Network Resilience & Reconnection

- [ ] **Cellular / WiFi Handoff**:
  - Transitioning between WiFi and 5G cellular maintains valid pilot session cookie.
- [ ] **Temporary Interruption**:
  - Reconnecting after brief signal drop does not trigger CSRF errors or session invalidation.

---

## 9. Sign-off & Reporting Protocol

Testers observing mobile anomalies must record:
1. Device model and OS version.
2. Exact page route / URL.
3. Screenshot or screen recording.
4. Steps to reproduce.

Reports are reviewed by the platform engineering lead prior to production release.
