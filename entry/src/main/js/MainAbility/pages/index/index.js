import router from '@system.router';
import app from '@system.app';

export default {
    data: {
        keyword: '',
        showToast: false,      // 是否显示弹框
        toastMessage: '',      // 弹框内容
        timer: null
    },
    onInit(){
    },
    onInputChange(event) {
        //console.info('input change: ' + JSON.stringify(event));
        if (event) {
            this.keyword = JSON.stringify(event);
        }
    },
    ClickAction(){
        const text = this.keyword;
        console.info("ClickAction text="+text);
        if(text.length>0) {
            router.replace({
                uri: "pages/explanation/explanation",
                params: { word: text }
            })
        } else {
            this.showToast =true;
            this.showToastMessage('不能为空');
        }
    },
    /**
     * 显示弹框，1秒后自动消失
     * @param {string} msg - 要显示的消息
     */
    showToastMessage(msg) {
        // 清除之前的定时器，避免冲突
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // 更新数据，显示弹框
        this.toastMessage = msg;
        this.showToast = true;

        // 设置1秒后自动隐藏
        this.timer = setTimeout(() => {
            this.showToast = false;
            this.timer = null;
        }, 1000); // 1000ms = 1秒
    },
    onSwipe(e){
        // 判断滑动方向是否为 'right'
        if (e.direction === 'right' && e.distance > 200) {
            console.info('检测到右滑，准备退出');
            app.terminate();
        }
    },
 }