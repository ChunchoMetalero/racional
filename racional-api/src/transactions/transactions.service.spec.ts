import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { TransactionType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TransactionsService } from './transactions.service.js';

const mockTx = {
  portfolio: { findFirst: jest.fn(), update: jest.fn() },
  transaction: { create: jest.fn() },
};

const mockPrisma = {
  portfolio: { findFirst: jest.fn() },
  transaction: { findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((arg) =>
      typeof arg === 'function' ? arg(mockTx) : Promise.all(arg),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  const userId = 'user-1';
  const portfolioId = 'portfolio-1';

  describe('createTransaction', () => {
    beforeEach(() => {
      mockTx.portfolio.update.mockResolvedValue({});
      mockTx.transaction.create.mockResolvedValue({ id: 'tx-1' });
    });

    it('adds the amount to cashBalance on DEPOSIT', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        id: portfolioId,
        cashBalance: new Prisma.Decimal('500.00'),
      });

      await service.createTransaction(userId, portfolioId, TransactionType.DEPOSIT, {
        amount: 1000,
        date: '2024-01-15',
      });

      const [{ data }] = mockTx.portfolio.update.mock.calls[0];
      expect(data.cashBalance.toNumber()).toBe(1500);
    });

    it('subtracts the amount from cashBalance on WITHDRAWAL', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        id: portfolioId,
        cashBalance: new Prisma.Decimal('1000.00'),
      });

      await service.createTransaction(userId, portfolioId, TransactionType.WITHDRAWAL, {
        amount: 300,
        date: '2024-01-15',
      });

      const [{ data }] = mockTx.portfolio.update.mock.calls[0];
      expect(data.cashBalance.toNumber()).toBe(700);
    });

    it('throws BadRequestException when withdrawal exceeds balance', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        id: portfolioId,
        cashBalance: new Prisma.Decimal('100.00'),
      });

      await expect(
        service.createTransaction(userId, portfolioId, TransactionType.WITHDRAWAL, {
          amount: 200,
          date: '2024-01-15',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.portfolio.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when portfolio is not found or not owned', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue(null);

      await expect(
        service.createTransaction(userId, portfolioId, TransactionType.DEPOSIT, {
          amount: 500,
          date: '2024-01-15',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('persists the date as UTC midnight to avoid timezone shifts', async () => {
      mockTx.portfolio.findFirst.mockResolvedValue({
        id: portfolioId,
        cashBalance: new Prisma.Decimal('1000.00'),
      });

      await service.createTransaction(userId, portfolioId, TransactionType.DEPOSIT, {
        amount: 100,
        date: '2024-01-15',
      });

      const [{ data }] = mockTx.transaction.create.mock.calls[0];
      expect(data.date).toEqual(new Date('2024-01-15T00:00:00.000Z'));
    });
  });

  describe('findRecent', () => {
    it('returns paginated transactions with metadata', async () => {
      const rows = [{ id: 'tx-1' }, { id: 'tx-2' }];
      mockPrisma.portfolio.findFirst.mockResolvedValue({ id: portfolioId });
      mockPrisma.transaction.findMany.mockResolvedValue(rows);
      mockPrisma.transaction.count.mockResolvedValue(2);

      const result = await service.findRecent(userId, portfolioId, { limit: 20, offset: 0 });

      expect(result).toEqual({ data: rows, total: 2, limit: 20, offset: 0 });
    });

    it('throws NotFoundException when portfolio is not found', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValue(null);

      await expect(
        service.findRecent(userId, portfolioId, { limit: 20, offset: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
