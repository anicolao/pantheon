"""Losslessly archive the per-game resume cache for a reviewable GitHub diff."""
import argparse,gzip,hashlib,json,tarfile
from pathlib import Path,PurePosixPath

p=argparse.ArgumentParser();p.add_argument('mode',choices=['pack','unpack']);p.add_argument('--scope',choices=['evaluation','smoke'],default='evaluation');args=p.parse_args()
root=Path('balance-results/league-review-v1')/args.scope;cache=root/'replays';archive=root/'replays.tar.gz';info=root/'archive.json'
expected=18600 if args.scope=='evaluation' else 372
def digest(data):return hashlib.sha256(data).hexdigest()
if args.mode=='pack':
    if archive.exists():raise RuntimeError('Refusing to overwrite frozen replay archive')
    files=sorted(cache.glob('*/*.json.gz'));assert len(files)==expected
    originals={str(f.relative_to(cache)):digest(f.read_bytes()) for f in files}
    temporary=archive.with_suffix('.tmp')
    with temporary.open('wb') as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as compressed,tarfile.open(fileobj=compressed,mode='w|') as tar:
        for f in files:
            entry=tar.gettarinfo(str(f),arcname=str(f.relative_to(cache)))
            entry.mtime=0;entry.uid=entry.gid=0;entry.uname=entry.gname='';entry.mode=0o644
            with f.open('rb') as source:tar.addfile(entry,source)
    restored={}
    with tarfile.open(temporary,'r:gz') as tar:
        for entry in tar:
            assert entry.isfile() and entry.name not in restored
            restored[entry.name]=digest(tar.extractfile(entry).read())
    assert restored==originals,'Archive differs from completed replay cache'
    temporary.rename(archive)
    info.write_text(json.dumps(dict(games=len(files),archiveSHA256=digest(archive.read_bytes()),
        individualFilesSHA256=digest(json.dumps(originals,sort_keys=True).encode()),losslessRoundTripVerified=True),indent=2)+'\n')
else:
    assert digest(archive.read_bytes())==json.loads(info.read_text())['archiveSHA256']
    cache.mkdir(exist_ok=True)
    with tarfile.open(archive,'r:gz') as tar:
        for entry in tar:
            path=PurePosixPath(entry.name)
            assert entry.isfile() and not path.is_absolute() and '..' not in path.parts
            target=cache.joinpath(*path.parts);data=tar.extractfile(entry).read()
            if target.exists():assert target.read_bytes()==data,'Existing replay differs from archive'
            else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print(f'{args.mode}: {expected:,} exact replay files')
