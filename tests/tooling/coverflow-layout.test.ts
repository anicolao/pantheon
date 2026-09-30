import {expect,test} from 'bun:test';
import {coverflowLayout} from '../../src/lib/components/play/coverflow-layout';

test('every pile retains an exposed, disjoint hit region across phone and desktop sizes',()=>{
  for(const width of [300,377,600,864,2304])for(const size of [45,65,100,150])for(let position=0;position<18;position++){
    const cardWidth=Math.min(size,(width-32)/3.8),layout=coverflowLayout(18,position,width,cardWidth);
    expect(layout).toHaveLength(18);
    for(const card of layout){expect(card.hitWidth).toBeGreaterThan(0);expect(card.hitLeft).toBeGreaterThanOrEqual(0);expect(card.hitLeft+card.hitWidth).toBeLessThanOrEqual(width);}
    for(let i=1;i<layout.length;i++)expect(layout[i-1].hitLeft+layout[i-1].hitWidth).toBeLessThanOrEqual(layout[i].hitLeft+.000001);
  }
});

test('the closest card starts at 65 degrees and each stack reaches 90 at its own end',()=>{
  const layout=coverflowLayout(18,8,900,180);
  expect(layout[8].transform).toContain('rotateY(0deg)');
  expect(layout[7].transform).toContain('rotateY(65deg)');
  expect(layout[9].transform).toContain('rotateY(-65deg)');
  expect(layout[0].transform).toContain('rotateY(90deg)');
  expect(layout[17].transform).toContain('rotateY(-90deg)');
});
