import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static'; // 引入静态资源模块
import { join } from 'path'; // Node 内置路径处理模块
import { ZpaiModule } from './zpai/zpai.module';

@Module({
  imports: [ZpaiModule,ServeStaticModule.forRoot({
    rootPath:join(__dirname, '..', 'static'),
    serveRoot: '/',
     exclude: ['/v1/*'],
  })],
  controllers: [],
  providers: [],
})
export class AppModule {}
