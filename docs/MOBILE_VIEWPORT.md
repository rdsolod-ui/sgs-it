# Mobile viewport and device cutouts

The page background fills the display. Content is inset using `env(safe-area-inset-*)` on all four sides; there are no device-name checks or guessed Dynamic Island dimensions. Existing gutters remain the minimum. Both themes use the same geometry and extend their background through the safe area. The browser's theme-color updates with the theme; browser chrome and iOS status-bar appearance ultimately remain OS-controlled.

`src/viewport.ts` listens to VisualViewport resize/scroll, window resize/orientation and input focus. The main app and native dialogs follow the visible height and vertical offset when a keyboard pans the screen. Pinch zoom is left to the browser. Compact windows use a smaller header and scrollable chat history. Keyboard mode hides secondary footer actions, but retains the chat field and product menu. Inputs use at least 16px on phone/tablet widths to avoid iOS focus zoom.

The intro respects the same insets, has light/dark presentation, uses two columns in landscape and restores focus without automatically opening a keyboard. Cookie information occupies its own row below the footer. CRM pages remain document-scrollable; dialogs and the login form share the safe-area rules.

## Automated verification

`npm run test:safe-area` runs Chromium; `SAFE_AREA_ENGINE=webkit npm run test:safe-area` runs Playwright WebKit. The suite injects explicit inset values into the shared CSS variables: island/notch portrait, island landscape, a small phone, Android-style bottom inset and tablet, in both themes. It checks bounding rectangles, dialog/intro controls, cookie/composer separation, theme colors, chat and synthetic VisualViewport keyboard/pan/zoom events. These injected values are test fixtures, not production device assumptions.

## Physical-device acceptance still required

- Safari and Chrome on iOS: portrait/landscape, expanded/collapsed browser bars, keyboard show/hide, long chat, modal form focus and zoom.
- Installed iOS Web App: cold start, return from background, light/dark theme and status-bar contrast.
- Chrome / Samsung Internet / Firefox on Android: gesture and button navigation, keyboard, orientation and address-bar changes.
- Telegram's embedded browser: cutouts and host chrome; it may reserve additional host controls outside the standard browser safe area.

Desktop WebKit is not a physical iPhone or a standalone installation. These manual checks must not be reported as passed based on emulation.

References: [WebKit safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/), [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [MDN env](https://developer.mozilla.org/en-US/docs/Web/CSS/env).
