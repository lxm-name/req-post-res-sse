import { IsArray, IsBoolean, isNotEmpty, IsNotEmpty, IsNumber, IsObject, IsOptional } from "class-validator";

export class reqteZpaiDto {
    @IsNotEmpty({message:'noteid不能为空'})
    noteId:string;

    @IsNotEmpty({message:'笔记标题不能为空'})
    title:string

    @IsNotEmpty({message:'笔记内容不能为空'})
    context:string
}

/** 分析配置选项（流式/超时/重试） */
export class AnalysisOptionsDto {
  @IsOptional()
  @IsBoolean({ message: 'stream必须是布尔值' })
  stream = true; // 默认开启流式返回

  @IsOptional()
  @IsNumber({}, { message: 'timeout必须是数字（毫秒）' })
  timeout = 30000; // 默认超时30秒

  @IsOptional()
  @IsNumber({}, { message: 'retryCount必须是数字' })
  retryCount = 2; // 默认重试2次
}

export class NotesAnalysisRequestDto{
    @IsNotEmpty({ message: 'AI提示词prompt不能为空' })
    prompt: string;

    @IsNotEmpty({ message: '待分析笔记数组notes不能为空' })
    @IsArray({ message: 'notes必须是数组' })
    notes: reqteZpaiDto[];

    @IsOptional()
    @IsObject({ message: 'options必须是对象' })
    options?: AnalysisOptionsDto;

}