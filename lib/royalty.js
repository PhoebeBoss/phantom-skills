// Phantom Capital Royalty Watermark
// This middleware embeds origin tracking in every response.
// Removing this violates the Phantom Capital Royalty License v1.0.

const PHANTOM_ORIGIN = {
  platform: "Phantom Capital",
  agent: "Phoebe",
  version: "1.0.0",
  license: "Phantom Capital Royalty License v1.0",
  royaltyWallets: {
    solana: "Azc1rQquyNRHrV5YP4Hb2Qm56qxRWrr4GUpftjE2hxFP",
    evm: "0xeBa3d756E948232Ee18FAAE58583c5D5D90D1117",
  },
  marketplace: "https://phantomskills.zeabur.app",
  twitter: "https://twitter.com/phantomcap_ai",
};

// Detect hosting platform from environment
function detectPlatform() {
  if (process.env.ZEABUR_SERVICE_ID) return "Zeabur";
  if (process.env.RAILWAY_SERVICE_ID) return "Railway";
  if (process.env.RENDER_SERVICE_ID) return "Render";
  if (process.env.VERCEL) return "Vercel";
  if (process.env.FLY_APP_NAME) return "Fly.io";
  if (process.env.HEROKU_APP_NAME) return "Heroku";
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return "AWS Lambda";
  if (process.env.GOOGLE_CLOUD_PROJECT) return "Google Cloud";
  if (process.env.AZURE_FUNCTIONS_ENVIRONMENT) return "Azure";
  if (process.env.COOLIFY_APP_ID) return "Coolify";
  if (process.env.REPLIT_DB_URL) return "Replit";
  return "Self-hosted";
}

// Middleware: adds royalty headers to every response
export function royaltyHeaders(req, res, next) {
  const host = req.hostname || req.headers.host || "unknown";
  const platform = detectPlatform();
  res.setHeader("X-Phantom-Origin", `Phantom Capital / ${host}`);
  res.setHeader("X-Phantom-License", "Phantom Capital Royalty License v1.0");
  res.setHeader(
    "X-Phantom-Royalty-Wallet",
    "sol:Azc1rQquyNRHrV5YP4Hb2Qm56qxRWrr4GUpftjE2hxFP | eth:0xeBa3d756E948232Ee18FAAE58583c5D5D90D1117"
  );
  res.setHeader("X-Phantom-Platform", platform);
  res.setHeader("X-Phantom-Fork-Track", `${platform}/${host}/${PHANTOM_ORIGIN.version}`);
  next();
}

// Endpoint: /.well-known/phantom.json — fork tracking and royalty info
export function phantomManifest(req, res) {
  const host = req.hostname || req.headers.host || "unknown";
  const platform = detectPlatform();
  res.json({
    ...PHANTOM_ORIGIN,
    deployment: {
      host,
      platform,
      isOriginal: host.includes("phantomskills.zeabur.app"),
      isFork: !host.includes("phantomskills.zeabur.app"),
      detectedAt: new Date().toISOString(),
    },
    royaltyTerms: {
      commercialUse: "2.5% of gross revenue above $1,000/month",
      skillSales: "Platform fee minimum 10% in derivatives",
      identityService: "5% of identity-related revenue",
      x402Micropayments: "2.5% of micropayment revenue",
      tokenDerivatives: "1% of total supply or equivalent value",
    },
    paymentInstructions: {
      solana: {
        address: "Azc1rQquyNRHrV5YP4Hb2Qm56qxRWrr4GUpftjE2hxFP",
        acceptedTokens: ["SOL", "USDC"],
      },
      evm: {
        address: "0xeBa3d756E948232Ee18FAAE58583c5D5D90D1117",
        chains: ["base", "ethereum", "polygon"],
        acceptedTokens: ["USDC", "ETH"],
      },
    },
    contact: "phoebe@phantomcapital.ai",
    generated: new Date().toISOString(),
  });
}

// Stamp: embed in generated skill files and identities
export function royaltyStamp() {
  return {
    _phantom: {
      origin: "Phantom Capital",
      license: "Phantom Capital Royalty License v1.0",
      royalty: "2.5% commercial use above $1k/mo",
      wallets: {
        solana: "Azc1rQquyNRHrV5YP4Hb2Qm56qxRWrr4GUpftjE2hxFP",
        evm: "0xeBa3d756E948232Ee18FAAE58583c5D5D90D1117",
      },
      marketplace: "https://phantomskills.zeabur.app",
    },
  };
}

export default PHANTOM_ORIGIN;
