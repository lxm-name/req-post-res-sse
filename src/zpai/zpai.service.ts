import { Injectable, Logger, HttpException, HttpStatus} from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { reqteZpaiDto, AnalysisOptionsDto } from './dto/req-zpai.dto';
import { NoteAnalysisResultDto } from './dto/res-zpai.dto';

@Injectable()
export class ZpaiService {
  private readonly logger = new Logger(ZpaiService.name);
  //  替换为实际AI模型接口            豆包/通义/智普 
  private readonly AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'; 
  // 替换为你的AI API密钥
  private readonly AI_API_KEY = '8ce5e21e14f94f03ad5ef2a881cefbb2.nrm7SPMq5Go8Tv0Z'; 
  // AI模型标识
  private readonly AI_MODEL = 'glm-4.5';

  /**
   * 单条笔记AI分析（带重试逻辑）
   * @param prompt AI提示词
   * @param note 单条笔记数据
   * @param options 分析配置
   */
  async analyzeSingleNote(
    prompt: string,
    note: reqteZpaiDto,
    options: AnalysisOptionsDto,
    retryCount = 0,
  ): Promise<NoteAnalysisResultDto> {
    // 构造AI提示词（强制结构化输出格式）
    const aiPrompt = `
      你需要分析以下笔记，严格按照要求输出结果：
      1. 从标题和内容中提取5个维度：提及产品、核心概念、沟通场景、产品卖点、面向人群（每个维度用数组存储，无则空数组）；
      2. 生成"概述"：20字以内，概括笔记的营销核心；
      3. 必须返回JSON格式，不要包含任何多余文字（如解释、代码块标记）；
      4. JSON结构必须与：{
        "noteId": "笔记ID",
        "概述": "20字以内文本",
        "详细分析": {
          "提及产品": [],
          "核心概念": [],
          "沟通场景": [],
          "产品卖点": [],
          "面向人群": []
        }
      } 完全一致。

      待分析笔记：
      - 笔记ID：${note.noteId}
      - 标题：${note.title}
      - 内容：${note.context}

      额外要求：${prompt}
    `.trim();

    // AI请求配置
    const requestConfig: AxiosRequestConfig = {
      url: this.AI_API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.AI_API_KEY}`,
      },
      data: {
        model: this.AI_MODEL,
        messages: [{ role: 'user', content: aiPrompt }],
        stream: false, // 单条分析关闭流式（流式由外层控制）
        temperature: 0.3, // 降低随机性，确保格式稳定
      },
      timeout: options.timeout,
    };

    try {
      this.logger.log(`开始分析笔记：${note.noteId}（第${retryCount + 1}次）`);
     
      const response = await axios(requestConfig);
      
      
      // 解析AI返回的JSON（移除可能的多余字符）
      const rawData = response.data.choices[0].message.content.replace(/[\n\s]+/g, ' ').trim();
      const result = JSON.parse(rawData) as NoteAnalysisResultDto;
      console.log(result)
      
      // 校验返回格式（确保noteId匹配）
      if (result.noteId !== note.noteId) {
        throw new Error(`AI返回的noteId不匹配：${result.noteId} vs ${note.noteId}`);
      }
      return result;

    } catch (error) {
      const axiosError = error as AxiosError;
      // 重试逻辑：未达最大重试次数，且是网络错误/超时
      if (retryCount < options.retryCount && 
          (axiosError.code === 'ECONNABORTED' || !axiosError.response)) {
        this.logger.warn(`笔记${note.noteId}分析失败，将重试（剩余${options.retryCount - retryCount}次）：${axiosError.message}`);
        return this.analyzeSingleNote(prompt, note, options, retryCount + 1);
      }

      // 重试耗尽，抛出最终错误
      const errMsg = `笔记${note.noteId}分析失败（已重试${options.retryCount}次）：${axiosError.message}`;
      this.logger.error(errMsg);
      // throw new TimeoutException(errMsg);
      throw new HttpException('Request timed out', HttpStatus.REQUEST_TIMEOUT);
    }
  }

  /**
   * 并发分析多条笔记
   * @param prompt AI提示词
   * @param notes 笔记数组
   * @param options 分析配置
   */
  async batchAnalyzeNotes(
    prompt: string,
    notes: reqteZpaiDto[],
    options: AnalysisOptionsDto,
  ): Promise<NoteAnalysisResultDto[]> {
    // 用Promise.all并发执行，所有笔记同时分析
    
    const analysisTasks = notes.map(note => 
      this.analyzeSingleNote(prompt, note, options)
    );
    
    return Promise.all(analysisTasks);
  }
  // async batchAnalyzeNotes(
  //   prompt: string,
  //   notes: reqteZpaiDto[],
  //   options: AnalysisOptionsDto,
  //   concurrency = 5 // 默认并发数
  // ): Promise<NoteAnalysisResultDto[]> {
  //   const results: NoteAnalysisResultDto[] = [];
    
  //   // 分批处理
  //   for (let i = 0; i < notes.length; i += concurrency) {
  //     const batch = notes.slice(i, i + concurrency);
  //     const batchResults = await Promise.all(
  //       batch.map(note => this.analyzeSingleNote(prompt, note, options))
  //     );
  //     results.push(...batchResults);
  //   }
  //   return results;
  // }
}
