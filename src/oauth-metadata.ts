/**
 * oauth-metadata.ts — OAuth/OIDC discovery metadata builders.
 *
 * DRYs up the repeated metadata object construction in the discovery endpoints.
 * Both /.well-known/openid-configuration and /.well-known/oauth-authorization-server
 * share ~80% of their fields.
 */

export interface OAuthMetadataConfig {
  serverUrl: string;
  jwksUri: string;
}

interface BaseMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  scopes_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}

interface OpenIdConfiguration extends BaseMetadata {
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
}

type OAuthAuthorizationServerMetadata = BaseMetadata;

const SCOPES_SUPPORTED = ["openid", "profile", "email", "offline_access"];
const TOKEN_AUTH_METHODS = ["client_secret_basic", "client_secret_post", "none"];

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
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: SCOPES_SUPPORTED,
    token_endpoint_auth_methods_supported: TOKEN_AUTH_METHODS,
  };
}

/**
 * Build OpenID Connect discovery metadata.
 * Used by /.well-known/openid-configuration
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
 * Used by /.well-known/oauth-authorization-server
 */
export function buildOAuthServerMetadata(
  config: OAuthMetadataConfig
): OAuthAuthorizationServerMetadata {
  return buildBaseMetadata(config);
}
