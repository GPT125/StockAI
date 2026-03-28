#!/usr/bin/env python3
"""Simple server launcher that avoids uvloop import issues."""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        loop="asyncio",
        http="h11",
        reload=False,
    )
