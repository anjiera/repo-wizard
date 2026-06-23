# React State Sanitization Rules

This document defines coding standards and optimization rules to prevent race conditions and stale closures in React hooks and state management systems.

---

## 1. Race Conditions in Async Operations
* **Problem**: Async side-effects (like REST API fetches) initiated within `useEffect` can resolve out-of-order, writing stale data back into the component state.
* **Standard**: Implement an active cancellation indicator or utilize an `AbortController` to discard response callbacks when the component dependency array changes or unmounts.
  ```javascript
  useEffect(() => {
      let isCurrent = true;
      async function fetchData() {
          const res = await fetch(`/api/data/${id}`);
          const data = await res.json();
          if (isCurrent) {
              setData(data);
          }
      }
      fetchData();
      return () => {
          isCurrent = false;
      };
  }, [id]);
  ```

---

## 2. Stale Closures in Handlers
* **Problem**: Callback functions (like event handlers or intervals) capture references to state variables at the time of creation, leading to reading stale variables on invocation.
* **Standard**: Utilize functional updates (e.g. `setState(prev => prev + 1)`) or maintain references using `useRef` for variables that should not trigger re-renders but must remain current.
  - Recommended:
    ```javascript
    const [count, setCount] = useState(0);
    useEffect(() => {
        const id = setInterval(() => {
            setCount(prev => prev + 1); // Avoids stale closure on count
        }, 1000);
        return () => clearInterval(id);
    }, []);
    ```

---

## 3. Cleanup of Event Listeners and Timers
* **Problem**: Registering event listeners on `window`, `document`, or DOM elements without clearing them on unmount leads to memory leaks and stale event actions.
* **Standard**: Always return a cleanup function in `useEffect` that calls `removeEventListener` or `clearTimeout`/`clearInterval`.
  ```javascript
  useEffect(() => {
      const handleResize = () => setWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => {
          window.removeEventListener('resize', handleResize);
      };
  }, []);
  ```
