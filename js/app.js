/**
 * Vue 3 应用主逻辑
 */

const { createApp } = Vue;

createApp({
    data() {
        return {
            // 当前页面：home, exam, overview, report
            currentPage: 'home',

            // 题库数据
            questions: [],

            // 考试相关
            currentExamQuestions: [], // 当前考试的题目列表
            currentQuestionIndex: 0,  // 当前题目索引
            userAnswer: '',           // 用户当前答案（单选/判断）或数组（多选）
            currentExamAnswers: [],   // 当前考试的答题记录

            // 答案反馈（紧凑显示在页面上方）
            lastAnswerFeedback: null, // 上一题的答案反馈信息

            // 考试统计
            currentExamCorrect: 0,    // 当前考试正确数
            currentExamIncorrect: 0,  // 当前考试错误数

            // 历史记录
            examHistory: [],

            // 设置
            consecutiveCorrectThreshold: 3, // 连续答对阈值
        };
    },

    computed: {
        /**
         * 当前题目
         */
        currentQuestion() {
            if (this.currentExamQuestions.length === 0) return null;
            return this.currentExamQuestions[this.currentQuestionIndex];
        },

        /**
         * 用户是否已作答
         */
        hasAnswer() {
            if (this.currentQuestion?.type === '多选') {
                return Array.isArray(this.userAnswer) && this.userAnswer.length > 0;
            }
            return this.userAnswer !== '';
        },

        /**
         * 进度百分比
         */
        progressPercent() {
            if (this.currentExamQuestions.length === 0) return 0;
            return ((this.currentQuestionIndex + 1) / this.currentExamQuestions.length) * 100;
        },

        /**
         * 可用题目（排除连续答对N次的题目）
         */
        availableQuestions() {
            return this.questions.filter(q => {
                return q.statistics.consecutiveCorrect < this.consecutiveCorrectThreshold;
            });
        },

        /**
         * 当前考试成绩
         */
        currentExamScore() {
            const total = this.currentExamAnswers.length;
            const correct = this.currentExamCorrect;
            const incorrect = this.currentExamIncorrect;
            const accuracy = calculateAccuracy(correct, total);

            return {
                total,
                correct,
                incorrect,
                accuracy
            };
        }
    },

    methods: {
        /**
         * 处理文件选择
         */
        async handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const questions = await parseCSV(file);

                // 加载已保存的统计数据
                const savedStats = loadFromLocalStorage('questionStats', {});
                questions.forEach(q => {
                    if (savedStats[q.id]) {
                        q.statistics = savedStats[q.id];
                    }
                });

                this.questions = questions;
                saveToLocalStorage('questions', questions);

                alert(`成功导入 ${questions.length} 道题目！`);
            } catch (error) {
                alert('导入失败：' + error.message);
                console.error(error);
            }
        },

        /**
         * 开始考试
         */
        startExam() {
            if (this.availableQuestions.length === 0) {
                alert('没有可用的题目！');
                return;
            }

            // 保持CSV导入的原始顺序
            this.currentExamQuestions = [...this.availableQuestions];
            this.currentQuestionIndex = 0;
            this.currentExamAnswers = [];
            this.currentExamCorrect = 0;
            this.currentExamIncorrect = 0;
            this.resetAnswer();
            this.lastAnswerFeedback = null;

            this.currentPage = 'exam';
        },

        /**
         * 重置答案
         */
        resetAnswer() {
            if (this.currentQuestion?.type === '多选') {
                this.userAnswer = [];
            } else {
                this.userAnswer = '';
            }
        },

        /**
         * 提交答案
         */
        submitAnswer() {
            if (!this.hasAnswer) return;

            const question = this.currentQuestion;
            const userAns = this.currentQuestion.type === '多选'
                ? this.userAnswer.sort().join('')
                : String(this.userAnswer);

            const isCorrect = checkAnswer(this.userAnswer, question.answer, question.type);

            // 记录答题
            this.currentExamAnswers.push({
                questionId: question.id,
                question: question.question,
                userAnswer: userAns,
                correctAnswer: question.answer,
                isCorrect: isCorrect
            });

            // 更新统计
            if (isCorrect) {
                this.currentExamCorrect++;
            } else {
                this.currentExamIncorrect++;
            }

            // 保存答案反馈信息（用于在下一题顶部显示）
            this.lastAnswerFeedback = {
                questionIndex: this.currentQuestionIndex + 1,
                userAnswer: userAns,
                correctAnswer: question.answer,
                isCorrect: isCorrect
            };

            // 检查是否是最后一题
            if (this.currentQuestionIndex < this.currentExamQuestions.length - 1) {
                // 不是最后一题，移动到下一题
                this.currentQuestionIndex++;
                this.resetAnswer();
            } else {
                // 是最后一题，自动交卷
                setTimeout(() => {
                    this.finishExam();
                }, 1500); // 延迟1.5秒，让用户看到最后一题的反馈
            }
        },

        /**
         * 上一题
         */
        previousQuestion() {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex--;
                this.resetAnswer();
                // 清除答案反馈（因为是回退）
                this.lastAnswerFeedback = null;
            }
        },

        /**
         * 显示总览
         */
        showOverview() {
            this.currentPage = 'overview';
        },

        /**
         * 返回答题
         */
        backToExam() {
            this.currentPage = 'exam';
        },

        /**
         * 跳转到指定题目
         */
        jumpToQuestion(index) {
            this.currentQuestionIndex = index;
            this.resetAnswer();
            this.lastAnswerFeedback = null;
            this.currentPage = 'exam';
        },

        /**
         * 获取题目状态
         */
        getQuestionStatus(index) {
            const answer = this.currentExamAnswers[index];
            if (!answer) return 'unanswered';
            return answer.isCorrect ? 'correct' : 'incorrect';
        },

        /**
         * 交卷
         */
        finishExam() {
            if (this.currentExamAnswers.length === 0) {
                alert('您还没有答题！');
                return;
            }

            if (!confirm('确定要交卷吗？')) {
                return;
            }

            // 更新题目统计信息
            this.updateQuestionStats();

            // 保存考试记录
            const examRecord = {
                examId: Date.now(),
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                answers: this.currentExamAnswers,
                score: this.currentExamScore
            };

            this.examHistory.unshift(examRecord);
            saveToLocalStorage('examHistory', this.examHistory);

            // 显示成绩报告
            this.currentPage = 'report';
        },

        /**
         * 更新题目统计信息
         */
        updateQuestionStats() {
            this.currentExamAnswers.forEach(answer => {
                const question = this.questions.find(q => q.id === answer.questionId);
                if (!question) return;

                question.statistics.totalAttempts++;

                if (answer.isCorrect) {
                    question.statistics.correctAttempts++;
                    question.statistics.consecutiveCorrect++;
                } else {
                    // 答错时重置连续答对次数
                    question.statistics.consecutiveCorrect = 0;
                }
            });

            // 保存统计数据
            const stats = {};
            this.questions.forEach(q => {
                stats[q.id] = q.statistics;
            });
            saveToLocalStorage('questionStats', stats);
            saveToLocalStorage('questions', this.questions);
        },

        /**
         * 返回首页
         */
        backToHome() {
            this.currentPage = 'home';
        },

        /**
         * 格式化时间
         */
        formatTime(timestamp) {
            return formatTime(timestamp);
        },

        /**
         * 清空所有数据
         */
        clearAllData() {
            if (!confirm('确定要清空所有数据吗？\n\n将清除：\n- 题库数据\n- 答题历史\n- 题目统计信息\n- 所有设置\n\n此操作无法撤销！')) {
                return;
            }

            // 清除LocalStorage中的所有数据
            localStorage.removeItem('questions');
            localStorage.removeItem('questionStats');
            localStorage.removeItem('examHistory');
            localStorage.removeItem('consecutiveCorrectThreshold');

            // 重置Vue数据
            this.questions = [];
            this.examHistory = [];
            this.consecutiveCorrectThreshold = 3;
            this.currentExamQuestions = [];
            this.currentExamAnswers = [];
            this.currentQuestionIndex = 0;
            this.currentExamCorrect = 0;
            this.currentExamIncorrect = 0;
            this.lastAnswerFeedback = null;

            // 重置文件输入
            const fileInput = document.getElementById('csvFile');
            if (fileInput) {
                fileInput.value = '';
            }

            alert('所有数据已清空！');
        },

        /**
         * 加载保存的数据
         */
        loadSavedData() {
            // 加载题库
            const savedQuestions = loadFromLocalStorage('questions', []);
            if (savedQuestions.length > 0) {
                this.questions = savedQuestions;
            }

            // 加载考试历史
            const savedHistory = loadFromLocalStorage('examHistory', []);
            if (savedHistory.length > 0) {
                this.examHistory = savedHistory;
            }

            // 加载设置
            const savedThreshold = loadFromLocalStorage('consecutiveCorrectThreshold', 3);
            this.consecutiveCorrectThreshold = savedThreshold;
        }
    },

    watch: {
        /**
         * 监听阈值变化，保存到LocalStorage
         */
        consecutiveCorrectThreshold(newVal) {
            saveToLocalStorage('consecutiveCorrectThreshold', newVal);
        }
    },

    mounted() {
        // 加载保存的数据
        this.loadSavedData();
    }
}).mount('#app');
