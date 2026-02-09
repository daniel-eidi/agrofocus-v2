module.exports = {
  apps: [
    {
      name: 'agrofocus-api',
      script: './src/server.js',
      cwd: '/home/clawdbot_user/clawd/booster_agro/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        FRONTEND_URL: 'https://agrofocus.agvant.com.br'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        FRONTEND_URL: 'https://agrofocus.agvant.com.br'
      },
      log_file: '/home/clawdbot_user/.pm2/logs/agrofocus-api.log',
      out_file: '/home/clawdbot_user/.pm2/logs/agrofocus-api-out.log',
      error_file: '/home/clawdbot_user/.pm2/logs/agrofocus-api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Configurações de saúde
      health_check_grace_period: 30000,
    }
  ]
};