import { Undo, Redo } from "pixelarticons/react";

import "./historyActions.css";

interface HistoryActionsProps {
    readonly undo: () => void;
    readonly redo: () => void;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}

export function HistoryActions({ undo, redo, canUndo, canRedo }: HistoryActionsProps) {
    return (
        <div className="history-actions">
            <div className="history-actions__buttons">
                <button
                    type="button"
                    className="history-actions__button"
                    aria-label="Undo"
                    title="Undo"
                    disabled={!canUndo}
                    onClick={undo}
                >
                    <Undo aria-hidden="true" />
                </button>

                <button
                    type="button"
                    className="history-actions__button"
                    aria-label="Redo"
                    title="Redo"
                    disabled={!canRedo}
                    onClick={redo}
                >
                    <Redo aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
