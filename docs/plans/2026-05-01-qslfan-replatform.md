# QSL.fan Replatform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the current SHX8800 web writer UI away from AntD and onto a QSL.fan-style frontend stack and design system.

**Architecture:** Keep the BLE transport and protocol logic intact, but replace the current AntD presentation layer with local UI primitives, Tailwind-driven layout, and a consistent design-token system. Route structure stays, while shell, controls, and pages are migrated to custom components.

**Tech Stack:** React 19, Vite 8, React Router 7, Tailwind CSS v4, lucide-react, clsx, tailwind-merge

---

### Task 1: Install and wire the new styling foundation

**Files:**
- Create: `src/utils/cn.js`
- Modify: `package.json`
- Modify: `src/main.jsx`
- Modify: `src/index.css`
- Test: `npm run build`

**Steps:**
1. Add Tailwind v4 related packages plus `lucide-react`, `clsx`, and `tailwind-merge`.
2. Replace the current global CSS with QSL-style tokens, Tailwind directives, utility layers, and reduced-motion rules.
3. Add the `cn()` utility for class merging.
4. Ensure the app entry loads the new stylesheet and still boots cleanly.

### Task 2: Build local UI primitives and shell

**Files:**
- Create: `src/components/ui/Button.jsx`
- Create: `src/components/ui/Card.jsx`
- Create: `src/components/ui/Badge.jsx`
- Create: `src/components/ui/Input.jsx`
- Create: `src/components/ui/Select.jsx`
- Create: `src/components/ui/PageLayout.jsx`
- Create: `src/components/ui/SectionHeader.jsx`
- Create: `src/components/ui/Surface.jsx`
- Modify: `src/layout/LayoutShell.jsx`
- Modify: `src/components/TopNav.jsx`
- Modify: `src/components/SideMenu.jsx`
- Test: `npm run lint`

**Steps:**
1. Create a minimal but reusable primitive layer matching the QSL.fan rules.
2. Replace AntD layout chrome with a custom shell using those primitives.
3. Replace icon usage with `lucide-react`.
4. Preserve the current routing and app-state wiring while removing AntD shell dependency.

### Task 3: Migrate routed pages to local primitives

**Files:**
- Modify: `src/pages/OverviewPage.jsx`
- Modify: `src/pages/ChannelsPage.jsx`
- Modify: `src/pages/BackupPage.jsx`
- Modify: `src/pages/SettingsPage.jsx`
- Modify: `src/pages/RadioPage.jsx`
- Modify: `src/pages/DtmfContactsPage.jsx`
- Modify: `src/pages/MdcContactsPage.jsx`
- Modify: `src/pages/BootImagePage.jsx`
- Modify: `src/pages/ChannelSharePage.jsx`
- Modify: `src/pages/AdvancedPage.jsx`
- Test: `npm run build`

**Steps:**
1. Replace AntD `Card`, `Button`, `Tag`, `Alert`, `Descriptions`, `Space`, and similar usage with local primitives and semantic markup.
2. Keep current BLE/protocol behavior unchanged.
3. Recompose each page into QSL-style sections: page header, surfaces, badges, utility rows, and data panels.

### Task 4: Remove remaining presentation-layer AntD usage from active UI

**Files:**
- Modify: `src/App.jsx`
- Modify: all active page/component files still importing `antd`
- Test: `rg -n "from 'antd'|from \"antd\"" src`

**Steps:**
1. Remove the last active `antd` imports from app UI code.
2. Keep only non-UI business logic untouched.
3. Verify route rendering and shared app context still work.

### Task 5: Verify and polish

**Files:**
- Modify: any touched file required by lint/build fixes
- Test: `npm run lint`
- Test: `npm test`
- Test: `npm run build`

**Steps:**
1. Run lint, tests, and production build.
2. Fix regressions and missed imports.
3. Check for any obvious style inconsistencies or leftover AntD patterns in the active app.
