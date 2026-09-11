import { TransactionType, Transaction, Account } from '../types';

export interface ParseResult {
  amount: string;
  type: TransactionType;
  categoryKeyword: string;
  note: string;
  merchant: string;
  date: string;
  time: string;
  accountKeyword: string;
  currency: string;  // 识别到的货币代码（如 'USD', 'JPY'），默认空字符串表示 CNY
}

const chineseNumberMap: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '百': 100, '千': 1000, '万': 10000, '亿': 100000000,
};

const chineseToNumber = (str: string): number | null => {
  if (!str) return null;
  
  const directMap: Record<string, number> = {
    '一块': 1, '两块': 2, '三块': 3, '五块': 5, '十块': 10,
    '二十': 20, '三十': 30, '五十': 50, '一百': 100, '两百': 200,
    '一千': 1000, '两千': 2000, '一万': 10000, '两万': 20000,
  };
  
  if (directMap[str]) return directMap[str];
  
  let result = 0;
  let section = 0;
  let current = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const num = chineseNumberMap[char];
    
    if (num === undefined) continue;
    
    if (num >= 10) {
      if (current === 0) current = 1;
      section += current * num;
      current = 0;
      
      if (num === 10000 || num === 100000000) {
        result += section;
        section = 0;
      }
    } else {
      current = num;
    }
  }
  
  result += section + current;
  return result > 0 ? result : null;
};

const incomeKeywords = [
  '工资', '收入', '奖金', '提成', '报销', '退款', '红包收入', '转账收入', '借款收回',
  '利息', '理财', '投资', '股息', '房租收入', '兼职', '稿费', '佣金', '发工资', '工资到账',
  '工资收入', '月薪', '年薪', '绩效', '年终奖', '项目奖金', '加班工资', '补贴', '津贴',
  '分红', '股息', '利息收入', '理财收益', '股票收益', '基金收益', '保险理赔', '赔偿',
  '退款到账', '退货退款', '支付宝退款', '微信退款', '红包', '收到红包', '转账收款',
  '到账', '收款', '入账', '进账', '收益', '回款', '返利', '返现', '退税',
];

