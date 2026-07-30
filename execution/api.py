import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import prism_router
import ledger
import scout_agent
import radar_scanner

PROJECT_ROOT = Path(__file__).parent.parent

app = FastAPI(title="Empire OS FastAPI")

# Enable CORS for React UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    ledger.init_db()

@app.get("/api/niches")
async def get_niches():
    niches_dir = PROJECT_ROOT / "config" / "niches"
    if not niches_dir.exists():
        return {"niches": []}
        
    niches = []
    for f in niches_dir.glob("*.json"):
        try:
            with open(f, 'r') as file:
                niche_data = json.load(file)
                stats = ledger.get_niche_stats(niche_data.get("niche_id", f.stem))
                niche_data["stats"] = stats
                niches.append(niche_data)
        except Exception as e:
            print(f"Error loading {f}: {e}")
            
    return {"niches": niches}

@app.get("/api/radar")
async def get_radar(force: bool = False):
    cache_path = PROJECT_ROOT / "config" / "radar_cache.json"
    
    if not force and cache_path.exists():
        import time
        stats = os.stat(cache_path)
        hours_old = (time.time() - stats.st_mtime) / 3600
        if hours_old < 24:
            try:
                with open(cache_path, 'r') as f:
                    data = json.load(f)
                return {"success": True, "radar": data.get("opportunities", [])}
            except Exception:
                pass

    # Re-run radar scanner if forced or missing/old
    try:
        # Since radar_scanner runs synchronously in its current state, we run it in a thread
        import subprocess
        result = await asyncio.to_thread(
            subprocess.run, 
            [sys.executable, "execution/radar_scanner.py"], 
            cwd=PROJECT_ROOT, 
            capture_output=True, 
            text=True
        )
        
        output = result.stdout
        start_idx = output.find('---JSON_START---')
        end_idx = output.find('---JSON_END---')
        if start_idx != -1 and end_idx != -1:
            json_str = output[start_idx + 16:end_idx].strip()
            data = json.loads(json_str)
            return {"success": True, "radar": data.get("opportunities", [])}
    except Exception as e:
        print(f"Failed to parse radar output: {e}")
        
    return {"success": False, "radar": []}

@app.post("/api/spawn")
async def spawn_niche(payload: dict):
    idea = payload.get("idea")
    if not idea:
        return JSONResponse(status_code=400, content={"error": "Niche idea required"})
        
    import subprocess
    result = await asyncio.to_thread(
        subprocess.run,
        [sys.executable, "execution/spawn_niche.py", idea],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        return JSONResponse(status_code=500, content={"error": "Spawn failed", "details": result.stderr})
        
    output = result.stdout
    try:
        json_str = output[output.find('{'):]
        data = json.loads(json_str)
        return {"success": True, "niche": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Failed to parse python output", "raw": output})

@app.post("/api/run-engine-stream")
async def run_engine_stream(payload: dict):
    niche_id = payload.get("niche_id")
    if not niche_id:
        return JSONResponse(status_code=400, content={"error": "Niche ID required"})
        
    niche_path = PROJECT_ROOT / "config" / "niches" / f"{niche_id}.json"
    
    async def log_generator():
        yield f"⚙️ Starting FastAPI engine for niche: {niche_id}\n"
        
        # We spawn the daily pipeline as an async subprocess and stream its output
        import asyncio
        env = os.environ.copy()
        env["ACTIVE_NICHE"] = str(niche_path)
        
        process = await asyncio.create_subprocess_exec(
            sys.executable, "execution/run_daily_pipeline.py",
            cwd=str(PROJECT_ROOT),
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )
        
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            yield line.decode('utf-8')
            
        await process.wait()

    return StreamingResponse(log_generator(), media_type="text/plain")

@app.post("/api/simulate-stream")
async def simulate_stream(payload: dict):
    url = payload.get("url")
    lens = payload.get("lens", "Extract the core value")
    tone = payload.get("tone", "Professional")
    package_type = payload.get("packageType", "newsletter_html")
    
    if not url:
        return JSONResponse(status_code=400, content={"error": "URL required"})

    async def log_generator():
        target_url = url
        
        if not target_url.startswith('http'):
            yield f"🕵️‍♂️ Target is an entity. Engaging FastAPI Scout Agent to locate: {url}\n"
            
            # Run scout
            import asyncio
            process = await asyncio.create_subprocess_exec(
                sys.executable, "execution/scout_agent.py", url, "content creator",
                cwd=str(PROJECT_ROOT),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await process.communicate()
            scout_result = stdout.decode('utf-8')
            
            try:
                start_idx = scout_result.find('[')
                end_idx = scout_result.rfind(']') + 1
                if start_idx != -1 and end_idx != -1:
                    json_match = scout_result[start_idx:end_idx]
                    creators = json.loads(json_match)
                    if creators and creators[0].get('urls'):
                        best_url = creators[0]['urls'][0]
                        for u in creators[0]['urls']:
                            if 'youtube.com' in u or 'substack.com' in u:
                                best_url = u
                                break
                        target_url = best_url
                        yield f"🎯 Target Locked: {creators[0].get('name')} on optimal platform ({target_url})\n\n"
                    else:
                        yield f"❌ Scout failed to lock on target URL. Aborting.\n"
                        return
            except Exception:
                yield f"❌ Scout failed to parse results.\n"
                return

        yield f"🧪 Running Prism Simulator for: {target_url}\n"
        
        process = await asyncio.create_subprocess_exec(
            sys.executable, "execution/prism_router.py",
            "--url", target_url,
            "--lens", lens,
            "--tone", tone,
            "--package", package_type,
            "--json",
            cwd=str(PROJECT_ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )
        
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            yield line.decode('utf-8')
            
        await process.wait()

    return StreamingResponse(log_generator(), media_type="text/plain")

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=3001, reload=True)
