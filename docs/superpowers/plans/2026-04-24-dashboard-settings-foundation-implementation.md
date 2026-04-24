# Dashboard Settings Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `dashboard/profile`, build reusable settings foundation, and apply it to `dashboard/usage` + `dashboard/endpoint` with i18n alignment while preserving behavior/data flow.

**Architecture:** Introduce focused shared settings UI primitives and domain hooks for Profile to separate rendering from mutations. Reuse the same primitives and text-key conventions in Usage and Endpoint without changing API contracts, polling/live flow, or mutation semantics. Apply incremental migration with test-first steps for extracted logic and regression protection.

**Tech Stack:** Next.js App Router, React + TypeScript, shadcn/ui (`@/components/ui/*`), Phosphor icons, runtime i18n (`src/i18n/runtime.ts`), Vitest (tests in `tests/unit`).

---

## File map (create/modify)

- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsPageShell.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsSectionCard.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsFieldRow.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsStatusMessage.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsActionBar.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/index.ts`

- Create: `src/app/(dashboard)/dashboard/profile/hooks/useSettingMutation.ts`
- Create: `src/app/(dashboard)/dashboard/profile/hooks/usePasswordSettings.ts`
- Create: `src/app/(dashboard)/dashboard/profile/hooks/useProxySettings.ts`
- Create: `src/app/(dashboard)/dashboard/profile/hooks/useBackupSettings.ts`
- Create: `src/app/(dashboard)/dashboard/profile/sections/LocalModeSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/SecuritySection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/RoutingSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/NetworkSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/ObservabilitySection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/AppInfoSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/index.ts`

- Modify: `src/app/(dashboard)/dashboard/profile/ProfilePageClient.tsx`
- Modify: `src/app/(dashboard)/dashboard/usage/UsagePageClient.tsx`
- Modify: `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx`
- Modify: `src/i18n/runtime.ts` (add key-based helper without breaking existing literal `translate`)

- Create: `src/i18n/messages/dashboard.settings.common.vi.json`
- Create: `src/i18n/messages/dashboard.profile.vi.json`
- Create: `src/i18n/messages/dashboard.usage.vi.json`
- Create: `src/i18n/messages/dashboard.endpoint.vi.json`

- Test: `tests/unit/profile-setting-mutation.test.js`
- Test: `tests/unit/profile-proxy-settings.test.js`
- Test: `tests/unit/profile-backup-settings.test.js`
- Test (existing regression): `tests/unit/usage-live-stats-merge.test.js`
- Test (existing regression): `tests/unit/usage-live-ticker.test.js`

---

### Task 1: Add settings foundation UI primitives

**Files:**
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsPageShell.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsSectionCard.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsFieldRow.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsStatusMessage.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/SettingsActionBar.tsx`
- Create: `src/app/(dashboard)/dashboard/_settings/components/index.ts`

- [ ] **Step 1: Write failing structure test for shared settings primitives**

```js
// tests/unit/settings-primitives-exports.test.js
import { describe, it, expect } from "vitest";

import * as SettingsUI from "../../src/app/(dashboard)/dashboard/_settings/components";

describe("settings primitives exports", () => {
  it("exports required primitives", () => {
    expect(SettingsUI.SettingsPageShell).toBeTypeOf("function");
    expect(SettingsUI.SettingsSectionCard).toBeTypeOf("function");
    expect(SettingsUI.SettingsFieldRow).toBeTypeOf("function");
    expect(SettingsUI.SettingsStatusMessage).toBeTypeOf("function");
    expect(SettingsUI.SettingsActionBar).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/settings-primitives-exports.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: FAIL (module not found / missing exports)

- [ ] **Step 3: Implement minimal primitives and barrel export**

```tsx
// src/app/(dashboard)/dashboard/_settings/components/SettingsPageShell.tsx
import type { ReactNode } from "react";

