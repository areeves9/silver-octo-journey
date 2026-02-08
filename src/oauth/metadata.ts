/**
 * oauth/metadata.ts — OAuth/OIDC discovery metadata builders.
 */

import type {
  OAuthMetadataConfig,
  BaseMetadata,
  OpenIdConfiguration,
  OAuthAuthorizationServerMetadata,
} from "./types.js";
import {
  SCOPES_SUPPORTED,
  TOKEN_AUTH_METHODS,
  RESPONSE_TYPES_SUPPORTED,
  GRANT_TYPES_SUPPORTED,
  CODE_CHALLENGE_METHODS,
} from "./constants.js";

/**
 * Build the base metadata object shared by both discovery endpoints.
 */
function buildBaseMetadata(config: OAuthMetadataConfig): BaseMetadata {
  const { serverUrl, jwksUri } = config;

  return {
    issuer: serverUrl,
    authorization_endpoint: `${serverUrl}/authorize`,
    token_endpoint: `${serverUrl}/token`,
    registration_endpoint: `${serverUrl}/register`,
    end_session_endpoint: `${serverUrl}/logout`,
    jwks_uri: jwksUri,
    response_types_supported: [...RESPONSE_TYPES_SUPPORTED],
    grant_types_supported: [...GRANT_TYPES_SUPPORTED],
    code_challenge_methods_supported: [...CODE_CHALLENGE_METHODS],
    scopes_supported: [...SCOPES_SUPPORTED],
    token_endpoint_auth_methods_supported: [...TOKEN_AUTH_METHODS],
  };
}

/**
 * Build OpenID Connect discovery metadata.
 */
export function buildOpenIdConfiguration(
  config: OAuthMetadataConfig
): OpenIdConfiguration {
  return {
    ...buildBaseMetadata(config),
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
  };
}

/**
 * Build OAuth Authorization Server metadata (RFC 8414).
 */
export function buildOAuthServerMetadata(
  config: OAuthMetadataConfig
): OAuthAuthorizationServerMetadata {
  return buildBaseMetadata(config);
}
