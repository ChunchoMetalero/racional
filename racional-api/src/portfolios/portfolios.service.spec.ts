import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PortfoliosService } from './portfolios.service.js';

const mockPrisma = {
  portfolio: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('PortfoliosService', () => {
  let service: PortfoliosService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfoliosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PortfoliosService>(PortfoliosService);
  });

  const userId = 'user-1';
  const portfolioId = 'portfolio-1';

  describe('findAllByUser', () => {
    it('returns all portfolios belonging to the user', async () => {
      const portfolios = [{ id: portfolioId, userId }];
      mockPrisma.portfolio.findMany.mockResolvedValue(portfolios);

      const result = await service.findAllByUser(userId);

      expect(result).toEqual(portfolios);
      expect(mockPrisma.portfolio.findMany).toHaveBeenCalledWith({ where: { userId } });
    });
  });

  describe('findOne', () => {
    it('returns the portfolio when found and owned', async () => {
      const portfolio = { id: portfolioId, userId };
      mockPrisma.portfolio.findFirst.mockResolvedValue(portfolio);

      const result = await service.findOne(userId, portfolioId);

      expect(result).toEqual(portfolio);
    });

    it('throws NotFoundException when portfolio is not found or belongs to another user', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, portfolioId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the portfolio with the provided fields', async () => {
      const updated = { id: portfolioId, name: 'New Name', description: 'desc' };
      mockPrisma.portfolio.findFirst.mockResolvedValue({ id: portfolioId, userId });
      mockPrisma.portfolio.update.mockResolvedValue(updated);

      const result = await service.update(userId, portfolioId, { name: 'New Name' });

      expect(result).toEqual(updated);
    });

    it('throws BadRequestException when the request body is empty', async () => {
      await expect(service.update(userId, portfolioId, {})).rejects.toThrow(BadRequestException);

      expect(mockPrisma.portfolio.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when portfolio is not found', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, portfolioId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTotalValue', () => {
    it('sums position book values and adds cash balance', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValue({
        id: portfolioId,
        currency: 'USD',
        cashBalance: new Prisma.Decimal('5000'),
        positions: [
          // AAPL: 10 × 150 = 1500
          { ticker: 'AAPL', quantity: new Prisma.Decimal('10'), avgCostBasis: new Prisma.Decimal('150') },
          // MSFT: 5 × 200 = 1000
          { ticker: 'MSFT', quantity: new Prisma.Decimal('5'), avgCostBasis: new Prisma.Decimal('200') },
        ],
      });

      const result = await service.getTotalValue(userId, portfolioId);

      expect(result.cashBalance).toBe(5000);
      expect(result.bookValue).toBe(2500);
      expect(result.totalValue).toBe(7500);
      expect(result.positions).toHaveLength(2);
    });

    it('returns zero bookValue when portfolio has no positions', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValue({
        id: portfolioId,
        currency: 'USD',
        cashBalance: new Prisma.Decimal('1000'),
        positions: [],
      });

      const result = await service.getTotalValue(userId, portfolioId);

      expect(result.bookValue).toBe(0);
      expect(result.totalValue).toBe(1000);
      expect(result.positions).toHaveLength(0);
    });

    it('throws NotFoundException when portfolio is not found', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValue(null);

      await expect(service.getTotalValue(userId, portfolioId)).rejects.toThrow(NotFoundException);
    });
  });
});
