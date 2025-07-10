import { useEffect, useReducer, useRef } from "preact/hooks";

type DependencyList = readonly unknown[];

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type AsyncAction<T> =
  | { type: "START" }
  | { type: "SUCCESS"; payload: T }
  | { type: "ERROR"; payload: string }
  | { type: "RESET" };

function asyncReducer<T>(state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case "START":
      return { ...state, loading: true, error: null };
    case "SUCCESS":
      return { data: action.payload, loading: false, error: null };
    case "ERROR":
      return { ...state, loading: false, error: action.payload };
    case "RESET":
      return { data: null, loading: false, error: null };
    default:
      return state;
  }
}

export interface UseAsyncOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  deps?: DependencyList;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions<T> = {},
): AsyncState<T> & { execute: () => Promise<void>; reset: () => void } {
  const { initialData = null, onSuccess, onError, deps = [] } = options;

  const [state, dispatch] = useReducer(asyncReducer<T>, {
    data: initialData,
    loading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = async (): Promise<void> => {
    try {
      dispatch({ type: "START" });
      const result = await asyncFunction();

      if (mountedRef.current) {
        dispatch({ type: "SUCCESS", payload: result });
        onSuccess?.(result);
      }
    } catch (error) {
      if (mountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        dispatch({ type: "ERROR", payload: errorMessage });
        onError?.(errorMessage);
      }
    }
  };

  const reset = () => {
    dispatch({ type: "RESET" });
  };

  useEffect(() => {
    execute();
  }, deps);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for multiple async operations
export function useAsyncOperations<T extends Record<string, unknown>>(
  operations: { [K in keyof T]: () => Promise<T[K]> },
): {
  [K in keyof T]: AsyncState<T[K]> & { execute: () => Promise<void>; reset: () => void };
} {
  const results = {} as {
    [K in keyof T]: AsyncState<T[K]> & { execute: () => Promise<void>; reset: () => void };
  };

  for (const key in operations) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = useAsync(operations[key], { deps: [] });
  }

  return results;
}
