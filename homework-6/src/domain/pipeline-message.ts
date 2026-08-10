export type PipelineMessageType = "transaction" | "pipeline_summary";

export interface PipelineMessage<TData> {
  message_id: string;
  timestamp: string;
  source_agent: string;
  target_agent: string;
  message_type: PipelineMessageType;
  data: TData;
}
