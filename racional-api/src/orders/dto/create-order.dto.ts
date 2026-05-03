import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'AAPL', description: 'Ticker symbol (uppercase letters, digits, and dots)' })
  @IsString()
  @Matches(/^[A-Z0-9.]+$/, { message: 'ticker must be uppercase letters, digits, or dots' })
  ticker: string;

  @ApiProperty({ example: 10, description: 'Number of shares (always positive, max 8 decimal places)' })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 182.5, description: 'Price per share at execution (max 8 decimal places)' })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: '2024-04-15', description: 'Execution date (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @ApiPropertyOptional({ example: 'Q1 rebalancing buy' })
  @IsOptional()
  @IsString()
  notes?: string;
}
