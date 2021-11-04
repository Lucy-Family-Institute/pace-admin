module.exports = {
  apps : [{
    name: 'client - dev',
    script: 'make',
    args: ['webapp'],
    watch: ['.env'],
    autorestart: false
  }, {
    name: 'server - dev',
    script: 'make',
    args: ['express'],
    watch: ['.env', 'server', 'templates'],
    autorestart: false
  }, {
    name: 'hasura migration console',
    script: 'make',
    args: ['migration-console'],
    autorestart: false
  }]
};
