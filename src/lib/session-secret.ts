import crypto from "crypto";

const DEV_SECRET_NAMESPACE = "corex-dev-session-secret";

export function resolveSessionSecret() {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET es obligatorio en produccion.");
  }

  return crypto
    .createHash("sha256")
    .update(`${DEV_SECRET_NAMESPACE}:${process.cwd()}`)
    .digest("hex");
}
