import { Lightbulb, Zap, Cable, type LucideIcon } from "lucide-react";
import {
    isBuiltInComponentType,
    type BuiltInComponentType,
} from "../../domain/circuit/components/componentType";

const COMPONENT_ICONS: Partial<Record<BuiltInComponentType, LucideIcon>> = {
    source: Zap,
    light: Lightbulb,
    wire: Cable,
};

interface ComponentGlyphProps {
    componentType: string;
    size?: number;
}

export function ComponentGlyph({ componentType, size }: ComponentGlyphProps) {
    if (!isBuiltInComponentType(componentType)) {
        return null;
    }

    const Icon = COMPONENT_ICONS[componentType];

    if (!Icon) {
        return null;
    }

    return <Icon className="component-glyph" size={size} aria-hidden="true" />;
}
