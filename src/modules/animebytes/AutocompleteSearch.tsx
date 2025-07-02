import { useEffect } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";

// Base64 loading spinner from the original script
const LOADING_SPINNER =
  "data:image/gif;base64,R0lGODlhEAAQALMMAKqooJGOhp2bk7e1rZ2bkre1rJCPhqqon8PBudDOxXd1bISCef///wAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFAAAMACwAAAAAEAAQAAAET5DJyYyhmAZ7sxQEs1nMsmACGJKmSaVEOLXnK1PuBADepCiMg/DQ+/2GRI8RKOxJfpTCIJNIYArS6aRajWYZCASDa41Ow+Fx2YMWOyfpTAQAIfkEBQAADAAsAAAAABAAEAAABE6QyckEoZgKe7MEQMUxhoEd6FFdQWlOqTq15SlT9VQM3rQsjMKO5/n9hANixgjc9SQ/CgKRUSgw0ynFapVmGYkEg3v1gsPibg8tfk7CnggAIfkEBQAADAAsAAAAABAAEAAABE2QycnOoZjaA/IsRWV1goCBoMiUJTW8A0XMBPZmM4Ug3hQEjN2uZygahDyP0RBMEpmTRCKzWGCkUkq1SsFOFQrG1tr9gsPc3jnco4A9EQAh+QQFAAAMACwAAAAAEAAQAAAETpDJyUqhmFqbJ0LMIA7McWDfF5LmAVApOLUvLFMmlSTdJAiM3a73+wl5HYKSEET2lBSFIhMIYKRSimFriGIZiwWD2/WCw+Jt7xxeU9qZCAAh+QQFAAAMACwAAAAAEAAQAAAETZDJyRCimFqbZ0rVxgwF9n3hSJbeSQ2rCWIkpSjddBzMfee7nQ/XCfJ+OQYAQFksMgQBxumkEKLSCfVpMDCugqyW2w18xZmuwZycdDsRACH5BAUAAAwALAAAAAAQABAAAARNkMnJUqKYWpunUtXGIAj2feFIlt5JrWybkdSydNNQMLaND7pC79YBFnY+HENHMRgyhwPGaQhQotGm00oQMLBSLYPQ9QIASrLAq5x0OxEAIfkEBQAADAAsAAAAABAAEAAABE2QycmUopham+da1cYkCfZ94UiW3kmtbJuRlGF0E4Iwto3rut6tA9wFAjiJjkIgZAYDTLNJgUIpgqyAcTgwCuACJssAdL3gpLmbpLAzEQA7";

interface AutocompleteResult {
  id: string;
  name: string;
  year: string;
  type: string;
}

interface AutocompleteResponse {
  results?: AutocompleteResult[];
}

