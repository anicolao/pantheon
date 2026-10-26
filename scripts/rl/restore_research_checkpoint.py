"""Restore a checksum-verified research archive without overwriting different files."""
import argparse,gzip,hashlib,json,tarfile
from pathlib import Path,PurePosixPath
p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('archive',type=Path);p.add_argument('--destination',type=Path,default=Path('.'));a=p.parse_args()
meta=json.loads((a.manifest/'archive.json').read_text());files=json.loads(gzip.decompress((a.manifest/'files.json.gz').read_bytes()))
with a.archive.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==meta['sha256'],'Archive checksum mismatch'
seen=set()
with tarfile.open(a.archive,'r:gz') as tar:
 for m in tar:
  name=PurePosixPath(m.name);assert m.isfile() and not name.is_absolute() and '..' not in name.parts and m.name in files and m.name not in seen
  data=tar.extractfile(m).read();assert hashlib.sha256(data).hexdigest()==files[m.name]['sha256']
  target=a.destination.joinpath(*name.parts)
  if target.exists():assert target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest()==files[m.name]['sha256'],f'Refusing to overwrite changed file: {target}'
  else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
  seen.add(m.name)
assert seen==set(files),'Incomplete archive'
print(f'Verified/restored {len(seen)} files into {a.destination}')
