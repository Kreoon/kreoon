module.exports = {
  apps: [{
    name: "vibe-kanban",
    script: "npx",
    args: "vibe-kanban",
    interpreter: "none",
    env: {
      PORT: 5555
    }
  }]
}
