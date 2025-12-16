
export interface PassportAnalysis {
  isValid: boolean;
  score: number; // 0 to 100
  issues: string[];
  suggestions: string[];
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PassportStandard {
  id: string;
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  aspectRatio: number; // width / height
  geminiAspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
}

export interface GridConfig {
  cols: number;
  rows: number;
  label: string;
}

export enum Step {
  SELECT_TYPE = 'SELECT_TYPE',
  UPLOAD = 'UPLOAD',
  CROP = 'CROP',
  EDIT = 'EDIT',
  DOWNLOAD = 'DOWNLOAD'
}
