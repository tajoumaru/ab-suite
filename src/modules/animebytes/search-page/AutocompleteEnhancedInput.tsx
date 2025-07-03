import { useEffect, useRef, useState } from "preact/hooks";
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

interface AutocompleteEnhancedInputProps {
  originalInput: HTMLInputElement;
  searchType: "anime" | "music";
}

/**
 * Declarative component that renders an enhanced input with autocomplete functionality.
 * This replaces the imperative AutocompleteSearch component logic.
 */
export function AutocompleteEnhancedInput({ originalInput, searchType }: AutocompleteEnhancedInputProps) {
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>({
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
      setAutocompleteState((prev) => ({
        ...prev,
        query: originalInput.value,
      }));
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
        setAutocompleteState((prev) => ({
          ...prev,
          results: cachedResults,
          isVisible: true,
          isLoading: false,
        }));
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

      setAutocompleteState((prev) => ({
        ...prev,
        results,
        isVisible: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error("AB Suite: Autocomplete search failed:", error);
      setAutocompleteState((prev) => ({
        ...prev,
        results: [],
        isVisible: false,
        isLoading: false,
      }));
    }
  };

  // Handle input changes
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;

    // Update original input
    originalInput.value = query;
    originalInput.dispatchEvent(new Event("input", { bubbles: true }));

    setAutocompleteState((prev) => ({
      ...prev,
      query,
      selectedIndex: -1,
    }));

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the search
    if (query.trim()) {
      setAutocompleteState((prev) => ({ ...prev, isLoading: true }));

      debounceTimerRef.current = window.setTimeout(() => {
        performSearch(query, searchType);
      }, 200);
    } else {
      setAutocompleteState((prev) => ({
        ...prev,
        results: [],
        isVisible: false,
        isLoading: false,
      }));
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const { results, selectedIndex, isVisible } = autocompleteState;

    if (!isVisible || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setAutocompleteState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, results.length - 1),
        }));
        break;

      case "ArrowUp":
        e.preventDefault();
        setAutocompleteState((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, -1),
        }));
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
        setAutocompleteState((prev) => ({ ...prev, isVisible: false }));
        break;
    }
  };

  // Handle focus
  const handleFocus = () => {
    if (autocompleteState.results.length > 0) {
      setAutocompleteState((prev) => ({ ...prev, isVisible: true }));
    }
  };

  // Handle blur
  const handleBlur = () => {
    // Hide autocomplete after a delay to allow for clicks
    setTimeout(() => {
      setAutocompleteState((prev) => ({ ...prev, isVisible: false }));
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
        value={autocompleteState.query}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        style={{ boxSizing: "border-box" }}
        {...originalAttribs}
      />

      {autocompleteState.isVisible && (
        <ul className="ab-autocomplete-container ab-visible">
          {autocompleteState.isLoading && <li className="ab-autocomplete-loading">Loading...</li>}

          {!autocompleteState.isLoading && autocompleteState.results.length === 0 && autocompleteState.query && (
            <li className="ab-autocomplete-no-results">No results found</li>
          )}

          {autocompleteState.results.slice(0, 10).map((result, index) => {
            const title = result.name.length > 80 ? `${result.name.substring(0, 80).trim()}…` : result.name;
            const yearText = result.year === "0" ? "" : ` [${result.year}]`;

            return (
              <li key={result.id} className={index === autocompleteState.selectedIndex ? "ab-selected" : ""}>
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