const expenseKeywordCategories: Record<string, string[]> = {
  餐饮: ['饭', '餐', '食', '外卖', '奶茶', '咖啡', '早餐', '午餐', '晚餐', '夜宵', '零食', '饮料', '下午茶', '肯德基', '麦当劳', '必胜客', '汉堡', '火锅', '烧烤', '美团', '饿了么', '大众点评', '吃饭', '用餐', '食堂', '餐馆', '饭店', '面馆', '快餐店', '沙县', '黄焖鸡', '麻辣烫', '串串', '冒菜', '螺蛳粉', '酸辣粉', '米线', '米粉', '炒饭', '炒面', '盖浇饭', '便当', '盒饭', '寿司', '刺身', '牛排', '西餐', '日料', '韩餐', '甜点', '蛋糕', '冰淇淋', '可乐', '雪碧', '果汁', '酸奶', '牛奶', '面包', '饼干', '薯片', '巧克力', '糖果', '水果', '蔬菜', '生鲜', '便利店', '喜茶', '奈雪', '瑞幸', '星巴克', '蜜雪冰城', '海底捞', '星巴克咖啡', '肯德基KFC', '麦当劳麦乐送', '华莱士', '德克士', '真功夫', '永和大王', '老乡鸡', '西贝', '外婆家', '绿茶餐厅', '太二', '费大厨', '木屋烧烤', '半天妖', '谭鸭血', '小龙坎', '海底捞火锅', '呷哺呷哺'],
  交通: ['打车', '滴滴', '出租', '地铁', '公交', '加油', '停车', '车票', '机票', '高铁', '火车', '过路费', '高速', '滴滴出行', '高德打车', '网约车', '快车', '专车', '顺风车', '出租车', '的', '大巴', '长途汽车', '轮船', '轮渡', '租车', '自驾', '油费', '汽油', '柴油', '停车费', '停车场', '高速费', 'ETC', '违章', '罚款', '年检', '保养', '维修', '洗车', '共享单车', '哈啰', '青桔', '美团单车', '电动车', '电瓶车', '地铁卡', '公交卡', '一卡通', '交通卡', '加油卡', '石油', '石化', '中海油', '壳牌'],
  购物: ['购物', '超市', '淘宝', '京东', '拼多多', '衣服', '鞋', '化妆品', '日用品', '生鲜', '超市', '便利店', '屈臣氏', '优衣库', '无印良品', '商场', '百货', '服装店', '鞋店', '包包', '首饰', '珠宝', '眼镜', '手表', '数码', '手机', '电脑', '平板', '耳机', '充电器', '数据线', '家电', '冰箱', '洗衣机', '空调', '电视', '微波炉', '电饭煲', '厨具', '餐具', '家具', '家居', '装修', '建材', '五金', '文具', '办公用品', '图书', '书籍', '玩具', '母婴', '奶粉', '尿布', '童装', '天猫', '唯品会', '苏宁易购', '网易严选', '小米', '华为', '苹果', 'Apple', '耐克', 'Nike', '阿迪', 'Adidas', '优衣库', '宜家', '名创优品', 'MINISO', '无印良品', 'MUJI', '山姆', '盒马', '永辉', '沃尔玛', '家乐福', '大润发', '物美', '苏果', '全家', '7-11', '罗森', '便利蜂'],
  娱乐: ['电影', '游戏', 'KTV', '演唱会', '演出', '门票', '旅游', '娱乐', '游乐场', '景区', '门票', '游乐园', '动物园', '植物园', '博物馆', '科技馆', '美术馆', '展览', '话剧', '音乐剧', '歌剧', '相声', '脱口秀', '直播', '打赏', '游戏币', '皮肤', '装备', '点卡', '网吧', '网咖', '台球', '保龄球', '高尔夫', '滑雪', '滑冰', '游泳', '健身', '瑜伽', '舞蹈', '乐器', '唱歌', '蹦迪', '酒吧', '夜场', '剧本杀', '密室逃脱', '桌游', '麻将', '棋牌室', '电竞', 'Steam', '腾讯视频', '爱奇艺', '优酷', '芒果TV', 'B站', '哔哩哔哩', '网易云', 'QQ音乐', '酷狗', '酷我', '喜马拉雅', '得到', '知乎', '微博会员', '爱奇艺会员', '腾讯会员', '优酷会员', 'B站大会员', '网易云黑胶', 'QQ音乐绿钻'],
  医疗: ['医院', '药店', '看病', '挂号', '体检', '药品', '医疗', '牙科', '诊所', '门诊', '住院', '手术', '治疗', '检查', '化验', '拍片', 'CT', 'MRI', 'B超', '疫苗', '预防针', '保健品', '维生素', '中药', '西药', '处方药', '非处方药', '医疗器械', '口罩', '消毒', '体温计', '血压计', '血糖仪', '眼科', '眼镜', '验光', '配镜', '隐形眼镜', '医美', '美容', '护肤', '化妆', '美甲', '美发', '理发', '剪发', '染发', '烫发', 'SPA', '按摩', '足疗', '足浴', '理疗', '针灸', '艾灸', '拔罐', '刮痧', '正骨', '牙科诊所', '口腔医院', '三甲医院', '社区医院', '同仁堂', '大药房', '益丰', '老百姓', '海王星辰', '叮当快药', '京东健康', '阿里健康', '平安好医生', '微医', '好大夫在线'],
  教育: ['学习', '课程', '培训', '书籍', '教材', '网课', '教育', '学校', '学费', '辅导班', '补习班', '兴趣班', '钢琴班', '舞蹈班', '美术班', '书法班', '英语班', '数学班', '语文班', '编程班', '机器人', '夏令营', '冬令营', '游学', '留学', '考试', '报名费', '资料费', '文具', '书包', '校服', '校车', '托管', '早教', '幼儿园', '考研', '考公', '考证', '雅思', '托福', 'GRE', '四六级', '驾考', '驾校', '学车', '学而思', '新东方', '猿辅导', '作业帮', 'VIPKID', '51Talk', '粉笔', '华图', '中公', '沪江', '有道', '万门', '得到', '樊登读书', '喜马拉雅', '微信读书', 'Kindle', '当当', '京东图书', '新华书店'],
  通讯: ['话费', '流量', '手机费', '宽带', '网络', '电信', '移动', '联通', '套餐', '充值', '缴费', 'Wi-Fi', '路由器', '机顶盒', '电视费', '有线电视', 'IPTV', '话费充值', '流量包', '加油包', '中国移动', '中国联通', '中国电信', '广电', '长城宽带', '鹏博士', '宽带费', '网费', '电话费', '短信费', '彩信费', '漫游费', '国际长途', '5G套餐', '4G套餐', '冰激凌套餐', '大王卡', '米粉卡', '圣卡', '鱼卡'],
  住房: ['房租', '水电', '物业', '水电煤', '暖气', '维修', '搬家', '租房', '买房', '装修', '家具', '家电', '物业费', '水电费', '煤气费', '取暖费', '空调费', '网费', '保洁', '家政', '维修', '管道疏通', '开锁', '换锁', '窗帘', '床品', '灯具', '地板', '瓷砖', '房贷', '月供', '首付', '定金', '押金', '租金', '中介费', '装修费', '建材费', '设计费', '施工费', '保洁费', '家政费', '物业费', '取暖费', '燃气费', '水费', '电费', '电梯费', '垃圾费', '停车费', '车位费', '车位', '地下室', '储藏室', '链家', '贝壳', '我爱我家', '自如', '蛋壳', '安居客', '58同城', '赶集网', '房天下', '土巴兔', '齐家网', '居然之家', '红星美凯龙', '宜家家居', '曲美', '全友', '林氏木业', '源氏木语'],
  转账: ['转账', '红包', '借钱', '还款', '收款', '发红包', '抢红包', '微信转账', '支付宝转账', '银行转账', '汇款', '借钱给', '借给', '还账', '还债', '欠款', '借款', '信用卡还款', '花呗还款', '借呗还款', '白条还款', '金条还款', '微粒贷', '网商贷', '借呗', '花呗', '白条', '信用卡', '网银', '手机银行', '网上银行', 'ATM', '存取款', '存款', '取款', '转账汇款', '跨行转账', '异地转账', '支付宝', '微信支付', '财付通', '云闪付', 'Apple Pay', '华为Pay', '小米Pay', '银联', 'VISA', 'MasterCard'],
  其他: ['其他', '杂项', '未知', '忘了', '记不清', '不知道', '说不清'],
};

