// ==============================================
// PingAlert Pro — Auth Service
// ==============================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';
import logger from '../config/logger';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: { select: { id: true, name: true } } },
    });

    if (!user || !user.active) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    logger.info(`User logged in: ${user.email}`, { userId: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        client: user.client,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(data: { name: string; email: string; password: string; role?: string; clientId?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, config.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'TECH',
        clientId: data.clientId,
      },
      select: { id: true, name: true, email: true, role: true, clientId: true },
    });

    logger.info(`New user registered: ${user.email}`, { userId: user.id });

    return user;
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
      client: user.client,
      avatarUrl: user.avatarUrl,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new Error('Email already in use');
      updateData.email = data.email;
    }

    if (data.newPassword) {
      if (!data.currentPassword) throw new Error('Current password is required');
      const valid = await bcrypt.compare(data.currentPassword, user.password);
      if (!valid) throw new Error('Current password is incorrect');
      updateData.password = await bcrypt.hash(data.newPassword, config.bcryptRounds);
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });
  }
}

export const authService = new AuthService();
