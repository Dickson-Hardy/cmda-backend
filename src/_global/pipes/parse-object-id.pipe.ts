import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value) || new Types.ObjectId(value).toString() !== value) {
      throw new BadRequestException('Invalid identifier');
    }
    return value;
  }
}
