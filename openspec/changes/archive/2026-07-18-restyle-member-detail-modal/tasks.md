## 1. Member Detail Modal Presentation

- [x] 1.1 Restyle the MemberDetailModal shell, backdrop, panel, header, close control and footer to match the established administrative modal pattern.
- [x] 1.2 Reorganize the member identity, ingame profile, Discord information and class-management content into compact, visually consistent sections while preserving all existing data fallbacks and controls.
- [x] 1.3 Move the Bang Viên role removal control into a clearly labeled dangerous-action area using the shared danger button treatment.

## 2. Interaction and Accessibility Preservation

- [x] 2.1 Add dialog semantic attributes, labelled title linkage and accessible labels/focus-visible styles for modal controls.
- [x] 2.2 Preserve the current management-only access guard, save callbacks, class-role validation, intentional backdrop dismissal and pointer text-selection protection.

## 3. Validation

- [x] 3.1 Run the frontend TypeScript check and production build.
- [x] 3.2 Manually verify the modal on a manager account: open/close paths, text-selection behavior, ingame-name save, class update states and dangerous role-removal confirmation flow.
