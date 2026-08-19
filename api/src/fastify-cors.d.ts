declare module 'fastify-cors' {
  // Minimal typing: Fastify's `register()` requires a plugin type, but
  // `fastify-cors` (deprecated) does not ship its own declarations in this repo.
  const plugin: import('fastify').FastifyPluginAsync<{ origin: boolean }>;
  export default plugin;
}

