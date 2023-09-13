# Token Endpoint Wrapper for Private Key JWT Client Authentication

This repository contains a Node.js-based Token Endpoint Wrapper for Private Key JWT to be used as part of an auth0 OIDC connection for an IDP that requires client authentication on token endpoint via private_key_jwt

## Prerequisites

Before running this server, you should have the following prerequisites installed and configured:

1. Node.js: Make sure you have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

2. Environment Variables: Create a `.env` file in the root directory of this project and configure the required environment variables. Refer to the [Configuration](#configuration) section for details on the environment variables.

## Installation

1. Clone/Copy this repository to your local github

## Usage

This sample is setup to run on vercel. The `vercel.json` file sets up deployment into vercel. Follow the options within your vercel dashboard to install this and check the Configuration section below to setup the ENV variables in vercel. 



## Endpoints

### 1. `/token` (POST)

This endpoint is used as a wrapper on your IDPs token endpoint. Clients can send a request to exchange an authorization code for access tokens. The server will validate the request and, if valid, return the tokens.

Example Request:
```json
POST /token

{
  "client_id": "your-client-id",
  "code": "authorization-code",
  "redirect_uri": "https://your-redirect-uri",
  "code_verifier": "code-verifier",
  "client_secret": "your-client-secret"
}
```

### 2. `/.well-known/keys` (GET)

This endpoint provides an ES256 public key for client authentication. It's used by the relying party of the IDP to verify client assertions.

Example Request:
```json
GET /.well-known/keys
```

## Configuration

Before running the server, configure the required environment variables in the `.env` file or in vercel. Here are the environment variables you need to set:

- `RP_ID`: Your relying party's client id.
- `IDP_DOMAIN`: The domain of the identity provider.
- `IDP_TOKEN_ENDPOINT`: The token endpoint URL of the identity provider. Example `/token`
- `A0_CLIENT_SECRET`: The client secret for client authentication.
- `RP_PRIVATE_KEY`: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC1dsvQ6S79NM+U\n...\n-----END PRIVATE KEY-----\n"
- `RP_KID`: ...
- `RP_ALG`: =RS256


Ensure that the `RP_PRIVATE_KEY` and `RP_ALG` environment variables are set according to your private key and algorithm used for generating client assertions.

The `RP_PRIVATE_KEY` is the PKCS8 formatted Private key with newlines replaced with `\n`

The `spkis/relyingPartyJWKS.json` file contains the public key(s) in jwks format that gets exposed as /.well-known/keys for the IDP to use for client assertion verification. If your IDP uses `jwks_uri` for client assertion validation this url can be used or else you can share the public key with them based on that jwks in this file.

## Use in Auth0 connection ( Example)

Create a connection in auth0 using the management API 

Assume your IDP's url is https://idp.com

```
{
  "options": {
    "type": "back_channel",
    "scope": "openid profile email",
    "issuer": "https://idp.com",
    "jwks_uri": "https://idp.com/jwks",
    "client_id": "client_pk_kwt",
    "attribute_map": {
      "mapping_mode": "bind_all"
    },
    "client_secret": "e7b613fc-68df-480c-855b-e6ae8b15e44d",
    "schema_version": "openid-1.0.0",
    "token_endpoint": "https://<your token wrapper's domain>/token",
    "userinfo_endpoint": "https://idp.com/me",
    "connection_settings": {
      "pkce": "auto"
    },
    "authorization_endpoint": "https://idp.com/auth"
  },
  "strategy": "oidc",
  "name": "<your connection's name in auth0>",
  "is_domain_connection": false,
  "show_as_button": false,
  "display_name": "<your connection's display name in auth0>",
  "enabled_clients": [
    "<client for which this connection is enabled>(optional)"
  ]
}
```



## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

