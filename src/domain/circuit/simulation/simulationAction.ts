import type { ComponentAction } from "../componentDefinition";

export interface SimulationAction extends ComponentAction {
    readonly componentId: string;
}
