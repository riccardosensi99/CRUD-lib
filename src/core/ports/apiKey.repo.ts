export type ApiKeyRecord = {
  id: string;
  name?: string | null;
  keyHash: string;
  scopes?: string[];
  tenantId?: string | number | null;
  revokedAt?: Date | string | null;
  createdAt?: Date | string;
};

/**
 * Storage port for machine-to-machine API keys, used by `isApiKey` to
 * authenticate service-to-service requests without a user behind them.
 */
export interface ApiKeyRepo {
  findById(id: string): Promise<ApiKeyRecord | null>;
  create(input: {
    id: string;
    name?: string | null;
    keyHash: string;
    scopes?: string[];
    tenantId?: string | number | null;
  }): Promise<ApiKeyRecord | void>;
  revoke(id: string, input?: { revokedAt?: Date }): Promise<void>;
}
