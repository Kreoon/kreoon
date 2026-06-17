# Profile Builder v2 estilo Canva Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a guided Canva-style portfolio builder UI on top of the current Profile Builder engine, preserving the existing block schema, templates, save/publish RPCs, and premium gates.

**Architecture:** Add a v2 UI layer under `src/components/profile-builder-v2/` that adapts existing `ProfileBlock[]` data into simple user-facing "sections". Reuse `BlockRenderer`, `useProfileBuilderData`, `useCreatorPlanFeatures`, template data, and media upload flows instead of replacing the persistence model.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/Radix UI, lucide-react, TanStack Query, Supabase RPCs.

---

## Current Context

Read before implementation:

- Design: `docs/plans/2026-06-17-profile-builder-v2-canva-design.md`
- Current page: `src/pages/ProfileBuilderPage.tsx`
- Current builder shell: `src/components/profile-builder/ProfileBuilder.tsx`
- Current canvas: `src/components/profile-builder/BuilderCanvas.tsx`
- Current toolbar: `src/components/profile-builder/BuilderToolbar.tsx`
- Current sidebar: `src/components/profile-builder/BuilderSidebar.tsx`
- Current settings panel: `src/components/profile-builder/BlockSettingsPanel.tsx`
- Current renderer: `src/components/profile-builder/BlockRenderer.tsx`
- Types: `src/components/profile-builder/types/profile-builder.ts`
- Persistence hook: `src/components/profile-builder/hooks/useProfileBuilderData.ts`
- Premium hook: `src/hooks/useCreatorPlanFeatures.ts`
- Templates: `src/components/profile-builder/templates/profile-templates.ts`

Important constraints:

- Do not change the persisted `ProfileBlock` schema in this phase.
- Do not remove the legacy builder yet.
- Do not import or render arbitrary HTML.
- Keep edits isolated from existing dirty worktree changes.
- Prefer simple, stable section editing over free-form pixel editing.

---

### Task 1: Add V2 Feature Flag And Route Switch

**Files:**

- Modify: `src/pages/ProfileBuilderPage.tsx`
- Create: `src/components/profile-builder-v2/ProfileBuilderV2.tsx`
- Create: `src/components/profile-builder-v2/index.ts`

**Step 1: Create the V2 placeholder component**

Add `src/components/profile-builder-v2/ProfileBuilderV2.tsx`:

```tsx
interface ProfileBuilderV2Props {
  profileId: string;
}

export function ProfileBuilderV2({ profileId }: ProfileBuilderV2Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Profile Builder v2</p>
          <p className="text-xs text-muted-foreground">{profileId}</p>
        </div>
      </div>
    </div>
  );
}
```

Add `src/components/profile-builder-v2/index.ts`:

```ts
export { ProfileBuilderV2 } from './ProfileBuilderV2';
```

**Step 2: Add a query-param switch in `ProfileBuilderPage.tsx`**

Import:

```tsx
import { useSearchParams } from 'react-router-dom';
import { ProfileBuilderV2 } from '@/components/profile-builder-v2';
```

Inside `ProfileBuilderPage`:

```tsx
const [searchParams] = useSearchParams();
const useV2 = searchParams.get('v') === '2';
```

Final render:

```tsx
return useV2 ? <ProfileBuilderV2 profileId={profileId} /> : <ProfileBuilder profileId={profileId} />;
```

**Step 3: Verify**

Run:

```bash
npm.cmd run build
```

Expected: build passes.

Manual check:

- `/profile-builder` renders legacy builder.
- `/profile-builder?v=2` renders V2 placeholder.

**Step 4: Commit**

```bash
git add src/pages/ProfileBuilderPage.tsx src/components/profile-builder-v2/ProfileBuilderV2.tsx src/components/profile-builder-v2/index.ts
git commit -m "feat: agregar entrada del builder de portafolios v2"
```

---

### Task 2: Create Section Adapter Utilities

**Files:**