const categoryAliases: Record<string, string[]> = {
  餐饮: ['吃饭', '用餐', '就餐', '美食', '食品', '饮品', '吃喝', '下馆子', '搓一顿', '大餐', '便饭', '家常饭'],
  交通: ['出行', '通勤', '代步', '交通工具', '坐车', '开车', '骑车', '赶路', '出差交通'],
  购物: ['采购', '消费', '买东西', '逛街', '败家', '血拼', 'shopping', '剁手'],
  娱乐: ['休闲', '玩乐', '消遣', '放松', '嗨皮', '浪', '出去玩', '耍'],
  医疗: ['看病', '治病', '健康', '养生', '吃药', '打针', '输液'],
  教育: ['学习', '读书', '培训', '进修', '充电', '自我提升'],
  通讯: ['通信', '网络', '电话', '上网', '话费充值'],
  住房: ['居住', '生活', '居家', '过日子', '家用'],
  转账: ['支付', '结算', '往来', '还钱', '借钱'],
};

const merchantPatterns = [
  /(?:在|去|到|从|向|给)\s*([^\s\d，。、；：！？,.!?;:]+?)(?:\s*(?:消费|支付|吃饭|买|购|花了|花|用了|用))/u,
  /([^\s\d，。、；：！？,.!?;:]{2,10}(?:公司|超市|商场|餐厅|饭店|酒店|店|馆|铺|坊|屋|轩|阁|楼|堂|坊|吧|厅|中心|广场|城|街|巷|路|号|大厦|公寓|小区|花园|家园))/u,
  /(?:美团|饿了么|淘宝|京东|拼多多|抖音|快手|微信|支付宝)\s*(?:支付|付款|转账|红包)/,
];

const extractMerchant = (text: string): string => {
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
};

/**
 * 币种关键词映射表
 * 按关键词长度降序排列，避免短关键词优先匹配（如"元"不应优先于"美元"）
 */
const currencyKeywordMap: { keyword: string; code: string }[] = [
  // 常见外币 - 中文名称（长的在前）
  { keyword: '美元', code: 'USD' },
  { keyword: '美金', code: 'USD' },
  { keyword: '欧元', code: 'EUR' },
  { keyword: '英镑', code: 'GBP' },
  { keyword: '日元', code: 'JPY' },
  { keyword: '韩元', code: 'KRW' },
  { keyword: '港币', code: 'HKD' },
  { keyword: '港纸', code: 'HKD' },
  { keyword: '台币', code: 'TWD' },
  { keyword: '新台币', code: 'TWD' },
  { keyword: '新加坡元', code: 'SGD' },
  { keyword: '泰铢', code: 'THB' },
  { keyword: '卢布', code: 'RUB' },
  { keyword: '卢比', code: 'INR' },
  { keyword: '澳元', code: 'AUD' },
  { keyword: '澳币', code: 'AUD' },
  { keyword: '加元', code: 'CAD' },
  { keyword: '瑞郎', code: 'CHF' },
  { keyword: '法郎', code: 'CHF' },
  { keyword: '越南盾', code: 'VND' },
  { keyword: '比索', code: 'PHP' },
  { keyword: '林吉特', code: 'MYR' },
  { keyword: '迪拉姆', code: 'AED' },
  { keyword: '里亚尔', code: 'SAR' },
  // 英文代码（3字母，大写匹配）
  { keyword: 'USD', code: 'USD' },
  { keyword: 'EUR', code: 'EUR' },
  { keyword: 'GBP', code: 'GBP' },
  { keyword: 'JPY', code: 'JPY' },
  { keyword: 'KRW', code: 'KRW' },
  { keyword: 'HKD', code: 'HKD' },
  { keyword: 'TWD', code: 'TWD' },
  { keyword: 'SGD', code: 'SGD' },
  { keyword: 'THB', code: 'THB' },
  { keyword: 'AUD', code: 'AUD' },
  { keyword: 'CAD', code: 'CAD' },
  { keyword: 'CHF', code: 'CHF' },
  { keyword: 'RUB', code: 'RUB' },
  { keyword: 'INR', code: 'INR' },
  { keyword: 'NZD', code: 'NZD' },
  // 货币符号
  { keyword: '$', code: 'USD' },
  { keyword: '€', code: 'EUR' },
  { keyword: '£', code: 'GBP' },
  { keyword: '₩', code: 'KRW' },
  { keyword: '฿', code: 'THB' },
  { keyword: '₹', code: 'INR' },
  { keyword: '₽', code: 'RUB' },
  { keyword: 'A$', code: 'AUD' },
  { keyword: 'C$', code: 'CAD' },
  { keyword: 'HK$', code: 'HKD' },
  { keyword: 'NT$', code: 'TWD' },
  { keyword: 'S$', code: 'SGD' },
];

