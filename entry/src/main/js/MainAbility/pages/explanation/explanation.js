import router from '@system.router';
import file from '@system.file';

export default {
    data: {
        word: '',
        showWord:"",
        //idxContent:'',
        explanation:"",
        dataList:[],
        fileContent: '',
        exchange:""
    },
    onInit() {
        console.info('详情页已加载');
        //获取单词首字母，确定文件名
        var raw = this.word;
        this.word = this.trimQuotes(raw);
        this.showWord = this.word;
        console.info('search_word：'+ this.word);
        var firstChar = this.word.charAt(0).toLowerCase();
        //console.info('firstChar：'+firstChar);
        var fileName = (firstChar >= 'a' && firstChar <= 'z') ? `${firstChar}.idx` : 'other.idx';
        var fileName_ = (firstChar >= 'a' && firstChar <= 'z') ? `${firstChar}.txt` : 'other.txt';
        console.info('fileName：'+fileName);
        var fileUri ='internal://app/rawfile/'+fileName;
        var fileUri_ ='internal://app/rawfile/'+fileName_;
        console.info('fileUri：'+fileUri);
        this.findWordInIdx(fileUri,fileUri_)
    },
    onShow() {
        this.$refs.listObj.rotation({focus: true})
    },
    onHide() {
        this.$refs.listObj.rotation({focus: false})
        this.fileContent = null;
    },
    //右滑返回
    onSwipe(e){
        // 判断滑动方向是否为 'right'
        if (e.direction === 'right' && e.distance > 160) {
            console.info('检测到右滑，准备返回');
            router.replace({
                uri: 'pages/index/index'
            });
        }
    },
    //在文件内容中查找单词
    findWordInIdx(fileUri,fileUri_) {
        console.info("findWordInIdx start");
        file.readArrayBuffer({
            uri: fileUri,
            position:0,
            success: (data) => {
                // console.info('call readArrayBuffer success: ' + data.buffer);
                console.info('call readArrayBuffer index success: ');
                var uint8Array = new Uint8Array(data.buffer);
                var text = this.decodeUTF8_(uint8Array);
                console.info("fileUri_:"+fileUri_);
                //console.info('文件内容：'+text);
                var indexObject = this.splitIndex(text);
                data = null;
                uint8Array = null;
                text = null;
                if (indexObject) {
                    console.info(indexObject.pos + " & " + indexObject.length);
                    //read content
                    this.readArrayBuffer(fileUri_, indexObject.pos, indexObject.length);
                    // 继续后续逻辑
                }else {
                    console.error('splitIndex 返回 null，未找到单词: ' + this.word + "尝试查找变形");
                    this.findExchange()
                }
            },
            fail: (data, code) => {
                console.error('call fail callback fail1, code: ' + code + ', data: ' + data);
                this.explanation = "未找到该单词"
                var totalHeight = this.estimateTextHeight(this.explanation,30,326,1.4,30);
                let list = [];
                list.push({
                    text: this.explanation,
                    height: totalHeight
                });
                this.dataList = list;
            },
        });
    },
    findExchange(){
        var firstChar = this.word.charAt(0).toLowerCase();
        var fileName = (firstChar >= 'a' && firstChar <= 'z') ? `${firstChar}_exchange.idx` : 'other_exchange.idx';
        var fileUri ='internal://app/rawfile/'+fileName;
        file.readArrayBuffer({
            uri: fileUri,
            position: 0,
            success: (data) => {
                console.info('call readArrayBuffer index success');
                var uint8Array = new Uint8Array(data.buffer);
                var text = this.decodeUTF8_(uint8Array);
                var indexObject = this.splitIndex_(text);
                data = null;
                uint8Array = null;
                text = null;
                if (indexObject) {
                    console.info('数组内容: ' + indexObject.join(' | '));
                    this.exchange = this.formatExchanges(indexObject);
                    this.word = indexObject[1];
                    console.info('search_word_：'+ this.word);
                    var firstChar = this.word.charAt(0).toLowerCase();
                    //console.info('firstChar：'+firstChar);
                    var fileName = (firstChar >= 'a' && firstChar <= 'z') ? `${firstChar}.idx` : 'other.idx';
                    var fileName_ = (firstChar >= 'a' && firstChar <= 'z') ? `${firstChar}.txt` : 'other.txt';
                    console.info('fileName：'+fileName);
                    var fileUri ='internal://app/rawfile/'+fileName;
                    var fileUri_ ='internal://app/rawfile/'+fileName_;
                    console.info('fileUri：'+fileUri);
                    this.findWordInIdx(fileUri,fileUri_)
                }else {
                    console.error('splitIndex 返回 null，未找到单词: ' + this.word);
                    this.explanation = "未找到该单词"
                    var totalHeight = this.estimateTextHeight(this.explanation,30,326,1.4,30);
                    let list = [];
                    list.push({
                        text: this.explanation,
                        height: totalHeight
                    });
                    this.dataList = list;
                }
            },
            fail: (data, code) => {
                console.error('call fail callback fail1, code: ' + code + ', data: ' + data);
                this.explanation = "未找到该单词"
                var totalHeight = this.estimateTextHeight(this.explanation,30,326,1.4,30);
                let list = [];
                list.push({
                    text: this.explanation,
                    height: totalHeight
                });
                this.dataList = list;
            },
        });
    },
    splitIndex(text) {
        if (!text) return null;

        var target = this.word.toLowerCase() + ',';
        var targetLen = target.length;
        var textLen = text.length;
        var CHUNK = 16384;   // 每块 16KB，可按需调整
        var offset = 0;

        while (offset < textLen) {
            var end = offset + CHUNK;

            if (end >= textLen) {
                end = textLen;
            } else {
                // 向后扫描到行尾，确保一行不被拆成两块
                // 这里的 charCodeAt 只在块边界附近调用，开销极小
                while (end < textLen && text.charCodeAt(end) !== 10) {
                    end++;
                }
                if (end < textLen) end++;  // 包含换行符
            }

            // 取出这一块，切分行
            var chunk = text.substring(offset, end);
            var lines = chunk.split('\n');

            // 只在这一块内逐行查找
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.length >= targetLen &&
                    line.substring(0, targetLen) === target) {
                    var rest = line.substring(targetLen);
                    var parts = rest.split(',');
                    return { pos: parts[0], length: parts[1] };
                }
            }

            // 这一块处理完，释放掉，进入下一块
            chunk = null;
            lines = null;
            offset = end;
        }

        console.info('未找到匹配');
        return null;
    },
    splitIndex_(text) {
        if (!text) return null;

        var target = this.word.toLowerCase() + ',';
        var targetLen = target.length;
        var textLen = text.length;
        var CHUNK = 16384;
        var offset = 0;

        while (offset < textLen) {
            var end = offset + CHUNK;

            if (end >= textLen) {
                end = textLen;
            } else {
                while (end < textLen && text.charCodeAt(end) !== 10) {
                    end++;
                }
                if (end < textLen) end++;
            }

            var chunk = text.substring(offset, end);
            var lines = chunk.split('\n');

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.length >= targetLen &&
                    line.substring(0, targetLen) === target) {
                    // 匹配成功，切分整行返回字段数组
                    return this.splitLineByComma(line, 0, line.length);
                }
            }

            chunk = null;
            lines = null;
            offset = end;
        }

        console.info('未找到匹配');
        return null;
    },
    /**
     * 从 text 中截取 [start, end) 范围的子串，按逗号切分成数组
     * 避免使用 split，逐字符扫描，减少临时字符串
     */
    splitLineByComma(text, start, end) {
        var parts = [];
        var fieldStart = start;

        for (var i = start; i <= end; i++) {
            if (i === end || text.charAt(i) === ',') {
                // 提取 [fieldStart, i) 作为一个字段
                parts.push(text.substring(fieldStart, i));
                fieldStart = i + 1;
            }
        }

        return parts;
    },



    //删去输入文本的“"
    trimQuotes(str) {
        // 1. 参数校验
        if (!str || typeof str !== 'string') {
            return str;
        }
        // 2. 检查首尾是否为双引号
        var first = str.charAt(0);
        var last = str.charAt(str.length - 1);
        if (first === '"' && last === '"') {
            // 如果首尾都是双引号，截取中间部分
            return str.substring(1, str.length - 1);
        } else {
            // 否则原样返回
            return str;
        }
    },
    //根据索引读取txt
    readArrayBuffer(fileUri, pos, len) {
        // 只有当 len 有效（非空、非 undefined）时才添加 length 字段
        file.readArrayBuffer({
            uri: fileUri,
            position:parseInt(pos, 10),
            length:parseInt(len, 10),
            success: (data) => {
                // console.info('call readArrayBuffer success: ' + data.buffer);
                console.info('call readArrayBuffer content success: ');
                var uint8Array = new Uint8Array(data.buffer);
                var text = this.decodeUTF8(uint8Array);
                console.info(pos + " & " + len);

                this.fileContent = text;
                console.info("read content finished");
                this.splitExplanation(); // 现在 fileContent 已有值
                let list = [];
                var finalText = '';
                if (this.exchange) {
                    if (this.exchange.length > 0) {
                        finalText = this.exchange + '\n' + this.explanation;
                    } else {
                        finalText = this.explanation;
                    }
                } else {
                    finalText = this.explanation;
                }
                var totalHeight = this.estimateTextHeight(finalText,30,326,1.4,30);
                list.push({
                    text:finalText,
                    height: totalHeight
                });
                this.dataList = list;
            },
            fail: function(data, code) {
                console.error('call fail callback fail, code: ' + code + ', data: ' + data);
            },
        });
    },
    // 纯 JS 实现的 UTF-8 解码器（兼容所有环境，支持中文）
    decodeUTF8(uint8Array) {
        var str = '';
        var i = 0;
        var len = uint8Array.length;

        while (i < len) {
            var byte1 = uint8Array[i++];

            // 1. 单字节字符 (0xxxxxxx) -> 直接转换 (英文/数字)
            if (byte1 < 128) {
                str += String.fromCharCode(byte1);
            }
            // 2. 双字节字符 (110xxxxx) -> 用于部分欧洲文字
            else if (byte1 > 191 && byte1 < 224) {
                var byte2 = uint8Array[i++];
                // 取出有效位拼接
                var codePoint = ((byte1 & 31) << 6) | (byte2 & 63);
                str += String.fromCharCode(codePoint);
            }
            // 3. 三字节字符 (1110xxxx) -> 用于中文、日文、韩文等 (重点)
            else if (byte1 > 223 && byte1 < 240) {
                var byte2 = uint8Array[i++];
                var byte3 = uint8Array[i++];
                // 取出有效位拼接 (16位Unicode码点)
                var codePoint = ((byte1 & 15) << 12) | ((byte2 & 63) << 6) | (byte3 & 63);
                str += String.fromCharCode(codePoint);
            }
            // 4. 四字节字符 (11110xxx) -> 用于表情符号等 (极少出现)
            else if (byte1 > 239 && byte1 < 248) {
                var byte2 = uint8Array[i++];
                var byte3 = uint8Array[i++];
                var byte4 = uint8Array[i++];
                // 计算码点（可能需要高位代理对，此处简化处理）
                var codePoint = ((byte1 & 7) << 18) | ((byte2 & 63) << 12) | ((byte3 & 63) << 6) | (byte4 & 63);
                str += String.fromCharCode(codePoint);
            }
        }
        return str;
    },
    decodeUTF8_(uint8Array) {
        var len = uint8Array.length;
        var str = '';
        var CHUNK = 4096;
        for (var i = 0; i < len; i += CHUNK) {
            var end = i + CHUNK < len ? i + CHUNK : len;
            // subarray 共享底层 buffer，不复制数据
            var chunk = uint8Array.subarray(i, end);
            str += String.fromCharCode.apply(null, chunk);
        }
        return str;
    },
    splitExplanation() {
        var content = this.fileContent || '';
        var split_explanation = content.split(',');
        var parts = [];
        var tagParts = [];
        // ========== 变形编码映射 ==========
        var exchangeMap1 = [
            { code: 'p:', label: '过去式：' },
            { code: 'd:', label: '过去分词：' },
            { code: 'i:', label: '现在分词：' },
            { code: '3:', label: '三单：' },
            { code: 'r:', label: '比较级：' },
            { code: 't:', label: '最高级：' },
            { code: 's:', label: '复数：' },
            { code: '0:', label: '原形：' },
            { code: '1:', label: '原形变形：' }
        ];
        // ========== 考试标签映射 ==========
        var exchangeMap2 = [
            { code: 'zk', label: '中考' },
            { code: 'gk', label: '高考' },
            { code: 'cet4', label: '四级' },
            { code: 'cet6', label: '六级' },
            { code: 'ky', label: '考研' },
            { code: 'toefl', label: '托福' },
            { code: 'gre', label: '美研' },
            { code: 'ielts', label: '雅思' }
        ];
        var fieldMap = [
            { index: 1, label: '音标' },
            { index: 3, label: '中文释义' },
            { index: 2, label: '英文释义' },
            { index: 4, label: '词性(pos)' },
            { index: 5, label: '柯林斯星级' },
            { index: 6, label: 'oxford' },
            { index: 7, label: 'tag' },
            { index: 8, label: '英国国家语料库词频顺序' },
            { index: 9, label: '当代语料库词频顺序' },
            { index: 10, label: '变形' },
            { index: 11, label: '例句' }
        ];
        for (var i = 0; i < fieldMap.length; i++) {
            var field = fieldMap[i];
            var value = split_explanation[field.index];
            if (this.isMeaningful(value)) {
                var trimmed = this.replaceNewlines(value).trim();
                var text;
                // ✅ 音标特殊处理
                if (field.index === 1) {
                    text = field.label + '：/ ' + trimmed + ' /';
                }
                // ✅ 变形字段：在 push 之前直接格式化
                else if (field.index === 10) {
                    var formatted = trimmed;
                    formatted = formatted.split('/').join('； ');
                    for (var k = 0; k < exchangeMap1.length; k++) {
                        formatted = formatted.split(exchangeMap1[k].code).join(exchangeMap1[k].label);
                    }
                    text = field.label + '：' + formatted;
                }
                // ✅ tag 字段：在 push 之前直接替换标签
                else if (field.index === 7) {
                    var tagFormatted = trimmed;
                    for (var m = 0; m < exchangeMap2.length; m++) {
                        tagFormatted = tagFormatted.split(exchangeMap2[m].code).join(exchangeMap2[m].label);
                    }
                    text = field.label + '：' + tagFormatted;
                }
                // 其他字段正常处理
                else {
                    text = field.label + '：' + trimmed;
                }

                if (field.index >= 4 && field.index <= 7) {
                    tagParts.push(text);
                } else if (field.index >= 8 && field.index <= 9){
                } else {
                    parts.push(text);
                }
            }
        }
        // 合并标签
        if (tagParts.length > 0) {
            parts.push('标签：' + tagParts.join('  '));
        }
        // 最终拼接
        var result = parts.join('\n');
        var result = this.replaceAllInString(result, "oxford：1", "牛津三千核心词汇")
        var result = this.replaceAllInString(result, "tag：", "")
        var result = this.replaceAllInString(result, "a.", "adj.")
        this.explanation = (result && result.trim() !== '') ? result : '未找到该单词';
    },
    isMeaningful(value) {
        if (!value) return false; // 处理 undefined 或 null
        var trimmed = value.trim();
        if (trimmed === '') return false;
        // 将常见的“无数据”标记视为空
        if (trimmed === '0' || trimmed === 'null' || trimmed === 'None' || trimmed === 'none' || trimmed === '-') {
            return false;
        }
        return true;
    },
    replaceNewlines(value) {
        if (!value) return '';
        var result = '';
        for (var i = 0; i < value.length; i++) {
            var ch = value.charAt(i);
            // 遇到反斜杠，检查下一个字符
            if (ch === '\\' && i + 1 < value.length) {
                var next = value.charAt(i + 1);
                if (next === 'n' || next === 'r') {
                    result += '；\n';
                    i++; // 跳过下一个字符
                    continue;
                }
            }
            result += ch;
        }
        return result;
    },
    /**
     * 只对数组中指定索引的元素执行替换
     * @param {Array} arr - 目标数组
     * @param {number} index - 要处理的元素索引
     * @param {string} searchStr - 要查找的字符
     * @param {string} replaceStr - 替换成的字符
     * @returns {Array} 处理后的新数组
     */
    replaceInArrayAt(arr, index, searchStr, replaceStr) {
        if (!arr || index < 0 || index >= arr.length) return arr;
        var result = arr.slice();  // 复制一份，不修改原数组
        result[index] = result[index].split(searchStr).join(replaceStr);
        return result;
    },
    /**
     * 将字符串中所有匹配的内容替换为新内容
     * @param {string} text - 原始字符串
     * @param {string} searchStr - 要查找的内容（字面量，不解析正则）
     * @param {string} replaceStr - 替换成的内容
     * @returns {string} 替换后的字符串
     */
    replaceAllInString(text, searchStr, replaceStr) {
        if (!text || searchStr === '') return text || '';
        return text.split(searchStr).join(replaceStr);
    },
    /**
     * 估算单行文本在指定容器内渲染所需的总高度（像素）
     * @param {string} text - 要估算的文本内容
     * @param {number} fontSize - 字体大小（px），需与 CSS 一致
     * @param {number} containerWidth - 容器宽度（px），通常为屏幕宽度减左右内边距
     * @param {number} lineHeightRatio - 行高比例（如 1.5）
     * @param {number} paddingVertical - 上下内边距（px）
     * @returns {number} 估算的总高度（px）
     */
    estimateTextHeight(text, fontSize, containerWidth, lineHeightRatio, paddingVertical) {
        if (!text || text.length === 0) {
            // 空文本占一行高度
            return fontSize * lineHeightRatio + paddingVertical * 2;
        }

        // 字符宽度权重（相对于 font-size 的倍数）
        var weights = {
            CJK: 1.0,        // 中文、日文、韩文
            upper: 0.7,      // 英文大写
            lower: 0.55,     // 英文小写
            digit: 0.5,      // 数字
            punctHalf: 0.35, // 英文标点
            punctFull: 1.0,  // 中文标点
            space: 0.3,      // 空格
            other: 0.5       // 其他
        };

        function getCharType(ch) {
            var code = ch.charCodeAt(0);
            if (ch === '\n') return 'newline';
            // CJK
            if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) ||
                (code >= 0x3040 && code <= 0x30FF) || (code >= 0xAC00 && code <= 0xD7AF)) {
                return 'CJK';
            }
            if (code >= 0x41 && code <= 0x5A) return 'upper';
            if (code >= 0x61 && code <= 0x7A) return 'lower';
            if (code >= 0x30 && code <= 0x39) return 'digit';
            if ((code >= 0x21 && code <= 0x2F) || (code >= 0x3A && code <= 0x40) ||
                (code >= 0x5B && code <= 0x60) || (code >= 0x7B && code <= 0x7E)) {
                return 'punctHalf';
            }
            if ((code >= 0x3000 && code <= 0x303F) || (code >= 0xFF00 && code <= 0xFFEF)) {
                return 'punctFull';
            }
            if (ch === ' ') return 'space';
            return 'other';
        }

        var lineHeight = fontSize * lineHeightRatio;
        var currentWidth = 0;
        var lines = 1;
        var length = text.length;

        for (var i = 0; i < length; i++) {
            var ch = text.charAt(i);
            if (ch === '\n') {
                lines++;
                currentWidth = 0;
                continue;
            }
            var type = getCharType(ch);
            var weight = weights[type] || weights.other;
            var charWidth = weight * fontSize;
            if (currentWidth + charWidth > containerWidth) {
                lines++;
                currentWidth = charWidth;
            } else {
                currentWidth += charWidth;
            }
        }

        return lines * lineHeight + paddingVertical * 2;
    },
    /**
     * 将Exchange索引数组格式化为变形描述文本
     * @param {Array} arr - 数组，arr[0] 是变量（如原型词），arr[1..] 是变形编码
     * @returns {string} 格式化后的文本，如 "该单词是 perceive 的过去式，三单"
     */
    formatExchanges(arr) {
        if (!arr || arr.length < 2) return '';

        // 第一个元素作为变量
        var word = arr[1];
        if (!word) return '';
        word = String(word).trim();

        // 变形编码映射表
        var map = {
            'p': '过去式',
            'd': '过去分词',
            'i': '现在分词',
            '3': '三单',
            'r': '比较级',
            't': '最高级',
            's': '复数',
            '0': '原形',
            '1': '原形变形'
        };
        // 遍历后续元素，收集描述
        var descs = [];
        for (var i = 2; i < arr.length; i++) {
            var code = arr[i];
            if (code === undefined || code === null) continue;
            code = String(code).trim();
            if (code === '') continue;

            var desc = map[code];
            if (desc) {
                descs.push(desc);
            } else {
                // 未知编码原样保留
                descs.push(code);
            }
        }
        if (descs.length === 0) return '';
        // 拼接输出
        if (descs.length === 1) {
            return '该单词是 ' + word + ' 的' + descs[0] + "，原型如下：";
        }
        return '该单词是 ' + word + ' 的' + descs.join('、') + "，原型如下：";
    },
}