import { createHash, randomBytes } from "crypto";

const ticket = /^[A-Za-z0-9_-]{40,100}$/;

export function newAdTicket() { return randomBytes(32).toString("base64url"); }
export function validAdTicket(value: unknown): value is string { return typeof value === "string" && ticket.test(value); }
export function secretHash(value: string) { return createHash("sha256").update(value, "utf8").digest("hex"); }
