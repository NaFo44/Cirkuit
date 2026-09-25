export interface HistoryState<T> {
    readonly past: readonly T[];
    readonly future: readonly T[];
}

export interface HistoryTransition<T> {
    readonly history: HistoryState<T>;
    readonly current: T;
}

export function createHistory<T>(): HistoryState<T> {
    return {
        past: [],
        future: [],
    };
}

export function commitHistory<T>(
    history: HistoryState<T>,
    current: T,
): HistoryState<T> {
    return {
        past: [...history.past, current],
        future: [],
    };
}

export function undoHistory<T>(
    history: HistoryState<T>,
    current: T,
): HistoryTransition<T> | undefined {
    if (history.past.length === 0) {
        return undefined;
    }

    const previous = history.past[history.past.length - 1];

    return {
        current: previous,
        history: {
            past: history.past.slice(0, -1),
            future: [current, ...history.future],
        },
    };
}

export function redoHistory<T>(
    history: HistoryState<T>,
    current: T,
): HistoryTransition<T> | undefined {
    if (history.future.length === 0) {
        return undefined;
    }

    const next = history.future[0];

    return {
        current: next,
        history: {
            past: [...history.past, current],
            future: history.future.slice(1),
        },
    };
}

export function clearHistory<T>(): HistoryState<T> {
    return {
        past: [],
        future: [],
    };
}
