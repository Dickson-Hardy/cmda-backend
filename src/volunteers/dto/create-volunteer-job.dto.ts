import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum VolunteerJobCategory {
  MISSIONS = 'missions',
  LOCAL_ORGANIZING = 'local_organizing',
  ADVOCACY = 'advocacy',
  OTHER = 'other',
}

export class CreateVolunteerJobDto {
  @ApiProperty({ example: 'Community Health Outreach Volunteer' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Join our team to provide health education in underserved communities.' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'Conduct health screenings, distribute educational materials.' })
  @IsOptional()
  @IsString()
  responsibilities?: string;

  @ApiPropertyOptional({ example: 'Medical background preferred but not required.' })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ example: 'Send your CV to volunteer@cmda.org' })
  @IsOptional()
  @IsString()
  applicationInstructions?: string;

  @ApiPropertyOptional({ example: 'Lagos, Nigeria' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: VolunteerJobCategory, example: VolunteerJobCategory.MISSIONS })
  @IsOptional()
  @IsEnum(VolunteerJobCategory)
  category?: VolunteerJobCategory;

  @ApiPropertyOptional({ example: 'CMDA Nigeria' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  companyLogo?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  closingDate?: string;
}
