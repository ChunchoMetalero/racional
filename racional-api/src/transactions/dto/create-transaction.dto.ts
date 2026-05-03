import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: 1500.0, description: 'Amount (always positive, max 2 decimal places)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2024-04-15', description: 'Business date (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @ApiPropertyOptional({ example: 'Monthly savings deposit' })
  @IsOptional()
  @IsString()
  notes?: string;
}
