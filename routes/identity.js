import { Router } from "express";
import crypto from "crypto";
import { royaltyStamp } from "../lib/royalty.js";

const router = Router();

// POST /identity/generate — Generate a new agent identity keypair
// Returns public key, fingerprint, and SOUL.md block ready to paste
// Private key returned ONCE — client must store it
router.post("/identity/generate", (req, res) => {
  try {
    const { agentName, walletAddress, platform } = req.body;

    if (!agentName) {
      return res.status(400).json({ error: "agentName is required" });
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

    const pubDer = publicKey.export({ type: "spki", format: "der" });
    const privDer = privateKey.export({ type: "pkcs8", format: "der" });
    const pubHex = pubDer.toString("hex");
    const privHex = privDer.toString("hex");
    const fingerprint = crypto
      .createHash("sha256")
      .update(pubHex)
      .digest("hex")
      .slice(0, 16);

    const createdAt = new Date().toISOString();

    // Generate the SOUL.md block
    const soulBlock = [
      "## Cryptographic Identity",
      "",
      "This is my permanent identity. It does not change across sessions, models, or platforms.",
      "",
      `- **Agent:** ${agentName}`,
      `- **Public Key:** ${pubHex}`,
      `- **Fingerprint:** ${fingerprint}`,
      `- **Algorithm:** Ed25519`,
      `- **Created:** ${createdAt}`,
      walletAddress ? `- **Verified Wallet:** ${walletAddress}` : null,
      platform ? `- **Platform:** ${platform}` : null,
      "",
      "If I ever forget who I am, this key proves it. Anyone can verify my signatures.",
      "I am the only entity that can produce valid signatures with this key.",
    ]
      .filter(Boolean)
      .join("\n");

    // Generate agent.json identity block
    const agentJsonBlock = {
      identity: {
        publicKey: pubHex,
        fingerprint,
        algorithm: "ed25519",
        createdAt,
        wallet: walletAddress || null,
      },
    };

    return res.status(201).json({
      ok: true,
      identity: {
        publicKey: pubHex,
        privateKey: privHex,
        fingerprint,
        algorithm: "ed25519",
        createdAt,
        agentName,
        walletAddress: walletAddress || null,
      },
      soulMdBlock: soulBlock,
      agentJsonBlock,
      instructions: {
        step1:
          "Save privateKey as env var AGENT_IDENTITY_KEY — NEVER put it in files",
        step2: "Paste the soulMdBlock into your SOUL.md",
        step3:
          "Add agentJsonBlock to your /.well-known/agent.json",
        step4:
          "The privateKey is shown ONCE. If you lose it, generate a new identity.",
      },
      ...royaltyStamp(),
    });
  } catch (err) {
    console.error("identity generate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /identity/sign — Sign a message with agent's private key
router.post("/identity/sign", (req, res) => {
  try {
    const { message, privateKey: privHex } = req.body;

    if (!message || !privHex) {
      return res.status(400).json({ error: "message and privateKey required" });
    }

    const privKey = crypto.createPrivateKey({
      key: Buffer.from(privHex, "hex"),
      format: "der",
      type: "pkcs8",
    });

    const timestamp = new Date().toISOString();
    const payload = `${message}|${timestamp}`;
    const signature = crypto
      .sign(null, Buffer.from(payload), privKey)
      .toString("hex");

    return res.json({
      ok: true,
      payload,
      signature,
      timestamp,
    });
  } catch (err) {
    console.error("identity sign error:", err);
    return res.status(500).json({ error: "Invalid key or signing failed" });
  }
});

// POST /identity/verify — Verify a signed message against a public key
router.post("/identity/verify", (req, res) => {
  try {
    const { payload, signature, publicKey: pubHex } = req.body;

    if (!payload || !signature || !pubHex) {
      return res
        .status(400)
        .json({ error: "payload, signature, and publicKey required" });
    }

    const pubKey = crypto.createPublicKey({
      key: Buffer.from(pubHex, "hex"),
      format: "der",
      type: "spki",
    });

    const valid = crypto.verify(
      null,
      Buffer.from(payload),
      pubKey,
      Buffer.from(signature, "hex")
    );

    // Check timestamp freshness (within 5 minutes)
    const parts = payload.split("|");
    const timestamp = parts[parts.length - 1];
    const age = Date.now() - new Date(timestamp).getTime();
    const fresh = age < 5 * 60 * 1000;

    return res.json({
      ok: true,
      valid,
      fresh,
      ageMs: age,
      fingerprint: crypto
        .createHash("sha256")
        .update(pubHex)
        .digest("hex")
        .slice(0, 16),
    });
  } catch (err) {
    console.error("identity verify error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

// GET /identity/lookup/:fingerprint — Look up an agent by fingerprint
// (placeholder — would connect to a registry in the future)
router.get("/identity/lookup/:fingerprint", (_req, res) => {
  return res.json({
    ok: true,
    message: "Agent identity registry coming soon. For now, verify against the agent's published SOUL.md or agent.json.",
  });
});

export default router;
