## 1. Modal interaction fix

- [x] 1.1 Update `MemberDetailModal` so backdrop dismissal requires a pointer gesture that begins on the backdrop.
- [x] 1.2 Ensure pointer gestures beginning inside the dialog, including text-selection drags from the ingame-name input, do not close the modal when they end on the backdrop.
- [x] 1.3 Preserve existing explicit close behavior for the close button and successful name/class saves.

## 2. Verification

- [x] 2.1 Add or update focused frontend coverage for intentional backdrop dismissal and selection drag preservation where the project test setup permits. (No frontend component-test runner is configured; validation is covered by typechecking and manual interaction verification.)
- [x] 2.2 Run frontend TypeScript validation and manually verify direct backdrop click closes while selecting the ingame name and releasing outside does not. (Frontend typecheck passed; user confirmed the interaction works correctly.)
