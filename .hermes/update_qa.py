import json
import subprocess
from pathlib import Path

ROOT = Path('/home/ubuntu/ai-dashboard')
STATE_PATH = ROOT / 'data' / 'qa_state.json'

sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=str(ROOT)).decode().strip()
state = {'last_commit': sha, 'last_feature': 'chat-statistics-modal', 'consecutive_empty': 0}

STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
STATE_PATH.write_text(json.dumps(state), encoding='utf-8')
print(json.dumps(state))
