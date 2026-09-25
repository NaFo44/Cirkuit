import { describe, expect, it } from "vitest";

import {
    createHistory,
    commitHistory,
    undoHistory,
    redoHistory,
} from "./history";

describe("history", () => {
    it("initialize an empty history", () => {
        const result = createHistory();

        expect(result).toStrictEqual({ past: [], future: [] });
    });

    it("commit an event", () => {
        let history = createHistory();
        const data1 = 1;
        history = commitHistory(history, data1);

        expect(history.past).toEqual([1]);

        const data2 = 2;
        history = commitHistory(history, data2);

        expect(history.past).toEqual([1, 2]);
    });

    it("undo an event", () => {
        const history = {
            past: [1, 2, 3],
            future: [],
        };
        const result = undoHistory(history, 4);

        const expectedResult = {
            history: {
                past: [1, 2],
                future: [4],
            },
            current: 3,
        };

        expect(result).toEqual(expectedResult);
    });

    it("redo an event", () => {
        const history = {
            past: [1, 2],
            future: [4, 5],
        };

        const result = redoHistory(history, 3);

        expect(result).toEqual({
            history: {
                past: [1, 2, 3],
                future: [5],
            },
            current: 4,
        });
    });

    it("cannot undo an empty history", () => {
        const history = createHistory<number>();

        expect(undoHistory(history, 1)).toBeUndefined();
    });

    it("cannot redo an empty history", () => {
        const history = createHistory<number>();

        expect(redoHistory(history, 1)).toBeUndefined();
    });

    it("support the full life cycle", () => {
        let history = createHistory<number>();
        let current = 3;

        history = commitHistory(history, 1);
        history = commitHistory(history, 2);

        const undo = undoHistory(history, current);

        if (undo !== undefined) {
            history = undo.history;
            current = undo.current;
        }

        expect(current).toBe(2);

        const undo2 = undoHistory(history, current);

        if (undo2 !== undefined) {
            history = undo2.history;
            current = undo2.current;
        }

        expect(current).toBe(1);

        const redo = redoHistory(history, current);

        if (redo !== undefined) {
            history = redo.history;
            current = redo.current;
        }

        expect(current).toBe(2);

        const next = 4;
        history = commitHistory(history, current);
        current = next;

        expect(history).toEqual({
            past: [1, 2],
            future: [],
        });

        expect(current).toBe(4);
    });
});