export function SettingsPageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl flex flex-col gap-6 p-6">{children}</div>;
}
```

```tsx
// src/app/(dashboard)/dashboard/_settings/components/SettingsSectionCard.tsx
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SettingsSectionCard({ title, description, icon, children }: { title: string; description?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/_settings/components/index.ts
export * from "./SettingsPageShell";
export * from "./SettingsSectionCard";
export * from "./SettingsFieldRow";
export * from "./SettingsStatusMessage";
export * from "./SettingsActionBar";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/settings-primitives-exports.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/settings-primitives-exports.test.js src/app/(dashboard)/dashboard/_settings/components
git commit -m "refactor(ui): add shared dashboard settings primitives"
```

### Task 2: Extract Profile mutation hooks (TDD)

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/hooks/useSettingMutation.ts`
- Create: `src/app/(dashboard)/dashboard/profile/hooks/usePasswordSettings.ts`
- Create: `src/app/(dashboard)/dashboard/profile/hooks/useProxySettings.ts`
- Create: `src/app/(dashboard)/dashboard/profile/hooks/useBackupSettings.ts`
- Test: `tests/unit/profile-setting-mutation.test.js`
- Test: `tests/unit/profile-proxy-settings.test.js`
- Test: `tests/unit/profile-backup-settings.test.js`

- [ ] **Step 1: Write failing tests for mutation transitions**

```js
// tests/unit/profile-setting-mutation.test.js
import { describe, it, expect } from "vitest";
import { createSettingMutation } from "../../src/app/(dashboard)/dashboard/profile/hooks/useSettingMutation";

describe("createSettingMutation", () => {
  it("returns success state on ok response", async () => {
    const fn = createSettingMutation(async () => ({ ok: true, json: async () => ({ value: true }) }));
    const result = await fn({ value: true });
    expect(result.type).toBe("success");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/profile-setting-mutation.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: FAIL (missing module/export)

- [ ] **Step 3: Implement minimal hook utilities**

```ts
// src/app/(dashboard)/dashboard/profile/hooks/useSettingMutation.ts
export type SettingStatus = { type: "" | "success" | "error"; message: string };

export function createSettingMutation(request: (payload: unknown) => Promise<{ ok: boolean; json: () => Promise<any> }>) {
  return async (payload: unknown): Promise<SettingStatus> => {
    try {
      const res = await request(payload);
      const data = await res.json();
      if (res.ok) return { type: "success", message: data?.message || "ok" };
      return { type: "error", message: data?.error || "error" };
    } catch {
      return { type: "error", message: "error" };
    }
  };
}
```

- [ ] **Step 4: Add proxy/backup hook tests and minimal implementations**

```js
// tests/unit/profile-proxy-settings.test.js
import { describe, it, expect } from "vitest";
import { validateProxyUrl } from "../../src/app/(dashboard)/dashboard/profile/hooks/useProxySettings";

describe("validateProxyUrl", () => {
  it("rejects empty string", () => {
    expect(validateProxyUrl(" ")).toBe(false);
  });
});
```

```ts
// src/app/(dashboard)/dashboard/profile/hooks/useProxySettings.ts
export function validateProxyUrl(value: string) {
  return value.trim().length > 0;
}
```

- [ ] **Step 5: Run tests and commit**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/profile-setting-mutation.test.js unit/profile-proxy-settings.test.js unit/profile-backup-settings.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: PASS

```bash
git add tests/unit/profile-setting-mutation.test.js tests/unit/profile-proxy-settings.test.js tests/unit/profile-backup-settings.test.js src/app/(dashboard)/dashboard/profile/hooks
git commit -m "refactor(profile): extract settings mutation hooks with tests"
```

### Task 3: Refactor Profile page into sections using shared foundation

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/sections/LocalModeSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/SecuritySection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/RoutingSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/NetworkSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/ObservabilitySection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/AppInfoSection.tsx`
- Create: `src/app/(dashboard)/dashboard/profile/sections/index.ts`
- Modify: `src/app/(dashboard)/dashboard/profile/ProfilePageClient.tsx`

- [ ] **Step 1: Write failing smoke test for extracted Profile sections**

```js
// tests/unit/profile-sections-smoke.test.js
import { describe, it, expect } from "vitest";
import * as Sections from "../../src/app/(dashboard)/dashboard/profile/sections";

describe("profile sections", () => {
  it("exports all section components", () => {
    expect(Sections.LocalModeSection).toBeTypeOf("function");
    expect(Sections.SecuritySection).toBeTypeOf("function");
    expect(Sections.RoutingSection).toBeTypeOf("function");
    expect(Sections.NetworkSection).toBeTypeOf("function");
    expect(Sections.ObservabilitySection).toBeTypeOf("function");
    expect(Sections.AppInfoSection).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/profile-sections-smoke.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: FAIL (module/export missing)

- [ ] **Step 3: Create section components and wire ProfilePageClient**

```tsx
// src/app/(dashboard)/dashboard/profile/ProfilePageClient.tsx (shape)
import { SettingsPageShell } from "../_settings/components";
import { LocalModeSection, SecuritySection, RoutingSection, NetworkSection, ObservabilitySection, AppInfoSection } from "./sections";

export default function ProfilePageClient({ initialData }: ProfilePageClientProps) {
  return (
    <SettingsPageShell>
      <LocalModeSection /* existing props */ />
      <SecuritySection /* existing props */ />
      <RoutingSection /* existing props */ />
      <NetworkSection /* existing props */ />
      <ObservabilitySection /* existing props */ />
      <AppInfoSection />
    </SettingsPageShell>
  );
}
```

- [ ] **Step 4: Run smoke + affected tests**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/profile-sections-smoke.test.js unit/profile-setting-mutation.test.js unit/profile-proxy-settings.test.js unit/profile-backup-settings.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/profile-sections-smoke.test.js src/app/(dashboard)/dashboard/profile/ProfilePageClient.tsx src/app/(dashboard)/dashboard/profile/sections
git commit -m "refactor(profile): split profile page into section components"
```

### Task 4: Add key-based i18n messages for settings pages

**Files:**
- Modify: `src/i18n/runtime.ts`
- Create: `src/i18n/messages/dashboard.settings.common.vi.json`
- Create: `src/i18n/messages/dashboard.profile.vi.json`
- Create: `src/i18n/messages/dashboard.usage.vi.json`
- Create: `src/i18n/messages/dashboard.endpoint.vi.json`

- [ ] **Step 1: Write failing test for key-based translator helper**

```js
// tests/unit/runtime-i18n-keys.test.js
import { describe, it, expect } from "vitest";
import { tKey } from "../../src/i18n/runtime";

describe("tKey", () => {
  it("returns fallback when key is missing", () => {
    expect(tKey("dashboard.profile.section.local.title", "Local Mode")).toBe("Local Mode");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/runtime-i18n-keys.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: FAIL (`tKey` not exported)

- [ ] **Step 3: Implement `tKey` and message maps**

```ts
// src/i18n/runtime.ts (append)
let keyedMessages: Record<string, string> = {};

export function setKeyedMessages(messages: Record<string, string>) {
  keyedMessages = messages;
}

export function tKey(key: string, fallback: string) {
  return keyedMessages[key] || fallback;
}
```

```json
// src/i18n/messages/dashboard.settings.common.vi.json
{
  "dashboard.settings.common.action.apply": "Áp dụng",
  "dashboard.settings.common.action.test": "Kiểm tra",
  "dashboard.settings.common.status.error.generic": "Đã xảy ra lỗi"
}
```

- [ ] **Step 4: Run i18n unit test**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/runtime-i18n-keys.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/runtime-i18n-keys.test.js src/i18n/runtime.ts src/i18n/messages/dashboard.settings.common.vi.json src/i18n/messages/dashboard.profile.vi.json src/i18n/messages/dashboard.usage.vi.json src/i18n/messages/dashboard.endpoint.vi.json
git commit -m "feat(i18n): add key-based dashboard settings message namespaces"
```

### Task 5: Apply foundation + i18n to Usage and Endpoint (no behavior change)

**Files:**
- Modify: `src/app/(dashboard)/dashboard/usage/UsagePageClient.tsx`
- Modify: `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx`
- Test: `tests/unit/usage-live-stats-merge.test.js`
- Test: `tests/unit/usage-live-ticker.test.js`

- [ ] **Step 1: Add failing regression assertion for unchanged usage live behavior**

```js
// tests/unit/usage-live-ticker.test.js (add)
it("keeps same reference when ticker payload unchanged", () => {
  const now = Date.now();
  const sample = [{ id: "a", timestamp: now }];
  const next = usageTimeAgoTicker(sample, now);
  const next2 = usageTimeAgoTicker(next, now);
  expect(next2).toBe(next);
});
```

- [ ] **Step 2: Run usage regression tests first**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/usage-live-stats-merge.test.js unit/usage-live-ticker.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: PASS before UI refactor

- [ ] **Step 3: Replace page shell/sections with shared settings primitives + key translations**

```tsx
// UsagePageClient.tsx (header shape)
import { SettingsPageShell, SettingsSectionCard } from "../_settings/components";
import { tKey } from "@/i18n/runtime";

<h1>{tKey("dashboard.usage.section.header.title", "Usage")}</h1>
```

```tsx
// EndpointPageClient.tsx (header shape)
import { SettingsPageShell, SettingsSectionCard } from "../_settings/components";
import { tKey } from "@/i18n/runtime";

<h1>{tKey("dashboard.endpoint.section.header.title", "Endpoint")}</h1>
```

- [ ] **Step 4: Re-run usage regression tests + type-check**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/usage-live-stats-merge.test.js unit/usage-live-ticker.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: PASS

Run: `./node_modules/.bin/tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/usage/UsagePageClient.tsx src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx tests/unit/usage-live-stats-merge.test.js tests/unit/usage-live-ticker.test.js
git commit -m "refactor(dashboard): apply settings foundation to usage and endpoint"
```

### Task 6: Manual UI verification and final integration checks

**Files:**
- Verify runtime pages only (no required file creation)
- Optional notes update in: `CLAUDE.md` (only if new stable guidance emerges)

- [ ] **Step 1: Start dev server**

Run: `PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev`  
Expected: app boots without compile errors

- [ ] **Step 2: Verify `/dashboard/profile`**

Checklist:
- Theme switch works.
- Require login toggle + password flow unchanged.
- Proxy enable/test/apply unchanged.
- Backup import/export unchanged.

- [ ] **Step 3: Verify `/dashboard/usage` and `/dashboard/endpoint`**

Checklist:
- Usage tabs/period/live stats behavior unchanged.
- Endpoint key create/delete/toggle unchanged.
- Tunnel/tailscale cards unchanged in behavior.

- [ ] **Step 4: Run final automated checks**

Run: `NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/profile-setting-mutation.test.js unit/profile-proxy-settings.test.js unit/profile-backup-settings.test.js unit/usage-live-stats-merge.test.js unit/usage-live-ticker.test.js --reporter=verbose --config ./vitest.config.js`  
Expected: PASS

Run: `./node_modules/.bin/tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Final commit**

```bash
git add src/app/(dashboard)/dashboard/_settings src/app/(dashboard)/dashboard/profile src/app/(dashboard)/dashboard/usage/UsagePageClient.tsx src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx src/i18n/runtime.ts src/i18n/messages tests/unit
git commit -m "refactor(profile): complete settings foundation and i18n rollout"
```

---

## Spec-to-plan coverage check

- Shared settings foundation components: covered in Task 1.
- Profile component/hook decomposition: covered in Task 2 + Task 3.
- i18n namespace + key convention rollout: covered in Task 4.
- Usage + Endpoint adoption without behavior drift: covered in Task 5.
- Testing + type-check + manual verification on 3 pages: covered in Task 6.

## Placeholder scan

- No `TODO`, `TBD`, or deferred “implement later” placeholders.
- All tasks include explicit file paths and runnable commands.
- Code steps include concrete snippets.

## Type/signature consistency check

- `createSettingMutation`, `validateProxyUrl`, `tKey` are introduced before downstream usage.
- Shared primitives imported via `../_settings/components` consistently.
- i18n message namespaces align with spec naming.
