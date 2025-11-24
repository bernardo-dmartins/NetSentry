const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const redisClient = require('../config/redis');
const emailService = require('../services/emailService');

class AuthController {
  // Validations
  static validateRegister = [
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ];

  static validateLogin = [
    body('username').notEmpty().trim().escape(),
    body('password').notEmpty()
  ];

  // Generate JWT token with sessionId
  static generateToken(user) {
    const sessionId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      token: jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          sessionId
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      ),
      sessionId
    };
  }

  // Store session in Redis
  static async storeSession(sessionId, userData, expiresIn = 604800) {
    try {
      await redisClient.setSession(sessionId, {
        ...userData,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }, expiresIn);

      logger.info(`Session stored: ${sessionId} for user ${userData.username}`);
      return true;
    } catch (error) {
      logger.error('Error storing session:', error);
      return false;
    }
  }

  // Get session from Redis
  static async getSession(sessionId) {
    try {
      const session = await redisClient.getSession(sessionId);
      
      if (session) {
        session.lastActivity = new Date().toISOString();
        await redisClient.refreshSession(sessionId, 604800);
      }
      
      return session;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  // Delete session from Redis
  static async deleteSession(sessionId) {
    try {
      await redisClient.deleteSession(sessionId);
      logger.info(`Session deleted: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting session:', error);
      return false;
    }
  }

  // Register
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already registered'
        });
      }

      // Create user
      const user = await User.create({
        username,
        email,
        password
      });

      // Generate token and sessionId
      const { token, sessionId } = AuthController.generateToken(user);

      // Store session in Redis
      await AuthController.storeSession(sessionId, {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      // 🎉 ENVIAR EMAIL DE BOAS-VINDAS (assíncrono, não bloqueia a resposta)
      emailService.sendWelcomeEmail({
        username: user.username,
        email: user.email,
        role: user.role
      }).then(sent => {
        if (sent) {
          logger.info(`✅ Welcome email sent successfully to ${user.email}`);
        } else {
          logger.warn(`⚠️ Welcome email not sent to ${user.email} - Email service may be disabled`);
        }
      }).catch(error => {
        logger.error(`❌ Error sending welcome email to ${user.email}:`, error.message);
      });

      logger.auth('New user registered', user.username);

      res.status(201).json({
        success: true,
        message: 'User created successfully. Welcome email sent!',
        data: {
          user: user.toPublic(),
          token
        }
      });

    } catch (error) {
      logger.error('Error in registration:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Login
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { username, password } = req.body;

      // Find user
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email: username }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User deactivated'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token and sessionId
      const { token, sessionId } = AuthController.generateToken(user);

      // Store session in Redis
      await AuthController.storeSession(sessionId, {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      logger.auth('Login successful', user.username);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toPublic(),
          token
        }
      });

    } catch (error) {
      logger.error('Error in login:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get Me (logged in user profile)
  static async getMe(req, res) {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check session in Redis
      if (req.user.sessionId) {
        const session = await AuthController.getSession(req.user.sessionId);
        if (!session) {
          return res.status(401).json({
            success: false,
            message: 'Session expired'
          });
        }
      }

      res.json({
        success: true,
        data: user.toPublic()
      });

    } catch (error) {
      logger.error('Error fetching profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update profile
  static async updateProfile(req, res) {
    try {
      const { email, currentPassword, newPassword } = req.body;
      
      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update email
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email,
            id: { [Op.ne]: user.id }
          }
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }

        user.email = email;
      }

      // Update password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Current password is required'
          });
        }

        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Current password incorrect'
          });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'New password must be at least 6 characters'
          });
        }

        user.password = newPassword;
      }

      await user.save();

      logger.info(`Profile updated: ${user.username}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user.toPublic()
      });

    } catch (error) {
      logger.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      if (req.user && req.user.sessionId) {
        await AuthController.deleteSession(req.user.sessionId);
        logger.auth('Logout successful', req.user.username);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Error in logout:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get active sessions (admin)
  static async getActiveSessions(req, res) {
    try {
      res.json({
        success: true,
        message: 'Feature in development'
      });
    } catch (error) {
      logger.error('Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;