/**
 * 从输入文本中识别币种
 * 返回 { code, keyword } - code 为货币代码，keyword 为匹配到的文本
 */
const extractCurrency = (text: string): { code: string; keyword: string } => {
  if (!text) return { code: '', keyword: '' };

  for (const { keyword, code } of currencyKeywordMap) {
    if (text.includes(keyword)) {
      return { code, keyword };
    }
  }

  return { code: '', keyword: '' };
}

/**
 * 从输入文本中识别账户关键词
 * 策略：优先匹配用户现有账户名，再回退到通用银行/平台关键词
 */
const extractAccountKeyword = (text: string, userAccounts: Account[] = []): string => {
  if (!text) return '';

  // 1. 优先精确匹配用户现有账户名（按长度降序，避免"南京银行"被"银行"截断）
  const sortedAccounts = [...userAccounts]
    .filter(a => a.name && a.name.length >= 2)
    .sort((a, b) => b.name.length - a.name.length);
  for (const account of sortedAccounts) {
    if (text.includes(account.name)) {
      return account.name;
    }
  }

  // 2. 匹配"银行简称+尾号"模式（如"工商6894"→"工商银行6894"）
  for (const account of sortedAccounts) {
    if (account.type === 'bank') {
      // 提取账户名中的银行简称和尾号
      // "工商银行6894" → 简称"工商"，尾号"6894"
      const bankMatch = account.name.match(/^(.+?)银行(.*)$/);
      if (bankMatch && bankMatch[1] && bankMatch[2]) {
        const shortName = bankMatch[1]; // "工商"
        const tailNumber = bankMatch[2]; // "6894"
        // 检查输入是否包含"简称+尾号"（如"工商6894"）
        const pattern = `${shortName}${tailNumber}`;
        if (text.includes(pattern)) {
          return pattern; // 返回实际匹配到的文本（如"工商6894"），用于从输入中移除
        }
      }
    }
  }

  // 3. 通用账户关键词匹配
  const accountKeywords = [
    // 具体银行（优先匹配）
    '南京银行', '招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行',
    '浦发银行', '民生银行', '兴业银行', '中信银行', '光大银行', '华夏银行', '平安银行',
    '广发银行', '邮储银行', '邮政储蓄', '北京银行', '上海银行', '宁波银行', '杭州银行',
    '江苏银行', '苏州银行', '成都银行', '重庆银行', '天津银行', '广州银行', '深圳银行',
    '长沙银行', '西安银行', '郑州银行', '青岛银行', '大连银行', '厦门银行', '福州银行',
    '武汉银行', '哈尔滨银行', '沈阳银行', '长春银行', '石家庄银行', '太原银行', '合肥银行',
    '南昌银行', '济南银行', '兰州银行', '银川银行', '西宁银行', '乌鲁木齐银行',
    '拉萨银行', '南宁银行', '海口银行', '贵阳银行', '昆明银行', '呼和浩特银行',
    '花旗银行', '汇丰银行', '渣打银行', '东亚银行', '星展银行', '恒生银行', '华侨银行',
    '摩根大通', '摩根士丹利', '高盛银行', '美国银行', '德意志银行', '巴克莱银行',
    // 简称
    '招行', '工行', '建行', '农行', '中行', '交行', '浦发', '民生', '兴业', '中信', '光大',
    '华夏', '平安', '广发', '邮储', '邮政',
    // 支付平台
    '支付宝', '微信支付', '余额宝', '零钱通', '云闪付', 'Apple Pay', '华为Pay',
    // 数字钱包/理财
    '京东金融', '度小满', '百度钱包', '壹钱包', '苏宁金融', '美团支付',
    // 其他（"微信"放最后，避免误匹配"微信支付"）
    '现金', '钱包', '银行卡', '信用卡', '储蓄卡', '借记卡', '微信',
  ];

  // 优先匹配最长的关键词
  const sortedKeywords = [...accountKeywords].sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  // 3. 动态匹配 "XX银行" 模式（识别未列出的银行）
  const bankPattern = /([\u4e00-\u9fa5]{2,6})银行/;
  const bankMatch = text.match(bankPattern);
  if (bankMatch && bankMatch[1]) {
    return bankMatch[0];
  }

  // 4. 匹配 "XX储蓄" / "XX信用社" 模式
  const otherBankPattern = /([\u4e00-\u9fa5]{2,6})(?:储蓄银行|信用社|农商行|村镇银行)/;
  const otherBankMatch = text.match(otherBankPattern);
  if (otherBankMatch) {
    return otherBankMatch[0];
  }

  return '';
};

/**
 * 根据账户关键词查找匹配的账户
 * 策略：优先精确匹配账户名，再通过银行核心词、类型映射、模糊匹配
 */
