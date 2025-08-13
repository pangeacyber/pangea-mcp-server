import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { ServerError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { ProxyOptions } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import {
  type OAuthClientInformationFull,
  OAuthClientInformationFullSchema,
  type OAuthTokens,
  OAuthTokensSchema,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { Response } from 'express';
import { PangeaConfig, Vault, VaultService } from 'pangea-node-sdk';
import { z } from 'zod';

// Pangea AuthN only supports these grant types.
const SUPPORTED_GRANT_TYPES = ['authorization_code', 'client_credentials'];

export const OAuthClientsSchema = z.object({
  clients: z.array(OAuthClientInformationFullSchema),
  last: z.string(),
  count: z.number(),
});

export const OAuthTokenIntrospectSchema = z.object({
  client_id: z.string(),
  scope: z.string(),
});

export class PangeaAuthNClientsStore implements OAuthRegisteredClientsStore {
  private readonly authnIssuer: string;
  private readonly pangeaApiToken: string;

  constructor(authnIssuer: string, pangeaApiToken: string) {
    this.authnIssuer = authnIssuer;
    this.pangeaApiToken = pangeaApiToken;
  }

  async getClient(clientId: string) {
    const reqUrl = new URL(`${this.authnIssuer}/v2/oauth/clients`);
    reqUrl.searchParams.set('client_id', clientId);

    const response = await fetch(reqUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.pangeaApiToken}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const data = OAuthClientsSchema.parse(await response.json());
    if (!data.clients.length) {
      return;
    }
    const client = data.clients[0];

    const vault = new VaultService(
      this.pangeaApiToken,
      new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
    );
    const vaultResponse = await vault.getBulk({
      filter: {
        type: 'secret',
        name: `oauth_client_${client.client_id}`,
      },
      size: 1,
    });

    if (!(vaultResponse.success && vaultResponse.result.items.length)) {
      return client;
    }
    const clientSecret = vaultResponse.result.items[0].item_versions[0].secret;
    return {
      ...client,
      client_secret: clientSecret,
    };
  }

  async registerClient(
    clientMetadata: Omit<
      OAuthClientInformationFull,
      'client_id' | 'client_id_issued_at'
    >
  ) {
    const response = await fetch(
      `${this.authnIssuer}/v2/oauth/clients/register`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.pangeaApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...clientMetadata,
          grant_types: (clientMetadata.grant_types ?? []).filter((grantType) =>
            SUPPORTED_GRANT_TYPES.includes(grantType)
          ),
          // At least one scope must be specified.
          scope: clientMetadata.scope ?? 'openid',
          // Pangea AuthN does not support the "none" method.
          token_endpoint_auth_method: 'client_secret_basic',
        }),
      }
    );

    if (!response.ok) {
      throw new ServerError(`Failed to register client: ${response.status}`);
    }

    // biome-ignore lint/suspicious/noExplicitAny: TODO
    const data: any = await response.json();
    const client = OAuthClientInformationFullSchema.parse({
      ...data,
      // Pangea AuthN has a string instead of a number for
      // `client_secret_expires_at`, which is not spec-compliant.
      client_secret_expires_at:
        typeof data.client_secret_expires_at === 'string'
          ? new Date(data.client_secret_expires_at).getTime() / 1000
          : data.client_secret_expires_at,
    });

    const vault = new VaultService(
      this.pangeaApiToken,
      new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
    );
    await vault.secretStore({
      name: `oauth_client_${client.client_id}`,
      secret: client.client_secret,
      type: Vault.ItemType.SECRET,
    });

    return client;
  }
}

export class PangeaAuthNProvider extends ProxyOAuthServerProvider {
  protected readonly _authnClientId: string;
  protected readonly _authnClientSecret: string;

  constructor(
    options: Omit<ProxyOptions, 'verifyAccessToken'> & {
      authnClientId: string;
      authnClientSecret: string;
    }
  ) {
    super({
      ...options,

      // This function is unused. The real implementation is the
      // `verifyAccessToken` override further down.
      verifyAccessToken: () => {
        throw new Error('unreachable');
      },
    });
    this._authnClientId = options.authnClientId;
    this._authnClientSecret = options.authnClientSecret;
  }

  // biome-ignore lint/suspicious/useAwait: matches parent signature
  override async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const targetUrl = new URL(this._endpoints.authorizationUrl);
    const searchParams = new URLSearchParams({
      client_id: client.client_id,
      response_type: 'code',
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      state: params.state ?? crypto.randomUUID(),
    });

    if (params.scopes?.length) {
      searchParams.set('scope', params.scopes.join(' '));
    }
    if (params.resource) {
      searchParams.set('resource', params.resource.href);
    }

    targetUrl.search = searchParams.toString();
    res.redirect(targetUrl.toString());
  }

  override async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    // Need to fetch the OAuth client with its client secret.
    const remoteClient = await this.clientsStore.getClient(client.client_id);
    if (!remoteClient) {
      throw new ServerError(`Client not found: ${client.client_id}`);
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
    });

    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }

    const response = await (this._fetch ?? fetch)(this._endpoints.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${client.client_id}:${remoteClient.client_secret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new ServerError(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    return OAuthTokensSchema.parse(data);
  }

  override async verifyAccessToken(token: string): Promise<AuthInfo> {
    const params = new URLSearchParams();
    params.append('token', token);

    const response = await fetch(`${this._endpoints.tokenUrl}/introspect`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${this._authnClientId}:${this._authnClientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new ServerError(`Token exchange failed: ${response.status}`);
    }

    const data = OAuthTokenIntrospectSchema.parse(await response.json());
    return {
      token,
      clientId: data.client_id,
      scopes: data.scope.split(' '),
    };
  }
}
