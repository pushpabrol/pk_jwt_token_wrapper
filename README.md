# Token Endpoint Wrapper for Private Key JWT Client Authentication

This repository contains a Node.js-based Token Endpoint Wrapper for Private Key JWT assertion to be used as part of an auth0 OIDC connection for an IDP that requires client authentication on token endpoint via private_key_jwt

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

This endpoint provides the public keys for client authentication. It's used by the IDP to verify client assertions. In this example it has keys for both RS256 and RS512.

Example Request:
```json
GET /.well-known/keys

```

### 3. `/intermediary.jwks` (GET)

This endpoint provides the public keys for the Auth0 Connection to use as the JWKS endpoint. Since the IDP is sending a token signed with RS512 the wrapper verifies the tokens, makes all the checks etc and then creates a new token signed with RS256. To verify this token auth0 needs a jwks and this url provides that. We will also update the connection to use this as the JWKs instead of the one provided by the IDP

Example Request:
```json
GET /intermediary.jwks

```

## Configuration

Before running the server, configure the required environment variables in the `.env` file or in vercel. Here are the environment variables you need to set:

- `RP_ID` - <Client_id from the IDP>
- `A0_CLIENT_SECRET` - <a client secret you use in the token wrapper to make sure its only called from auth0 ( shared secret with auth0)>
- `RP_PRIVATE_KEY_RS256` - "pkcs8 formattted private key - RS256"
- `RP_PRIVATE_KEY_RS512` - "pkcs8 formattted private key - RS512"
- `RP_KID_RS256` - <kid for RS256>
- `RP_KID_RS512` - <kid for RS512>
- `IDP_DOMAIN` - domain of your IDP
- `IDP_TOKEN_ENDPOINT` - path of your IDP's token endpoint relative to the domains based url - /token
- `IDP_TOKEN_SIGNING_ALG` - Algorithm used by the IDP to sign the id_token
- `RP_CLIENT_ASSERTION_SIGNING_ALG` - Algorithm used by the RP/this wrapper to sign the client authentication assertion
- `DEBUG` - false or true
- `INTERMEDIARY_PRIVATE_KEY` - "pkcs8 formattted private key - RS256, used by the wrapper to sign the token with RS256 for auth0 connection"
- `INTERMEDIARY_KEY_KID` - "kid for RS256 intermediary"
- `INTERMEDIARY_SIGNING_ALG` - RS256 <for auth0 this is RS256>
- `IDP_JWKS_ENDPOINT` - path of your IDP jwks endpoint relative to the domains based url - /.well-known/jwks.json


Ensure that the `RP_PRIVATE_KEY_RS256` and/or `RP_PRIVATE_KEY_RS512` `INTERMEDIARY_PRIVATE_KEY` `INTERMEDIARY_KEY_KID` and `RP_CLIENT_ASSERTION_SIGNING_ALG`  environment variables are set according to your private key and algorithm used for generating client assertions.

Ensure that the `IDP_TOKEN_SIGNING_ALG` is set to what matches the IDP uses for signing the id_token

In the env file the `RP_PRIVATE_KEY_RS256` or `RP_PRIVATE_KEY_RS512` is the PKCS8 formatted Private key with newlines replaced with `\n` . Example ....-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC1dsvQ6S79NM+U\n...gEFVWzotcHeRbyso8nNEeF10JBPY2qvNOveLsV9WFQhwG6+vFtski1VpjYpucjaN\nadx4UD2Hw8MYvwdkG7BpFA==\n-----END PRIVATE KEY-----\n

The `spkis/relyingPartyJWKS.json` file contains the public key(s) in jwks format that gets exposed as /.well-known/keys for the IDP to use for client assertion verification. If your IDP uses `jwks_uri` for client assertion validation this url can be used or else you can share the public key with them based on that jwks in this file. Make sure you set the contents of this file based on the public keys you have for client asertion validation by the IDP

The `spkis/intermediaryJWKS.json` file contains the public key(s) in jwks format that gets exposed as `/intermediary.jwks` for Auth0 to use for token verification of the RS256 token created in the wrapper

## Use in Auth0 connection ( Example)

Create a connection in auth0 using the Auth0 management API 

Assume your IDP's url is https://idp.com

```
{
  "options": {
    "type": "back_channel",
    "scope": "openid profile email",
    "issuer": "https://idp.com",
    "jwks_uri": "https://<your token wrapper's domain>/intermediary.jwks",
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