export const findAccountByKeyword = (
  accounts: Account[],
  keyword: string
): string | null => {
  if (!keyword || accounts.length === 0) return null;

  // 1. 精确匹配账户名称
  for (const account of accounts) {
    if (account.name === keyword) {
      return account.id;
    }
  }

  // 2. 账户名称与关键词互相包含
  for (const account of accounts) {
    if (account.name.includes(keyword) || keyword.includes(account.name)) {
      return account.id;
    }
  }

  // 2.5 匹配"银行简称+尾号"模式（如keyword="工商6894"→account="工商银行6894"）
  for (const account of accounts) {
    if (account.type === 'bank') {
      const bankMatch = account.name.match(/^(.+?)银行(.*)$/);
      if (bankMatch && bankMatch[1] && bankMatch[2]) {
        const shortName = bankMatch[1]; // "工商"
        const tailNumber = bankMatch[2]; // "6894"
        const pattern = `${shortName}${tailNumber}`; // "工商6894"
        if (keyword === pattern || keyword.includes(pattern)) {
          return account.id;
        }
      }
    }
  }

  // 3. 银行类关键词：提取核心词匹配
  // 例如 keyword="南京银行"，账户名"南京银行储蓄卡" → 核心词"南京"匹配
  const bankSuffixes = ['银行', '储蓄银行', '信用社', '农商行', '村镇银行'];
  const isSpecificBank = bankSuffixes.some(k => keyword.includes(k)) && keyword.length > 2;
  if (isSpecificBank) {
    const coreKeyword = keyword.replace(/银行|储蓄银行|信用社|农商行|村镇银行/g, '');
    if (coreKeyword && coreKeyword.length >= 2) {
      // 精确包含核心词
      for (const account of accounts) {
        if (account.name.includes(coreKeyword)) {
          return account.id;
        }
      }
      // 模糊匹配银行类账户（要求较高的相似度，避免"工商"误匹配"招商"）
      for (const account of accounts) {
        if (account.type === 'bank') {
          const similarity = calculateSimilarity(coreKeyword, account.name);
          if (similarity > 0.6) {
            return account.id;
          }
        }
      }
      // 银行关键词未匹配到具体账户，返回 null（不误匹配其他银行）
      return null;
    }
  } else if (keyword === '银行' || keyword === '银行卡') {
    // 通用"银行"/"银行卡"关键词：如果只有一个银行账户，直接返回
    const bankAccounts = accounts.filter(a => a.type === 'bank');
    if (bankAccounts.length === 1) {
      return bankAccounts[0].id;
    }
  }

  // 4. 根据关键词推断账户类型
  const typeMapping: Record<string, Account['type']> = {
    '支付宝': 'alipay',
    '余额宝': 'alipay',
    '微信': 'wechat',
    '微信支付': 'wechat',
    '零钱通': 'wechat',
    '现金': 'cash',
  };

  if (typeMapping[keyword]) {
    const matched = accounts.find(a => a.type === typeMapping[keyword]);
    if (matched) return matched.id;
  }

  // 5. 模糊匹配（排除银行类关键词，已在第3步处理）
  const isBankKeyword = bankSuffixes.some(k => keyword.includes(k));
  if (!isBankKeyword) {
    let bestSimilarity = 0;
    let bestAccountId: string | null = null;
    for (const account of accounts) {
      const similarity = calculateSimilarity(keyword, account.name);
      if (similarity > 0.5 && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestAccountId = account.id;
      }
    }
    if (bestAccountId) return bestAccountId;
  }

  return null;
};

const extractDateTime = (text: string): { date: string; time: string } => {
  let date = '';
  let time = '';

  const datePattern = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }

  const timePattern = /(\d{1,2})[:点时](\d{2})(?:分)?/;
  const timeMatch = text.match(timePattern);
  if (timeMatch) {
    time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
  }

  const todayPatterns = [/今天/, /今日/, /今天上午/, /今天下午/, /今天晚上/, /今晚/, /今早/, /今晨/];
  const yesterdayPatterns = [/昨天/, /昨日/, /昨天上午/, /昨天下午/, /昨天晚上/, /昨晚/, /昨天早上/];
  const tomorrowPatterns = [/明天/, /明日/, /明天上午/, /明天下午/, /明天晚上/, /明晚/];

  const now = new Date();
  if (todayPatterns.some(p => p.test(text))) {
    date = now.toISOString().split('T')[0];
  } else if (yesterdayPatterns.some(p => p.test(text))) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    date = y.toISOString().split('T')[0];
  } else if (tomorrowPatterns.some(p => p.test(text))) {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    date = t.toISOString().split('T')[0];
  }

  const morningPatterns = [/早上/, /早晨/, /上午/, /凌晨/, /清晨/];
  const noonPatterns = [/中午/, /午间/, /午休/];
  const afternoonPatterns = [/下午/, /午后/];
  const eveningPatterns = [/晚上/, /傍晚/, /夜里/, /夜间/, /深夜/];

  if (!time) {
    if (morningPatterns.some(p => p.test(text))) {
      time = '08:00';
    } else if (noonPatterns.some(p => p.test(text))) {
      time = '12:00';
    } else if (afternoonPatterns.some(p => p.test(text))) {
      time = '15:00';
    } else if (eveningPatterns.some(p => p.test(text))) {
      time = '20:00';
    }
  }

  return { date, time };
};

