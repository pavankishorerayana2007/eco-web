import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`🚀 Quantum Market Express Server running on port ${PORT}`);
  console.log(`📡 Local API Health: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================================`);
});
