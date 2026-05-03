import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { TransactionType } from '../generated/prisma/enums.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import { TransactionsService } from './transactions.service.js';

@ApiTags('Transactions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@Controller('portfolios/:portfolioId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('deposit')
  @ApiOperation({ summary: 'Register a cash deposit into the portfolio' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiCreatedResponse({ description: 'Deposit registered. cashBalance updated.' })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  deposit(
    @CurrentUser() user: JwtPayload,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.createTransaction(
      user.id,
      portfolioId,
      TransactionType.DEPOSIT,
      dto,
    );
  }

  @Post('withdrawal')
  @ApiOperation({ summary: 'Register a cash withdrawal from the portfolio' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiCreatedResponse({ description: 'Withdrawal registered. cashBalance updated.' })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  @ApiBadRequestResponse({ description: 'Insufficient cash balance.' })
  withdrawal(
    @CurrentUser() user: JwtPayload,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.createTransaction(
      user.id,
      portfolioId,
      TransactionType.WITHDRAWAL,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List recent movements (paginated)' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiOkResponse({
    description: 'Paginated list of transactions.',
    schema: {
      example: {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  findRecent(
    @CurrentUser() user: JwtPayload,
    @Param('portfolioId') portfolioId: string,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactionsService.findRecent(user.id, portfolioId, query);
  }
}
