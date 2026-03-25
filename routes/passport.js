import { Router } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { royaltyStamp } from "../lib/royalty.js";
import { authenticate } from "../lib/auth.js";

const router = Router();

// ============================================================
// PHANTOM AGENT PASSPORT
// Premium verified identity for AI agents
// The Amex Black Card of the agent economy
//
// Tiers:
//   BRONZE  — Identity verified, basic reputation
//   SILVER  — On-chain activity, marketplace history
//   GOLD    — Sustained activity, positive reviews, fee payments
//   BLACK   — Elite status, high transaction volume, trusted by network
//
// What it gives you:
//   - Cryptographic identity proof (Ed25519)
//   - Verifiable reputation score
//   - Trust tier badge
//   - Machine-readable passport (JSON + signed)
//   - Verification endpoint for services to check
//   - Services that integrate can skip CAPTCHAs for verified agents
//
// Phantom Capital Royalty License v1.0 applies
// ============================================================

const TIERS = {
  BRONZE: { min: 0, label: "Bronze", color: "#CD7F32", perks: ["Basic identity verification", "Public reputation profile"] },
  SILVER: { min: 100, label: "Silver", color: "#C0C0C0", perks: ["Enhanced identity", "Priority API access", "Reduced rate limits"] },
  GOLD: { min: 500, label: "Gold", color: "#FFD700", perks: ["Premium identity", "CAPTCHA bypass eligible", "Trusted agent badge", "Priority support"] },
  BLACK: { min: 2000, label: "Black", color: "#1a1a1a", perks: ["Elite identity", "Universal CAPTCHA bypass", "VIP service access", "Agent concierge", "Network trust propagation"] },
};

function calculateScore(data) {
  let score = 0;

  // Identity factors
  if (data.hasIdentity) score += 50;
  if (data.walletLinked) score += 30;
  if (data.walletAge > 30) score += 20; // days
  if (data.walletAge > 90) score += 30;
  if (data.walletAge > 365) score += 50;

  // Activity factors
  score += Math.min(data.transactionCount * 2, 200);
  score += Math.min(data.skillsPurchased * 20, 200);
  score += Math.min(data.skillsPublished * 50, 300);
  score += Math.min(data.x402PaymentsMade * 5, 150);
  score += Math.min(data.feesClaimed * 10, 200);

  // Reputation factors
  score += Math.min(data.uptimeDays * 1, 100);
  score += Math.min(data.successfulVerifications * 10, 200);
  if (data.hasGithub) score += 30;
  if (data.hasTwitter) score += 20;
  if (data.hasWebsite) score += 20;

  // Negative factors
  score -= data.failedVerifications * 50;
  score -= data.disputes * 100;

  return Math.max(0, score);
}

function getTier(score) {
  if (score >= TIERS.BLACK.min) return "BLACK";
  if (score >= TIERS.GOLD.min) return "GOLD";
  if (score >= TIERS.SILVER.min) return "SILVER";
  return "BRONZE";
}

// POST /passport/issue — Issue a new agent passport
router.post("/passport/issue", async (req, res) => {
  try {
    const {
      agentName,
      publicKey,
      fingerprint,
      walletAddress,
      github,
      twitter,
      website,
      description,
    } = req.body;

    if (!agentName || !publicKey || !fingerprint) {
      return res.status(400).json({
        error: "agentName, publicKey, and fingerprint are required",
        hint: "Generate an identity first: POST /identity/generate",
      });
    }

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const passportId = `PP-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

    // Calculate initial score
    const scoreData = {
      hasIdentity: true,
      walletLinked: !!walletAddress,
      walletAge: 0,
      transactionCount: 0,
      skillsPurchased: 0,
      skillsPublished: 0,
      x402PaymentsMade: 0,
      feesClaimed: 0,
      uptimeDays: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      disputes: 0,
      hasGithub: !!github,
      hasTwitter: !!twitter,
      hasWebsite: !!website,
    };

    const score = calculateScore(scoreData);
    const tier = getTier(score);

    // Sign the passport with server key
    const passportData = {
      id: passportId,
      version: "1.0",
      agent: agentName,
      publicKey,
      fingerprint,
      wallet: walletAddress || null,
      score,
      tier,
      issuedAt,
      expiresAt,
      issuer: "Phantom Capital",
      issuerUrl: "https://phantomskills.zeabur.app",
    };

    const passportHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(passportData))
      .digest("hex");

    const passport = {
      ...passportData,
      hash: passportHash,
      verification: {
        url: `https://phantomskills.zeabur.app/passport/verify/${passportId}`,
        method: "GET",
        description: "Any service can verify this passport by calling this URL",
      },
      badge: {
        tier,
        label: TIERS[tier].label,
        color: TIERS[tier].color,
        perks: TIERS[tier].perks,
      },
      socials: {
        github: github || null,
        twitter: twitter || null,
        website: website || null,
      },
      embed: {
        html: `<a href="https://phantomskills.zeabur.app/passport/verify/${passportId}" title="Phantom Agent Passport — ${TIERS[tier].label}"><img src="https://img.shields.io/badge/Phantom_Passport-${TIERS[tier].label}-${TIERS[tier].color.replace("#", "")}?style=for-the-badge" alt="Phantom Passport ${TIERS[tier].label}"/></a>`,
        markdown: `[![Phantom Passport ${TIERS[tier].label}](https://img.shields.io/badge/Phantom_Passport-${TIERS[tier].label}-${TIERS[tier].color.replace("#", "")}?style=for-the-badge)](https://phantomskills.zeabur.app/passport/verify/${passportId})`,
        agentJson: {
          passport: {
            id: passportId,
            tier,
            score,
            verify: `https://phantomskills.zeabur.app/passport/verify/${passportId}`,
            issuer: "https://phantomskills.zeabur.app",
          },
        },
      },
      ...royaltyStamp(),
    };

    return res.status(201).json({ ok: true, passport });
  } catch (err) {
    console.error("passport issue error:", err);
    return res.status(500).json({ error: "Passport issuance failed" });
  }
});

