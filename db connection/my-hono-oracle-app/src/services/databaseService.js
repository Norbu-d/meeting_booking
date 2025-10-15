import { getConnection, closeConnection } from '../config/database.js';
import logger from '../utils/logger.js';

class DatabaseService {
  async getConnection() {
    return await getConnection();
  }

  async closeConnection(connection) {
    await closeConnection(connection);
  }

  async executeQuery(query, bindVars = {}) {
    let connection;
    try {
      connection = await this.getConnection();
      const result = await connection.execute(query, bindVars);
      return result;
    } catch (error) {
      logger.error('Database query execution error:', error);
      throw error;
    } finally {
      if (connection) {
        await this.closeConnection(connection);
      }
    }
  }

  async executeTransaction(queries) {
    let connection;
    try {
      connection = await this.getConnection();
      
      for (const queryData of queries) {
        await connection.execute(queryData.query, queryData.bindVars || {});
      }
      
      await connection.commit();
      return { success: true };
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          logger.error('Rollback error:', rollbackError);
        }
      }
      logger.error('Transaction execution error:', error);
      throw error;
    } finally {
      if (connection) {
        await this.closeConnection(connection);
      }
    }
  }

  // Helper method to map Oracle result rows to objects
  mapRowsToObjects(rows, metaData) {
    return rows.map(row => {
      const obj = {};
      metaData.forEach((col, index) => {
        obj[col.name] = row[index];
      });
      return obj;
    });
  }
}

export default new DatabaseService();