import { useEffect, useReducer, useRef } from "preact/hooks";
import { err } from "@/lib/utils/logging";
import { apiService } from "@/services/api";

interface AutocompleteResult {
  id: string;
  name: string;
  year: string;
  type: string;
}

interface AutocompleteState {
  query: string;
  results: AutocompleteResult[];
  isLoading: boolean;
  isVisible: boolean;
  selectedIndex: number;
}

type AutocompleteAction =
  | { type: "SET_QUERY"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_RESULTS"; payload: AutocompleteResult[] }
  | { type: "SET_VISIBLE"; payload: boolean }
  | { type: "SET_SELECTED_INDEX"; payload: number }
  | { type: "HIDE_DROPDOWN" }
  | { type: "SHOW_RESULTS"; payload: AutocompleteResult[] }
  | { type: "NAVIGATE_UP" }
  | { type: "NAVIGATE_DOWN" }
  | { type: "RESET" };

function autocompleteReducer(state: AutocompleteState, action: AutocompleteAction): AutocompleteState {
  switch (action.type) {
    case "SET_QUERY":
      return {
        ...state,
        query: action.payload,
        selectedIndex: -1, // Reset selection when query changes
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "SET_RESULTS":
      return {
        ...state,
        results: action.payload,
        isLoading: false,
      };
    case "SET_VISIBLE":
      return {
        ...state,
        isVisible: action.payload,
      };
    case "SET_SELECTED_INDEX":
      return {
        ...state,
        selectedIndex: action.payload,
      };
    case "HIDE_DROPDOWN":
      return {
        ...state,
        isVisible: false,
        selectedIndex: -1,
      };
    case "SHOW_RESULTS":
      return {
        ...state,
        results: action.payload,
        isVisible: action.payload.length > 0,
        isLoading: false,
        selectedIndex: -1,
      };
    case "NAVIGATE_UP":
      return {
        ...state,
        selectedIndex: state.selectedIndex > 0 ? state.selectedIndex - 1 : state.results.length - 1,
      };
    case "NAVIGATE_DOWN":
      return {
        ...state,
        selectedIndex: state.selectedIndex < state.results.length - 1 ? state.selectedIndex + 1 : 0,
      };
    case "RESET":
      return {
        query: "",
        results: [],
        isLoading: false,
        isVisible: false,
        selectedIndex: -1,
      };
    default:
      return state;
  }
}

interface AutocompleteEnhancedInputProps {
  originalInput: HTMLInputElement;
  searchType: "anime" | "music";
}

/**
 * Declarative component that renders an enhanced input with autocomplete functionality.
 * This replaces the imperative AutocompleteSearch component logic.
 */
export function AutocompleteEnhancedInput({ originalInput, searchType }: AutocompleteEnhancedInputProps) {
  const [state, dispatch] = useReducer(autocompleteReducer, {
    query: originalInput.value || "",
    results: [],
    isLoading: false,
    isVisible: false,
    selectedIndex: -1,
  });

  const debounceTimerRef = useRef<number>();
  const cacheRef = useRef<Map<string, AutocompleteResult[]>>(new Map());

  // Sync with original input value
  useEffect(() => {
    const handleOriginalChange = () => {
      dispatch({ type: "SET_QUERY", payload: originalInput.value });
    };

    originalInput.addEventListener("input", handleOriginalChange);

    return () => {
      originalInput.removeEventListener("input", handleOriginalChange);
    };
  }, [originalInput]);

  // Perform autocomplete search
  const performSearch = async (query: string, type: "anime" | "music") => {
    const cacheKey = `${type}:${query}`;

    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      const cachedResults = cacheRef.current.get(cacheKey);
      if (cachedResults) {
        dispatch({ type: "SHOW_RESULTS", payload: cachedResults });
        return;
      }
    }

    try {
      const results = await apiService.autocompleteSearch(query, type);

      // Cache results
      cacheRef.current.set(cacheKey, results);

      // Clean cache if it gets too large
      if (cacheRef.current.size > 200) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) {
          cacheRef.current.delete(firstKey);
        }
      }

      dispatch({ type: "SHOW_RESULTS", payload: results });
    } catch (error) {
      err("Autocomplete search failed:", error);
      dispatch({ type: "SHOW_RESULTS", payload: [] });
    }
  };

  // Handle input changes
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;

    // Update original input
    originalInput.value = query;
    originalInput.dispatchEvent(new Event("input", { bubbles: true }));

    dispatch({ type: "SET_QUERY", payload: query });

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the search
    if (query.trim()) {
      dispatch({ type: "SET_LOADING", payload: true });

      debounceTimerRef.current = window.setTimeout(() => {
        performSearch(query, searchType);
      }, 200);
    } else {
      dispatch({ type: "SHOW_RESULTS", payload: [] });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const { results, selectedIndex, isVisible } = state;

    if (!isVisible || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        dispatch({ type: "NAVIGATE_DOWN" });
        break;

      case "ArrowUp":
        e.preventDefault();
        dispatch({ type: "NAVIGATE_UP" });
        break;

      case "Enter":
        if (selectedIndex >= 0 && results[selectedIndex]) {
          e.preventDefault();
          const result = results[selectedIndex];
          const url = searchType === "anime" ? `/torrents.php?id=${result.id}` : `/torrents2.php?id=${result.id}`;
          window.location.href = url;
        }
        break;

      case "Escape":
        dispatch({ type: "HIDE_DROPDOWN" });
        break;
    }
  };

  // Handle focus
  const handleFocus = () => {
    if (state.results.length > 0) {
      dispatch({ type: "SET_VISIBLE", payload: true });
    }
  };

  // Handle blur
  const handleBlur = () => {
    // Hide autocomplete after a delay to allow for clicks
    setTimeout(() => {
      dispatch({ type: "HIDE_DROPDOWN" });
    }, 150);
  };

  // Handle result selection
  const handleResultClick = (result: AutocompleteResult) => {
    const url = searchType === "anime" ? `/torrents.php?id=${result.id}` : `/torrents2.php?id=${result.id}`;
    window.location.href = url;
  };

  // Copy original input attributes
  const originalAttribs = {
    className: originalInput.className,
    name: originalInput.name,
    placeholder: originalInput.placeholder,
    size: originalInput.size,
    maxLength: originalInput.maxLength,
  };

  return (
    <div position="relative" size-w="full">
      <input
        type="text"
        value={state.query}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        className={originalAttribs.className || ""}
        name={originalAttribs.name}
        placeholder={originalAttribs.placeholder}
        size={originalAttribs.size}
        maxLength={originalAttribs.maxLength}
      />

      {state.isVisible && (
        <ul
          position="absolute z-1000"
          bg="[var(--input-bg,hsl(0,0%,10%))]"
          text-color="[hsl(0,0%,60%)]"
          overflow="hidden"
          size-w="auto"
          max-w="888px"
          min-w="unset"
          p="0!"
          m="0"
          text-align="left"
          text-size="0.723rem"
          list="none"
          block
          max-h="300px"
          overflow-y="auto"
          border="1 solid [rgba(78,78,78,0.31)]"
          shadow="[0_2px_8px_rgba(0,0,0,0.2)]"
        >
          {state.isLoading && (
            <li block="!" p="8px" text-align="center" font="italic" text-color="[hsl(0,0%,40%)]">
              Loading...
            </li>
          )}

          {!state.isLoading && state.results.length === 0 && state.query && (
            <li block="!" p="8px" text-align="center" font="italic" text-color="[hsl(0,0%,40%)]">
              No results found
            </li>
          )}

          {state.results.slice(0, 10).map((result, index) => {
            const title = result.name.length > 80 ? `${result.name.substring(0, 80).trim()}…` : result.name;
            const yearText = result.year === "0" ? "" : ` [${result.year}]`;

            return (
              <li key={result.id} bg={index === state.selectedIndex ? "[rgba(255,255,255,0.1)]" : "inherit"}>
                <button
                  type="button"
                  block="!"
                  size-w="full"
                  border="none b-[1px_solid_rgba(78,78,78,0.31)]"
                  p="[4px_8px]"
                  un-ws="nowrap"
                  cursor="pointer"
                  bg="inherit"
                  text="inherit"
                  font="inherit"
                  text-align="left"
                  transition="background-color"
                  outline-offset="-1px"
                  hover="bg-[rgba(255,255,255,0.1)]"
                  focus="outline-[1px_dotted_hsl(0,0%,80%)]"
                  onClick={() => handleResultClick(result)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleResultClick(result);
                    }
                  }}
                  title={result.name.length > 80 ? result.name : undefined}
                >
                  {title}
                  {yearText} - {result.type}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