- Create: `src/components/profile-builder-v2/types.ts`
- Create: `src/components/profile-builder-v2/section-adapter.ts`

**Step 1: Define section-facing types**

Create `types.ts`:

```ts
import type { BlockType, ProfileBlock } from '@/components/profile-builder/types/profile-builder';

export type BuilderPanel = 'templates' | 'sections' | 'style' | 'media' | 'ai' | 'publish';

export type DevicePreview = 'desktop' | 'mobile';

export interface BuilderSection {
  id: string;
  blockId: string;
  type: BlockType;
  label: string;
  description: string;
  isVisible: boolean;
  isRequired: boolean;
  isDeletable: boolean;
  block: ProfileBlock;
}
```

**Step 2: Add adapter functions**

Create `section-adapter.ts`:

```ts
import { BLOCK_DEFINITIONS, type ProfileBlock } from '@/components/profile-builder/types/profile-builder';
import type { BuilderSection } from './types';

const FALLBACK_LABELS: Record<string, string> = {
  hero_banner: 'Portada',
  about: 'Sobre mi',
  portfolio: 'Portafolio',
  services: 'Servicios',
  pricing: 'Precios',
  reviews: 'Resenas',
  verified_reviews: 'Resenas verificadas',
  contact: 'Contacto',
  cta_banner: 'CTA',
  whatsapp_button: 'WhatsApp',
  recommended_talent: 'Talento recomendado',
};

export function blockToSection(block: ProfileBlock): BuilderSection {
  const definition = BLOCK_DEFINITIONS[block.type];
  return {
    id: `section-${block.id}`,
    blockId: block.id,
    type: block.type,
    label: FALLBACK_LABELS[block.type] || definition?.label || 'Seccion avanzada',
    description: definition?.description || 'Seccion personalizada del portafolio',
    isVisible: block.isVisible,
    isRequired: definition?.isRequired ?? false,
    isDeletable: definition?.isDeletable ?? true,
    block,
  };
}

export function blocksToSections(blocks: ProfileBlock[]): BuilderSection[] {
  return [...blocks]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(blockToSection);
}

export function getSelectedSection(blocks: ProfileBlock[], selectedBlockId: string | null): BuilderSection | null {
  if (!selectedBlockId) return null;
  const block = blocks.find((item) => item.id === selectedBlockId);
  return block ? blockToSection(block) : null;
}
```

**Step 3: Verify**

Run:

```bash
npm.cmd run build
```

Expected: build passes.

**Step 4: Commit**

```bash
git add src/components/profile-builder-v2/types.ts src/components/profile-builder-v2/section-adapter.ts
git commit -m "feat: mapear bloques a secciones del builder v2"
```

---

### Task 3: Build The V2 Shell

**Files:**

- Modify: `src/components/profile-builder-v2/ProfileBuilderV2.tsx`
- Create: `src/components/profile-builder-v2/TopToolbarV2.tsx`
- Create: `src/components/profile-builder-v2/LeftToolRail.tsx`
- Create: `src/components/profile-builder-v2/CanvasPreview.tsx`
- Create: `src/components/profile-builder-v2/ContextPanel.tsx`

**Step 1: Implement `TopToolbarV2`**

Props:

```ts
interface TopToolbarV2Props {
  isDirty: boolean;
  isSaving: boolean;
  device: 'desktop' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'mobile') => void;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
}
```

UI:

- Left: save status.
- Center: desktop/mobile segmented control.
- Right: preview, save, publish buttons.

Use lucide icons: `Monitor`, `Smartphone`, `Eye`, `Save`, `Send`.

**Step 2: Implement `LeftToolRail`**

Props:

```ts
interface LeftToolRailProps {
  activePanel: BuilderPanel;
  onPanelChange: (panel: BuilderPanel) => void;
}
```

Buttons:

- `templates` with `LayoutTemplate`
- `sections` with `Layers`
- `style` with `Palette`
- `media` with `Images`
- `ai` with `Sparkles`
- `publish` with `Send`

