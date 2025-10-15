import databaseService from '../services/databaseService.js';
import logger from '../utils/logger.js';

class UserController {
  async getProfile(c) {
    try {
      const user = c.get('user');
      
      const query = `
        SELECT 
          e.EMPLOYEE_ID,
          e.LOGIN_ID,
          e.FIRST_NAME,
          e.MIDDLE_NAME,
          e.LAST_NAME,
          e.EMAIL_ID,
          e.PHONE_NO,
          e.BRANCH_CODE,
          e.DESIGNATION_CODE,
          e.STATUS_CODE,
          b.BRANCH_NAME,
          d.DESIGNATION_NAME
        FROM EMPMAS e
        LEFT JOIN BRANCH_MASTER b ON e.BRANCH_CODE = b.BRANCH_CODE
        LEFT JOIN DESIGNATION_MASTER d ON e.DESIGNATION_CODE = d.DESIGNATION_CODE
        WHERE e.EMPLOYEE_ID = :employeeId
      `;

      const result = await databaseService.executeQuery(query, { 
        employeeId: user.userId 
      });

      if (result.rows.length === 0) {
        return c.json({ 
          success: false, 
          message: 'User profile not found' 
        }, 404);
      }

      const profileData = databaseService.mapRowsToObjects(result.rows, result.metaData)[0];

      return c.json({
        success: true,
        data: {
          employeeId: profileData.EMPLOYEE_ID,
          loginId: profileData.LOGIN_ID,
          firstName: profileData.FIRST_NAME,
          middleName: profileData.MIDDLE_NAME,
          lastName: profileData.LAST_NAME,
          fullName: `${profileData.FIRST_NAME || ''} ${profileData.MIDDLE_NAME || ''} ${profileData.LAST_NAME || ''}`.trim(),
          emailId: profileData.EMAIL_ID,
          phoneNo: profileData.PHONE_NO,
          branchCode: profileData.BRANCH_CODE,
          branchName: profileData.BRANCH_NAME,
          designationCode: profileData.DESIGNATION_CODE,
          designationName: profileData.DESIGNATION_NAME,
          statusCode: profileData.STATUS_CODE
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      return c.json({ 
        success: false, 
        message: 'Error fetching user profile' 
      }, 500);
    }
  }

  async getPermissions(c) {
    try {
      const user = c.get('user');
      
      // This would depend on your permission/role system
      // For now, returning basic permissions based on user status
      const query = `
        SELECT 
          e.USER_IND,
          e.STATUS_CODE,
          e.DESIGNATION_CODE,
          d.DESIGNATION_NAME
        FROM EMPMAS e
        LEFT JOIN DESIGNATION_MASTER d ON e.DESIGNATION_CODE = d.DESIGNATION_CODE
        WHERE e.EMPLOYEE_ID = :employeeId
      `;

      const result = await databaseService.executeQuery(query, { 
        employeeId: user.userId 
      });

      if (result.rows.length === 0) {
        return c.json({ 
          success: false, 
          message: 'User not found' 
        }, 404);
      }

      const userData = databaseService.mapRowsToObjects(result.rows, result.metaData)[0];

      // Basic permissions based on user status and designation
      const permissions = {
        canLogin: userData.USER_IND === 'Y' && userData.STATUS_CODE === 'A',
        canViewReports: userData.USER_IND === 'Y',
        canEditProfile: userData.STATUS_CODE === 'A',
        designation: userData.DESIGNATION_NAME,
        userStatus: userData.STATUS_CODE
      };

      return c.json({
        success: true,
        data: permissions
      });

    } catch (error) {
      logger.error('Get permissions error:', error);
      return c.json({ 
        success: false, 
        message: 'Error fetching user permissions' 
      }, 500);
    }
  }

  async updateProfile(c) {
    try {
      const user = c.get('user');
      const { emailId, phoneNo } = await c.req.json();

      // Basic validation
      if (emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) {
        return c.json({ 
          success: false, 
          message: 'Invalid email format' 
        }, 400);
      }

      if (phoneNo && !/^\+?[\d\s-()]{10,}$/.test(phoneNo)) {
        return c.json({ 
          success: false, 
          message: 'Invalid phone number format' 
        }, 400);
      }

      const updateFields = [];
      const bindVars = { employeeId: user.userId };

      if (emailId !== undefined) {
        updateFields.push('EMAIL_ID = :emailId');
        bindVars.emailId = emailId;
      }

      if (phoneNo !== undefined) {
        updateFields.push('PHONE_NO = :phoneNo');
        bindVars.phoneNo = phoneNo;
      }

      if (updateFields.length === 0) {
        return c.json({ 
          success: false, 
          message: 'No fields to update' 
        }, 400);
      }

      const query = `
        UPDATE EMPMAS 
        SET ${updateFields.join(', ')}
        WHERE EMPLOYEE_ID = :employeeId
      `;

      let connection;
      try {
        connection = await databaseService.getConnection();
        await connection.execute(query, bindVars);
        await connection.commit();

        logger.info(`Profile updated for user: ${user.loginId}`);

        return c.json({
          success: true,
          message: 'Profile updated successfully'
        });

      } catch (dbError) {
        if (connection) {
          await connection.rollback();
        }
        throw dbError;
      } finally {
        if (connection) {
          await databaseService.closeConnection(connection);
        }
      }

    } catch (error) {
      logger.error('Update profile error:', error);
      return c.json({ 
        success: false, 
        message: 'Error updating user profile' 
      }, 500);
    }
  }
}

export default new UserController();