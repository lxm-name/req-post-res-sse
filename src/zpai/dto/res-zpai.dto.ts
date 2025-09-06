/** 提取的5个核心维度数据 */
export class AnalysisDimensionDto {
  /** 提及产品：品牌、商品等（如["徐福记","山姆"]） */
  '提及产品': string[];

  /** 核心概念：笔记主题、关键理念（如["低卡零食","控糖饮食"]） */
  '核心概念': string[];

  /** 沟通场景：适用场景或使用场景（如["办公室","休闲"]） */
  '沟通场景': string[];

  /** 产品卖点：产品优势或特点（如["低卡","无罪恶感","不挨饿"]） */
  '产品卖点': string[];

  /** 面向人群：目标受众或潜在用户群体（如["减脂人群","办公室人群"]） */
  '面向人群': string[];
}

/** 单条笔记的完整分析结果 */
export class NoteAnalysisResultDto {
  /** 笔记ID（与输入对应） */
  noteId: string;

  /** 营销核心概述（20字以内） */
  '概述': string;

  /** 各维度详细分析 */
  '详细分析': AnalysisDimensionDto;
}

/** 流式返回的分片格式（SSE） */
export class StreamChunkDto {
  /** 分片类型：chunk（数据分片）、complete（结束标识）、error（错误标识） */
  type: 'chunk' | 'complete' | 'error';

  /** 分片数据：单条笔记结果或错误信息 */
  data?: NoteAnalysisResultDto | string;

  /** 处理进度（百分比，0-100） */
  progress: number;
}

/** 非流式返回的完整结果格式 */
export class NotesAnalysisResponseDto {
  code: number; // 状态码：200成功，500失败
  message: string; // 提示信息
  data?: NoteAnalysisResultDto[]; // 所有笔记分析结果
  progress: number; // 进度（固定100）
}