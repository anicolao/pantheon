import sharp from 'sharp';

// Preserve the approved artwork at the size used by the player-count controls.
// A small source avoids inconsistent large-image downsampling in Chromium.
await sharp(new URL('../static/assets/ui/gather-seat.webp', import.meta.url).pathname)
  .resize({ width: 384 })
  .webp({ lossless: true })
  .toFile(new URL('../static/assets/ui/gather-seat-count.webp', import.meta.url).pathname);
