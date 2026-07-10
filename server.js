const express = require("express");
const cors = require("cors");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Modifiez cette variable si le disque ou le NAS change d'emplacement.
const UPLOAD_DIRECTORY = process.env.UPLOAD_DIRECTORY || "/Volumes/Sans titre/MARIAGE";
const PORT = Number(process.env.PORT) || 3000;
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
// 2 Go par vidéo : modifiez cette valeur si vous souhaitez une autre limite.
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".webp"]);
const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp"
]);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm"
]);

if (!fs.existsSync(UPLOAD_DIRECTORY) || !fs.statSync(UPLOAD_DIRECTORY).isDirectory()) {
  console.error(`Erreur : le dossier de destination est introuvable : ${UPLOAD_DIRECTORY}`);
  console.error("Branchez le disque, puis vérifiez le nom du volume et du dossier.");
  process.exit(1);
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, UPLOAD_DIRECTORY),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isImage = ALLOWED_MIME_TYPES.has(file.mimetype)
      && ALLOWED_EXTENSIONS.has(extension);
    const isVideo = ALLOWED_VIDEO_MIME_TYPES.has(file.mimetype)
      && ALLOWED_VIDEO_EXTENSIONS.has(extension);

    if (!isImage && !isVideo) {
      return callback(new Error("Format non autorisé. Images (jpg, jpeg, png, heic, webp) et vidéos (mp4, mov, m4v, webm) uniquement."));
    }

    callback(null, true);
  }
});

const app = express();

// Autorise la page GitHub Pages et les tests locaux. Ajoutez votre futur domaine ici si besoin.
app.use(cors({
  origin(origin, callback) {
    const allowed = !origin
      || origin === "https://nyvzj92t49-hue.github.io"
      || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):8000$/.test(origin);

    callback(allowed ? null : new Error("Origine non autorisée."), allowed);
  },
  methods: ["GET", "POST"]
}));

app.get("/health", (_request, response) => {
  response.json({ ok: true, uploadDirectory: UPLOAD_DIRECTORY });
});

app.get("/media", async (_request, response, next) => {
  try {
    const entries = await fs.promises.readdir(UPLOAD_DIRECTORY, { withFileTypes: true });
    const media = await Promise.all(entries
      .filter((entry) => entry.isFile())
      .filter((entry) => {
        const extension = path.extname(entry.name).toLowerCase();
        return ALLOWED_EXTENSIONS.has(extension) || ALLOWED_VIDEO_EXTENSIONS.has(extension);
      })
      .map(async (entry) => {
        const stats = await fs.promises.stat(path.join(UPLOAD_DIRECTORY, entry.name));
        const extension = path.extname(entry.name).toLowerCase();
        return {
          name: entry.name,
          type: ALLOWED_VIDEO_EXTENSIONS.has(extension) ? "video" : "image",
          createdAt: stats.mtimeMs
        };
      }));

    media.sort((a, b) => b.createdAt - a.createdAt);
    response.json({ media });
  } catch (error) {
    next(error);
  }
});

app.get("/media/:filename", (request, response) => {
  const filename = request.params.filename;
  const extension = path.extname(filename).toLowerCase();
  const validName = filename === path.basename(filename);
  const validExtension = ALLOWED_EXTENSIONS.has(extension) || ALLOWED_VIDEO_EXTENSIONS.has(extension);

  if (!validName || !validExtension) {
    return response.status(404).end();
  }

  response.sendFile(filename, { root: UPLOAD_DIRECTORY, dotfiles: "deny" });
});

app.post("/upload", upload.single("file"), (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: "Aucun fichier reçu." });
  }

  const extension = path.extname(request.file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(extension) && request.file.size > MAX_IMAGE_SIZE) {
    fs.unlink(request.file.path, (error) => {
      if (error) console.error(`Impossible de supprimer le fichier trop grand : ${error.message}`);
    });
    return response.status(413).json({ error: "L'image dépasse la limite de 50 Mo." });
  }

  response.status(201).json({
    message: "Image enregistrée.",
    filename: request.file.filename
  });
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(413).json({ error: "Le fichier dépasse la taille autorisée." });
  }

  console.error(error.message);
  response.status(400).json({ error: error.message || "Erreur lors de l'envoi." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur prêt sur http://0.0.0.0:${PORT}`);
  console.log(`Les images seront enregistrées dans : ${UPLOAD_DIRECTORY}`);
});