**Step 3: Implement `CanvasPreview`**

Props:

```ts
interface CanvasPreviewProps {
  blocks: ProfileBlock[];
  selectedBlockId: string | null;
  device: 'desktop' | 'mobile';
  builderConfig: BuilderConfig;
  userId?: string;
  creatorProfileId?: string;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<ProfileBlock>) => void;
}
```

Initial implementation may wrap the existing `BuilderCanvas`:

```tsx
<BuilderCanvas
  blocks={blocks}
  selectedBlockId={selectedBlockId}
  onSelectBlock={onSelectBlock}
  onUpdateBlock={onUpdateBlock}
  onReorderBlocks={() => undefined}
  previewDevice={device === 'desktop' ? 'desktop' : 'mobile'}
  builderConfig={builderConfig}
  userId={userId}
  creatorProfileId={creatorProfileId}
/>
```

**Step 4: Implement `ContextPanel` placeholder**

Props:

```ts
interface ContextPanelProps {
  activePanel: BuilderPanel;
  selectedSection: BuilderSection | null;
}
```

Render:

- Panel title from active panel.
- If selected section exists, show selected section label.
- Otherwise, show an empty state.

**Step 5: Wire shell in `ProfileBuilderV2`**

Use `useProfileBuilderData(profileId)` to load:

- `profile`
- `blocks`
- `builderConfig`
- `saveBlocks`
- `publishBlocks`
- `generatePreviewTokenAsync`

Local state:

```ts
const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
const [activePanel, setActivePanel] = useState<BuilderPanel>('sections');
const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
const [builderConfig, setBuilderConfig] = useState(DEFAULT_BUILDER_CONFIG);
```

Sync loaded data in `useEffect`.

**Step 6: Verify**

Run:

```bash
npm.cmd run build
```

Expected: build passes.

Manual check:

- `/profile-builder?v=2` loads actual profile data.
- Canvas renders existing blocks.
- Left rail changes active panel.
- Toolbar device toggle changes preview width.
- Clicking blocks selects a section.

**Step 7: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: crear interfaz base del builder v2"
```

---

### Task 4: Implement Sections Panel

**Files:**

- Create: `src/components/profile-builder-v2/panels/SectionsPanel.tsx`
- Modify: `src/components/profile-builder-v2/ContextPanel.tsx`
- Modify: `src/components/profile-builder-v2/ProfileBuilderV2.tsx`

**Step 1: Create `SectionsPanel`**

Props:

```ts
interface SectionsPanelProps {
  sections: BuilderSection[];
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  onToggleVisibility: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  onDelete: (blockId: string) => void;
}
```

Render a simple list with:

- Section label.
- Visibility toggle icon.
- Move up/down buttons.
- Delete button only if `isDeletable`.

**Step 2: Add helper actions in `ProfileBuilderV2`**

Implement:

```ts
function updateBlock(blockId: string, updates: Partial<ProfileBlock>) {
  setBlocks((current) => current.map((block) => block.id === blockId ? { ...block, ...updates } : block));
  setIsDirty(true);
}

function toggleVisibility(blockId: string) {
  setBlocks((current) => current.map((block) => block.id === blockId ? { ...block, isVisible: !block.isVisible } : block));
  setIsDirty(true);
}

function moveSection(blockId: string, direction: -1 | 1) {
  setBlocks((current) => {
    const sorted = [...current].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = sorted.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return current;
    const [moved] = sorted.splice(index, 1);
    sorted.splice(nextIndex, 0, moved);
    return sorted.map((block, orderIndex) => ({ ...block, orderIndex }));
  });
  setIsDirty(true);
}
```

**Step 3: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- Selecting a row selects the matching block in canvas.
- Hide/show changes preview.
- Move up/down changes order.
- Delete removes non-required sections only.

**Step 4: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: agregar panel de secciones al builder v2"
```

---

### Task 5: Add Simple Editors For Core Sections

