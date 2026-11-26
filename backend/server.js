/**
 * backend/server.js
 * Express entry point. Imports the app and starts listening.
 */

import app from './app.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NetWatch backend listening on http://localhost:${PORT}`);
});

