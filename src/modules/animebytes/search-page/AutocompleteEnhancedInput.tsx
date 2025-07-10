import { useEffect, useReducer, useRef } from "preact/hooks";
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
      console.error("AB Suite: Autocomplete search failed:", error);
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
    <div className="ab-autocomplete-wrapper">
      <input
        type="text"
        value={state.query}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        style={{ boxSizing: "border-box" }}
        {...originalAttribs}
      />

      {state.isVisible && (
        <ul className="ab-autocomplete-container ab-visible">
          {state.isLoading && <li className="ab-autocomplete-loading">Loading...</li>}

          {!state.isLoading && state.results.length === 0 && state.query && (
            <li className="ab-autocomplete-no-results">No results found</li>
          )}

          {state.results.slice(0, 10).map((result, index) => {
            const title = result.name.length > 80 ? `${result.name.substring(0, 80).trim()}…` : result.name;
            const yearText = result.year === "0" ? "" : ` [${result.year}]`;

            return (
              <li key={result.id} className={index === state.selectedIndex ? "ab-selected" : ""}>
                <button
                  type="button"
                  className="ab-autocomplete-item"
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
