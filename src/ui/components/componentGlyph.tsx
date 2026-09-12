import { ArrowRight, ArrowLeft, Plus, type LucideIcon } from "lucide-react";
import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";
import type { Rotation } from "../../domain/circuit/placedComponent";

const COMPONENT_ICONS: Record<BuiltInComponentType, LucideIcon> = {
    wire: Plus,
    source: ArrowRight,
    light: ArrowLeft,
};

interface ComponentGlyphProps {
    componentType: string;
    rotation: Rotation;
    size?: number;
}

export function ComponentGlyph({
    componentType,
    rotation,
    size,
}: ComponentGlyphProps) {
    if (!isBuiltInComponentType(componentType)) {
        return null;
    }

    const Icon = COMPONENT_ICONS[componentType];

    return (
        <Icon
            className="component-glyph"
            style={{ transform: `rotate(${rotation}deg)` }}
            size={size}
            aria-hidden="true"
        />
    );
}
