import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "pixelarticons/react";

import { PROJECT_FILE_ACCEPT } from "./projectFile";
import "./projectActions.css";

interface ProjectActionsProps {
    readonly error: string | null;
    readonly onOpen: (file: File) => Promise<void>;
    readonly onSave: () => void;
}

export function ProjectActions({ error, onOpen, onSave }: ProjectActionsProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpening, setIsOpening] = useState(false);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const file = input.files?.[0];

        input.value = "";

        if (!file) {
            return;
        }

        setIsOpening(true);

        try {
            await onOpen(file);
        } finally {
            setIsOpening(false);
        }
    };

    return (
        <div className="project-actions">
            {error && (
                <p className="project-actions__error" role="alert">
                    {error}
                </p>
            )}

            <div className="project-actions__buttons">
                <button
                    type="button"
                    className="project-actions__button"
                    aria-label="Open project"
                    title="Open project"
                    disabled={isOpening}
                    onClick={() => inputRef.current?.click()}
                >
                    <Upload aria-hidden="true" />
                    <span>{isOpening ? "Opening..." : "Open"}</span>
                </button>

                <button
                    type="button"
                    className="project-actions__button"
                    aria-label="Download project"
                    title="Download project"
                    disabled={isOpening}
                    onClick={onSave}
                >
                    <Download aria-hidden="true" />
                    <span>Save</span>
                </button>
            </div>

            <input
                ref={inputRef}
                className="project-actions__input"
                type="file"
                accept={PROJECT_FILE_ACCEPT}
                onChange={(event) => void handleFileChange(event)}
            />
        </div>
    );
}
