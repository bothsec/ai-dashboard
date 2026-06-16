#!/bin/bash
# Start the Vite dev server for ai-dashboard (with proxy support)
cd /home/ubuntu/ai-dashboard
exec npm run dev -- --host 0.0.0.0 --port 8080