import lyricsData from "./lyricsData.json";

const GOOGLE_DRIVE_FOLDER_ID = "1dTuzWuaoVrPAKVocEq5MrOgsTQvWNZme";

const metadataBySlug = {
  "a-sombra-de-tuas-palavras": {
    title: "A sombra de Tuas Palavras",
    artist: "Filho Varão",
    album: "Coletânea Filho Varão",
    art: "https://teste.png"
  }
};

const createSlug = (fileName) =>
  fileName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const buildUcUrl = (fileId) => `https://drive.google.com/uc?export=download&id=${fileId}`;

const buildAltMediaUrl = (fileId, apiKey) =>
  `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

export const loadMusicDB = async () => {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Configure REACT_APP_GOOGLE_API_KEY para listar os áudios da pasta pública do Google Drive."
    );
  }

  const query = encodeURIComponent(`'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType)");

  const files = [];
  let nextPageToken = "";

  do {
    const pageTokenParam = nextPageToken
      ? `&pageToken=${encodeURIComponent(nextPageToken)}`
      : "";

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields},nextPageToken&orderBy=name&pageSize=1000${pageTokenParam}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error("Não foi possível carregar os arquivos de áudio do Google Drive.");
    }

    const data = await response.json();
    files.push(...(data.files || []));
    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken);

  return files
    .filter((file) => file.mimeType && file.mimeType.startsWith("audio/"))
    .map((file, index) => {
      const slug = createSlug(file.name);
      const metadata = metadataBySlug[slug] || {};

      return {
        id: file.id,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: metadata.artist || "Artista desconhecido",
        album: metadata.album || "Google Drive",
        // Primary src: drive v3 alt=media (returns raw bytes with correct content-type)
        src: buildAltMediaUrl(file.id, apiKey),
        // Fallback src (older uc?export=download style)
        srcAlt: buildUcUrl(file.id),
        art: metadata.art || "https://via.placeholder.com/300x300?text=Album+Art",
        lyrics: lyricsData[slug] || [],
        order: index
      };
    });
};
