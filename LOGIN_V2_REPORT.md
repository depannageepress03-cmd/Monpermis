# Login v2 verification

## Implementation

- Kept the existing email/phone authentication API, session persistence, Google sign-in, error messages, and post-login redirects.
- Corrected the hint chip's positioning so its measured bounds match the collision calculations. The hint is suppressed when it would overlap the form or sit outside the visible viewport.
- Adjusted desktop car positions to preserve at least 12 px of clearance from the login card.
- Added responsive and authentication behavior coverage in [login-v2.spec.ts](./e2e/specs/login-v2.spec.ts).

## Verification

- `npm run build:learner-web` — passed.
- Login v2 Playwright suite — 5 tests passed:
  - 13 viewport sizes from 320×568 through 2560×1440, each checked in empty, half-complete, and ready states (39 geometry checks).
  - No horizontal overflow and at least 12 px between the car and login card in each checked state.
  - API authentication errors remain visible; Enter submits the form with the expected identifier and password.
  - Mocked successful login reaches `/accueil` in under 1000 ms.
  - Phone mode and reduced-motion behavior.
- Browser screenshots:
  - [390×844 mobile](./e2e/artifacts/login-v2/login-390x844.png)
  - [1024×768 tablet/compact desktop](./e2e/artifacts/login-v2/login-1024x768.png)
  - [1440×900 desktop](./e2e/artifacts/login-v2/login-1440x900.png)

The Google Identity Services button itself still requires a configured Google client ID and a manual provider-backed sign-in to verify end to end.
