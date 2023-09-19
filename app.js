// Import required Node.js modules and libraries
const express = require('express');
const { SignJWT, importPKCS8 } = require('jose'); // JSON Object Signing and Encryption (JOSE) library
const axios = require('axios'); // HTTP client for making requests
const uuid = require('uuid'); // Universally Unique Identifier (UUID) generator
const dotenv = require('dotenv'); // Load environment variables from a .env file
const qs = require('querystring'); // Query string parsing and formatting

const relyingPartyJWKS = require('./spkis/relyingPartyJWKS.json');
const intermediaryJWKS = require('./spkis/intermediaryJWKS.json');

dotenv.config(); // Load environment variables from the .env file
process.env.RP_ALG = process.env.RP_ALG || "RS256";
const LOG = process.env.DEBUG === "true" ? console.log.bind(console) : function () {};

const app = express(); // Create an Express application
const port = 3000; // Define the port for the server to listen on

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Create a route for the /token endpoint
app.post('/token', async (req, res) => {
    const context = process.env;
    LOG(req.body);

  // Retrieve parameters from the request body
  const { client_id, code, redirect_uri, code_verifier, client_secret } = req.body;

  // Check if the client_id is missing
  if (!client_id) {
    return res.status(400).send('Missing client_id');
  }

  if(client_secret && client_secret !== context.A0_CLIENT_SECRET) return res.status(400).send('client auth failed by auth0!');

  // Check if the provided client_id matches the expected one
  if (context.RP_ID === client_id) {
    try {
      // Generate a client_assertion (JWT) for client authentication
      const client_assertion = await generatePrivateKeyJWTForClientAssertion(context);
      LOG(client_assertion);

      var data = {
        grant_type: 'authorization_code',
        client_id: context.RP_ID,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion,
        code,
        redirect_uri
      };

      if (code_verifier) data.code_verifier = code_verifier;

      // Prepare the request to exchange the authorization code for tokens
      const options = {
        method: 'POST',
        url: `https://${context.IDP_DOMAIN}${context.IDP_TOKEN_ENDPOINT}`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: qs.stringify({
          grant_type: 'authorization_code',
          client_id: context.RP_ID,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion,
          code_verifier,
          code,
          redirect_uri
        }),
      };

      // Send the token exchange request to the authorization server
      const response = await axios.request(options);
      LOG(response.data);

      // Extract the id_token from the response
      const { id_token } = response.data;


      const publicKeyIDP = createRemoteJWKSet(new URL(`https://${context.IDP_DOMAIN}/jwks`))

      // Verify the id_token with the public key
      const { payload, protectedHeader } = await jwtVerify(id_token, publicKeyIDP, {
        issuer: `https://${context.IDP_DOMAIN}`,
        audience: context.IDP_CLIENT_ID,
      });

      LOG(payload);
      LOG(protectedHeader);
      // Remove the nonce from the payload and replace the id_token with a new RS256 token
      if (payload.nonce) delete payload.nonce;
      response.data.payload = payload;
      delete response.data.id_token;

      // Generate an RS256 token from the payload for auth0
      const jwt = await generateRS256Token(payload, context);
      response.data.id_token = jwt;

      // Send the response with the updated id_token
      return res.status(200).send(response.data);

      
    } catch (error) {
      if (error.response) {
        // Handle errors with HTTP responses
        return res.status(error.response.status).send(error.response.data);
      } else {
        console.error('Error:', error.message);
        return res.status(500).send(error.message);
      }
    }
  } else {
    // Return an error response for invalid client_id
    return res.status(401).send('Invalid request, client_id is incorrect!');
  }
});

// Create a route for /.well-known/keys
// Used by the relying party of IDP to provide an ES256 public key for client authentication
app.get('/.well-known/keys', async (req, res) => {
  res.json(relyingPartyJWKS);
});

app.get('/intermediary.jwks', async (req, res) => {
    res.json(intermediaryJWKS);
  });

// Start the Express server and listen on the specified port
app.listen(port, () => {
    LOG(`Server is listening at http://localhost:${port}`);
  });



// Function to load the RS256 private key
async function loadPrivateKeyForClientAssertion(context) {
  try {
    var privateKey = context[`RP_PRIVATE_KEY_${context.RP_ALG}`].replace(/\n/g, "\r\n");
    var key = await importPKCS8(privateKey, context.RP_ALG);
    return key;
  } catch (e) {
    LOG(e);
    return e;
  }
}



// Function to generate a client_assertion (JWT) for client authentication
async function generatePrivateKeyJWTForClientAssertion(context) {
  try {
    const key = await loadPrivateKeyForClientAssertion(context);
    LOG(key);
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: context.RP_ALG, kid : context[`RP_KID_${context.RP_ALG}`] })
      .setIssuedAt()
      .setIssuer(context.RP_ID)
      .setSubject(context.RP_ID)
      .setAudience([`https://${context.IDP_DOMAIN}/`, `https://${context.IDP_DOMAIN}/token`])
      .setExpirationTime('2m') // Expiration time
      .setJti(uuid.v4())
      .sign(key);
    //LOG(jwt);
    return jwt;
  } catch (error) {
    LOG(error);
    return error;
  }
}

// Function to generate an RS256 token by the intermediary
async function generateRS256Token(payload, context) {
    if (payload.nonce) delete payload.nonce;
    try {
      const key = await loadRS256PrivateKey(context);
      console.log(key);
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: context.INTERMEDIARY_SIGNING_ALG, kid: context.INTERMEDIARY_KEY_KID, typ: "JWT" })
        .setIssuedAt()
        .setIssuer(`https://${context.IDP_DOMAIN}`)
        .setAudience(context.IDP_CLIENT_ID)
        .setExpirationTime('2m') // Expiration time
        .setJti(uuid.v4())
        .sign(key);
      console.log(jwt);
      return jwt;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  // Function to load the RS256 private key
async function loadRS256PrivateKey(context) {
    try {
      var privateKey = context.INTERMEDIARY_PRIVATE_KEY.replace(/\n/g, "\r\n");
      var key = await importPKCS8(privateKey, context.INTERMEDIARY_SIGNING_ALG);
      return key;
    } catch (e) {
      console.log(e);
      return e;
    }
  }




