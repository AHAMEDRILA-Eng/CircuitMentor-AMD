import os

search_dirs = [
    r"C:\Anti-gravity\CircuitMentor\frontend\src",
    r"C:\Anti-gravity\CircuitMentor\backend"
]
for search_dir in search_dirs:
    for root, dirs, files in os.walk(search_dir):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '.next', '__pycache__')]
        for f in files:
            if f.endswith(('.ts', '.tsx', '.py', '.json')):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        for i, line in enumerate(file):
                            if 'image' in line:
                                print(f"{f}:{i+1}: {line.strip()}")
                except Exception as e:
                    pass
print("Done search.")
