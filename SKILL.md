---
name: patternfly-react-vite
description: Enforces Red Hat PatternFly UI guidelines and component structures within a React + Vite + TypeScript application.
triggers:
  - "create patternfly component"
  - "build layout with patternfly"
  - "add patternfly page"
  - "refactor to patternfly"
version: 1.0.0
---

# PatternFly React + Vite Engineering Skill

Use this skill when generating, reviewing, or refactoring React components using Red Hat's PatternFly component library inside a Vite-powered TypeScript environment.

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
