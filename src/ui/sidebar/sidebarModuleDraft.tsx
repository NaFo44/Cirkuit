import { useId, useMemo, useState } from "react";
import { Check, Plus } from "pixelarticons/react";
import type { CircuitProject } from "../../domain/project/circuitProject";
import type { ModuleDraft } from "../../domain/circuit/modules/moduleDraft";
import type { Direction } from "../../domain/circuit/direction";
import {
    getModuleDraftError,
    hasModuleInternalPort,
    MAX_MODULE_BODY_SIZE,
} from "../../domain/circuit/modules/moduleDraftConfiguration";
import { ModuleBodyEditor } from "../modules/moduleBodyEditor";
import type { ModulePortPickRequest } from "../modules/modulePortPicker";
import type { useModuleDraftWorkspace } from "../modules/useModuleDraftWorkspace";
import "./workspaceSidebar.css";
import "./sidebarModuleDraft.css";
import "./sidebarActionButton.css";

type DraftActions = Pick<
    ReturnType<typeof useModuleDraftWorkspace>,
    "resizeDraft" | "renamePort" | "movePort" | "removePort"
>;

interface Props {
    readonly draft: ModuleDraft;
    readonly project: CircuitProject;
    readonly disabled: boolean;
    readonly isEditing: boolean;
    readonly actions: DraftActions;
    readonly selectedPortId: string | null;
    readonly pickRequest: ModulePortPickRequest | null;
    readonly error: string | null;
    readonly onError: (error: string | null) => void;
    readonly onSelectPort: (id: string) => void;
    readonly onPick: (request: ModulePortPickRequest) => void;
    readonly onCancelPick: () => void;
    readonly onPublish: () => void;
    readonly onRename: (name: string) => void;
    readonly onReturn: () => void;
}

function BodySizeInput({
    label,
    value,
    disabled,
    onCommit,
}: {
    label: string;
    value: number;
    disabled: boolean;
    onCommit: (value: number) => string | null;
}) {
    const [text, setText] = useState(String(value));
    return (
        <label>
            {label}
            <input
                type="number"
                min={1}
                max={MAX_MODULE_BODY_SIZE}
                step={1}
                value={text}
                disabled={disabled}
                onChange={(event) => {
                    setText(event.target.value);
                    onCommit(event.target.valueAsNumber);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                    }
                }}
                onBlur={() => {
                    if (text !== String(value)) {
                        setText(String(value));
                        onCommit(value);
                    }
                }}
            />
        </label>
    );
}

