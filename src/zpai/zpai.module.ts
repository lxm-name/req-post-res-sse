import { Module } from '@nestjs/common';
import { ZpaiService } from './zpai.service';
import { ZpaiController } from './zpai.controller';
import { StreamService } from './stream.service';

@Module({
  controllers: [ZpaiController],
  providers: [ZpaiService,StreamService],
})
export class ZpaiModule {}
