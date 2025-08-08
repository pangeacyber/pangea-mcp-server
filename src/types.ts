export type FastMCPSessionAuth = Record<string, unknown> | undefined;

export type ServerContext = {
  /** Pangea API token. */
  apiToken: string;

  /** Pangea Secure Audit Log config ID. */
  auditConfigId: string;
};
