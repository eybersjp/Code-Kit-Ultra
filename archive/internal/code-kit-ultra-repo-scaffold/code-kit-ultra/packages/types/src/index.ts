export type ExecutionMode = 'safe' | 'balanced' | 'god';

export type GateName =
  | 'clarity'
  | 'scope'
  | 'architecture'
  | 'build'
  | 'qa'
  | 'security'
  | 'cost'
  | 'deployment'
  | 'launch';

export interface ProjectIdea {
  title: string;
  summary: string;
  mode: ExecutionMode;
}

export interface GateResult {
  gate: GateName;
  status: 'pass' | 'needs_review' | 'blocked';
  risks: string[];
  recommendation: 'continue' | 'revise' | 'ask_user' | 'stop';
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  triggers: string[];
}
