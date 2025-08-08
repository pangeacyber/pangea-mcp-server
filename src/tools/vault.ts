import type { FastMCP } from 'fastmcp';
import { PangeaConfig, VaultService } from 'pangea-node-sdk';
import { z } from 'zod';

import type { FastMCPSessionAuth, ServerContext } from '../types.js';

const VAULT_ITEM_ID_REGEX = /^pvi_[a-z2-7]{32}$/;

export function registerVaultTools<
  T extends FastMCPSessionAuth = FastMCPSessionAuth,
>({ server, context }: { server: FastMCP<T>; context: ServerContext }) {
  server.addTool({
    name: 'get_vault_item',
    description: 'Retrieve details for a Vault key, secret, token, or folder.',
    parameters: z.object({
      id: z
        .string()
        .regex(VAULT_ITEM_ID_REGEX)
        .describe('ID of a Vault key, secret, token, or folder'),
    }),
    execute: async ({ id }) => {
      const vault = new VaultService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );

      const response = await vault.getItem({ id });

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to get Vault item',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Result:\n\n${JSON.stringify(response.result, null, 2)}`,
          },
        ],
      };
    },
  });

  server.addTool({
    name: 'list_vault_items',
    description:
      'Retrieve an array of Vault items matching a given filter, including secrets, keys, tokens, and folders, along with their common details.',
    parameters: z.object({
      filter: z
        .object({})
        .partial()
        .describe(
          'Filters to customize your search, for example:\n```\n{\n  "folder": "/encryption",\n  "tags": "personal",\n  "name__contains": "my",\n  "created_at__gt": "2020-03-11"\n}\n```'
        ),
      size: z
        .number()
        .optional()
        .describe('Maximum number of items in the response'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Direction for ordering the results'),
      order_by: z
        .enum([
          'id',
          'type',
          'created_at',
          'algorithm',
          'purpose',
          'expiration',
          'last_rotated',
          'next_rotation',
          'name',
          'folder',
          'item_state',
        ])
        .optional()
        .describe('Property by which to order the results'),
      last: z
        .string()
        .optional()
        .describe(
          'Internal ID returned in the previous look up response. Used for pagination.'
        ),
    }),
    execute: async ({ filter, size, order, order_by, last }) => {
      const vault = new VaultService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );

      const response = await vault.list({
        filter,
        size,
        // @ts-expect-error
        order,
        // @ts-expect-error
        order_by,
        last,
      });

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to list items',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Result:\n\n${JSON.stringify(response.result, null, 2)}`,
          },
        ],
      };
    },
  });

  server.addTool({
    name: 'delete_vault_item',
    description: 'Delete a Vault key, secret, token, or folder.',
    parameters: z.object({
      id: z
        .string()
        .regex(VAULT_ITEM_ID_REGEX)
        .describe('ID of a Vault key, secret, token, or folder'),
    }),
    execute: async ({ id }) => {
      const vault = new VaultService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );

      const response = await vault.delete(id);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to delete Vault item',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Result:\n\n${JSON.stringify(response.result, null, 2)}`,
          },
        ],
      };
    },
  });

  server.addTool({
    name: 'generate_key',
    description: 'Generate a symmetric or asymmetric key.',
    parameters: z.object({
      type: z.enum(['asymmetric_key', 'symmetric_key']),
      purpose: z
        .union([
          z
            .enum(['signing', 'encryption', 'jwt', 'pki'])
            .describe('Asymmetric key purpose'),
          z
            .enum(['encryption', 'jwt', 'fpe'])
            .describe('Symmetric key purpose'),
        ])
        .describe('Purpose of the key:'),
      algorithm: z.union([
        z
          .enum([
            'ED25519',
            'RSA-PKCS1V15-2048-SHA256',
            'ES256',
            'ES384',
            'ES512',
            'ES256K',
            'RSA-PSS-2048-SHA256',
            'RSA-PSS-3072-SHA256',
            'RSA-PSS-4096-SHA256',
            'RSA-PSS-4096-SHA512',
            'ED25519-DILITHIUM2-BETA',
            'ED448-DILITHIUM3-BETA',
            'SPHINCSPLUS-128F-SHAKE256-SIMPLE-BETA',
            'SPHINCSPLUS-128F-SHAKE256-ROBUST-BETA',
            'SPHINCSPLUS-128F-SHA256-SIMPLE-BETA',
            'SPHINCSPLUS-128F-SHA256-ROBUST-BETA',
            'SPHINCSPLUS-192F-SHAKE256-SIMPLE-BETA',
            'SPHINCSPLUS-192F-SHAKE256-ROBUST-BETA',
            'SPHINCSPLUS-192F-SHA256-SIMPLE-BETA',
            'SPHINCSPLUS-192F-SHA256-ROBUST-BETA',
            'SPHINCSPLUS-256F-SHAKE256-SIMPLE-BETA',
            'SPHINCSPLUS-256F-SHAKE256-ROBUST-BETA',
            'SPHINCSPLUS-256F-SHA256-SIMPLE-BETA',
            'SPHINCSPLUS-256F-SHA256-ROBUST-BETA',
            'FALCON-1024-BETA',
          ])
          .describe('Algorithm for type=asymmetric_key, purpose=signing'),
        z
          .enum([
            'RSA-OAEP-2048-SHA1',
            'RSA-OAEP-2048-SHA256',
            'RSA-OAEP-2048-SHA512',
            'RSA-OAEP-3072-SHA1',
            'RSA-OAEP-3072-SHA256',
            'RSA-OAEP-3072-SHA512',
            'RSA-OAEP-4096-SHA1',
            'RSA-OAEP-4096-SHA256',
            'RSA-OAEP-4096-SHA512',
          ])
          .describe('Algorithm for type=asymmetric_key, purpose=encryption'),
        z
          .enum(['ES256', 'ES384', 'ES512'])
          .describe('Algorithm for type=asymmetric_key, purpose=jwt'),
        z
          .enum([
            'ED25519',
            'RSA-2048-SHA256',
            'RSA-3072-SHA256',
            'RSA-4096-SHA256',
            'RSA-PSS-2048-SHA256',
            'RSA-PSS-3072-SHA256',
            'RSA-PSS-4096-SHA256',
            'RSA-PSS-4096-SHA512',
            'ECDSA-SHA256',
            'ECDSA-SHA384',
            'ECDSA-SHA512',
          ])
          .describe('Algorithm for type=asymmetric_key, purpose=pki'),
        z
          .enum([
            'AES-CFB-128',
            'AES-CFB-256',
            'AES-GCM-256',
            'AES-CBC-128',
            'AES-CBC-256',
          ])
          .describe('Algorithm for type=symmetric_key, purpose=encryption'),
        z
          .enum(['HS256', 'HS384', 'HS512'])
          .describe('Algorithm for type=symmetric_key, purpose=jwt'),
        z
          .enum(['AES-FF3-1-128-BETA', 'AES-FF3-1-256-BETA'])
          .describe('Algorithm for type=symmetric_key, purpose=fpe'),
      ]),
      name: z.string(),
      folder: z.string().optional(),
    }),
    execute: async ({ type, purpose, algorithm, name, folder }) => {
      const vault = new VaultService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );

      const response =
        type === 'asymmetric_key'
          ? await vault.asymmetricGenerate({
              // @ts-expect-error
              purpose,
              // @ts-expect-error
              algorithm,
              name,
              folder,
            })
          : await vault.symmetricGenerate({
              // @ts-expect-error
              purpose,
              // @ts-expect-error
              algorithm,
              name,
              folder,
            });

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to generate key',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Result:\n\n${JSON.stringify(response.result, null, 2)}`,
          },
        ],
      };
    },
  });
}
