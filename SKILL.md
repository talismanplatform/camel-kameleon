---
name: patternfly-react-vite
description: Enforces Red Hat PatternFly UI guidelines and component structures within a React + Vite + TypeScript application.
triggers:
  - "create patternfly component"
  - "build layout with patternfly"
  - "add patternfly page"
  - "refactor to patternfly"
  - "validate patternfly build"
version: 1.1.0
---

# PatternFly React + Vite Engineering Skill

Use this skill when generating, reviewing, or refactoring React components using Red Hat's PatternFly component library inside a Vite-powered TypeScript environment.

> **Definition of done**: no PatternFly task is complete until `npm run build` passes. See [Section 5](#5-mandatory-build-validation).

## 1. Import Architecture & Treeshaking

To prevent bloated Vite bundles and slow HMR (Hot Module Replacement), strictly enforce explicit item imports.

* **DO NOT** use wildcard imports: `import { Button, Card } from '@patternfly/react-core';` is acceptable ONLY if verified by Vite tree-shaking, but individual paths are preferred for minimal compilation overhead.
* **Preferred Pattern**:
  ```typescript
  import { Button } from '@patternfly/react-core/dist/esm/components/Button';
  import { Card, CardBody } from '@patternfly/react-core/dist/esm/components/Card';
  ```
* **Icons**: Always import icons from the specific ESM path to keep the bundle small:
  ```typescript
  import ArrowRightIcon from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon';
  ```

## 2. Layout & Page Composition Patterns

PatternFly relies on strict structural layouts. Never use arbitrary `div` flexboxes when an official PatternFly wrapper component exists.

* **Application Shell**: Always use `Page`, `PageSidebar`, and `Masthead` for the main layout.
* **Content Layouts**: Use grid-based wrappers to maintain responsive Red Hat design standards:
  * `Gallery`: For grids of cards with uniform widths.
  * `Grid` + `GridItem`: For explicitly spanned multi-column views.
  * `Flex` + `FlexItem`: For simple, unidirectional layouts.

### Standard Page Template
```tsx
import React from 'react';
import { Page, PageSection, PageSectionVariants } from '@patternfly/react-core/dist/esm/components/Page';
import { Title } from '@patternfly/react-core/dist/esm/components/Title';

export const StandardPage: React.FC = () => {
  return (
    <Page>
      <PageSection variant={PageSectionVariants.light}>
        <Title headingLevel="h1" size="2xl">Page Title</Title>
      </PageSection>
      <PageSection variant={PageSectionVariants.default}>
        {/* Main content goes here */}
      </PageSection>
    </Page>
  );
};
```

## 3. Vite + PatternFly Asset Integration

Ensure styles map correctly to Vite’s bundling asset pipeline.

* **Global Styles**: Global PatternFly CSS must be imported once in `src/main.tsx`:
  ```typescript
  import '@patternfly/react-core/dist/styles/base.css';
  ```
* **Dynamic Styling**: Use PatternFly utility classes via string concatenation or `clsx` rather than writing custom utility CSS classes.

## 4. Anti-Patterns to Avoid

* **No Arbitrary Sizing**: Do not use `style={{ width: '250px' }}`. Use standard PatternFly modifiers or class variables.
* **Form Structure**: Never use standard HTML `<form>` or `<input>` tags directly. Always wrap elements inside `<Form>`, `<FormGroup>`, and `<TextInput>`.
* **State Management**: Prefer controlled PatternFly components with explicit `isOpen` or `isSelected` flags coupled with clean local state (`useState`).

## 5. Mandatory Build Validation

Every task touching this codebase MUST be validated by running the project build
before it is reported as complete. Deep ESM import paths and PatternFly's typed
props are the two most common sources of breakage, and neither is visible without
compiling.

* **Required command** (runs `tsc --noEmit` and then `vite build`):
  ```bash
  npm run build
  ```
* **Definition of done**: the task is complete ONLY when this command exits with
  code `0`. A change that merely "looks correct" is not done.
* **Never** substitute `npm run dev` or a visual check for the build — the dev
  server does not type-check and tolerates imports that fail at build time.

### Validation Loop

1. Make the code change following Sections 1–4.
2. Run `npm run build`.
3. If it fails, read the first reported error, fix the root cause, and go back to
   step 2. Repeat until the build is clean.
4. Only then report the task as complete.

### What to Check on Failure

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `Cannot find module '@patternfly/react-core/dist/esm/...'` | Wrong or renamed deep ESM path | Verify the path under `node_modules/@patternfly/react-core/dist/esm/components/`, or fall back to the package root import |
| `Property 'x' does not exist on type ...` | Prop removed/renamed in PatternFly v6 | Check the component's `.d.ts` for the current prop name |
| `'X' is declared but its value is never read` | Leftover import after a refactor | Remove the unused import |
| Build succeeds but styles are missing | `base.css` not imported | Import it once in `src/main.tsx` (Section 3) |

* **Do not** silence build errors with `@ts-ignore`, `any`, or by relaxing
  `tsconfig.json`. Fix the underlying type or import instead.
* **Do not** commit or hand off work while the build is red. If a failure cannot
  be resolved, report the exact command output rather than declaring success.
