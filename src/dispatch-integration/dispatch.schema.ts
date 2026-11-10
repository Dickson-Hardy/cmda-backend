import { Prop,Schema,SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
@Schema({collection:'dispatch_member_syncs',timestamps:true,versionKey:false})
export class DispatchMemberSync extends Document {
 @Prop({type:String}) _id:string;
 @Prop({default:0}) revision:number;
 @Prop({default:''}) fingerprint:string;
 @Prop({type:Object}) snapshot:Record<string,any>;
 @Prop() eventId:string;
 @Prop({enum:['pending','processing','delivered','failed'],default:'pending'}) status:string;
 @Prop({default:0}) attempts:number;
 @Prop({default:Date.now}) nextAttemptAt:Date;
 @Prop() claimedAt:Date;
 @Prop() claimToken:string;
 @Prop() lastError:string;
 @Prop() deliveredAt:Date;
 @Prop() dispatchContactId:string;
}
export const DispatchMemberSyncSchema=SchemaFactory.createForClass(DispatchMemberSync);
DispatchMemberSyncSchema.index({status:1,nextAttemptAt:1});
@Schema({collection:'dispatch_connector_states',versionKey:false})
export class DispatchConnectorState extends Document {
 @Prop({type:String}) _id:string;
 @Prop() holder:string;
 @Prop() leaseUntil:Date;
 @Prop() cursorAt:Date;
 @Prop({default:''}) cursorId:string;
 @Prop({default:false}) fullRunning:boolean;
 @Prop({default:''}) fullCursor:string;
 @Prop() lastFullAt:Date;
 @Prop({default:false}) pruneRunning:boolean;
 @Prop({default:''}) pruneCursor:string;
 @Prop() rescanToken:string;
 @Prop() activeRescanToken:string;
 @Prop() lastCollectionAt:Date;
 @Prop() lastDeliveryAt:Date;
 @Prop() lastFeedbackAt:Date;
 @Prop() lastError:string;
}
export const DispatchConnectorStateSchema=SchemaFactory.createForClass(DispatchConnectorState);
@Schema({collection:'dispatch_feedback',timestamps:true,versionKey:false})
export class DispatchFeedback extends Document {
 @Prop({type:String}) _id:string;
 @Prop({required:true}) memberId:string;
 @Prop() sequence:number;
 @Prop() email:string;
 @Prop() type:string;
 @Prop() occurredAt:Date;
 @Prop() sourceRevision:number;
 @Prop() messageId:string;
 @Prop() providerMessageId:string;
 @Prop() payloadHash:string;
 @Prop({default:'received'}) status:string;
 @Prop() appliedAt:Date;
}
export const DispatchFeedbackSchema=SchemaFactory.createForClass(DispatchFeedback);
DispatchFeedbackSchema.index({memberId:1,occurredAt:-1});
DispatchFeedbackSchema.index({type:1,occurredAt:-1});
@Schema({collection:'dispatch_request_nonces',versionKey:false})
export class DispatchNonce extends Document {@Prop({type:String}) _id:string;@Prop() expiresAt:Date;}
export const DispatchNonceSchema=SchemaFactory.createForClass(DispatchNonce);
DispatchNonceSchema.index({expiresAt:1},{expireAfterSeconds:0});
