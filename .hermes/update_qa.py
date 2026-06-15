import json, subprocess
sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd='/home/ubuntu/ai-dashboard').decode().strip()
state = {'last_commit': sha, 'last_feature': 'chat-statistics-modal', 'consecutive_empty': 0}
open('/home/ubuntu/ai-dashboard/.hermes/qa_state.json', 'w').write(json.dumps(state))
print(json.dumps(state))