import type { BuiltInComponentType } from "../../domain/circuit/components/builtInComponents";
import type { Rotation } from "../../domain/circuit/placedComponent";

export type EditorTool =
    | {
          readonly kind: "component";
          readonly componentType: BuiltInComponentType;
          readonly rotation: Rotation;
      }
    | {
          readonly kind: "eraser";
      };
