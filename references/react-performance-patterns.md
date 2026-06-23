# React Web Performance Patterns

This document defines performance optimization patterns and standards for React applications.

---

## 1. INP (Interaction to Next Paint) Yielding
* **Main Thread Blocking**: Break up long-running JavaScript execution blocks (e.g. rendering huge lists or sorting data) by yielding to the browser main thread using `scheduler.yield()` or `setTimeout`. This allows the browser to paint user inputs immediately, reducing input delay.
  ```javascript
  async function processLargeArray(items) {
      for (const item of items) {
          process(item);
          // Yield to main thread every 50 iterations
          if (idx % 50 === 0 && typeof scheduler !== 'undefined' && scheduler.yield) {
              await scheduler.yield();
          }
      }
  }
  ```
* **useTransition**: Wrap state modifications that trigger complex, non-blocking UI changes in a transition block to keep the UI responsive.
  ```javascript
  const [isPending, startTransition] = useTransition();
  const handleFilter = (query) => {
      startTransition(() => {
          setFilterQuery(query);
      });
  };
  ```

---

## 2. Layout Shift Avoidance & Variable Fonts
* **Font Metric Overrides**: Avoid Layout Shifts (CLS) when loading custom web fonts by applying font metric overrides (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) to match the fallback system font structure.
  ```css
  @font-face {
      font-family: 'CustomFont';
      src: url('/fonts/custom.woff2') format('woff2');
      ascent-override: 95%;
      descent-override: 25%;
      size-adjust: 98%;
  }
  ```
* **Image Dimensions**: Always define explicit `width` and `height` aspect-ratio wrappers on images to reserve space before image downloading starts.

---

## 3. Back/Forward Cache (bfcache) Compatibility
* **Avoid unload listener**: Never attach `unload` event listeners to window or document blocks, as this disqualifies the page from being stored in the browser's high-speed Back/Forward Cache. Use `pagehide` instead.
  - Recommended:
    ```javascript
    window.addEventListener('pagehide', (event) => {
        if (event.persisted) {
            // Page is stored in bfcache, clean up state
        }
    });
    ```
* **Cache validation**: Revalidate user auth/cache states using `pageshow` event checks when pages are restored from the cache.
  ```javascript
  window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
          // Re-validate session
      }
  });
  ```
