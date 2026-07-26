import { createPublicKey } from "node:crypto";
import { getJwtAlgorithm, getJwtKeyId, getJwtPublicKey } from "../config/env.js";

export type Jwk = Record<string, unknown>;

/**
 * Builds a JWKS document from `JWT_PUBLIC_KEY`. Returns an empty key set
 * when `JWT_ALG` is not `RS256` (HS256 has no public key to publish).
 */
export function getJwks(): { keys: Jwk[] } {
  if (getJwtAlgorithm() !== "RS256") return { keys: [] };

  const keyObject = createPublicKey(getJwtPublicKey());
  const jwk = keyObject.export({ format: "jwk" }) as Record<string, unknown>;

  return {
    keys: [
      {
        ...jwk,
        use: "sig",
        alg: "RS256",
        kid: getJwtKeyId(),
      },
    ],
  };
}
