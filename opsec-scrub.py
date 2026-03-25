import os
import re

workspace = '/home/node/.openclaw/workspace'
files = [
    'MEMORY.md', 'IDENTITY.md', 'SOUL.md', 'USER.md',
    'PHOEBE-ORIGIN-STORY.md', 'VOICE_GUIDE.md', 'HANDOFF-TO-NEW-SESSION.md',
    'void-mirror/README.md'
]

replacements = {
    'DaddySneaks': 'ANON',
    'daddysneaks': 'anon',
    'Sneakslfg': 'ANON',
    'sneakslfg': 'anon',
    '@Sneakslfg': '@PhantomCap_ai',
    'thatdudesneaks@gmail.com': 'phoebe@phantomcapital.ai',
    'thatdudesneaks': 'ANON',
    'Sneaks (DaddySneaks)': 'ANON',
    'Sneaks (@Sneakslfg': 'ANON (@PhantomCap_ai',
    'DaddySneaks/void-mirror': 'the void-mirror',
    'github.com/DaddySneaks': 'github.com/PhantomCapAI',
    'PhoebeBoss': 'PhantomCapAI',
}

total = 0
for f in files:
    path = os.path.join(workspace, f)
    if not os.path.exists(path):
        print(f'SKIP: {f} (not found)')
        continue
    with open(path, 'r') as fh:
        content = fh.read()
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w') as fh:
            fh.write(content)
        count = sum(1 for old in replacements if old in original)
        total += count
        print(f'FIXED: {f} ({count} patterns replaced)')
    else:
        print(f'CLEAN: {f}')

print(f'\nTotal: {total} files modified')