function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  
  return 1 - dp[len1][len2] / Math.max(len1, len2);
}

const extractAmount = (text: string): { amount: string; matchText: string } => {
  const currencyUnits = ['元', '块', '钱', '¥', '￥', '块钱', '元整', '元人民币'];
  
  for (const unit of currencyUnits) {
    const pattern = new RegExp(`(\\d+(?:\\.\\d{1,2})?)\\s*${unit}`);
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        return { amount: num.toString(), matchText: match[0] };
      }
    }
  }

  const symbolPattern = /(?:¥|￥)\s*(\d+(?:\.\d{1,2})?)/;
  const symbolMatch = text.match(symbolPattern);
  if (symbolMatch) {
    const num = parseFloat(symbolMatch[1]);
    if (!isNaN(num) && num > 0) {
      return { amount: num.toString(), matchText: symbolMatch[0] };
    }
  }

  const chinesePattern = /([零一二两三四五六七八九十百千万亿]+)\s*(?:块|元|钱|块钱)/;
  const chineseMatch = text.match(chinesePattern);
  if (chineseMatch) {
    const num = chineseToNumber(chineseMatch[1]);
    if (num && num > 0) {
      return { amount: num.toString(), matchText: chineseMatch[0] };
    }
  }

  const spokenPatterns = [
    /(?:花了|花|用了|用|消费|支付|扣了|扣|花费|花掉)\s*(\d+(?:\.\d{1,2})?)/,
    /(\d+(?:\.\d{1,2})?)\s*(?:块钱|块|元|毛钱|毛|分)/,
    /(?:一共|总共|合计|总计|花费|花了|用了|用去)\s*(\d+(?:\.\d{1,2})?)/,
  ];
  
  for (const pattern of spokenPatterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        return { amount: num.toString(), matchText: match[0] };
      }
    }
  }

  const genericPattern = /(\d+(?:\.\d{1,2})?)/g;
  let match;
  while ((match = genericPattern.exec(text)) !== null) {
    const num = parseFloat(match[1]);
    if (!isNaN(num) && num > 0 && num < 1000000) {
      return { amount: num.toString(), matchText: match[0] };
    }
  }

  return { amount: '', matchText: '' };
};

