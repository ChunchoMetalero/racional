import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { OrderSide } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from './orders.service.js';

const mockTx = {
  portfolio: { findFirst: jest.fn(), update: jest.fn() },
  position: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  order: { create: jest.fn() },
};

const mockPrisma = {
  portfolio: { findFirst: jest.fn() },
  order: { findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((arg) =>
      typeof arg === 'function' ? arg(mockTx) : Promise.all(arg),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  const userId = 'user-1';
  const portfolioId = 'portfolio-1';
  const baseDto = { ticker: 'AAPL', quantity: 10, price: 100, date: '2024-01-15' };

  describe('createOrder — BUY', () => {
    beforeEach(() => {
      mockTx.portfolio.update.mockResolvedValue({});
      mockTx.order.create.mockResolvedValue({ id: 'order-1', side: OrderSide.BUY });
    });

    it('creates a new position when none exists', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('2000'),
      });
      mockTx.position.findUnique.mockResolvedValue(null);
      mockTx.position.create.mockResolvedValue({});

      await service.createOrder(userId, portfolioId, OrderSide.BUY, baseDto);

      const [{ data }] = mockTx.position.create.mock.calls[0];
      expect(data.ticker).toBe('AAPL');
      expect(data.quantity.toNumber()).toBe(10);
      expect(data.avgCostBasis.toNumber()).toBe(100);
    });

    it('deducts totalValue (quantity × price) from cashBalance', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('2000'),
      });
      mockTx.position.findUnique.mockResolvedValue(null);
      mockTx.position.create.mockResolvedValue({});

      await service.createOrder(userId, portfolioId, OrderSide.BUY, baseDto); // 10 × 100 = 1000

      const [{ data }] = mockTx.portfolio.update.mock.calls[0];
      expect(data.cashBalance.toNumber()).toBe(1000);
    });

    it('recalculates weighted average cost when adding to an existing position', async () => {
      // existing: 10 shares @ 100  →  new buy: 10 shares @ 120
      // expected avgCostBasis: (10×100 + 10×120) / 20 = 110
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('5000'),
      });
      mockTx.position.findUnique.mockResolvedValue({
        quantity: new Prisma.Decimal('10'),
        avgCostBasis: new Prisma.Decimal('100'),
      });
      mockTx.position.update.mockResolvedValue({});

      await service.createOrder(userId, portfolioId, OrderSide.BUY, { ...baseDto, price: 120 });

      const [{ data }] = mockTx.position.update.mock.calls[0];
      expect(data.quantity.toNumber()).toBe(20);
      expect(data.avgCostBasis.toNumber()).toBe(110);
    });

    it('throws BadRequestException when cash balance is insufficient', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('500'), // needs 1000
      });

      await expect(
        service.createOrder(userId, portfolioId, OrderSide.BUY, baseDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.position.create).not.toHaveBeenCalled();
      expect(mockTx.portfolio.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when portfolio is not found or not owned', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrder(userId, portfolioId, OrderSide.BUY, baseDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrder — SELL', () => {
    beforeEach(() => {
      mockTx.portfolio.update.mockResolvedValue({});
      mockTx.order.create.mockResolvedValue({ id: 'order-2', side: OrderSide.SELL });
    });

    it('reduces position quantity and credits cash proceeds', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('0'),
      });
      mockTx.position.findUnique.mockResolvedValue({
        quantity: new Prisma.Decimal('20'),
      });
      mockTx.position.update.mockResolvedValue({});

      await service.createOrder(userId, portfolioId, OrderSide.SELL, baseDto); // sell 10 @ 100

      const [{ data: posData }] = mockTx.position.update.mock.calls[0];
      expect(posData.quantity.toNumber()).toBe(10);

      const [{ data: portData }] = mockTx.portfolio.update.mock.calls[0];
      expect(portData.cashBalance.toNumber()).toBe(1000);
    });

    it('deletes the position record when all shares are sold', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('0'),
      });
      mockTx.position.findUnique.mockResolvedValue({
        quantity: new Prisma.Decimal('10'), // exactly what we sell
      });
      mockTx.position.delete.mockResolvedValue({});

      await service.createOrder(userId, portfolioId, OrderSide.SELL, baseDto);

      expect(mockTx.position.delete).toHaveBeenCalledWith({
        where: { portfolioId_ticker: { portfolioId, ticker: 'AAPL' } },
      });
      expect(mockTx.position.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when selling more shares than owned', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('0'),
      });
      mockTx.position.findUnique.mockResolvedValue({
        quantity: new Prisma.Decimal('5'), // less than 10
      });

      await expect(
        service.createOrder(userId, portfolioId, OrderSide.SELL, baseDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.portfolio.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when no position exists for the ticker', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        cashBalance: new Prisma.Decimal('0'),
      });
      mockTx.position.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder(userId, portfolioId, OrderSide.SELL, baseDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns paginated orders with metadata', async () => {
      const rows = [{ id: 'order-1' }];
      mockPrisma.portfolio.findFirst.mockResolvedValue({ id: portfolioId });
      mockPrisma.order.findMany.mockResolvedValue(rows);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.findAll(userId, portfolioId, { limit: 20, offset: 0 });

      expect(result).toEqual({ data: rows, total: 1, limit: 20, offset: 0 });
    });

    it('throws NotFoundException when portfolio is not found', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValue(null);

      await expect(
        service.findAll(userId, portfolioId, { limit: 20, offset: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
