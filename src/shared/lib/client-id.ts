"use client";

let fallbackSequence = 0;

export function makeClientId(prefix = "ui") {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  fallbackSequence += 1;
  return [
    prefix,
    Date.now().toString(36),
    fallbackSequence.toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("_");
}
