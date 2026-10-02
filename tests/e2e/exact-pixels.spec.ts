import {test,expect} from './helpers/fixtures';
import {identicalPixels,preparePixels} from './helpers/exact-pixels';
import sharp from 'sharp';

test('exact comparison ignores lossless encoding differences but rejects a single changed channel',async()=>{
  await test.step('Compare exact pixels within 2,000 ms',async()=>{
    const pixels=Buffer.alloc(8*8*4,255),image=sharp(pixels,{raw:{width:8,height:8,channels:4}});
    const a=await image.clone().png({compressionLevel:0}).toBuffer(),b=await image.clone().png({compressionLevel:9}).toBuffer();
    expect(a.equals(b)).toBe(false);expect(await identicalPixels(a,b)).toBe(true);
    expect(await identicalPixels(a,preparePixels(b))).toBe(true);
    pixels[0]=254;
    const changed=await sharp(pixels,{raw:{width:8,height:8,channels:4}}).png().toBuffer();
    expect(await identicalPixels(a,changed)).toBe(false);
    expect(await identicalPixels(a,preparePixels(changed))).toBe(false);
    const differentDimensions=await image.clone().resize(4,16).png().toBuffer();
    expect(await identicalPixels(a,differentDimensions)).toBe(false);
    expect(await identicalPixels(a,preparePixels(differentDimensions))).toBe(false);
    await expect(identicalPixels(a,preparePixels(Buffer.from('invalid PNG')))).rejects.toThrow();
  },{timeout:2000});
});
