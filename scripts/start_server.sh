#!/bin/bash
cd /home/ubuntu/ai-dashboard
export NODE_ENV=production
exec node --import tsx server.ts