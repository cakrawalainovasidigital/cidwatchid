module.exports = {
	apps: [
		{
			name: "cidwatch-api",
			script: "bun",
			args: "run server.ts",

			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: "512M",

			env_development: {
				NODE_ENV: "development",
				PORT: 8787,
			},
			env_production: {
				NODE_ENV: "production",
				PORT: 8787,
			},
		},
	],
};
