// Usage: node scripts/hash-password.js "YourPasswordHere"
// Outputs a bcrypt hash you can paste into ADMIN_PASSWORD_HASH env var.
const bcrypt = require("bcryptjs");

const pwd = process.argv[2];
if (!pwd) {
  console.error('Usage: node scripts/hash-password.js "YourPasswordHere"');
  process.exit(1);
}

const hash = bcrypt.hashSync(pwd, 10);
console.log(hash);
