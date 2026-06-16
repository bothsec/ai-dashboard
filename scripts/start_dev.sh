#!/bin/bash
# Serve the production build (content-hashed, no browser cache issues)
cd /home/ubuntu/ai-dashboard
exec npx serve dist -p 3000 -s