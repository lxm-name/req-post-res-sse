import { Controller, Post, Body, Res, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { NotesAnalysisRequestDto } from './dto/req-zpai.dto';
import { ZpaiService } from './zpai.service';
import { StreamService } from './stream.service';
import { StreamChunkDto, NotesAnalysisResponseDto } from './dto/res-zpai.dto';

@Controller('v1/notes') // 接口基础路径
export class ZpaiController {
  constructor(
    private readonly aiAnalysisService: ZpaiService,
    private readonly streamService: StreamService,
  ) {}

  /**
   * 核心接口：笔记AI分析（支持流式/非流式）
   * @param request 分析请求参数（带校验）
   * @param res Express响应对象
   */
  @Post('analysis') // 完整接口路径：/v1/notes/analysis
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true })) // 参数校验+自动类型转换
  async analyzeNotes(
    @Body() request: NotesAnalysisRequestDto,
    @Res() res: Response,
  ) {
    const { options = { stream: true, timeout: 30000, retryCount: 2 } } = request;

    //  流式返回（SSE）：设置响应头，推送流数据
    if (options.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // 禁用反向代理缓冲

      // 获取流式Observable，逐片推送
      const stream$: Observable<StreamChunkDto> = this.streamService.createAnalysisStream(request);

      
      const subscription = stream$.subscribe({
        next: (chunk) => {
          // SSE格式要求：data: {JSON}\n\n
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          // 结束标识：推送后关闭连接
          if (chunk.type === 'complete' || chunk.type === 'error') {
            subscription.unsubscribe();
            res.end();
          }
        },
        error: (err) => {
          res.write(`data: ${JSON.stringify({
            type: 'error' as const,
            data: err.message,
            progress: 0,
          })}\n\n`);
          res.end();
        },
      });

      // 监听客户端断开连接，清理订阅
      res.on('close', () => {
        subscription.unsubscribe();
        res.end();
      });
      return;
    }

    //  非流式返回：等待所有结果，一次性返回JSON
    try {
      const results = await this.aiAnalysisService.batchAnalyzeNotes(
        request.prompt,
        request.notes,
        options,
      );
      const response: NotesAnalysisResponseDto = {
        code: HttpStatus.OK,
        message: '分析成功',
        data: results,
        progress: 100,
      };
      res.status(HttpStatus.OK).json(response);
    } catch (err) {
      const response: NotesAnalysisResponseDto = {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message,
        progress: 0,
      };
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
    }
  }
}