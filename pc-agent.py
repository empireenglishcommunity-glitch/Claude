import os,json,shutil,time,subprocess,urllib.request,urllib.error
from datetime import datetime
from pathlib import Path

SERVER = "https://bot.empireenglish.online"
POLL_URL = SERVER + "/webhook/pc-agent-poll"
RESULT_URL = SERVER + "/webhook/pc-agent-result"
DESKTOP = Path(r"C:\Users\97150\OneDrive\Desktop")
DOWNLOADS = Path(os.path.expanduser("~/Downloads"))
POLL_INTERVAL = 10

FILE_CATEGORIES = {
    "Images": [".jpg",".jpeg",".png",".gif",".webp",".svg",".bmp"],
    "Documents": [".pdf",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".txt",".rtf"],
    "Videos": [".mp4",".mkv",".avi",".mov",".wmv"],
    "Audio": [".mp3",".wav",".flac",".aac",".ogg"],
    "Archives": [".zip",".rar",".7z",".tar",".gz"],
    "Code": [".py",".js",".ts",".html",".css",".json",".bat",".ps1"],
    "Installers": [".exe",".msi"],
    "Data": [".csv",".sql",".db",".sqlite"],
}

def get_category(ext):
    for cat, exts in FILE_CATEGORIES.items():
        if ext.lower() in exts:
            return cat
    return "Other"

def list_desktop(params=None):
    items = [{"name": i.name, "type": "folder" if i.is_dir() else "file"} for i in DESKTOP.iterdir()]
    return {"items": items, "count": len(items)}

def clean_desktop(params=None):
    moved, kept = [], []
    for item in DESKTOP.iterdir():
        if item.is_dir() or item.suffix.lower() == ".lnk" or item.name == "desktop.ini" or item.name.startswith("~$"):
            kept.append(item.name)
            continue
        cat = get_category(item.suffix)
        td = DESKTOP / "Sorted" / cat
        try:
            td.mkdir(parents=True, exist_ok=True)
            t = td / item.name
            if t.exists():
                t = td / (item.stem + "_" + datetime.now().strftime("%H%M%S") + item.suffix)
            shutil.move(str(item), str(t))
            moved.append(item.name + " -> Sorted/" + cat)
        except:
            pass
    return {"moved": len(moved), "kept": len(kept), "details": moved[:20]}

def organize_downloads(params=None):
    moved = []
    for item in DOWNLOADS.iterdir():
        if item.is_dir():
            continue
        cat = get_category(item.suffix)
        td = DOWNLOADS / cat
        try:
            td.mkdir(exist_ok=True)
            t = td / item.name
            if t.exists():
                t = td / (item.stem + "_" + datetime.now().strftime("%H%M%S") + item.suffix)
            shutil.move(str(item), str(t))
            moved.append(item.name + " -> " + cat)
        except:
            pass
    return {"moved": len(moved), "details": moved[:20]}

def run_command(params=None):
    if not params:
        params = {}
    cmd = params.get("cmd", "echo hello")
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        return {"stdout": r.stdout[:3000], "stderr": r.stderr[:1000], "code": r.returncode}
    except subprocess.TimeoutExpired:
        return {"error": "timeout"}
    except Exception as e:
        return {"error": str(e)}

def health(params=None):
    return {"status": "ok", "time": datetime.now().isoformat(), "hostname": os.environ.get("COMPUTERNAME", "unknown")}

TASKS = {
    "list_desktop": list_desktop,
    "clean_desktop": clean_desktop,
    "organize_downloads": organize_downloads,
    "run_command": run_command,
    "health": health,
}

def poll():
    try:
        req = urllib.request.Request(POLL_URL, headers={"User-Agent": "EmpireAgent/1.0"})
        r = urllib.request.urlopen(req, timeout=15)
        data = json.loads(r.read())
        return data.get("tasks", [])
    except:
        return []

def report(task_id, result):
    try:
        body = json.dumps({"task_id": task_id, "result": result}).encode()
        req = urllib.request.Request(RESULT_URL, data=body, headers={"Content-Type": "application/json", "User-Agent": "EmpireAgent/1.0"})
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:
        print(f"  Report failed: {e}")

if __name__ == "__main__":
    print("Empire PC Agent (Polling Mode)")
    print(f"Server: {SERVER}")
    print(f"Desktop: {DESKTOP}")
    print(f"Downloads: {DOWNLOADS}")
    print(f"Poll interval: {POLL_INTERVAL}s")
    print(f"Available tasks: {list(TASKS.keys())}")
    print("Polling...")
    while True:
        tasks = poll()
        for t in tasks:
            tid = t.get("id", "?")
            tname = t.get("task", "health")
            tparams = t.get("params", {})
            now = datetime.now().strftime("%H:%M:%S")
            print(f"[{now}] Task: {tname} (id:{tid})")
            if tname in TASKS:
                result = TASKS[tname](tparams)
                print(f"  Result: {json.dumps(result)[:200]}")
                report(tid, result)
            else:
                report(tid, {"error": f"Unknown task: {tname}"})
        time.sleep(POLL_INTERVAL)
