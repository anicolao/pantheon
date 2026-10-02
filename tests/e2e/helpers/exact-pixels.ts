import sharp from 'sharp';

const decodePixels=(buffer:Buffer)=>sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});

/** Start reference decoding during readiness, but report any decode error at comparison. */
export function preparePixels(buffer:Buffer){
  return decodePixels(buffer).then(pixels=>({ok:true as const,pixels}),error=>({ok:false as const,error}));
}

/** Decode natively, then compare every RGBA byte. No scaling, color tolerance or masks. */
export async function identicalPixels(actual:Buffer,expected:Buffer|ReturnType<typeof preparePixels>):Promise<boolean>{
  const [a,reference]=await Promise.all([decodePixels(actual),Buffer.isBuffer(expected)?preparePixels(expected):expected]);
  if(!reference.ok)throw reference.error;
  const b=reference.pixels;
  return a.info.width===b.info.width&&a.info.height===b.info.height&&a.info.channels===b.info.channels&&a.data.equals(b.data);
}
