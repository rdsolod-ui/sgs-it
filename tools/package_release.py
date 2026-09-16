"""Create a reproducible, secret-free application archive after npm run build."""
from pathlib import Path
import tarfile,hashlib,shutil,json,subprocess
root=Path(__file__).resolve().parents[1];stage=root/'.local/package';stage.mkdir(parents=True,exist_ok=True)
# This staging directory belongs exclusively to this packager.
for child in stage.iterdir():
 if child.is_dir():shutil.rmtree(child)
 else:child.unlink()
for name in ['dist','dist-server','deploy']:shutil.copytree(root/name,stage/name)
(stage/'server').mkdir();shutil.copy2(root/'server/schema.sql',stage/'server/schema.sql')
for name in ['package.json','package-lock.json']:shutil.copy2(root/name,stage/name)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
(stage/'RELEASE.json').write_text(json.dumps({'commit':commit,'repository':'https://github.com/rdsolod-ui/sgs-it'},indent=2))
files=sorted(p for p in stage.rglob('*') if p.is_file())
(stage/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(stage))+'\n' for p in files))
with tarfile.open(root/'.local/release.tar.gz','w:gz') as archive:
 for p in sorted(stage.rglob('*')):
  if p.is_file():archive.add(p,arcname=str(p.relative_to(stage)))
print('Archive: .local/release.tar.gz; manifest files:',len(files))
