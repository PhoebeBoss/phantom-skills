import express from "express";
import cron from "node-cron";
import { retryFailedPayouts } from "./jobs/retryFailedPayouts.js";

import listRoutes from "./routes/skills/list.js";
import createRoutes from "./routes/skills/create.js";
import verifyResultRoutes from "./routes/skills/verifyResult.js";
import checkoutRoutes from "./routes/skills/checkout.js";
import successRoutes from "./routes/skills/success.js";
import leaderboardRoutes from "./routes/skills/leaderboard.js";
import authRoutes from "./routes/auth/register.js";
import payoutCalculateRoutes from "./routes/creator/payout/calculate.js";
import payoutExecuteRoutes from "./routes/creator/payout/execute.js";
import stripeWebhookRoutes from "./routes/webhooks/stripe.js";
import identityRoutes from "./routes/identity.js";
import cryptoRoutes from "./routes/crypto.js";
import passportRoutes from "./routes/passport.js";
import canvasRoutes from "./routes/canvas.js";
import sitemapRoutes from "./routes/sitemap.js";
import x402PaidRoutes from "./routes/x402/paid.js";
import agentRoutes from "./routes/agent.js";
import { royaltyHeaders, phantomManifest } from "./lib/royalty.js";
import rateLimit from "./lib/rateLimit.js";
import landingRoutes from "./routes/landing.js";
import honeypotRoutes from "./routes/honeypots.js";

const app = express();
app.disable("x-powered-by");

// Rate limiting (100 req/min per IP)
app.use(rateLimit);

// Royalty watermark on every response
app.use(royaltyHeaders);

// Honeypot endpoints (must be early to catch scanners)
app.use(honeypotRoutes);

// SEO
app.use(sitemapRoutes);

// Royalty manifest for fork tracking
app.get("/.well-known/phantom.json", phantomManifest);

// Raw body for webhook signature verification (must come before json parser)
app.use((req, res, next) => {
  if (
    req.path === "/webhooks/stripe" ||
    req.path.endsWith("/verify-result")
  ) {
    express.raw({ type: "application/json" })(req, res, (err) => {
      if (err) return next(err);
      req.rawBody = req.body;
      req.body = JSON.parse(req.body);
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

// Agent discovery
app.use(agentRoutes);

// x402 paid routes (served without payment gate for now — gate activates when facilitator is available)
app.use(x402PaidRoutes);

// x402 micropayment middleware (lazy load, non-blocking)
try {
  import("./lib/x402.js")
    .then(({ setupX402 }) => setupX402(app))
    .then(() => console.log("[x402] Payment gate active"))
    .catch((err) => {
      console.warn("[x402] Payment gate not active:", err.message);
    });
} catch (err) {
  console.warn("[x402] Skipped:", err.message);
}

// Identity + Crypto services
app.use(identityRoutes);
app.use(cryptoRoutes);
app.use(passportRoutes);
app.use(canvasRoutes);

// Free routes
app.use(listRoutes);
app.use(createRoutes);
app.use(verifyResultRoutes);
app.use(checkoutRoutes);
app.use(successRoutes);
app.use(leaderboardRoutes);
app.use(authRoutes);
app.use(payoutCalculateRoutes);
app.use(payoutExecuteRoutes);
app.use(stripeWebhookRoutes);

// Landing page
app.use(landingRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Hourly cron: retry failed payouts
const payoutCron = process.env.PAYOUT_RETRY_CRON || "0 * * * *";
cron.schedule(payoutCron, () => {
  retryFailedPayouts().catch((err) =>
    console.error("[cron] retryFailedPayouts error:", err)
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`phantom-skills API running on port ${PORT}`);
});

export default app;
