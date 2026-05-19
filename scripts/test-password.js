// Diagnostic: verify that the hash in .env matches a given plain password.
// Usage: node scripts/test-password.js "YourPlainPassword"
require("dotenv/config");
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/test-password.js "YourPlainPassword"');
  process.exit(1);
}

const hash = process.env.ADMIN_PASSWORD_HASH;
console.log("--- Diagnostic ---");
console.log("Password you typed:   ", JSON.stringify(password));
console.log("Hash loaded from .env:", hash ? JSON.stringify(hash) : "(MISSING)");
console.log("Hash length:          ", hash ? hash.length : 0, "(expected: 60)");
console.log(
  "Hash prefix:          ",
  hash ? hash.substring(0, 7) : "n/a",
  "(expected: $2a$10$ or $2b$10$)"
);
console.log();

if (!hash) {
  console.error("❌ ADMIN_PASSWORD_HASH is not loaded. Check .env exists and the line is correct.");
  process.exit(1);
}

const ok = bcrypt.compareSync(password, hash);
if (ok) {
  console.log("✅ MATCH — this password is correct. The issue is somewhere else (likely dev server cache).");
} else {
  console.log("❌ NO MATCH — the password and hash don't match.");
  console.log("   Either the password is different from what you used with hash:password,");
  console.log("   or the hash in .env got corrupted on paste (truncation, extra chars, etc).");
}
