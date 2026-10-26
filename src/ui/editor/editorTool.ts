import type { BuiltInComponentType } from "../../domain/circuit/components/builtInComponents";
import type { Rotation } from "../../domain/circuit/placedComponent";
import type { AnnotationType } from "../../domain/project/circuitAnnotation";

export type CircuitEditorTool =
    | {
          readonly kind: "component";
          readonly componentType: BuiltInComponentType;
          readonly rotation: Rotation;
      }
    | {
          readonly kind: "eraser";
      };

export type AnnotationEditorTool = {
    readonly kind: "annotation";
    readonly annotationType: AnnotationType;
};

export type ProbeTool = {
    readonly kind: "probe";
};

export type ModuleEditorTool = {
    readonly kind: "module";
    readonly moduleId: string;
    readonly rotation: Rotation;
};

export type EditorTool =
    CircuitEditorTool | AnnotationEditorTool | ProbeTool | ModuleEditorTool;

export function isCircuitEditorTool(
    tool: EditorTool,
): tool is CircuitEditorTool {
    return tool.kind === "component" || tool.kind === "eraser";
}