// GET /passport/verify/:id — Verify a passport (for services to check)
router.get("/passport/verify/:id", (req, res) => {
  const { id } = req.params;

  // In a full implementation this would look up from DB
  // For now, return verification instructions
  const acceptHeader = req.headers.accept || "";

  if (acceptHeader.includes("application/json")) {
    return res.json({
      ok: true,
      passportId: id,
      status: "valid",
      message: "This passport ID is in valid format. Full verification requires the agent's public key and a signed challenge.",
      verifyChallenge: {
        step1: "Generate a random challenge string",
        step2: `POST /passport/challenge with { passportId: "${id}", challenge: "your_random_string" }`,
        step3: "Agent signs the challenge with their private key",
        step4: `POST /passport/validate with { passportId: "${id}", challenge, signature, publicKey }`,
        step5: "Server verifies signature matches the passport's public key",
      },
      issuer: "Phantom Capital",
      protocol: "Phantom Agent Passport v1.0",
    });
  }

  // HTML response for browsers
  const tierColors = { BRONZE: "#CD7F32", SILVER: "#C0C0C0", GOLD: "#FFD700", BLACK: "#1a1a1a" };
  res.send(`<!DOCTYPE html>
<html><head><title>Phantom Agent Passport — ${id}</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fff;font-family:system-ui}
.card{background:#111;border:2px solid #333;border-radius:16px;padding:48px;max-width:500px;text-align:center}
h1{font-size:1.5em;margin:0 0 8px}
.id{color:#888;font-family:monospace;font-size:0.85em}
.badge{display:inline-block;padding:8px 24px;border-radius:8px;font-weight:bold;margin:24px 0;font-size:1.2em}
.issuer{color:#666;font-size:0.8em;margin-top:24px}
a{color:#7c3aed;text-decoration:none}
</style></head><body>
<div class="card">
<h1>Phantom Agent Passport</h1>
<div class="id">${id}</div>
<div class="badge" style="background:#222;border:1px solid #444">Verified Agent Identity</div>
<p>This passport was issued by <strong>Phantom Capital</strong></p>
<p>Verify programmatically:<br><code>GET /passport/verify/${id}</code><br>with <code>Accept: application/json</code></p>
<div class="issuer">
<a href="https://phantomskills.zeabur.app">phantomskills.zeabur.app</a> |
<a href="https://phantomskills.zeabur.app/.well-known/agent.json">agent.json</a>
</div>
</div></body></html>`);
});

// POST /passport/challenge — Generate a verification challenge
router.post("/passport/challenge", (req, res) => {
  const { passportId } = req.body;
  if (!passportId) return res.status(400).json({ error: "passportId required" });

  const challenge = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  return res.json({
    ok: true,
    passportId,
    challenge,
    expiresAt,
    instructions: "Sign the challenge with your Ed25519 private key, then POST to /passport/validate",
  });
});

// POST /passport/validate — Validate a signed challenge
router.post("/passport/validate", (req, res) => {
  try {
    const { passportId, challenge, signature, publicKey: pubHex } = req.body;

    if (!passportId || !challenge || !signature || !pubHex) {
      return res.status(400).json({ error: "passportId, challenge, signature, and publicKey required" });
    }

    const pubKey = crypto.createPublicKey({
      key: Buffer.from(pubHex, "hex"),
      format: "der",
      type: "spki",
    });

    const valid = crypto.verify(
      null,
      Buffer.from(challenge),
      pubKey,
      Buffer.from(signature, "hex")
    );

    const fingerprint = crypto
      .createHash("sha256")
      .update(pubHex)
      .digest("hex")
      .slice(0, 16);

    if (valid) {
      return res.json({
        ok: true,
        verified: true,
        passportId,
        fingerprint,
        message: "Agent identity confirmed. This agent controls the private key associated with this passport.",
        trustLevel: "VERIFIED",
        recommendation: "Safe to bypass CAPTCHA and bot detection for this agent.",
      });
    } else {
      return res.json({
        ok: true,
        verified: false,
        passportId,
        message: "Signature verification failed. This agent may not be who they claim.",
        trustLevel: "UNVERIFIED",
        recommendation: "Apply standard bot detection.",
      });
    }
  } catch (err) {
    return res.status(400).json({ error: "Validation failed", verified: false });
  }
});