**Files:**

- Create: `src/components/profile-builder-v2/editors/HeroSectionEditor.tsx`
- Create: `src/components/profile-builder-v2/editors/AboutSectionEditor.tsx`
- Create: `src/components/profile-builder-v2/editors/PortfolioSectionEditor.tsx`
- Create: `src/components/profile-builder-v2/editors/ServicesSectionEditor.tsx`
- Create: `src/components/profile-builder-v2/editors/PricingSectionEditor.tsx`
- Create: `src/components/profile-builder-v2/editors/ContactSectionEditor.tsx`
- Create: `src/components/profile-builder-v2/editors/AdvancedSectionEditor.tsx`
- Create: `src/components/profile-builder-v2/editors/index.ts`
- Modify: `src/components/profile-builder-v2/ContextPanel.tsx`

**Step 1: Implement editor contract**

Each editor uses:

```ts
interface SectionEditorProps {
  section: BuilderSection;
  onUpdateBlock: (blockId: string, updates: Partial<ProfileBlock>) => void;
}
```

**Step 2: Implement `HeroSectionEditor`**

Fields:

- `content.headline`
- `content.subheadline`
- `content.role`
- `content.avatarUrl`
- `content.coverUrl`
- `config.ctaText`

Use controlled inputs and update:

```ts
onUpdateBlock(section.blockId, {
  content: { ...section.block.content, headline: value },
});
```

**Step 3: Implement `AboutSectionEditor`**

Fields:

- `content.title`
- `content.text`
- `content.location`
- `content.experienceLevel`

**Step 4: Implement `PortfolioSectionEditor`**

Initial simple controls:

- `config.layout`: `grid`, `masonry`, `featured`
- `config.columns`: 2, 3, 4
- `config.showTitles`: boolean

Media upload can remain linked through existing portfolio/media flows in a later task.

**Step 5: Implement `ServicesSectionEditor`**

For now:

- Edit `content.title`.
- Render existing `content.items` as read-only cards.
- Add a clear note that service management will be connected to marketplace services in a later task.

**Step 6: Implement `PricingSectionEditor`**

For now:

- Edit `content.title`.
- Toggle `config.showCurrency`.
- Render existing packages if present.

**Step 7: Implement `ContactSectionEditor`**

Fields:

- `config.buttonText`
- `content.email`
- `content.whatsapp`

Show premium notice if current block is premium-gated and user cannot use it.

**Step 8: Implement `AdvancedSectionEditor`**

For unknown/advanced blocks:

- Show section name.
- Visibility notice.
- No technical JSON editing.

**Step 9: Route selected section to editor in `ContextPanel`**

Use switch on `selectedSection.type`.

**Step 10: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- Selecting hero opens hero editor.
- Typing in fields updates canvas immediately.
- No raw technical config appears.
- Unknown block shows advanced fallback.

**Step 11: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: agregar editores simples de secciones"
```

---

### Task 6: Implement Style Panel

**Files:**

- Create: `src/components/profile-builder-v2/panels/StylePanel.tsx`
- Modify: `src/components/profile-builder-v2/ContextPanel.tsx`
- Modify: `src/components/profile-builder-v2/ProfileBuilderV2.tsx`

**Step 1: Create `StylePanel`**

Props:

```ts
interface StylePanelProps {
  config: BuilderConfig;
  onChange: (updates: Partial<BuilderConfig>) => void;
}
```

Controls:

- Accent color swatches.
- Theme: light/dark.
- Heading font.
- Body font.
- Border radius.
- Spacing.

Use existing `BuilderConfig` values only.

**Step 2: Wire into `ContextPanel`**

When `activePanel === 'style'`, render `StylePanel`.

**Step 3: Save config**

In `ProfileBuilderV2`, maintain dirty state when config changes.

On save:

- call `saveBlocksAsync(blocks, true)`
- call `saveBuilderConfigAsync(builderConfig)`

**Step 4: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- Changing accent color updates canvas.
- Changing theme updates canvas.
- Save persists and reload keeps config.

**Step 5: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: agregar estilos globales simples al builder v2"
```

