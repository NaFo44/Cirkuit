import type { EditorMode } from "./editorMode";
import "./editorHints.css";

interface EditorHintsProps {
    readonly mode: EditorMode;
}

interface EditorHint {
    readonly input: string;
    readonly action: string;
}

const COMMON_HINTS: readonly EditorHint[] = [
    {
        input: "Space",
        action: "Run / stop",
    },
    {
        input: "Pinch / wheel",
        action: "Zoom",
    },
    {
        input: "Right / middle drag",
        action: "Pan",
    },
];

const MODE_HINTS: Readonly<Record<EditorMode, readonly EditorHint[]>> = {
    edit: [
        {
            input: "Left drag",
            action: "Draw",
        },
        {
            input: "R",
            action: "Rotate",
        },
        {
            input: "S + drag",
            action: "Select",
        },
        {
            input: "Ctrl+C / V",
            action: "Copy / paste",
        },
    ],
    simulate: [
        {
            input: "Click",
            action: "Toggle switch",
        },
    ],
};

export function EditorHints({ mode }: EditorHintsProps) {
    const hints = [...MODE_HINTS[mode], ...COMMON_HINTS];

    return (
        <section className="editor-hints" aria-labelledby="editor-hints-title">
            <h2 id="editor-hints-title" className="editor-hints__title">
                Shortcuts
            </h2>

            <ul className="editor-hints__list">
                {hints.map((hint) => (
                    <li key={hint.input} className="editor-hints__item">
                        <span className="editor-hints__input">
                            {hint.input}
                        </span>

                        <span className="editor-hints__action">
                            {hint.action}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
