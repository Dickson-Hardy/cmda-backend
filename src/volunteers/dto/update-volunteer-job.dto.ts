import { PartialType } from '@nestjs/swagger';
import { CreateVolunteerJobDto } from './create-volunteer-job.dto';

export class UpdateVolunteerJobDto extends PartialType(CreateVolunteerJobDto) {}
