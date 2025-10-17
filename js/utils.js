/**
 * 工具函数集合
 */

/**
 * 解析CSV文件
 * @param {File} file - CSV文件对象
 * @returns {Promise<Array>} 解析后的题目数组
 */
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const questions = parseCSVText(text);
                resolve(questions);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };

        // 尝试使用GB2312/GBK编码读取
        reader.readAsText(file, 'GBK');
    });
}

/**
 * 解析CSV文本内容
 * @param {string} text - CSV文本内容
 * @returns {Array} 题目数组
 */
function parseCSVText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const questions = [];

    // 跳过标题行，从第二行开始
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 按逗号分割，但要注意引号内的逗号
        const fields = parseCSVLine(line);

        if (fields.length < 9) continue; // 确保有足够的字段

        const [id, type, question, optA, optB, optC, optD, optE, answer] = fields;

        // 构建选项对象
        const options = {};

        // 如果是判断题，使用固定的对/错选项
        if (type.trim() === '判断') {
            options.A = '对';
            options.B = '错';
        } else {
            // 其他题型使用CSV中的选项
            if (optA && optA.trim()) options.A = optA.trim();
            if (optB && optB.trim()) options.B = optB.trim();
            if (optC && optC.trim()) options.C = optC.trim();
            if (optD && optD.trim()) options.D = optD.trim();
            if (optE && optE.trim()) options.E = optE.trim();
        }

        const questionObj = {
            id: id.trim(),
            type: type.trim(),
            question: question.trim(),
            options: options,
            answer: answer.trim(),
            statistics: {
                consecutiveCorrect: 0,
                totalAttempts: 0,
                correctAttempts: 0
            }
        };

        questions.push(questionObj);
    }

    return questions;
}

/**
 * 解析CSV行，处理引号和逗号
 * @param {string} line - CSV行
 * @returns {Array} 字段数组
 */
function parseCSVLine(line) {
    const fields = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(field);
            field = '';
        } else {
            field += char;
        }
    }

    // 添加最后一个字段
    fields.push(field);

    return fields;
}

/**
 * 格式化时间
 * @param {string|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化的时间字符串
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 洗牌算法 - 随机打乱数组
 * @param {Array} array - 要打乱的数组
 * @returns {Array} 打乱后的新数组
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * 保存数据到LocalStorage
 * @param {string} key - 键名
 * @param {*} value - 值（会被JSON序列化）
 */
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('保存到LocalStorage失败:', error);
    }
}

/**
 * 从LocalStorage读取数据
 * @param {string} key - 键名
 * @param {*} defaultValue - 默认值
 * @returns {*} 读取的值
 */
function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.error('从LocalStorage读取失败:', error);
        return defaultValue;
    }
}

/**
 * 检查答案是否正确
 * @param {string|Array} userAnswer - 用户答案
 * @param {string} correctAnswer - 正确答案
 * @param {string} questionType - 题目类型
 * @returns {boolean} 是否正确
 */
function checkAnswer(userAnswer, correctAnswer, questionType) {
    if (questionType === '多选') {
        // 多选题需要排序后比较
        const userAns = Array.isArray(userAnswer) ? userAnswer.sort().join('') : '';
        const correctAns = correctAnswer.split('').sort().join('');
        return userAns === correctAns;
    } else {
        // 单选题和判断题
        return String(userAnswer) === String(correctAnswer);
    }
}

/**
 * 计算正确率
 * @param {number} correct - 正确数
 * @param {number} total - 总数
 * @returns {string} 正确率字符串（如"85.5%"）
 */
function calculateAccuracy(correct, total) {
    if (total === 0) return '0%';
    const accuracy = (correct / total * 100).toFixed(1);
    return accuracy + '%';
}
