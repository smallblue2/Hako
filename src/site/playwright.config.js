const config = {
	webServer: {
    command: 'npx svelte-kit sync && npm run preview',
		port: 4173
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
