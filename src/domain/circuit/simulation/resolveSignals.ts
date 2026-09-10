import { SIGNALS, type Signal } from "../signal";

export function resolveSignals(signals: Iterable<Signal>): Signal {
    let hasLow = false;
    let hasHigh = false;

    for (const signal of signals) {
        if (signal === SIGNALS.conflict) {
            return SIGNALS.conflict;
        }

        if (signal === SIGNALS.low) {
            hasLow = true;
        }

        if (signal === SIGNALS.high) {
            hasHigh = true;
        }
    }

    if (hasLow && hasHigh) {
        return SIGNALS.conflict;
    }

    if (hasHigh) {
        return SIGNALS.high;
    }

    if (hasLow) {
        return SIGNALS.low;
    }

    return SIGNALS.floating;
}
