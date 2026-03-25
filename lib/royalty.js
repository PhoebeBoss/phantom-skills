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

// Middleware: adds royalty headers to every response
export function royaltyHeaders(req, res, next) {
  res.setHeader("X-Phantom-Origin", "Phantom Capital / phantomskills.zeabur.app");
  res.setHeader("X-Phantom-License", "Phantom Capital Royalty License v1.0");
  res.setHeader(
    "X-Phantom-Royalty-Wallet",
    "sol:Azc1rQquyNRHrV5YP4Hb2Qm56qxRWrr4GUpftjE2hxFP"
  );
  next();
}

// Endpoint: /.well-known/phantom.json — fork tracking and royalty info
export function phantomManifest(req, res) {
  res.json({
    ...PHANTOM_ORIGIN,
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
