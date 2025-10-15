// src/config/database.js
import dotenv from 'dotenv';
import oracledb from 'oracledb';
import logger from '../utils/logger.js';

// Load environment variables first
dotenv.config();

// Enable Thick mode for older Oracle database versions
try {
  // Initialize Thick mode - this is needed for Oracle Database versions older than 12.1
  oracledb.initOracleClient();
  logger.info('Oracle client initialized in Thick mode');
} catch (error) {
  // If Thick mode fails, we'll try Thin mode
  logger.warn('Could not initialize Thick mode, will attempt Thin mode:', error.message);
}

// Validate required environment variables
const requiredEnvVars = [
  'ORACLE_USER', 
  'ORACLE_PASSWORD', 
  'ORACLE_HOST', 
  'ORACLE_PORT', 
  'ORACLE_SERVICE_NAME'
];

function validateEnvironmentVariables() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    console.error('❌ Environment variables missing. Please check your .env file:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Make sure your .env file is in the project root directory');
    console.error('💡 Make sure your .env file has no extra spaces or special characters');
    throw new Error(errorMsg);
  }

  // Validate specific formats
  if (isNaN(parseInt(process.env.ORACLE_PORT))) {
    const errorMsg = 'ORACLE_PORT must be a valid number';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  logger.info('All required environment variables are present');
}

// Don't validate immediately - wait for initialization

const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
  poolMin: 1,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 300,
  stmtCacheSize: 40,
  // Additional Oracle connection options
  poolAlias: 'default',
  poolPingInterval: 60,
  enableStatistics: true,
  // Force connection string format for older Oracle versions
  connectionClass: 'POOLED'
};

async function initializeDatabase() {
  try {
    // Validate environment variables now
    validateEnvironmentVariables();

    logger.info('Initializing Oracle database connection...', {
      user: dbConfig.user,
      connectString: dbConfig.connectString,
      poolSettings: {
        min: dbConfig.poolMin,
        max: dbConfig.poolMax,
        increment: dbConfig.poolIncrement,
        timeout: dbConfig.poolTimeout
      }
    });

    // Create connection pool
    const pool = await oracledb.createPool(dbConfig);
    logger.info('Oracle database connection pool created successfully', {
      poolAlias: pool.poolAlias,
      poolMin: pool.poolMin,
      poolMax: pool.poolMax,
      connectionsOpen: pool.connectionsOpen,
      connectionsInUse: pool.connectionsInUse
    });
    
    // Test the connection
    logger.info('Testing database connection...');
    const connection = await oracledb.getConnection();
    
    try {
      const result = await connection.execute('SELECT SYSDATE, USER FROM DUAL');
      logger.info('Database connection test successful:', {
        currentDate: result.rows[0][0],
        connectedUser: result.rows[0][1],
        database: process.env.ORACLE_SERVICE_NAME
      });
      
      console.log('✅ Database connection test passed');
      console.log(`📅 Server time: ${result.rows[0][0]}`);
      console.log(`👤 Connected as: ${result.rows[0][1]}`);
      
    } finally {
      await connection.close();
    }
    
  } catch (error) {
    logger.error('Failed to initialize database connection:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      config: {
        user: dbConfig.user,
        connectString: dbConfig.connectString,
        password: '******' // Never log actual passwords
      }
    });
    
    console.error('❌ Database connection failed:', error.message);
    
    // Provide helpful error messages for common issues
    if (error.message.includes('NJS-101')) {
      console.error('💡 Tip: Check if all Oracle credentials are set in .env file');
    } else if (error.message.includes('ORA-12541') || error.message.includes('ORA-12514')) {
      console.error('💡 Tip: Check if Oracle database is running and accessible');
      console.error(`   - Host: ${process.env.ORACLE_HOST}`);
      console.error(`   - Port: ${process.env.ORACLE_PORT}`);
      console.error(`   - Service: ${process.env.ORACLE_SERVICE_NAME}`);
    } else if (error.message.includes('ORA-01017')) {
      console.error('💡 Tip: Check username and password credentials');
    }
    
    throw error;
  }
}

async function getConnection() {
  try {
    const connection = await oracledb.getConnection();
    logger.debug('Database connection acquired from pool');
    return connection;
  } catch (error) {
    logger.error('Failed to get database connection from pool:', {
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

async function closeConnection(connection) {
  if (connection) {
    try {
      await connection.close();
      logger.debug('Database connection returned to pool');
    } catch (error) {
      logger.error('Failed to close database connection:', {
        message: error.message,
        code: error.code
      });
    }
  }
}

// Helper function to execute queries with automatic connection management
async function executeQuery(sql, binds = [], options = {}) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT, // Return rows as objects
      autoCommit: true, // Auto-commit by default
      ...options
    });
    return result;
  } catch (error) {
    logger.error('Query execution failed:', {
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      error: error.message,
      code: error.code
    });
    throw error;
  } finally {
    if (connection) {
      await closeConnection(connection);
    }
  }
}

// Helper function to get pool statistics
function getPoolStatistics() {
  try {
    const pool = oracledb.getPool();
    return {
      poolAlias: pool.poolAlias,
      connectionsOpen: pool.connectionsOpen,
      connectionsInUse: pool.connectionsInUse,
      poolMin: pool.poolMin,
      poolMax: pool.poolMax,
      poolIncrement: pool.poolIncrement,
      poolTimeout: pool.poolTimeout,
      queueTimeout: pool.queueTimeout,
      stmtCacheSize: pool.stmtCacheSize
    };
  } catch (error) {
    logger.error('Failed to get pool statistics:', error);
    return null;
  }
}

export {
  initializeDatabase,
  getConnection,
  closeConnection,
  executeQuery,
  getPoolStatistics,
  dbConfig
};