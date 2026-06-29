"""Fix the Discord Daily Tasks and Word of Day workflows — replace broken multiline strings with \\n."""
import json
import urllib.request

API_URL = "https://bot.empireenglish.online/api/v1"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzODExZjBlMC0xYzIyLTQ4MmEtOTk5ZC0wZThlYzVkZDk3YjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZWNiOTkyMzktNjAwMC00OWFkLTk1ODQtZWJhYTQ4YTQ0MWI2IiwiaWF0IjoxNzgyNjc5NzY0fQ.nWwDc7yR9y6TshdIiNwuEDHTKENT8xpscfH0QpKAgX8"

HEADERS = {"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"}

# Fixed code for Discord Daily Tasks
DAILY_TASKS_CODE = 'const d=new Date();const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];const dn=days[d.getDay()];const s=new Date("2026-06-26");const ds=Math.floor((d-s)/864e5);const w=Math.min(8,Math.max(1,Math.floor(ds/7)+1));const n=ds+1;const f={1:"minimal pairs",2:"th-sounds",3:"schwa",4:"R vs L",5:"American R",6:"word stress",7:"multi-syllable",8:"connected speech"};const t={1:"Greetings",2:"Numbers",3:"Family",4:"Home",5:"Food",6:"Places",7:"Actions",8:"Feelings"};const m={Sat:"Introduce yourself.",Sun:"Describe your surroundings.",Mon:"List 5 recent activities.",Tue:"Read aloud clearly.",Wed:"Answer: name, city, goal.",Thu:"Repeat: Nice to meet you.",Fri:"Free talk 45 seconds!"};const sec=Math.min(60,20+w*5);const p="DAY "+n+" ("+dn+", Week "+w+")\\n\\n1. ACCENT (10min): "+f[w]+"\\n2. VOCAB (10min): "+t[w]+" - learn 8 words\\n3. SHADOW (10min): listen+repeat 3x\\n4. SPEAK (10min): "+(m[dn]||m.Fri)+" Target: "+sec+"s\\n5. LISTEN (8min): short clip + questions\\n6. WRITE (7min): 4 sentences about "+t[w]+"\\n7. COMMUNITY (5min): voice or chat\\n\\nTotal: ~55min | !done to track";return[{json:{content:p}}];'

# Fixed code for Word of Day
WORD_OF_DAY_CODE = 'const words=[{w:"improve",p:"im-PROOV",ar:"\\u064a\\u062a\\u062d\\u0633\\u0651\\u0646",ex:"I want to improve my pronunciation."},{w:"actually",p:"AK-choo-lee",ar:"\\u0628\\u0627\\u0644\\u0641\\u0639\\u0644",ex:"I actually enjoy studying English now."},{w:"confident",p:"KON-fih-dent",ar:"\\u0648\\u0627\\u062b\\u0642",ex:"I feel more confident every day."},{w:"schedule",p:"SKEJ-ool",ar:"\\u062c\\u062f\\u0648\\u0644",ex:"Let me check my schedule."},{w:"opportunity",p:"op-er-TOO-neh-tee",ar:"\\u0641\\u0631\\u0635\\u0629",ex:"English opens many opportunities."},{w:"struggle",p:"STRUH-gel",ar:"\\u064a\\u0639\\u0627\\u0646\\u064a",ex:"I struggle with pronunciation."},{w:"goal",p:"GOHL",ar:"\\u0647\\u062f\\u0641",ex:"My goal is to speak fluently."},{w:"comfortable",p:"KUMF-ter-bel",ar:"\\u0645\\u0631\\u064a\\u062d",ex:"I am not comfortable speaking yet."},{w:"practice",p:"PRAK-tis",ar:"\\u064a\\u062a\\u0645\\u0631\\u0651\\u0646",ex:"Practice makes progress."},{w:"focus",p:"FOH-kus",ar:"\\u064a\\u0631\\u0643\\u0651\\u0632",ex:"Focus on speaking, not just studying."},{w:"mistake",p:"mis-TAYK",ar:"\\u062e\\u0637\\u0623",ex:"Making mistakes is how you learn."},{w:"pronounce",p:"pruh-NOWNS",ar:"\\u064a\\u0646\\u0637\\u0642",ex:"How do you pronounce this word?"},{w:"fluent",p:"FLOO-ent",ar:"\\u0637\\u0644\\u064a\\u0642",ex:"I want to become fluent."},{w:"consistent",p:"kun-SIS-tent",ar:"\\u0645\\u0633\\u062a\\u0645\\u0631",ex:"Being consistent is the key."}];const d=new Date();const startDate=new Date("2026-06-26");const daysSince=Math.floor((d-startDate)/(1000*60*60*24));const idx=daysSince%words.length;const word=words[idx];const post="\\ud83d\\udcd6 Word of the Day: **"+word.w+"**\\n\\n\\ud83d\\udd0a "+word.p+"\\n\\ud83d\\udcdd "+word.ar+"\\n\\n\\u270d\\ufe0f "+word.ex+"\\n\\n\\ud83d\\udcac Use it in a sentence below \\ud83d\\udc47";return[{json:{content:post}}];'


def get_workflow(wf_id):
    req = urllib.request.Request(f"{API_URL}/workflows/{wf_id}", headers=HEADERS)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())


def update_workflow(wf_id, nodes, connections):
    data = json.dumps({"nodes": nodes, "connections": connections}).encode()
    req = urllib.request.Request(f"{API_URL}/workflows/{wf_id}", data=data, headers=HEADERS, method="PUT")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  PUT failed ({e}), will need server-side import")
        return None


def fix_workflow(wf_id, node_name, fixed_code):
    print(f"\nFixing workflow {wf_id}...")
    wf = get_workflow(wf_id)
    
    for node in wf.get("nodes", []):
        if node["name"] == node_name:
            node["parameters"]["jsCode"] = fixed_code
            print(f"  Fixed node: {node_name}")
            break
    
    # Save to file for server-side import
    wf["nodes"] = wf.get("nodes", [])
    with open(f"/tmp/fixed_{wf_id}.json", "w") as f:
        json.dump(wf, f)
    print(f"  Saved to /tmp/fixed_{wf_id}.json")
    return wf


if __name__ == "__main__":
    print("=== Fixing Discord Workflows ===")
    
    # Fix Daily Tasks
    fix_workflow("UZrhtBiCZsn0XoeS", "Build", DAILY_TASKS_CODE)
    
    # Fix Word of Day
    fix_workflow("cg8axk0J2ELk9SWG", "Pick Word", WORD_OF_DAY_CODE)
    
    print("\n=== Files saved. Now importing... ===")
    print("Run these commands on server:")
    print("  docker cp /tmp/fixed_UZrhtBiCZsn0XoeS.json empire-n8n:/tmp/")
    print("  docker cp /tmp/fixed_cg8axk0J2ELk9SWG.json empire-n8n:/tmp/")
    print("  docker exec empire-n8n n8n import:workflow --input=/tmp/fixed_UZrhtBiCZsn0XoeS.json")
    print("  docker exec empire-n8n n8n import:workflow --input=/tmp/fixed_cg8axk0J2ELk9SWG.json")
