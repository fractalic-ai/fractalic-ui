export interface TraceNodeData {
  key: string;
  type: string;
  name?: string;
  role?: string;
  level: number;
  indent?: number;
  content?: string;
  prev?: string;
  next?: string;
  enabled?: boolean;
  id?: string;
  created_by?: string;
  created_by_file?: string;
  source_path?: string;
  source_block_id?: string;
  target_path?: string;
  target_block_id?: string;
  params?: any;
  response_content?: string;
  trace_node_id?: string;
  response_messages?: any[];
}

export interface TraceGroup {
  id: string;
  text: string;
  data: TraceNodeData[];
  parentId?: string;
  traceTree?: TraceTreeNode;
}

export interface TraceTreeNode {
  id: string;
  text: string;
  trace_content?: string;
  children: TraceTreeNode[];
}

export interface ProcessedTraceGroup {
  id: string;
  text: string;
  data: TraceNodeData[];
  children: ProcessedTraceGroup[];
  hasContent: boolean;
}

export interface NodePosition {
  groupId: string;
  element: HTMLElement;
}

export interface DebugPanelProps {
  nodePositions: Map<string, NodePosition[]>;
  isOpen: boolean;
  onToggle: () => void;
  transform: { x: number; y: number; scale: number };
  connectionSegments: any[];
}

export interface PositionedNode {
  id: string;
  key: string;
  groupId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdBy?: string;
}