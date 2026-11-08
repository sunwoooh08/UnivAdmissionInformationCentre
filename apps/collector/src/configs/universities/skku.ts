import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'skku',
  status: 'needs-ocr',
  admissionSite: 'https://admission.skku.edu',
  note: '입시결과 PDF 에 글자 층이 없음 (이미지). 글자 인식(OCR) 필요',
};

export default config;
