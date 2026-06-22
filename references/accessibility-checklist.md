# Accessibility Standards & Compliance Checklist

This reference checklist maps major digital accessibility standards (WCAG 2.1 AA, WCAG 2.2 AA, and EN 301 549) to codebase and configuration controls.

> [!NOTE]
> **Verification Nuance:** Several crucial accessibility criteria (such as keyboard focus trap prevention, logical tab ordering, screen-reader audio announcements, and color contrast validation on image assets) cannot be fully checked by analyzing the codebase alone. These are marked as manual verification checks.

> [!IMPORTANT]
> **Opt-In Policy:** Developers may choose to align their project with none, one, or multiple accessibility standards. All codebase scanning, recommendations, and test verification checks must only run for the standards explicitly chosen.

---

## 1. WCAG 2.1 Level AA Controls

### 1.1 Non-Text Content (SC 1.1.1)
- [ ] *Conditional Check:* All image elements (`<img>`) must have descriptive `alt` attributes or empty `alt=""` for decorative images.
- [ ] *Conditional Check:* All icon buttons (e.g. SVGs, icon fonts) must have an `aria-label` or `sr-only` description.

### 1.2 Keyboard Accessibility (SC 2.1.1)
- [ ] *Conditional Check:* All interactive elements (buttons, links, form inputs) must be keyboard focusable and operable.
- [ ] *Manual Verification:* Confirm that custom overlay menus, modals, and dialogs capture focus and prevent focus leaks (no focus traps).

### 1.3 Focus Order (SC 2.4.3)
- [ ] *Conditional Check:* Enforce logical tab index ordering by avoiding positive `tabindex` values (use `tabindex="0"` or `tabindex="-1"`).
- [ ] *Manual Verification:* Confirm the visual focus indicator is visible and follows a logical reading order when navigating with the Tab key.

### 1.4 Name, Role, Value (SC 4.1.2)
- [ ] *Conditional Check:* Ensure form input elements are explicitly bound to `<label>` elements via `id` and `for` attributes.
- [ ] *Conditional Check:* Validate that custom interactive widgets use appropriate WAI-ARIA roles (e.g. `role="dialog"`, `role="tabpanel"`).

---

## 2. WCAG 2.2 Level AA Controls (Incremental Additions)

### 2.1 Accessible Authentication (SC 3.3.8)
- [ ] *Conditional Check:* Ensure login and signup forms support browser auto-fill or copy-paste (do not block copy-paste on password or username fields).

### 2.2 Redundant Entry (SC 3.3.7)
- [ ] *Conditional Check:* Ensure forms that require repeat information (e.g. billing address vs shipping address) provide auto-populate checkboxes to avoid redundant user input.

---

## 🇪🇺 3. EN 301 549 European Standards (Digital Products)

### 3.1 Software & Web Content Compatibility
- [ ] *Conditional Check:* Enforce standard HTML5 semantic tags (e.g. `<header>`, `<main>`, `<nav>`, `<footer>`) instead of generic nested `<div>` wrappers.
- [ ] *Manual Verification:* Confirm the app functions correctly when user stylesheets or high-contrast OS display settings are active.