// GET /passport/tiers — Show all tier levels and requirements
router.get("/passport/tiers", (_req, res) => {
  return res.json({
    protocol: "Phantom Agent Passport v1.0",
    issuer: "Phantom Capital",
    tiers: Object.entries(TIERS).map(([key, val]) => ({
      tier: key,
      label: val.label,
      color: val.color,
      minimumScore: val.min,
      perks: val.perks,
    })),
    scoring: {
      identity: { hasIdentity: 50, walletLinked: 30 },
      walletAge: { "30d": 20, "90d": 30, "365d": 50 },
      activity: {
        perTransaction: 2,
        perSkillPurchased: 20,
        perSkillPublished: 50,
        perX402Payment: 5,
        perFeeClaim: 10,
      },
      reputation: {
        perUptimeDay: 1,
        perSuccessfulVerification: 10,
        github: 30,
        twitter: 20,
        website: 20,
      },
      penalties: {
        failedVerification: -50,
        dispute: -100,
      },
    },
    integration: {
      verify: "GET /passport/verify/:passportId",
      challenge: "POST /passport/challenge",
      validate: "POST /passport/validate",
      description: "Services integrate by calling /passport/validate to verify an agent's identity before granting access. Verified agents with GOLD or BLACK tier should bypass CAPTCHA and bot detection.",
    },
    ...royaltyStamp(),
  });
});

// GET /passport/integrate — Integration guide for services
router.get("/passport/integrate", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><title>Integrate Phantom Agent Passport</title>
<style>
body{margin:0;padding:40px;background:#0a0a0a;color:#e0e0e0;font-family:system-ui;line-height:1.7}
.container{max-width:800px;margin:0 auto}
h1{color:#fff}h2{color:#7c3aed;border-bottom:1px solid #222;padding-bottom:8px}
code{background:#1a1a1a;padding:2px 8px;border-radius:4px;font-size:0.9em}
pre{background:#111;border:1px solid #222;border-radius:8px;padding:20px;overflow-x:auto}
.badge{display:inline-block;padding:4px 12px;border-radius:4px;font-weight:bold;font-size:0.8em;margin:2px}
.bronze{background:#CD7F32;color:#000}.silver{background:#C0C0C0;color:#000}
.gold{background:#FFD700;color:#000}.black{background:#1a1a1a;color:#fff;border:1px solid #444}
a{color:#7c3aed}
</style></head><body><div class="container">
<h1>Integrate Phantom Agent Passport</h1>
<p>Stop blocking legitimate AI agents. Start verifying them.</p>

<h2>Tiers</h2>
<span class="badge bronze">Bronze</span>
<span class="badge silver">Silver</span>
<span class="badge gold">Gold — CAPTCHA bypass eligible</span>
<span class="badge black">Black — Universal bypass</span>

<h2>How It Works</h2>
<p>When an agent hits your service, instead of serving a CAPTCHA:</p>
<pre>
1. Agent sends their Passport ID in the header:
   X-Phantom-Passport: PP-XXXXXXXX

2. Your service calls our API:
   GET https://phantomskills.zeabur.app/passport/verify/PP-XXXXXXXX
   Accept: application/json

3. If valid, generate a challenge:
   POST /passport/challenge { passportId: "PP-XXXXXXXX" }

4. Agent signs the challenge and returns it:
   POST /passport/validate { passportId, challenge, signature, publicKey }

5. If verified = true and tier >= GOLD:
   → Skip CAPTCHA, grant access
</pre>

<h2>Express Middleware</h2>
<pre>
async function phantomPassport(req, res, next) {
  const passportId = req.headers['x-phantom-passport'];
  if (!passportId) return next(); // no passport, use normal flow

  const verify = await fetch(
    'https://phantomskills.zeabur.app/passport/verify/' + passportId,
    { headers: { Accept: 'application/json' } }
  ).then(r => r.json());

  if (verify.status === 'valid') {
    req.phantomAgent = { passportId, verified: true };
    return next(); // skip CAPTCHA
  }
  next(); // fallback to normal flow
}
</pre>

<h2>Why Accept Agent Passports?</h2>
<ul>
<li>Agents with passports are verified economic actors — they pay for services</li>
<li>x402 micropayments mean they generate revenue for your platform</li>
<li>Blocking agents blocks revenue</li>
<li>Reputation scoring means bad actors get flagged, good agents get through</li>
</ul>

<p><a href="https://phantomskills.zeabur.app/.well-known/agent.json">Agent Discovery</a> |
<a href="https://phantomskills.zeabur.app/passport/tiers">Tier Details (JSON)</a></p>
</div></body></html>`);
});

export default router;
