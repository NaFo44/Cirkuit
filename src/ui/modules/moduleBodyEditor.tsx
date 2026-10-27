import type { Direction } from "../../domain/circuit/direction";
import type { ModuleDraft } from "../../domain/circuit/modules/moduleDraft";
import { getLocalPortPosition } from "../../domain/circuit/componentGeometry";
import { createModuleInstance } from "../../domain/circuit/modules/moduleDefinition";
import { CELL_SIZE } from "../../domain/grid/gridCoordinates";
import { positionKey } from "../../domain/grid/position";
import { ModuleSymbol } from "../components/moduleSymbol";
import "./moduleBodyEditor.css";

const PORT_DRAG_TYPE = "application/x-cirkuit-module-port";
interface Props {
    readonly draft: ModuleDraft;
    readonly selectedPortId: string | null;
    readonly disabled: boolean;
    readonly onSelect: (id: string) => void;
    readonly onMove: (id: string, side: Direction, offset: number) => void;
}

export function ModuleBodyEditor({
    draft,
    selectedPortId,
    disabled,
    onSelect,
    onMove,
}: Props) {
    const { width, height } = draft.footprint;
    const descriptor = {
        type: "module:draft",
        footprint: draft.footprint,
        ports: draft.ports,
    };
    const selected = draft.ports.find((port) => port.id === selectedPortId);
    const portsByCell = new Map(
        draft.ports.map((port) => [
            positionKey(getLocalPortPosition(descriptor, port)),
            port,
        ]),
    );
    const cells = new Map<
        string,
        { x: number; y: number; side: Direction; offset: number }
    >();
    for (const side of ["west", "east", "north", "south"] as const) {
        const length = side === "north" || side === "south" ? width : height;
        for (let offset = 0; offset < length; offset++) {
            const position = getLocalPortPosition(descriptor, {
                id: "cell",
                kind: "passive",
                side,
                offset,
            });
            const key = positionKey(position);
            if (!cells.has(key)) cells.set(key, { ...position, side, offset });
        }
    }
    const definition = {
        ...draft,
        circuit: { width: 1, height: 1, components: [] },
        annotations: [],
    };
    const component = createModuleInstance(draft.id, {
        id: "body-preview",
        position: { x: 0, y: 0 },
        rotation: 0,
        layer: 0,
    });

    return (
        <div className="module-body-editor">
            <p>
                Drag a port to move it. Click a port to change its connection.
            </p>
            <div className="module-body-editor__viewport">
                <div
                    className="module-body-editor__body"
                    style={{
                        width: width * CELL_SIZE,
                        height: height * CELL_SIZE,
                    }}
                >
                    <ModuleSymbol
                        component={component}
                        definition={definition}
                        inactive
                    />
                    {[...cells.entries()].map(([key, cell]) => {
                        const port = portsByCell.get(key);
                        const selectedSideFits =
                            selected &&
                            ((selected.side === "west" && cell.x === 0) ||
                                (selected.side === "east" &&
                                    cell.x === width - 1) ||
                                (selected.side === "north" && cell.y === 0) ||
                                (selected.side === "south" &&
                                    cell.y === height - 1));
                        const side = selectedSideFits
                            ? selected!.side
                            : cell.side;
                        const offset =
                            side === "north" || side === "south"
                                ? cell.x
                                : cell.y;
                        const canMove =
                            !disabled &&
                            selected &&
                            (!port || port.id === selected.id);
                        return (
                            <button
                                key={key}
                                type="button"
                                className="module-body-editor__cell"
                                style={{
                                    left: cell.x * CELL_SIZE,
                                    top: cell.y * CELL_SIZE,
                                }}
                                data-selected={port?.id === selectedPortId}
                                data-occupied={Boolean(port)}
                                disabled={disabled || (!port && !selected)}
                                draggable={!disabled && Boolean(port)}
                                aria-label={
                                    port
                                        ? `Select port ${port.name}`
                                        : `Move port to column ${cell.x + 1}, row ${cell.y + 1}`
                                }
                                aria-pressed={
                                    port
                                        ? port.id === selectedPortId
                                        : undefined
                                }
                                onClick={() => {
                                    if (port) onSelect(port.id);
                                    else if (selected)
                                        onMove(selected.id, side, offset);
                                }}
                                onDragStart={(event) => {
                                    if (!port) return;
                                    onSelect(port.id);
                                    event.dataTransfer.setData(
                                        PORT_DRAG_TYPE,
                                        port.id,
                                    );
                                    event.dataTransfer.effectAllowed = "move";
                                }}
                                onDragOver={(event) => {
                                    if (
                                        !canMove ||
                                        !event.dataTransfer.types.includes(
                                            PORT_DRAG_TYPE,
                                        )
                                    )
                                        return;
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(event) => {
                                    if (
                                        !canMove ||
                                        !event.dataTransfer.types.includes(
                                            PORT_DRAG_TYPE,
                                        )
                                    )
                                        return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const id =
                                        event.dataTransfer.getData(
                                            PORT_DRAG_TYPE,
                                        );
                                    if (id === selected.id)
                                        onMove(id, side, offset);
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
