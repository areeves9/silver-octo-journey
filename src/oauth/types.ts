/**
 * oauth/types.ts — Type definitions for OAuth module.
 */

export interface OAuthMetadataConfig {
  serverUrl: string;
  jwksUri: string;
}

export interface OAuthProxyConfig {
  serverUrl: string;
  auth0: {
    domain: string;
    audience: string;
    jwksUri: string;
  };
}

export interface BaseMetadata {
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

export interface OpenIdConfiguration extends BaseMetadata {
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
}

export type OAuthAuthorizationServerMetadata = BaseMetadata;
