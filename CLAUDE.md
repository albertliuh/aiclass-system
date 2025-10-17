# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要规则

- **所有交互必须使用中文输入输出**
- **完成任务后必须执行git提交**
- 代码注释使用中文
- 变量和函数命名可使用英文，但要语义清晰

## Project Overview

This is a WeChat-based online exam/quiz system (微信答题考试系统) that allows users to:
- Import question banks from CSV files
- Take exams with single-choice, multiple-choice, and true/false questions
- Track answer history and adaptively hide questions answered correctly 3 times in a row
- View progress, jump between questions, and get detailed score reports

## Technology Stack

**Target Platform**:
- **优先方式**: 第三方网页（H5响应式页面，可在浏览器中打开）
- 备选方式: WeChat Mini Program or WeChat Official Account H5 page

**Recommended Tech Stack**:
- Frontend: Vue.js or React
- Backend: 可选轻量级后端（Node.js or Python Flask），或纯前端实现
- Storage: LocalStorage for persistence (browser-based)
- UI: Modern, clean design with good mobile UX

## CSV Question Bank Format

The CSV file (`classinput.csv`) contains ~500 questions with the following structure:

**Header row**: `序号,题型,题干,答案选项A,答案选项B,答案选项C,答案选项D,试题(选项E),正确答案`

**Columns**:
1. 序号 (Question ID)
2. 题型 (Question Type): 单选 (single-choice), 多选 (multiple-choice), 判断 (true/false)
3. 题干 (Question text)
4. 答案选项A-D (Answer options A-D)
5. 试题(选项E) (Optional E option)
6. 正确答案 (Correct answer)

**Note**: The CSV file uses Chinese encoding (likely GB2312 or GBK), not UTF-8.

## Core Data Structures

### Question Data Model
```json
{
  "id": "question number",
  "type": "单选/多选/判断",
  "question": "question text",
  "options": {
    "A": "option A content",
    "B": "option B content",
    "C": "option C content",
    "D": "option D content",
    "E": "option E content (optional)"
  },
  "answer": "correct answer",
  "statistics": {
    "consecutiveCorrect": 0,
    "totalAttempts": 0,
    "correctAttempts": 0
  }
}
```

### Exam Record Model
```json
{
  "examId": "exam ID",
  "startTime": "start timestamp",
  "endTime": "end timestamp",
  "answers": [
    {
      "questionId": "question ID",
      "userAnswer": "user's answer",
      "correctAnswer": "correct answer",
      "isCorrect": true/false
    }
  ],
  "score": {
    "total": 500,
    "correct": 450,
    "incorrect": 50,
    "accuracy": "90%"
  }
}
```

## Key Features & Implementation Details

### 1. CSV Import
- Parse CSV with proper Chinese encoding (GB2312/GBK)
- Validate data format and clean entries
- Store in local/cloud database

### 2. Exam Flow
- **Sequential display**: Show questions one by one
- **Dynamic UI**: Render single-choice radio buttons, multiple-choice checkboxes, or true/false radios based on question type
- **Immediate feedback**: After clicking "Next", show:
  - Correct answer
  - Whether user's answer was correct
  - **Cumulative correct/incorrect count** for current exam session
- **Progress indicator**: Display "current/total" (e.g., "1/500")

### 3. Overview Page
- Grid layout showing all 500 questions
- Color coding:
  - 已答题 (Answered): Green
  - 答对 (Correct): Dark green with ✓
  - 答错 (Wrong): Red with ✗
  - 未答题 (Unanswered): Gray
- Click any question number to jump directly to it

### 4. Intelligent Question Filtering
- Track consecutive correct answers for each question
- If a question is answered correctly **N times in a row** across different exams, exclude it from future exams
- **N is configurable** (default: 3)
- Reset consecutive count to 0 if answered incorrectly

### 5. Submit & Scoring
- "Submit" button with confirmation dialog
- Score report showing **current exam session** statistics:
  - Total questions answered
  - Correct/incorrect counts
  - Accuracy percentage
  - Detailed answer review

## Page Structure

1. **Main Page**: Import questions, start exam, view history
2. **Exam Page**: Progress bar, question/options, navigation (Previous/Overview/Next/Submit)
3. **Overview Page**: Grid of all questions with status colors, click to jump
4. **Score Report**: Statistics, detailed answers, wrong answer review, restart option

## Development Phases

### Phase 1: Foundation
1. Set up project framework (WeChat Mini Program or H5)
2. Implement CSV parsing with correct encoding
3. Build basic exam UI
4. Implement sequential question flow

### Phase 2: Core Features
1. Overview page and question jumping
2. Answer recording and validation
3. Submit and score calculation
4. Immediate answer feedback

### Phase 3: Intelligent Features
1. Answer history tracking
2. Smart question filtering (skip questions with 3 consecutive correct answers)
3. Data persistence

### Phase 4: WeChat Deployment
1. WeChat environment adaptation
2. User authorization handling
3. Testing and optimization
4. Production deployment

## Important Considerations

- **Encoding**: CSV file is in Chinese encoding (not UTF-8), ensure proper parsing
- **WeChat Compatibility**: Test thoroughly in WeChat browser environment
- **Mobile UX**: Buttons should be touch-friendly, responsive layout for different screen sizes
- **Performance**: Handle 500 questions efficiently
- **Data Reliability**: Ensure answer records and statistics are saved properly

## Future Enhancements (Optional)

- Practice mode vs. exam mode
- Timed exams
- Wrong answer review sessions
- Data analytics and trending
- Social features (leaderboards, sharing)
