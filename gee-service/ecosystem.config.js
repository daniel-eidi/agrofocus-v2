module.exports = {
  apps: [{
    name: 'agrofocus-gee',
    script: 'app.py',
    cwd: '/home/clawdbot_user/clawd/booster_agro/gee-service',
    interpreter: 'python3',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    log_file: '/home/clawdbot_user/.pm2/logs/agrofocus-gee-out.log',
    error_file: '/home/clawdbot_user/.pm2/logs/agrofocus-gee-error.log',
    out_file: '/home/clawdbot_user/.pm2/logs/agrofocus-gee-out.log'
  }]
};
