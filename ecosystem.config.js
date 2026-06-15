module.exports = {
  apps: [
    {
      name: 'ai-dashboard',
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0 --port 8080',
      cwd: '/home/ubuntu/ai-dashboard',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 5,
      min_uptime: 10000,
    },
    {
      name: 'backend',
      script: '/usr/bin/bash',
      args: '-c "cd /home/ubuntu/ai-dashboard && node --import tsx server.ts"',
      cwd: '/home/ubuntu/ai-dashboard',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 5,
      min_uptime: 10000,
    },
    {
      name: 'queue-worker',
      script: '/home/ubuntu/ai-dashboard/scripts/retry_queue.sh',
      cwd: '/home/ubuntu/ai-dashboard',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
      exp_backoff_restart_delay: 100,
    },
  ],
};