# Userscript Refactoring Plan

## 1. Overall Goal: A Robust, Declarative Foundation

The primary goal of this refactoring is to transform the userscript from a collection of imperative scripts into a modern, declarative Preact application. This will make the codebase more robust, easier to maintain, and significantly less prone to breaking when the host sites (AnimeBytes, AniList) update their layout.

We will achieve this by fully embracing the Preact component model and eliminating direct DOM manipulation wherever possible.

---

## 2. Core Architectural Shift: The "Declarative Takeover"

This is the most critical concept. Instead of constantly searching for and modifying live DOM elements, we will perform a one-time "takeover" of the relevant sections of a page.

**The Strategy:**

1.  **Identify an Anchor:** For each feature, identify a single, stable root element on the page (e.g., the `.torrent_table` on AnimeBytes). This is our anchor.
2.  **Extract Data:** Treat the original HTML within that anchor as a data source. We will traverse it *once* to extract all necessary information into a clean JavaScript data structure (e.g., an array of torrent objects).
3.  **Hide the Original:** The original HTML element will be hidden via `display: none;`. It will be kept in the DOM as a reference but will not be visible to the user.
4.  **Render the Preact App:** A new, empty `<div>` will be created adjacent to the hidden anchor, and our main Preact component for that feature will be rendered into it, receiving the extracted data as props.

**Impact:**

*   **Eliminates `src/utils/dom.ts`:** Functions like `waitForElement` and `insertAfter` become obsolete because we control the rendering tree within our Preact app.
*   **Simplifies `MutationObserver`:** The role of `MutationObserver` is drastically reduced. Instead of triggering complex DOM manipulation, its only job will be to detect if the host page has loaded new data (e.g., more torrents). If so, it will simply trigger a re-run of the data extraction and pass the new data array to the root Preact component. Preact's diffing algorithm will handle the UI updates efficiently.

---

## 3. Application Entry Point & Routing (`src/main.tsx`)

The goal here is to make the main entry point cleaner and more scalable.

*   **Create a `withSettings` HOC:**
    *   A Higher-Order Component named `withSettings` will be created.
    *   **Functionality:** It will wrap page-specific components (e.g., `AnimeBytesApp`). It will contain the `useSettingsStore` logic to load settings and will only render its child component once `isLoaded` is true, effectively removing this boilerplate from every page component.
*   **Implement Hostname-Based Routing:**
    *   The `switch` statement in the `App` component will be replaced with a simple configuration object.
    *   **Example:**
        ```javascript
        const pageMap = {
          'anilist.co': AniListApp,
          'animebytes.tv': AnimeBytesApp,
          'releases.moe': ReleasesApp,
        };
        const Component = pageMap[window.location.hostname];
        return Component ? <Component /> : null;
        ```

---

## 4. Feature Refactoring: From Scripts to Components

This section details how each major feature will be rebuilt using the new declarative architecture.

#### `TableRestructure.tsx` -> `TorrentPage` Module

This is the largest refactoring task. The monolithic `TableRestructure.tsx` will be deleted and replaced by a new module responsible for the torrents page.

*   **`TorrentPage` Component:** The new root component. It will perform the initial data extraction from the hidden table and manage the state of the torrents data array.
*   **`TorrentTable` Component:** Receives the torrents array as a prop. It will manage UI state like sorting (`sortColumn`, `sortDirection`) and expanded rows. It will render the `TorrentHeader` and map over the sorted data to render a `TorrentRow` for each item.
*   **`TorrentRow` Component:** A "pure" component that receives a single torrent object as a prop. It will be responsible for rendering all the `<td>` cells for that row. Crucially, it will also render the `SeaDexIcon` and `ExternalLinks` components directly, making the integration seamless.
*   **`TorrentDetails` Component:** The expandable row. It will receive the raw HTML for the details section and render it using `dangerouslySetInnerHTML`. This is a pragmatic choice to avoid the complexity of recreating the entire torrent details view.

#### `AutocompleteSearch.tsx` -> `Autocomplete` Component

*   **State Management:** The component will be refactored to use Preact state hooks: `useState` for the search query, results array, and loading status.
*   **Declarative Rendering:** The component will render a standard `<input>` element. The search results `<ul>` will be rendered conditionally based on the state (`results.length > 0`).
*   **API Abstraction:** The `fetch` logic will be moved into a new `autocompleteSearch` method in the `apiService`. This method will be called from a `useEffect` hook that is triggered by changes to the search query (with debouncing).

---

## 5. Code Quality & Organization

This section covers project-wide improvements.

*   **Centralize Styles:**
    *   **Action:** Move all inline styles (`style={{...}}`), `style.cssText`, and dynamically injected `<style>` tags into the appropriate `.css` files in `src/styles`.
    *   **Example:** The inline styles for the autocomplete container in `AutocompleteSearch.tsx` will be moved to `src/styles/animebytes.css` under a class like `.ab-autocomplete-container`. The component will then simply render `<ul className="ab-autocomplete-container">`.
*   **Refine Services (`api.ts`):**
    *   The redundant `fetchSeadexBatched` method will be removed. The `SeaDexIntegration` logic will be updated to use the primary `fetchSeadex` method.
    *   A new `autocompleteSearch` method will be added to handle that specific API call.
*   **Refine State Management (`settings.ts`):**
    *   The numerous individual getters will be removed to reduce boilerplate. Components will access settings directly from the store's state object.
    *   A `SETTINGS_KEY_PREFIX` constant will be added to avoid using a magic string for `GM_setValue` keys.
*   **Improve Module Co-location:**
    *   The `extractMediaInfo` function, which is only used for AniList, will be moved from the generic `src/utils/format-mapping.ts` to a more appropriate location, such as `src/modules/anilist/utils.ts`.
    *   The `ReleasesIntegration` component will be moved into its own `src/modules/releases` directory.