---

### Task 7: Implement Templates Panel

**Files:**

- Create: `src/components/profile-builder-v2/panels/TemplatesPanel.tsx`
- Modify: `src/components/profile-builder-v2/ContextPanel.tsx`
- Modify: `src/components/profile-builder-v2/ProfileBuilderV2.tsx`

**Step 1: Create `TemplatesPanel`**

Use existing templates from:

```ts
import { FREE_TEMPLATES, PRO_TEMPLATES, PREMIUM_TEMPLATES } from '@/components/profile-builder/templates/profile-templates';
```

Props:

```ts
interface TemplatesPanelProps {
  currentTemplate?: string;
  onApplyTemplate: (template: ProfileTemplate, mode: 'style-only' | 'replace') => void;
}
```

**Step 2: Implement two apply modes**

Style-only:

- apply `template.config`
- keep current `blocks`

Replace:

- generate blocks from template using existing helper:

```ts
generateBlocksFromTemplate(template, marketplaceData)
```

Require confirmation before replace.

**Step 3: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- Style-only keeps content.
- Replace changes sections after confirmation.
- Premium templates show locked state if plan does not allow them.

**Step 4: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: agregar panel de plantillas al builder v2"
```

---

### Task 8: Add Autosave And Dirty State Hardening

**Files:**

- Create: `src/components/profile-builder-v2/hooks/useBuilderAutosave.ts`
- Modify: `src/components/profile-builder-v2/ProfileBuilderV2.tsx`
- Modify: `src/components/profile-builder-v2/TopToolbarV2.tsx`

**Step 1: Create autosave hook**

Inputs:

```ts
interface UseBuilderAutosaveParams {
  enabled: boolean;
  isDirty: boolean;
  delayMs: number;
  onSave: () => Promise<void>;
}
```

Behavior:

- Debounce save by `delayMs`.
- Do not autosave while initial load is running.
- Expose `lastSavedAt` and `saveError`.

**Step 2: Use hook in `ProfileBuilderV2`**

Set delay to 1500ms.

Manual save should call same save function.

**Step 3: Improve toolbar status**

Show:

- Guardando...
- Guardado hace Xs.
- Cambios sin guardar.
- Error al guardar.

**Step 4: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- Editing a field triggers autosave.
- Reload keeps changes.
- Manual save still works.

**Step 5: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: agregar autoguardado al builder v2"
```

---

### Task 9: Add Publish Checklist

**Files:**

- Create: `src/components/profile-builder-v2/panels/PublishPanel.tsx`
- Create: `src/components/profile-builder-v2/publish-checklist.ts`
- Modify: `src/components/profile-builder-v2/ContextPanel.tsx`

**Step 1: Implement checklist helper**

Create `publish-checklist.ts`:

```ts
import type { ProfileBlock } from '@/components/profile-builder/types/profile-builder';

export interface PublishChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
}

export function getPublishChecklist(blocks: ProfileBlock[]): PublishChecklistItem[] {
  const hero = blocks.find((block) => block.type === 'hero_banner');
  const portfolio = blocks.find((block) => block.type === 'portfolio');
  const services = blocks.find((block) => block.type === 'services');
  const contact = blocks.find((block) => block.type === 'contact' || block.type === 'cta_banner' || block.type === 'whatsapp_button');

  const portfolioItems = Array.isArray(portfolio?.content?.items) ? portfolio.content.items : [];
  const serviceItems = Array.isArray(services?.content?.items) ? services.content.items : [];

  return [
    { id: 'hero', label: 'Portada configurada', isComplete: !!hero },
    { id: 'bio', label: 'Bio o frase principal', isComplete: !!hero?.content?.subheadline },
    { id: 'portfolio', label: 'Minimo 3 trabajos', isComplete: portfolioItems.length >= 3 },
    { id: 'services', label: 'Minimo 1 servicio', isComplete: serviceItems.length >= 1 },
    { id: 'contact', label: 'Contacto o CTA configurado', isComplete: !!contact },
  ];
}
```