export const parseSmartInput = (input: string, userAccounts: Account[] = [], userCategories: { id: string; name: string; type: TransactionType }[] = []): ParseResult => {
  const result: ParseResult = {
    amount: '',
    type: 'expense',
    categoryKeyword: '',
    note: input.trim(),
    merchant: '',
    date: '',
    time: '',
    accountKeyword: '',
    currency: '',
  };

  const trimmedInput = input.trim();

  // ★ 先识别币种，再提取金额（避免币种符号/关键词干扰金额识别）
  const { code: currencyCode, keyword: currencyKeyword } = extractCurrency(trimmedInput);
  result.currency = currencyCode;

  // ★ 先识别账户关键词，再提取金额（避免账户尾号被误判为金额）
  const accountKeyword = extractAccountKeyword(trimmedInput, userAccounts);
  result.accountKeyword = accountKeyword;

  // 从文本中移除账户关键词后再提取金额
  const textForAmount = accountKeyword
    ? trimmedInput.replace(new RegExp(accountKeyword, 'g'), '')
    : trimmedInput;
  const { amount, matchText: amountMatchText } = extractAmount(textForAmount);
  result.amount = amount;

  const { date, time } = extractDateTime(trimmedInput);
  result.date = date;
  result.time = time;

  const merchant = extractMerchant(trimmedInput);
  result.merchant = merchant;

  for (const keyword of incomeKeywords) {
    if (trimmedInput.includes(keyword)) {
      result.type = 'income';
      break;
    }
  }

  // ★ 优先通过通用关键词匹配分类（更精准，如"午餐"→餐饮）
  // 仅在通用关键词未匹配时，才尝试匹配用户现有分类名
  let bestMatchScore = 0;
  let bestCategoryKeyword = '';

  // 从搜索文本中移除已识别的账户关键词，避免"支付宝"被误识别为分类
  const searchTextForCategory = accountKeyword
    ? trimmedInput.replace(new RegExp(accountKeyword, 'g'), '')
    : trimmedInput;
  const searchTexts = [searchTextForCategory, merchant];

  for (const searchText of searchTexts) {
    if (!searchText) continue;

    for (const [, keywords] of Object.entries(expenseKeywordCategories)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          const score = keyword.length / Math.max(searchText.length, 1);
          if (score > bestMatchScore || (score === bestMatchScore && keyword.length > bestCategoryKeyword.length)) {
            bestMatchScore = score;
            bestCategoryKeyword = keyword;
          }
        }
      }
    }

    for (const [, aliases] of Object.entries(categoryAliases)) {
      for (const alias of aliases) {
        if (searchText.includes(alias)) {
          const score = alias.length / Math.max(searchText.length, 1);
          if (score > bestMatchScore || (score === bestMatchScore && alias.length > bestCategoryKeyword.length)) {
            bestMatchScore = score;
            bestCategoryKeyword = alias;
          }
        }
      }
    }
  }

  if (!bestCategoryKeyword) {
    for (const [, keywords] of Object.entries(expenseKeywordCategories)) {
      for (const keyword of keywords) {
        const similarity = calculateSimilarity(searchTextForCategory, keyword);
        if (similarity > 0.5 && similarity > bestMatchScore) {
          bestMatchScore = similarity;
          bestCategoryKeyword = keyword;
        }
      }
    }
  }

  if (bestCategoryKeyword) {
    result.categoryKeyword = bestCategoryKeyword;
  }

  // 如果通用关键词未匹配，尝试匹配用户现有分类名
  if (!result.categoryKeyword) {
    const matchedUserCategory = [...userCategories]
      .filter(c => c.type === result.type && c.name && c.name.length >= 2)
      .sort((a, b) => b.name.length - a.name.length)
      .find(c => searchTextForCategory.includes(c.name));
    if (matchedUserCategory) {
      result.categoryKeyword = matchedUserCategory.name;
    }
  }

  let note = trimmedInput;
  if (amountMatchText) {
    note = note.replace(amountMatchText, '');
  }
  if (date) {
    note = note.replace(/\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?/, '');
  }
  if (time) {
    note = note.replace(/\d{1,2}[:点时]\d{2}(?:分)?/, '');
  }
  // 从备注中去除账户关键词
  if (accountKeyword) {
    note = note.replace(new RegExp(accountKeyword, 'g'), '');
  }
  // 从备注中去除币种关键词
  if (currencyKeyword) {
    note = note.replace(new RegExp(currencyKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }
  note = note.replace(/今天|昨天|明天|今日|昨日|明日|早上|上午|中午|下午|晚上|今早|昨晚|明晚|凌晨|清晨|傍晚|深夜|夜里|夜间|午间|午休|午后|晚上/g, '');
  note = note.replace(/[\s]+/g, ' ').trim();
  note = note.replace(/^[，。、；：！？,.!?;:\s]+|[，。、；：！？,.!?;:\s]+$/g, '');
  
  result.note = note || '';

  return result;
};

export const parseSmartInputWithHistory = (
  input: string,
  transactions: Transaction[],
  userAccounts: Account[] = [],
  userCategories: { id: string; name: string; type: TransactionType }[] = []
): ParseResult & { confidence: number } => {
  const result = parseSmartInput(input, userAccounts, userCategories);
  let confidence = result.categoryKeyword ? 0.6 : 0.3;

  const note = result.note.toLowerCase();
  const merchant = result.merchant.toLowerCase();

  const merchantCategoryCount: Record<string, Record<string, number>> = {};
  const noteKeywordCategory: Record<string, Record<string, number>> = {};

  for (const tx of transactions.slice().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 500)) {
    const txNote = tx.note?.toLowerCase() || '';
    const txCategory = tx.categoryId;
    
    if (merchant && txNote.includes(merchant)) {
      if (!merchantCategoryCount[txCategory]) {
        merchantCategoryCount[txCategory] = { count: 0, total: 0 };
      }
      merchantCategoryCount[txCategory].count++;
      merchantCategoryCount[txCategory].total++;
    }

    if (note && txNote) {
      const words = note.split(/\s+/).filter(w => w.length >= 2);
      for (const word of words) {
        if (txNote.includes(word)) {
          if (!noteKeywordCategory[word]) {
            noteKeywordCategory[word] = {};
          }
          noteKeywordCategory[word][txCategory] = (noteKeywordCategory[word][txCategory] || 0) + 1;
        }
      }
    }
  }

  if (Object.keys(merchantCategoryCount).length > 0) {
    const topCategory = Object.entries(merchantCategoryCount)
      .sort((a, b) => b[1].count - a[1].count)[0];
    if (topCategory && topCategory[1].count >= 2) {
      confidence = Math.min(0.95, confidence + 0.3);
      return { ...result, confidence };
    }
  }

  return { ...result, confidence };
};

