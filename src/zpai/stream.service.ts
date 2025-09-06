import { Injectable, Logger } from '@nestjs/common';
import { Observable, interval } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { ZpaiService } from './zpai.service';
import { NotesAnalysisRequestDto } from './dto/req-zpai.dto';
import { StreamChunkDto, NoteAnalysisResultDto } from './dto/res-zpai.dto';


@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);

  constructor(private readonly aiAnalysisService: ZpaiService) {}

  /**
   * 生成流式分析结果（SSE格式）
   * @param request 分析请求参数
   */
  createAnalysisStream(
    request: NotesAnalysisRequestDto,
  ): Observable<StreamChunkDto> {
    const { prompt, notes, options = {stream : true,retryCount : 2,timeout : 130000} } = request;
    const totalNotes = notes.length;
    let completedCount = 0;
    let analysisResults: NoteAnalysisResultDto[] = [];
    let isAnalysisDone = false;
    let errorMsg = '';

    // 启动并发分析（后台执行，不阻塞流）
    this.aiAnalysisService.batchAnalyzeNotes(prompt, notes, options)
      .then(results => {
        analysisResults = results;
        completedCount = totalNotes;
        isAnalysisDone = true;
        this.logger.log(`所有${totalNotes}条笔记分析完成`);
      })
      .catch(err => {
        errorMsg = err.message;
        isAnalysisDone = true;
        this.logger.error(`流式分析失败：${err.message}`);
      });
    // 生成SSE流：定时推送进度和结果
    return interval(500) // 每500ms推送一次
      .pipe(
        // takeWhile(() => !isAnalysisDone || completedCount < totalNotes),
        map(() => {
            
          // 处理错误场景
          if (errorMsg) {
            return {
              type: 'error' as const,
              data: errorMsg,
              progress: 0,
            };
          }

          // 分析完成：推送所有结果+结束标识
          if (isAnalysisDone && completedCount === totalNotes) {
            // 首次推送完整结果（仅一次）
            if (analysisResults.length > 0) {
              const firstResult = analysisResults.shift()!;
              return {
                type: 'chunk' as const,
                data: firstResult,
                progress: 100,
              };
            }
            // 所有结果推送完，返回结束标识
            return {
              type: 'complete' as const,
              progress: 100,
            };
          }

          // 分析中：推送当前进度（无数据）
          return {
            type: 'chunk' as const,
            progress: Math.round((completedCount / totalNotes) * 100),
          };
        }),
      );
  }
}