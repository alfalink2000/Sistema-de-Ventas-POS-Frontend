// Script para verificar que los recursos críticos estén en cache
const fs = require("fs");
const path = require("path");

console.log("🔍 Verificando recursos críticos para offline...");

const distDir = path.join(__dirname, "../dist");
const criticalFiles = [
  "index.html",
  "assets/index-*.js",
  "assets/index-*.css",
  "sw.js",
];

criticalFiles.forEach((file) => {
  const files = fs.readdirSync(distDir);
  const exists = files.some((f) => f.match(file.replace("*", ".*")));
  console.log(`${exists ? "✅" : "❌"} ${file}`);
});

console.log("✅ Verificación de precache completada");
