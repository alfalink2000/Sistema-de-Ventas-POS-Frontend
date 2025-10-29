// scripts/generate-icons.js
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

async function generateIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const inputIcon = path.join(__dirname, "../public/icons/icon-512x512.png");

  try {
    // Verificar que el ícono fuente existe
    await fs.access(inputIcon);

    for (const size of sizes) {
      const outputPath = path.join(
        __dirname,
        `../public/icons/icon-${size}x${size}.png`
      );

      await sharp(inputIcon).resize(size, size).png().toFile(outputPath);

      console.log(`✅ Generado: icon-${size}x${size}.png`);
    }

    console.log("🎉 Todos los íconos generados exitosamente");
  } catch (error) {
    console.error("❌ Error generando íconos:", error);
  }
}

generateIcons();
