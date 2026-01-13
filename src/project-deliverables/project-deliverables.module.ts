import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectDeliverablesController } from './project-deliverables.controller';
import { ProjectDeliverablesService } from './project-deliverables.service';
import { ProjectDeliverablesExportService } from './project-deliverables-export.service';
import { ProjectDeliverable, ProjectDeliverableSchema } from './project-deliverables.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectDeliverable.name, schema: ProjectDeliverableSchema },
    ]),
  ],
  controllers: [ProjectDeliverablesController],
  providers: [ProjectDeliverablesService, ProjectDeliverablesExportService],
  exports: [ProjectDeliverablesService],
})
export class ProjectDeliverablesModule {}
