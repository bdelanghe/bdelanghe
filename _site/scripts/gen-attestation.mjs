#!/usr/bin/env node
// Emit a real, verifiable in-toto / SLSA provenance attestation for the build —
// DSSE-signed with ed25519, zero-dep (node:crypto), so the site stays dependency-free
// and nix-clean. Runs AFTER build.mjs (operates on dist/). Writes:
//   dist/attestation.json  — the signed DSSE envelope (hosted at /attestation.json)
//   dist/attestation.pub   — the ed25519 public key (verify the envelope against it)
// Key: $ATTEST_KEY (pkcs8 PEM) for a stable identity; else an ephemeral per-build key
// (still self-verifiable — the matching pubkey is published alongside).
import { readFile, writeFile, access } from "node:fs/promises";
import { createHash, generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

// subject — the built artifacts, by digest (what the attestation is ABOUT)
const subjectFiles = ["index.html", "provenance.html", "resume.html", "blog.html"];
const subject = [];
for (const f of subjectFiles) if (await exists(join(dist, f))) subject.push({ name: f, digest: { sha256: sha256(await readFile(join(dist, f))) } });

// materials — the build inputs, content-addressed where computable
const materials = [];
for (const f of ["data/profile.json", "data/site.json"]) if (await exists(join(root, f))) materials.push({ uri: f, digest: { sha256: sha256(await readFile(join(root, f))) } });
const brandPkg = (await exists(join(root, "brand", "package.json"))) ? JSON.parse(await readFile(join(root, "brand", "package.json"), "utf8")) : {};
if (brandPkg.version) materials.push({ uri: "pkg:jsr/@bounded-systems/brand", version: brandPkg.version });
// the design system itself — tokens (visual) + content strings (verbal), by digest
for (const f of ["brand/tokens/tokens.json", "brand/tokens/tokens.css", "brand/content/strings.json", "brand/css/base.css", "brand/css/fonts.css"])
  if (await exists(join(root, f))) materials.push({ uri: f, digest: { sha256: sha256(await readFile(join(root, f))) } });
const COMMIT = process.env.CF_PAGES_COMMIT_SHA || process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || "";
if (COMMIT) materials.push({ uri: "git+https://github.com/bdelanghe/site", digest: { sha1: COMMIT } });

// in-toto Statement/v1 carrying a SLSA provenance predicate
const statement = {
  _type: "https://in-toto.io/Statement/v1",
  subject,
  predicateType: "https://slsa.dev/provenance/v1",
  predicate: {
    buildDefinition: {
      buildType: "https://robertdelanghe.dev/build/v1",
      externalParameters: { source: "git+https://github.com/bdelanghe/site", commit: COMMIT || "(local)" },
      resolvedDependencies: materials,
    },
    runDetails: {
      builder: { id: "https://github.com/bdelanghe/site/.github/workflows" },
      metadata: { invocationId: COMMIT || "local", finishedOn: new Date().toISOString() },
    },
  },
};

// DSSE: sign the PAE of the payload, attach the signature
const payloadType = "application/vnd.in-toto+json";
const payload = Buffer.from(JSON.stringify(statement), "utf8");
const pae = Buffer.concat([Buffer.from(`DSSEv1 ${Buffer.byteLength(payloadType)} ${payloadType} ${payload.length} `, "utf8"), payload]);

let priv, pub;
if (process.env.ATTEST_KEY) { priv = createPrivateKey(process.env.ATTEST_KEY); pub = createPublicKey(priv); }
else { const kp = generateKeyPairSync("ed25519"); priv = kp.privateKey; pub = kp.publicKey; }
const keyid = sha256(pub.export({ type: "spki", format: "der" })); // sha256 of SPKI DER
const sig = sign(null, pae, priv); // ed25519
if (!verify(null, pae, pub, sig)) { console.error("✗ attestation self-verify failed"); process.exit(1); } // fail-closed

const envelope = { payloadType, payload: payload.toString("base64"), signatures: [{ keyid, sig: sig.toString("base64") }] };
await writeFile(join(dist, "attestation.json"), JSON.stringify(envelope, null, 2) + "\n");
await writeFile(join(dist, "attestation.pub"), pub.export({ type: "spki", format: "pem" }));
console.log(`✓ attestation: ${subject.length} subjects · ${materials.length} materials · keyid ${keyid.slice(0, 12)}…${process.env.ATTEST_KEY ? "" : " (ephemeral key)"}`);
