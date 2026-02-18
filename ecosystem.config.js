module.exports = {
  apps: [
    {
      name: "odoo-mpesa-payments-sms-integrations",
      script: "./src/app.js",
      instances: 1, // Run in single instance mode
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_file: "logs/pm2-combined.log",
      time: true,
      // Auto-restart if app crashes
      autorestart: true,
      // Restart if memory usage goes over 150MB
      max_memory_restart: "150M",
      // Delay between restarts
      restart_delay: 4000,
      // Graceful shutdown
      kill_timeout: 5000,
      // Listen for shutdown events
      shutdown_with_message: true,
    },
  ],
};
