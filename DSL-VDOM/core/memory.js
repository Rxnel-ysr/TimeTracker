"use strict";
const Memory = new Map();

export function memorize(definition, value) {
    return Memory.set(definition, value);
}

export function recall(definition) {
    return Memory.get(definition);
}

export function forget(definition) {
    return Memory.delete(definition)
}

export function remembered(definition) {
    return Memory.has(definition)
}