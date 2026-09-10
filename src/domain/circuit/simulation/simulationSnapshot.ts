import type { Signal } from "../signal";

export interface SimulationSnapshot {
    readonly tick: number;
    readonly netSignals: ReadonlyMap<string, Signal>;
    readonly componentStates: ReadonlyMap<string, unknown>;
}