export const findCategoryByIdentifier = (
  categories: { id: string; type: TransactionType; name: string; color: string; icon: string }[],
  type: TransactionType,
  keyword: string
): string | null => {
  const filteredCategories = categories.filter((c) => c.type === type);

  if (!keyword) {
    return null;
  }

  // 1. 精确匹配分类名
  for (const category of filteredCategories) {
    if (category.name === keyword) {
      return category.id;
    }
  }

  // 2. 分类名与关键词互相包含
  for (const category of filteredCategories) {
    if (category.name.includes(keyword) || keyword.includes(category.name)) {
      return category.id;
    }
  }

  // 3. 通过通用关键词反查分类名
  // 例如：keyword="午餐" 在 expenseKeywordCategories["餐饮"] 中 → 找名为"餐饮"的分类
  for (const [categoryName, keywords] of Object.entries(expenseKeywordCategories)) {
    if (keywords.includes(keyword)) {
      // 3a. 精确匹配分类名
      const found = filteredCategories.find((c) => c.name === categoryName);
      if (found) return found.id;

      // 3b. 用户分类名是否在该类别的关键词列表中（如用户分类"吃饭"在"餐饮"关键词列表中）
      const keywordNameMatch = filteredCategories.find(c => keywords.includes(c.name));
      if (keywordNameMatch) return keywordNameMatch.id;

      // 3c. 用户分类名是否包含该类别的某个关键词（如用户分类"午餐饭"包含"午餐"）
      const containsMatch = filteredCategories.find(c =>
        keywords.some(kw => c.name.includes(kw) || kw.includes(c.name))
      );
      if (containsMatch) return containsMatch.id;

      // 3d. 模糊匹配该类别名
      const fuzzyFound = filteredCategories.find(c =>
        calculateSimilarity(c.name, categoryName) > 0.4
      );
      if (fuzzyFound) return fuzzyFound.id;
    }
  }

  // 4. 通过分类别名反查
  for (const [categoryName, aliases] of Object.entries(categoryAliases)) {
    if (aliases.includes(keyword)) {
      const found = filteredCategories.find((c) => c.name === categoryName);
      if (found) return found.id;
    }
  }

  // 5. 通用映射表
  const commonMappings: Record<string, string> = {
    '美团': '餐饮', '饿了么': '餐饮', '滴滴': '交通', '淘宝': '购物', '京东': '购物',
    '话费': '通讯', '工资': '工资', '红包': '转账', '转账': '转账', '打车': '交通',
    '加油': '交通', '停车': '交通', '吃饭': '餐饮', '外卖': '餐饮', '奶茶': '餐饮',
    '咖啡': '餐饮', '超市': '购物', '衣服': '购物', '电影': '娱乐', '游戏': '娱乐',
    '医院': '医疗', '药店': '医疗', '学习': '教育', '培训': '教育', '房租': '住房',
    '水电': '住房', '拼多多': '购物', '抖音': '娱乐', '快手': '娱乐', '微信': '转账',
    '支付宝': '转账', '信用卡': '转账', '花呗': '转账', '借呗': '转账',
    '星巴克': '餐饮', '瑞幸': '餐饮', '喜茶': '餐饮', '奈雪': '餐饮', '蜜雪冰城': '餐饮',
    '海底捞': '餐饮', '肯德基': '餐饮', '麦当劳': '餐饮', '全家': '购物', '7-11': '购物',
    '罗森': '购物', '便利蜂': '购物', '盒马': '购物', '山姆': '购物', '永辉': '购物',
    '沃尔玛': '购物', '大润发': '购物', '优衣库': '购物', '无印良品': '购物',
    '名创优品': '购物', '宜家': '购物', '小米': '购物', '华为': '购物', '苹果': '购物',
    '顺丰': '交通', '京东物流': '交通', '圆通': '交通', '中通': '交通', '韵达': '交通',
    '申通': '交通', '百世': '交通', '极兔': '交通', '快递': '交通',
    '网易云': '娱乐', 'QQ音乐': '娱乐', '腾讯视频': '娱乐', '爱奇艺': '娱乐',
    '优酷': '娱乐', 'B站': '娱乐', '哔哩哔哩': '娱乐', '芒果TV': '娱乐',
    '喜马拉雅': '娱乐', '得到': '教育', '知乎': '教育', '微博': '娱乐',
    '健身房': '娱乐', '游泳': '娱乐', '瑜伽': '娱乐', '跑步': '娱乐',
    '理发': '医疗', '美容': '医疗', '美甲': '医疗', 'SPA': '医疗', '按摩': '医疗',
    '搬家': '住房', '装修': '住房', '物业': '住房', '水电费': '住房',
    '幼儿园': '教育', '小学': '教育', '中学': '教育', '大学': '教育',
    '驾校': '教育', '考研': '教育', '考公': '教育', '考证': '教育',
  };

  if (commonMappings[keyword]) {
    const found = filteredCategories.find((c) => c.name === commonMappings[keyword]);
    if (found) return found.id;
  }

  // 6. 模糊匹配（取相似度最高的）
  let bestSimilarity = 0;
  let bestCategoryId: string | null = null;
  for (const category of filteredCategories) {
    const similarity = calculateSimilarity(keyword, category.name);
    if (similarity > 0.4 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestCategoryId = category.id;
    }
  }

  return bestCategoryId;
};

export const guessCategoryFromNote = (
  note: string,
  categories: { id: string; type: TransactionType; name: string; color: string; icon: string }[],
  type: TransactionType = 'expense'
): { categoryId: string | null; confidence: number } => {
  const filteredCategories = categories.filter(c => c.type === type);
  const lowerNote = note.toLowerCase();

  for (const [categoryName, keywords] of Object.entries(expenseKeywordCategories)) {
    for (const keyword of keywords) {
      if (lowerNote.includes(keyword.toLowerCase())) {
        const found = filteredCategories.find(c => c.name === categoryName);
        if (found) {
          const confidence = Math.min(0.95, 0.5 + (keyword.length / note.length) * 0.5);
          return { categoryId: found.id, confidence };
        }
      }
    }
  }

  for (const category of filteredCategories) {
    const similarity = calculateSimilarity(lowerNote, category.name.toLowerCase());
    if (similarity > 0.4) {
      return { categoryId: category.id, confidence: similarity };
    }
  }

  return { categoryId: null, confidence: 0 };
};
