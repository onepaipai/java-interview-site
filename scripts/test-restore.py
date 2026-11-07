"""Test restore control flow with a fake Docker executable; never touches Docker/data."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parent.parent
bash = sys.argv[1] if len(sys.argv) > 1 else shutil.which('bash')
if not bash:
    raise SystemExit('Pass a Bash executable path as the first argument')
with tempfile.TemporaryDirectory(prefix='interview-restore-') as directory:
    work = Path(directory)
    (work / 'deploy').mkdir()
    (work / 'mock-bin').mkdir()
    backup = work / 'backups/test'
    backup.mkdir(parents=True)
    shutil.copyfile(root / 'deploy/restore.sh', work / 'deploy/restore.sh')
    for name in ['database.sql', 'uploads.tar.gz']:
        (backup / name).write_bytes(b'fixture')
    (backup / 'SHA256SUMS').write_text(''.join(
        hashlib.sha256((backup / name).read_bytes()).hexdigest() + '  ' + name + '\n'
        for name in ['database.sql', 'uploads.tar.gz']), encoding='utf-8', newline='\n')
    docker = work / 'mock-bin/docker'
    docker.write_text('''#!/usr/bin/env bash
echo "$*" >> calls.txt
case "$*" in
  *"exec -T db"*) stage=sql; cat >/dev/null ;;
  *"--entrypoint tar"*) stage=uploads; cat >/dev/null ;;
  *"--entrypoint chown"*) stage=ownership ;;
  *"start backend"*) stage=start ;;
  *) stage=stop ;;
esac
if [ "$FAIL_STAGE" = "$stage" ]; then exit 7; fi
''', encoding='utf-8', newline='\n')
    docker.chmod(0o755)
    for failure in ['sql', 'uploads', 'ownership', 'none']:
        (work / 'calls.txt').write_text('', encoding='utf-8')
        env = dict(os.environ, FAIL_STAGE=failure)
        result = subprocess.run([bash, '-c', 'export PATH="$PWD/mock-bin:$PATH"; bash deploy/restore.sh backups/test'],
                                cwd=work, env=env, input=b'RESTORE\n', capture_output=True)
        calls = (work / 'calls.txt').read_text(encoding='utf-8')
        assert 'stop backend' in calls, (failure, result.stderr)
        if failure == 'none':
            assert result.returncode == 0 and 'start backend' in calls, result.stderr
        else:
            assert result.returncode != 0 and 'start backend' not in calls, calls
            assert b'remains stopped' in result.stderr, result.stderr
        print(f'{failure}: PASS')
