import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

jest.mock('bcryptjs');

const mockTx = {
  user: { create: jest.fn() },
  portfolio: { create: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findByEmailWithPasswordHash: jest.fn(),
};

const mockJwt = { sign: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((cb) => cb(mockTx));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'john@example.com',
      password: 'secret123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('returns an access token on successful registration', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');
      mockTx.user.create.mockResolvedValue({ id: 'user-1', email: dto.email });
      mockTx.portfolio.create.mockResolvedValue({});
      mockJwt.sign.mockReturnValue('jwt_token');

      const result = await service.register(dto);

      expect(result).toEqual({ accessToken: 'jwt_token' });
    });

    it('hashes the password before storing — never persists plaintext', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');
      mockTx.user.create.mockResolvedValue({ id: 'user-1', email: dto.email });
      mockTx.portfolio.create.mockResolvedValue({});
      mockJwt.sign.mockReturnValue('jwt_token');

      await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      const [{ data }] = mockTx.user.create.mock.calls[0];
      expect(data.passwordHash).toBe('hashed_pw');
      expect(data).not.toHaveProperty('password');
    });

    it('creates a default portfolio in the same transaction', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');
      mockTx.user.create.mockResolvedValue({ id: 'user-1', email: dto.email });
      mockTx.portfolio.create.mockResolvedValue({});
      mockJwt.sign.mockReturnValue('jwt_token');

      await service.register(dto);

      expect(mockTx.portfolio.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
    });

    it('throws ConflictException when the email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const credentials = { email: 'john@example.com', password: 'secret123' };

    it('returns an access token on valid credentials', async () => {
      mockUsersService.findByEmailWithPasswordHash.mockResolvedValue({
        id: 'user-1',
        email: credentials.email,
        passwordHash: 'hashed_pw',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('jwt_token');

      const result = await service.login(credentials);

      expect(result).toEqual({ accessToken: 'jwt_token' });
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      mockUsersService.findByEmailWithPasswordHash.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password is incorrect', async () => {
      mockUsersService.findByEmailWithPasswordHash.mockResolvedValue({
        id: 'user-1',
        email: credentials.email,
        passwordHash: 'hashed_pw',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(credentials)).rejects.toThrow(UnauthorizedException);

      expect(mockJwt.sign).not.toHaveBeenCalled();
    });
  });
});
