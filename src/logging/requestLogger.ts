const requestLogger = {
  ...console,
  debug: async (msg: any) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG]: ${msg}`);
  },
};
export default requestLogger;
