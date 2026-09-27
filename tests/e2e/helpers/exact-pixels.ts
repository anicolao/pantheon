import sharp from 'sharp';

/** Decode natively, then compare every RGBA byte. No scaling, color tolerance or masks. */
export async function identicalPixels(actual:Buffer,expected:Buffer):Promise<boolean>{
  const [a,b]=await Promise.all([actual,expected].map(buffer=>sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
  return a.info.width===b.info.width&&a.info.height===b.info.height&&a.info.channels===b.info.channels&&a.data.equals(b.data);
}
