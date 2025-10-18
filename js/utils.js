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
    const questions = [];
    const rows = parseCSVRows(text);

    // 跳过标题行，从第二行开始
    for (let i = 1; i < rows.length; i++) {
        const fields = rows[i];

        if (fields.length < 9) continue; // 确保有足够的字段

        const [id, type, question, optA, optB, optC, optD, optE, answer] = fields;

        // 构建选项对象
        const options = {};

        // 如果是判断题，使用固定的对/错选项
        if (type.trim() === '判断') {
            options.A = '对';
            options.B = '错';
        } else {
            // 其他题型使用CSV中的选项，清理换行符
            if (optA && optA.trim()) options.A = optA.trim().replace(/\n+/g, ' ');
            if (optB && optB.trim()) options.B = optB.trim().replace(/\n+/g, ' ');
            if (optC && optC.trim()) options.C = optC.trim().replace(/\n+/g, ' ');
            if (optD && optD.trim()) options.D = optD.trim().replace(/\n+/g, ' ');
            if (optE && optE.trim()) options.E = optE.trim().replace(/\n+/g, ' ');
        }

        const questionObj = {
            id: id.trim(),
            type: type.trim(),
            question: question.trim().replace(/\n+/g, ' '),
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
 * 解析CSV文本为行数组（处理引号内的换行符）
 * @param {string} text - CSV文本
 * @returns {Array<Array>} 二维数组，每行是一个字段数组
 */
function parseCSVRows(text) {
    const rows = [];
    const lines = text.split('\n');
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                // 检查是否是转义的引号（两个连续引号）
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    currentField += '"';
                    i++; // 跳过下一个引号
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }

        // 如果在引号内，添加换行符并继续下一行
        if (inQuotes) {
            currentField += '\n';
        } else {
            // 行结束，添加最后一个字段
            currentRow.push(currentField.trim());
            currentField = '';

            // 如果这一行有内容，添加到结果中
            if (currentRow.some(field => field.length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
        }
    }

    // 处理最后一行（如果有未完成的）
    if (currentRow.length > 0 || currentField.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow);
        }
    }

    return rows;
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

/**
 * 解析 XLSX 文件（包含单元格颜色信息）
 * @param {File} file - XLSX 文件对象
 * @returns {Promise<Array>} 解析后的题目数组（包含颜色信息）
 */
function parseXLSX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellStyles: true });

                // 获取第一个工作表
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const questions = parseXLSXWorksheet(worksheet, workbook);
                resolve(questions);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * 解析 XLSX 工作表内容
 * @param {Object} worksheet - 工作表对象
 * @param {Object} workbook - 工作簿对象
 * @returns {Array} 题目数组
 */
function parseXLSXWorksheet(worksheet, workbook) {
    const questions = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // 从第二行开始读取（跳过标题行）
    for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
        const row = [];
        const rowColors = [];

        // 读取每一列的值和颜色
        for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
            const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
            const cell = worksheet[cellAddress];

            let value = '';
            let color = null;

            if (cell) {
                value = cell.v || '';

                // 获取单元格背景颜色
                if (cell.s && cell.s.fgColor) {
                    color = rgbToHex(cell.s.fgColor.rgb);
                } else if (cell.s && cell.s.bgColor) {
                    color = rgbToHex(cell.s.bgColor.rgb);
                }
            }

            row.push(value);
            rowColors.push(color);
        }

        if (row.length < 9) continue; // 确保有足够的字段

        const [id, type, question, optA, optB, optC, optD, optE, answer] = row;

        // 构建选项对象（包含颜色）
        const options = {};
        const optionColors = {};

        // 如果是判断题，使用固定的对/错选项
        if (String(type).trim() === '判断') {
            options.A = '对';
            options.B = '错';
            optionColors.A = rowColors[3] || null;
            optionColors.B = rowColors[4] || null;
        } else {
            // 其他题型使用 XLSX 中的选项
            if (optA && String(optA).trim()) {
                options.A = String(optA).trim();
                optionColors.A = rowColors[3] || null;
            }
            if (optB && String(optB).trim()) {
                options.B = String(optB).trim();
                optionColors.B = rowColors[4] || null;
            }
            if (optC && String(optC).trim()) {
                options.C = String(optC).trim();
                optionColors.C = rowColors[5] || null;
            }
            if (optD && String(optD).trim()) {
                options.D = String(optD).trim();
                optionColors.D = rowColors[6] || null;
            }
            if (optE && String(optE).trim()) {
                options.E = String(optE).trim();
                optionColors.E = rowColors[7] || null;
            }
        }

        const questionObj = {
            id: String(id).trim(),
            type: String(type).trim(),
            question: String(question).trim(),
            options: options,
            optionColors: optionColors, // 新增：选项颜色信息
            answer: String(answer).trim(),
            statistics: {
                consecutiveCorrect: 0,
                totalAttempts: 0,
                correctAttempts: 0
            },
            source: 'xlsx' // 标记数据来源
        };

        questions.push(questionObj);
    }

    return questions;
}

/**
 * 将 RGB 对象转换为十六进制颜色代码
 * @param {string} rgb - RGB 字符串（如 "FF0000"）
 * @returns {string} 十六进制颜色代码（如 "#FF0000"）
 */
function rgbToHex(rgb) {
    if (!rgb) return null;

    // 如果已经是十六进制格式
    if (rgb.startsWith('#')) return rgb;

    // 如果是 ARGB 格式（8位），去掉前两位（Alpha通道）
    if (rgb.length === 8) {
        rgb = rgb.substring(2);
    }

    // 添加 # 前缀
    return '#' + rgb.toUpperCase();
}
