#!/usr/bin/env python3
"""Erzeugt projects.json: listet alle Projekt-Unterordner (mit optionaler meta.json)."""
import json, os, datetime, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"scripts", "assets", "node_modules"}
SHOW_EXT = (".html", ".pdf", ".docx", ".pptx", ".xlsx", ".zip", ".png", ".jpg", ".svg")

def last_change(path):
    try:
        out = subprocess.check_output(["git", "log", "-1", "--format=%cI", "--", path], cwd=ROOT, text=True).strip()
        return out or None
    except Exception:
        return None

projects = []
for name in sorted(os.listdir(ROOT)):
    p = os.path.join(ROOT, name)
    if not os.path.isdir(p) or name.startswith((".", "_")) or name in SKIP:
        continue
    meta = {}
    mp = os.path.join(p, "meta.json")
    if os.path.exists(mp):
        try:
            with open(mp, encoding="utf-8") as f:
                meta = json.load(f)
        except Exception:
            meta = {}
    if meta.get("hidden"):
        continue
    files = sorted(f for f in os.listdir(p) if f.lower().endswith(SHOW_EXT) and f != "index.html")
    projects.append({
        "folder": name,
        "title": meta.get("title") or name.replace("-", " ").replace("_", " ").title(),
        "description": meta.get("description", ""),
        "icon": meta.get("icon", "📁"),
        "tags": meta.get("tags", []),
        "hasIndex": os.path.exists(os.path.join(p, "index.html")),
        "files": files,
        "updated": last_change(name),
    })

data = {"generated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "projects": projects}
with open(os.path.join(ROOT, "projects.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"{len(projects)} Projekt(e) eingetragen.")
