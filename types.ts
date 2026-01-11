
export interface ProcessedImage {
  id: string;
  originalName: string;
  quadrants: string[]; // Base64 data URLs
}

export interface FileWithPreview extends File {
  preview?: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