export function SidebarModuleDraft({
    draft,
    project,
    disabled,
    isEditing,
    actions,
    selectedPortId,
    pickRequest,
    error,
    onError,
    onSelectPort,
    onPick,
    onCancelPick,
    onPublish,
    onRename,
    onReturn,
}: Props) {
    const inputId = useId();
    const validationError = useMemo(
        () => getModuleDraftError(draft, project),
        [draft, project],
    );
    const movePort = (id: string, side: Direction, offset: number) => {
        onCancelPick();
        onError(actions.movePort(id, side, offset));
    };

    return (
        <section
            className="workspace-sidebar__page sidebar-module-draft"
            aria-labelledby="module-draft-title"
        >
            <div className="sidebar-module-draft__content">
                <button
                    type="button"
                    className="workspace-sidebar__back"
                    onClick={onReturn}
                >
                    Back to main circuit
                </button>
                <h1
                    id="module-draft-title"
                    className="workspace-sidebar__brand workspace-sidebar__page-title"
                >
                    Module
                </h1>

                <div className="sidebar-module-draft__field">
                    <label htmlFor={inputId}>Module name</label>
                    <input
                        id={inputId}
                        type="text"
                        value={draft.name}
                        disabled={disabled}
                        onChange={(event) => {
                            onRename(event.target.value);
                            onError(null);
                        }}
                        placeholder="New module"
                        autoComplete="off"
                    />
                </div>

                <div className="sidebar-module-draft__dimensions">
                    <BodySizeInput
                        label="Body width"
                        value={draft.footprint.width}
                        disabled={disabled}
                        onCommit={(width) => {
                            const message = actions.resizeDraft({
                                ...draft.footprint,
                                width,
                            });
                            onError(message);
                            return message;
                        }}
                    />
                    <BodySizeInput
                        label="Body height"
                        value={draft.footprint.height}
                        disabled={disabled}
                        onCommit={(height) => {
                            const message = actions.resizeDraft({
                                ...draft.footprint,
                                height,
                            });
                            onError(message);
                            return message;
                        }}
                    />
                </div>
                <ModuleBodyEditor
                    draft={draft}
                    disabled={disabled}
                    selectedPortId={selectedPortId}
                    onSelect={(id) => {
                        onSelectPort(id);
                        onPick({ type: "reconnect", portId: id });
                    }}
                    onMove={movePort}
                />

                <div className="sidebar-module-draft__port-actions">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onPick({ type: "add", kind: "input" })}
                    >
                        Add input
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onPick({ type: "add", kind: "output" })}
                    >
                        Add output
                    </button>
                </div>
                {pickRequest && (
                    <div className="sidebar-module-draft__port-actions">
                        <button type="button" onClick={onCancelPick}>
                            Cancel (Escape)
                        </button>
                    </div>
                )}
                {error && (
                    <p className="sidebar-module-draft__error" role="alert">
                        {error}
                    </p>
                )}

                <div className="sidebar-module-draft__ports">
                    {draft.ports.map((port) => {
                        const component = project.circuit.getComponentById(
                            port.internalPort.componentId,
                        );
                        const missing = !hasModuleInternalPort(
                            project.circuit,
                            port.internalPort,
                        );
                        return (
                            <details
                                key={port.id}
                                name={`${inputId}-ports`}
                                className="sidebar-module-draft__port"
                                data-selected={port.id === selectedPortId}
                            >
                                <summary
                                    onClick={() => {
                                        if (!disabled) onSelectPort(port.id);
                                    }}
                                >
                                    <span className="sidebar-module-draft__port-name">
                                        {port.name || "Unnamed port"}
                                    </span>
                                    <span className="sidebar-module-draft__port-kind">
                                        {port.kind === "input"
                                            ? "Input"
                                            : "Output"}
                                        {missing && (
                                            <span
                                                className="sidebar-module-draft__error"
                                                aria-label="Internal connection missing"
                                            >
                                                {" "}
                                                !
                                            </span>
                                        )}
                                    </span>
                                </summary>
                                <fieldset
                                    className="sidebar-module-draft__port-details"
                                    disabled={disabled}
                                >
                                    <label>
                                        Port name
                                        <input
                                            type="text"
                                            value={port.name}
                                            onChange={(event) => {
                                                actions.renamePort(
                                                    port.id,
                                                    event.target.value,
                                                );
                                                onError(null);
                                            }}
                                        />
                                    </label>
                                    <p
                                        className={
                                            missing
                                                ? "sidebar-module-draft__error"
                                                : "sidebar-module-draft__connection"
                                        }
                                    >
                                        {missing
                                            ? "Internal connection missing."
                                            : `Connected to ${component!.type} at ${component!.position.x},${component!.position.y}`}
                                    </p>
                                    <div className="sidebar-module-draft__port-actions">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                actions.removePort(port.id);
                                                if (
                                                    pickRequest?.type ===
                                                        "reconnect" &&
                                                    pickRequest.portId ===
                                                        port.id
                                                )
                                                    onCancelPick();
                                                onError(null);
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </fieldset>
                            </details>
                        );
                    })}
                </div>
            </div>

            <div className="sidebar-module-draft__footer">
                {validationError && (
                    <p className="sidebar-module-draft__help" role="status">
                        {validationError}
                    </p>
                )}
                <button
                    type="button"
                    className="sidebar-action-button sidebar-module-draft__publish"
                    disabled={
                        disabled ||
                        Boolean(validationError) ||
                        Boolean(pickRequest)
                    }
                    onClick={onPublish}
                >
                    {isEditing ? (
                        <Check aria-hidden="true" />
                    ) : (
                        <Plus aria-hidden="true" />
                    )}
                    <span>{isEditing ? "Save changes" : "Create module"}</span>
                </button>
            </div>
        </section>
    );
}
