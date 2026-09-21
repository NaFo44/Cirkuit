import { useEffect, useRef } from "react";

type SaveAction = () => void | Promise<void>;

export function useSaveShortcut(onSave: SaveAction): void {
    const onSaveRef = useRef(onSave);

    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        const handleSaveShortcut = (event: KeyboardEvent) => {
            const isSaveShortcut =
                (event.ctrlKey || event.metaKey) &&
                !event.altKey &&
                !event.shiftKey &&
                event.key.toLowerCase() === "s";

            if (!isSaveShortcut || event.repeat) {
                return;
            }

            event.preventDefault();

            const target = event.target;

            const isEditingText =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable);

            if (isEditingText) {
                target.blur();

                window.setTimeout(() => {
                    void onSaveRef.current();
                }, 0);

                return;
            }

            void onSaveRef.current();
        };

        window.addEventListener("keydown", handleSaveShortcut, true);

        return () => {
            window.removeEventListener("keydown", handleSaveShortcut, true);
        };
    }, []);
}
