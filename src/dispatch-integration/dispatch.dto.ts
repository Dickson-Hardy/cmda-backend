import { IsEmail,IsIn,IsInt,IsISO8601,IsOptional,IsString,IsUUID,Matches,Max,MaxLength,Min } from 'class-validator';
export class DispatchFeedbackDto {
 @IsUUID() eventId:string;
 @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) sequence:number;
 @Matches(/^[a-f0-9]{24}$/) memberId:string;
 @IsEmail() @MaxLength(320) email:string;
 @IsIn(['marketing.unsubscribed','marketing.resubscribed','email.bounced','email.complained','email.delivered']) type:string;
 @IsISO8601({strict:true}) occurredAt:string;
 @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) sourceRevision:number;
 @IsOptional() @IsUUID() messageId?:string;
 @IsOptional() @IsString() @MaxLength(200) providerMessageId?:string;
}
export class DispatchControlDto {@IsIn(['rescan','status','retry']) action:'rescan'|'status'|'retry'; @IsOptional() @Matches(/^[a-f0-9]{24}$/) memberId?:string;}
export class DispatchMemberActionDto {@IsIn(['retry']) action:'retry';}