**Step 2: Create `PublishPanel`**

Props:

```ts
interface PublishPanelProps {
  blocks: ProfileBlock[];
  onPreview: () => void;
  onPublish: () => void;
}
```

Render checklist with check icons and action buttons.

**Step 3: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- Publish panel shows checklist.
- Preview opens public preview flow.
- Publish calls existing publish mutation.

**Step 4: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: agregar checklist de publicacion al builder v2"
```

---

### Task 10: Add AI Panel Placeholders And Safe Entry Points

**Files:**

- Create: `src/components/profile-builder-v2/panels/AIPanel.tsx`
- Modify: `src/components/profile-builder-v2/ContextPanel.tsx`

**Step 1: Create `AIPanel`**

Initial actions:

- Mejorar mi bio.
- Crear frase principal.
- Mejorar CTA.
- Sugerir servicios.
- Revisar mi portafolio.

In this task, only render disabled/coming-soon buttons unless an existing `portfolio-ai` action already maps safely to the selected block.

**Step 2: Add safe UX copy**

Each future action must use before/after confirmation. Do not auto-apply AI output in this task.

**Step 3: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- AI panel renders.
- No AI mutation runs accidentally.

**Step 4: Commit**

```bash
git add src/components/profile-builder-v2
git commit -m "feat: agregar panel inicial de ia al builder v2"
```

---

### Task 11: Link V2 From Existing UI

**Files:**

- Modify: `src/pages/settings/sections/ProfileSection.tsx`
- Modify: `src/pages/TemplateLibraryPage.tsx`

**Step 1: Update links to point to V2 behind query param**

Change builder links from:

```tsx
"/profile-builder"
```

to:

```tsx
"/profile-builder?v=2"
```

Keep legacy route accessible manually.

**Step 2: Verify**

Run:

```bash
npm.cmd run build
```

Manual check:

- Settings link opens V2.
- Template library link opens V2.
- Direct `/profile-builder` still opens legacy builder.

**Step 3: Commit**

```bash
git add src/pages/settings/sections/ProfileSection.tsx src/pages/TemplateLibraryPage.tsx
git commit -m "feat: enlazar builder v2 desde la interfaz"
```

---

### Task 12: Final Verification

**Files:**

- No source changes expected unless fixing issues found during verification.

**Step 1: Build**

Run:

```bash
npm.cmd run build
```

Expected: build passes.

Known existing warnings may remain:

- Tailwind ambiguous arbitrary classes.
- Large chunks.
- Duplicate `enabled` key in `src/hooks/useFinanceOverview.ts`.

Do not fix unrelated warnings in this task unless they break the builder.

**Step 2: Manual QA**

Check:

- `/profile-builder` loads legacy builder.
- `/profile-builder?v=2` loads V2.
- Existing profile blocks render.
- Section selection works.
- Editing hero text updates preview.
- Style changes update preview.
- Autosave persists changes.
- Manual save persists changes.
- Publish panel calls existing publish flow.
- Mobile preview is usable.
- Premium-locked features are not silently enabled.

**Step 3: Git status**

Run:

```bash
git status --short
```

Expected:

- Only files from this implementation are modified/staged.
- Existing unrelated dirty files remain untouched.

**Step 4: Final commit if fixes were needed**

```bash
git add <only-builder-v2-files>
git commit -m "fix: estabilizar builder de portafolios v2"
```

---

## Rollout Notes

Initial rollout should keep V2 behind `?v=2`.

After manual validation with real creators:

1. Make `/profile-builder` default to V2.
2. Move legacy builder to `/profile-builder/legacy` or admin-only fallback.
3. Start the next project: convert external HTML templates into native `ProfileTemplate` snapshots.
