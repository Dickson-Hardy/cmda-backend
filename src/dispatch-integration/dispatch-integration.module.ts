import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User,UserSchema } from '../users/schema/users.schema';
import { UserSettings,UserSettingsSchema } from '../users/schema/user-settings.schema';
import { DispatchMemberSync,DispatchMemberSyncSchema,DispatchConnectorState,DispatchConnectorStateSchema,DispatchFeedback,DispatchFeedbackSchema,DispatchNonce,DispatchNonceSchema } from './dispatch.schema';
import { DispatchIntegrationService } from './dispatch-integration.service';
import { DispatchFeedbackGuard } from './dispatch-feedback.guard';
import { DispatchInboundController,DispatchAdminController } from './dispatch-integration.controller';
@Module({imports:[MongooseModule.forFeature([{name:User.name,schema:UserSchema},{name:UserSettings.name,schema:UserSettingsSchema},{name:DispatchMemberSync.name,schema:DispatchMemberSyncSchema},{name:DispatchConnectorState.name,schema:DispatchConnectorStateSchema},{name:DispatchFeedback.name,schema:DispatchFeedbackSchema},{name:DispatchNonce.name,schema:DispatchNonceSchema}])],controllers:[DispatchInboundController,DispatchAdminController],providers:[DispatchIntegrationService,DispatchFeedbackGuard],exports:[DispatchIntegrationService]})
export class DispatchIntegrationModule {}