export function AutocompleteSearch() {
  const { autocompleteSearchEnabled } = useSettingsStore();

  useEffect(() => {
    // Early exit if feature is disabled
    if (!autocompleteSearchEnabled) {
      return;
    }

    // Only run on search pages
    if (!window.location.pathname.includes("/torrents.php") && !window.location.pathname.includes("/torrents2.php")) {
      return;
    }

    let last = 0;
    let cache = 0;
    let select = 0;
    const cached: Record<string, AutocompleteResponse> = {};

    // Debounce function
    function debounce<T extends unknown[]>(func: (...args: T) => void, timeout = 200) {
      let timer: ReturnType<typeof setTimeout>;
      return (...args: T) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          func(...args);
        }, timeout);
      };
    }

    // Clear autocomplete results
    function clearResults(container: HTMLElement) {
      while (container.lastChild) {
        container.removeChild(container.lastChild);
      }
    }

    // Main autocomplete function
    async function autocomplete(searchInput: HTMLInputElement, container: HTMLElement, type: "anime" | "music") {
      const search = searchInput.value;
      if (search === "") {
        select = 0;
        container.style.display = "none";
        return clearResults(container);
      }

      const bgColor = window.getComputedStyle(searchInput).getPropertyValue("background-color");
      searchInput.style.background = `${bgColor} url("${LOADING_SPINNER}") right 10px center no-repeat`;
      last = window.performance.now();

      let data: AutocompleteResponse = {};
      let currcache = 0;

      const cacheKey = type + search;
      if (cached[cacheKey]) {
        currcache = last;
        data = cached[cacheKey];
        console.log("AB Suite: Using cached data for", cacheKey, data);
      } else {
        try {
          const response = await fetch(`/xhr/ac/search/${type}?q=${encodeURIComponent(search)}&cache=${last}`);
          currcache = +(response.url.split("&cache=")[1] || last);
          data = await response.json();
          console.log("AB Suite: API response for", cacheKey, data);
        } catch (error) {
          console.error("AB Suite: Autocomplete fetch error:", error);
          searchInput.style.background = "";
          return;
        }
      }

      if (currcache >= cache || cached[cacheKey]) {
        clearResults(container);
        select = 0;
        if (currcache === last) {
          searchInput.style.background = "";
        }
        cached[cacheKey] = data;

        if (data.results && data.results.length > 0) {
          cache = currcache;
          data.results.slice(0, 10).forEach((result) => {
            const listItem = document.createElement("li");
            listItem.style.cssText =
              "display: block !important; border-bottom: 1px solid rgba(78, 78, 78, 0.31); padding: 4px 3px; white-space: nowrap";

            const link = document.createElement("a");
            const textArea = document.createElement("textarea");
            textArea.innerHTML = result.name;
            let title = textArea.value;

            link.href = (type === "anime" ? "/torrents.php?id=" : "/torrents2.php?id=") + result.id;

            if (title.length > 80) {
              link.title = title;
              title = title.substring(0, 80).trim() + "…";
            }

            const yearText = result.year === "0" ? "" : ` [${result.year}]`;
            link.appendChild(document.createTextNode(`${title}${yearText} - ${result.type}`));
            listItem.appendChild(link);
            container.appendChild(listItem);
          });

          // Show the container with results
          container.style.display = "block";
          console.log("AB Suite: Displaying", data.results.length, "results");
        } else {
          container.style.display = "none";
          console.log("AB Suite: No results found");
        }

        // Clear cache if it gets too large
        if (Object.keys(cached).length > 200) {
          Object.keys(cached).forEach((key) => delete cached[key]);
        }
      }
    }

    // Handle keyboard navigation
    function handleKeyNavigation(event: KeyboardEvent) {
      const target = event.target as HTMLInputElement;
      const nextNode = target.nextSibling;

      // Check if nextSibling is an HTMLElement with the autocomplete container class
      if (!nextNode || nextNode.nodeType !== Node.ELEMENT_NODE) return;

      const container = nextNode as HTMLElement;
      if (!container.classList.contains("ab-autocomplete-container") || !container.children.length) return;

      let dir = 0;
      if (event.key === "ArrowUp") {
        dir = -1;
        event.preventDefault();
      }
      if (event.key === "ArrowDown") {
        dir = 1;
        event.preventDefault();
      }

      if (event.key === "Enter") {
        const selectedItem = container.querySelector(`:nth-child(${select})`) as HTMLElement;
        if (selectedItem) {
          const link = selectedItem.firstChild as HTMLAnchorElement;
          if (link && link.href) {
            window.location.href = link.href;
            event.preventDefault();
          }
        }
        return;
      }

      // Clear previous selection
      Array.from(container.children).forEach((item) => {
        (item as HTMLElement).style.outline = "none";
      });

      const newSelect = select + dir;
      const selectedItem = container.querySelector(`:nth-child(${newSelect})`) as HTMLElement;

      if (selectedItem) {
        select = newSelect;
        selectedItem.style.outline = "1px dotted grey";
      } else if (dir === 1 && container.firstChild) {
        select = 1;
        (container.firstChild as HTMLElement).style.outline = "1px dotted grey";
      }
    }

    // Handle focus events
    function handleFocus(event: FocusEvent) {
      const target = event.target as HTMLInputElement;
      const nextNode = target.nextSibling;
      select = 0;

      if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE) {
        const container = nextNode as HTMLElement;
        if (container.classList.contains("ab-autocomplete-container")) {
          Array.from(container.children).forEach((item) => {
            (item as HTMLElement).style.outline = "none";
          });
          // Show container if it has results
          if (container.children.length > 0) {
            container.style.display = "block";
          }
        }
      }
    }

    // Handle blur events to hide container
    function handleBlur(event: FocusEvent) {
      const target = event.target as HTMLInputElement;
      const nextNode = target.nextSibling;

      if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE) {
        const container = nextNode as HTMLElement;
        if (container.classList.contains("ab-autocomplete-container")) {
          // Hide container after a small delay to allow for clicks
          setTimeout(() => {
            container.style.display = "none";
          }, 150);
        }
      }
    }

    // Check if autocomplete is already setup for an input
    function hasAutocompleteSetup(searchInput: HTMLInputElement): boolean {
      const nextNode = searchInput.nextSibling;
      return !!(
        nextNode &&
        nextNode.nodeType === Node.ELEMENT_NODE &&
        (nextNode as HTMLElement).classList.contains("ab-autocomplete-container")
      );
    }

    // Setup autocomplete for a search input
    function setupAutocomplete(searchInput: HTMLInputElement, type: "anime" | "music") {
      const bgColor = window.getComputedStyle(searchInput).getPropertyValue("background-color");

      // Set up parent positioning
      if (searchInput.parentElement) {
        searchInput.parentElement.style.position = "relative";
      }
      searchInput.autocomplete = "off";

      // Create autocomplete container
      const container = document.createElement("ul");
      container.className = "ab-autocomplete-container";
      container.style.cssText = `
        position: absolute;
        background: ${bgColor};
        color: #9a9a9a;
        overflow: hidden;
        width: auto;
        max-width: 888px;
        z-index: 1000;
        min-width: unset;
        left: 0;
        top: ${searchInput.clientHeight + 4}px;
        padding: 0;
        text-align: left;
        font-size: 0.723rem;
        display: none;
      `;

      // Insert container after search input
      if (searchInput.parentNode) {
        searchInput.parentNode.insertBefore(container, searchInput.nextSibling);
      }

      // Create debounced autocomplete function
      const debouncedAutocomplete = debounce(() => autocomplete(searchInput, container, type));

      // Add event listeners
      searchInput.addEventListener("input", debouncedAutocomplete);
      searchInput.addEventListener("keydown", handleKeyNavigation);
      searchInput.addEventListener("focus", handleFocus);
      searchInput.addEventListener("blur", handleBlur);

      return container;
    }

    // Find and setup all relevant search inputs
    const setupInputs = () => {
      // Main search inputs for torrents pages
      const animeSearch = document.querySelector('form[action$="/torrents.php"] > .series_search') as HTMLInputElement;
      const musicSearch = document.querySelector('form[action$="/torrents2.php"] > .series_search') as HTMLInputElement;

      // Series name inputs
      const animeSeriesInput = document.querySelector("#series_name_anime") as HTMLInputElement;
      const musicGroupInput = document.querySelector('.inputtext[name="groupname"]') as HTMLInputElement;

      if (animeSearch && !hasAutocompleteSetup(animeSearch)) {
        setupAutocomplete(animeSearch, "anime");
      }

      if (musicSearch && !hasAutocompleteSetup(musicSearch)) {
        setupAutocomplete(musicSearch, "music");
      }

      if (animeSeriesInput && !hasAutocompleteSetup(animeSeriesInput)) {
        setupAutocomplete(animeSeriesInput, "anime");
      }

      if (musicGroupInput && !hasAutocompleteSetup(musicGroupInput)) {
        setupAutocomplete(musicGroupInput, "music");
      }
    };

    // Add CSS styles
    const addStyles = () => {
      if (document.getElementById("ab-autocomplete-styles")) return;

      const style = document.createElement("style");
      style.id = "ab-autocomplete-styles";
      style.innerHTML = `
        .ab-autocomplete-container {
          display: none;
        }
        .ab-autocomplete-container > li {
          outline-offset: -1px;
        }
        .ab-autocomplete-container > li:last-child {
          border-bottom: none !important;
        }
        .ab-autocomplete-container a {
          display: block;
          width: 100%;
          text-decoration: none;
          color: inherit;
        }
        .ab-autocomplete-container a:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `;
      document.head.appendChild(style);
    };

    // Initialize
    try {
      addStyles();
      setupInputs();

      // Set up observer for dynamically loaded content
      const observer = new MutationObserver((mutations) => {
        let shouldResetup = false;

        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check if new search elements were added
              if (
                element.matches('.series_search, #series_name_anime, .inputtext[name="groupname"]') ||
                element.querySelector('.series_search, #series_name_anime, .inputtext[name="groupname"]')
              ) {
                shouldResetup = true;
                break;
              }
            }
          }
          if (shouldResetup) break;
        }

        if (shouldResetup) {
          setTimeout(setupInputs, 100);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        observer.disconnect();
        // Clean up styles
        const styleElement = document.getElementById("ab-autocomplete-styles");
        if (styleElement) {
          styleElement.remove();
        }
      };
    } catch (error) {
      console.error("AB Suite: Error in AutocompleteSearch setup:", error);
    }
  }, [autocompleteSearchEnabled]);

  // This component doesn't render anything directly
  return null;
}
