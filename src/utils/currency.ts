// 货币工具文件 - 支持的货币列表和汇率转换

export interface Currency {
  code: string;       // 货币代码
  symbol: string;     // 货币符号
  name: string;       // 货币名称
  flag: string;       // 国旗 emoji
  rateToCNY: number;  // 对人民币的汇率（1单位外币 = ?人民币）
  region: string;     // 地区分类
}

// 支持的货币列表（默认汇率仅供参考，支持实时更新）
export const currencies: Currency[] = [
  // === 人民币 ===
  { code: 'CNY', symbol: '¥', name: '人民币', flag: '🇨🇳', rateToCNY: 1, region: '亚洲' },

  // === 亚洲主要货币 ===
  { code: 'USD', symbol: '$', name: '美元', flag: '🇺🇸', rateToCNY: 7.25, region: '美洲' },
  { code: 'EUR', symbol: '€', name: '欧元', flag: '🇪🇺', rateToCNY: 7.85, region: '欧洲' },
  { code: 'GBP', symbol: '£', name: '英镑', flag: '🇬🇧', rateToCNY: 9.20, region: '欧洲' },
  { code: 'JPY', symbol: '¥', name: '日元', flag: '🇯🇵', rateToCNY: 0.048, region: '亚洲' },
  { code: 'KRW', symbol: '₩', name: '韩元', flag: '🇰🇷', rateToCNY: 0.0053, region: '亚洲' },
  { code: 'HKD', symbol: 'HK$', name: '港币', flag: '🇭🇰', rateToCNY: 0.93, region: '亚洲' },
  { code: 'TWD', symbol: 'NT$', name: '新台币', flag: '🇹🇼', rateToCNY: 0.225, region: '亚洲' },
  { code: 'SGD', symbol: 'S$', name: '新加坡元', flag: '🇸🇬', rateToCNY: 5.38, region: '亚洲' },
  { code: 'THB', symbol: '฿', name: '泰铢', flag: '🇹🇭', rateToCNY: 0.20, region: '亚洲' },
  { code: 'MYR', symbol: 'RM', name: '马来西亚林吉特', flag: '🇲🇾', rateToCNY: 1.57, region: '亚洲' },
  { code: 'INR', symbol: '₹', name: '印度卢比', flag: '🇮🇳', rateToCNY: 0.087, region: '亚洲' },
  { code: 'VND', symbol: '₫', name: '越南盾', flag: '🇻🇳', rateToCNY: 0.00029, region: '亚洲' },
  { code: 'PHP', symbol: '₱', name: '菲律宾比索', flag: '🇵🇭', rateToCNY: 0.125, region: '亚洲' },
  { code: 'IDR', symbol: 'Rp', name: '印尼盾', flag: '🇮🇩', rateToCNY: 0.00045, region: '亚洲' },
  { code: 'PKR', symbol: '₨', name: '巴基斯坦卢比', flag: '🇵🇰', rateToCNY: 0.026, region: '亚洲' },
  { code: 'BDT', symbol: '৳', name: '孟加拉塔卡', flag: '🇧🇩', rateToCNY: 0.066, region: '亚洲' },
  { code: 'LKR', symbol: '₨', name: '斯里兰卡卢比', flag: '🇱🇰', rateToCNY: 0.024, region: '亚洲' },
  { code: 'NPR', symbol: '₨', name: '尼泊尔卢比', flag: '🇳🇵', rateToCNY: 0.054, region: '亚洲' },
  { code: 'KHR', symbol: '៛', name: '柬埔寨瑞尔', flag: '🇰🇭', rateToCNY: 0.0018, region: '亚洲' },
  { code: 'LAK', symbol: '₭', name: '老挝基普', flag: '🇱🇦', rateToCNY: 0.00033, region: '亚洲' },
  { code: 'MMK', symbol: 'K', name: '缅甸缅元', flag: '🇲🇲', rateToCNY: 0.0035, region: '亚洲' },
  { code: 'BND', symbol: 'B$', name: '文莱元', flag: '🇧🇳', rateToCNY: 5.38, region: '亚洲' },
  { code: 'MNT', symbol: '₮', name: '蒙古图格里克', flag: '🇲🇳', rateToCNY: 0.0021, region: '亚洲' },
  { code: 'KZT', symbol: '₸', name: '哈萨克斯坦坚戈', flag: '🇰🇿', rateToCNY: 0.015, region: '亚洲' },

  // === 中东货币 ===
  { code: 'AED', symbol: 'د.إ', name: '阿联酋迪拉姆', flag: '🇦🇪', rateToCNY: 1.97, region: '中东' },
  { code: 'SAR', symbol: '﷼', name: '沙特里亚尔', flag: '🇸🇦', rateToCNY: 1.93, region: '中东' },
  { code: 'QAR', symbol: '﷼', name: '卡塔尔里亚尔', flag: '🇶🇦', rateToCNY: 1.99, region: '中东' },
  { code: 'KWD', symbol: 'د.ك', name: '科威特第纳尔', flag: '🇰🇼', rateToCNY: 23.6, region: '中东' },
  { code: 'BHD', symbol: '.د.ب', name: '巴林第纳尔', flag: '🇧🇭', rateToCNY: 19.2, region: '中东' },
  { code: 'OMR', symbol: '﷼', name: '阿曼里亚尔', flag: '🇴🇲', rateToCNY: 18.8, region: '中东' },
  { code: 'JOD', symbol: 'د.ا', name: '约旦第纳尔', flag: '🇯🇴', rateToCNY: 10.2, region: '中东' },
  { code: 'LBP', symbol: '£', name: '黎巴嫩镑', flag: '🇱🇧', rateToCNY: 0.000081, region: '中东' },
  { code: 'ILS', symbol: '₪', name: '以色列谢克尔', flag: '🇮🇱', rateToCNY: 1.97, region: '中东' },
  { code: 'IRR', symbol: '﷼', name: '伊朗里亚尔', flag: '🇮🇷', rateToCNY: 0.000017, region: '中东' },
  { code: 'IQD', symbol: 'ع.د', name: '伊拉克第纳尔', flag: '🇮🇶', rateToCNY: 0.0055, region: '中东' },
  { code: 'EGP', symbol: '£', name: '埃及镑', flag: '🇪🇬', rateToCNY: 0.15, region: '非洲' },

  // === 欧洲货币 ===
  { code: 'CHF', symbol: 'Fr', name: '瑞士法郎', flag: '🇨🇭', rateToCNY: 8.25, region: '欧洲' },
  { code: 'SEK', symbol: 'kr', name: '瑞典克朗', flag: '🇸🇪', rateToCNY: 0.69, region: '欧洲' },
  { code: 'NOK', symbol: 'kr', name: '挪威克朗', flag: '🇳🇴', rateToCNY: 0.68, region: '欧洲' },
  { code: 'DKK', symbol: 'kr', name: '丹麦克朗', flag: '🇩🇰', rateToCNY: 1.05, region: '欧洲' },
  { code: 'PLN', symbol: 'zł', name: '波兰兹罗提', flag: '🇵🇱', rateToCNY: 1.83, region: '欧洲' },
  { code: 'CZK', symbol: 'Kč', name: '捷克克朗', flag: '🇨🇿', rateToCNY: 0.32, region: '欧洲' },
  { code: 'HUF', symbol: 'Ft', name: '匈牙利福林', flag: '🇭🇺', rateToCNY: 0.020, region: '欧洲' },
  { code: 'RON', symbol: 'lei', name: '罗马尼亚列伊', flag: '🇷🇴', rateToCNY: 1.58, region: '欧洲' },
  { code: 'BGN', symbol: 'лв', name: '保加利亚列弗', flag: '🇧🇬', rateToCNY: 4.02, region: '欧洲' },
  { code: 'ISK', symbol: 'kr', name: '冰岛克朗', flag: '🇮🇸', rateToCNY: 0.053, region: '欧洲' },
  { code: 'UAH', symbol: '₴', name: '乌克兰格里夫纳', flag: '🇺🇦', rateToCNY: 0.17, region: '欧洲' },
  { code: 'TRY', symbol: '₺', name: '土耳其里拉', flag: '🇹🇷', rateToCNY: 0.21, region: '欧洲' },
  { code: 'RUB', symbol: '₽', name: '俄罗斯卢布', flag: '🇷🇺', rateToCNY: 0.082, region: '欧洲' },
  { code: 'NZD', symbol: 'NZ$', name: '新西兰元', flag: '🇳🇿', rateToCNY: 4.35, region: '大洋洲' },

  // === 美洲货币 ===
  { code: 'AUD', symbol: 'A$', name: '澳元', flag: '🇦🇺', rateToCNY: 4.72, region: '大洋洲' },
  { code: 'CAD', symbol: 'C$', name: '加元', flag: '🇨🇦', rateToCNY: 5.25, region: '美洲' },
  { code: 'BRL', symbol: 'R$', name: '巴西雷亚尔', flag: '🇧🇷', rateToCNY: 1.30, region: '美洲' },
  { code: 'MXN', symbol: '$', name: '墨西哥比索', flag: '🇲🇽', rateToCNY: 0.38, region: '美洲' },
  { code: 'ARS', symbol: '$', name: '阿根廷比索', flag: '🇦🇷', rateToCNY: 0.0072, region: '美洲' },
  { code: 'CLP', symbol: '$', name: '智利比索', flag: '🇨🇱', rateToCNY: 0.0078, region: '美洲' },
  { code: 'COP', symbol: '$', name: '哥伦比亚比索', flag: '🇨🇴', rateToCNY: 0.0017, region: '美洲' },
  { code: 'PEN', symbol: 'S/', name: '秘鲁索尔', flag: '🇵🇪', rateToCNY: 1.92, region: '美洲' },
  { code: 'UYU', symbol: '$U', name: '乌拉圭比索', flag: '🇺🇾', rateToCNY: 0.18, region: '美洲' },
  { code: 'DOP', symbol: 'RD$', name: '多米尼加比索', flag: '🇩🇴', rateToCNY: 0.12, region: '美洲' },
  { code: 'GTQ', symbol: 'Q', name: '危地马拉格查尔', flag: '🇬🇹', rateToCNY: 0.94, region: '美洲' },
  { code: 'CRC', symbol: '₡', name: '哥斯达黎加科朗', flag: '🇨🇷', rateToCNY: 0.014, region: '美洲' },
  { code: 'JMD', symbol: 'J$', name: '牙买加元', flag: '🇯🇲', rateToCNY: 0.046, region: '美洲' },
  { code: 'BOB', symbol: 'Bs', name: '玻利维亚诺', flag: '🇧🇴', rateToCNY: 1.05, region: '美洲' },
  { code: 'PYG', symbol: '₲', name: '巴拉圭瓜拉尼', flag: '🇵🇾', rateToCNY: 0.00098, region: '美洲' },
  { code: 'HNL', symbol: 'L', name: '洪都拉斯伦皮拉', flag: '🇭🇳', rateToCNY: 0.29, region: '美洲' },

  // === 非洲货币 ===
  { code: 'ZAR', symbol: 'R', name: '南非兰特', flag: '🇿🇦', rateToCNY: 0.40, region: '非洲' },
  { code: 'NGN', symbol: '₦', name: '尼日利亚奈拉', flag: '🇳🇬', rateToCNY: 0.0044, region: '非洲' },
  { code: 'KES', symbol: 'KSh', name: '肯尼亚先令', flag: '🇰🇪', rateToCNY: 0.056, region: '非洲' },
  { code: 'GHS', symbol: '₵', name: '加纳塞地', flag: '🇬🇭', rateToCNY: 0.47, region: '非洲' },
  { code: 'ETB', symbol: 'Br', name: '埃塞俄比亚比尔', flag: '🇪🇹', rateToCNY: 0.058, region: '非洲' },
  { code: 'TZS', symbol: 'TSh', name: '坦桑尼亚先令', flag: '🇹🇿', rateToCNY: 0.0027, region: '非洲' },
  { code: 'UGX', symbol: 'USh', name: '乌干达先令', flag: '🇺🇬', rateToCNY: 0.0019, region: '非洲' },
  { code: 'RWF', symbol: 'FRw', name: '卢旺达法郎', flag: '🇷🇼', rateToCNY: 0.0056, region: '非洲' },
  { code: 'MAD', symbol: 'د.م.', name: '摩洛哥迪拉姆', flag: '🇲🇦', rateToCNY: 0.73, region: '非洲' },
  { code: 'TND', symbol: 'د.ت', name: '突尼斯第纳尔', flag: '🇹🇳', rateToCNY: 2.53, region: '非洲' },
  { code: 'DZD', symbol: 'د.ج', name: '阿尔及利亚第纳尔', flag: '🇩🇿', rateToCNY: 0.054, region: '非洲' },
  { code: 'LYD', symbol: 'ل.د', name: '利比亚第纳尔', flag: '🇱🇾', rateToCNY: 1.50, region: '非洲' },

  // === 大洋洲货币 ===
  { code: 'FJD', symbol: 'FJ$', name: '斐济元', flag: '🇫🇯', rateToCNY: 3.25, region: '大洋洲' },
  { code: 'PGK', symbol: 'K', name: '巴布亚新几内亚基那', flag: '🇵🇬', rateToCNY: 1.82, region: '大洋洲' },
  { code: 'WST', symbol: 'T', name: '萨摩亚塔拉', flag: '🇼🇸', rateToCNY: 2.60, region: '大洋洲' },
  { code: 'SBD', symbol: 'SI$', name: '所罗门群岛元', flag: '🇸🇧', rateToCNY: 0.87, region: '大洋洲' },
  { code: 'TOP', symbol: 'T$', name: '汤加潘加', flag: '🇹🇴', rateToCNY: 3.05, region: '大洋洲' },
  { code: 'VUV', symbol: 'Vt', name: '瓦努阿图瓦图', flag: '🇻🇺', rateToCNY: 0.060, region: '大洋洲' },
  { code: 'XPF', symbol: '₣', name: '太平洋法郎', flag: '🇵🇫', rateToCNY: 0.066, region: '大洋洲' },

  // === 亚洲补充 ===
  { code: 'AFN', symbol: '؋', name: '阿富汗尼', flag: '🇦🇫', rateToCNY: 0.105, region: '亚洲' },
  { code: 'AMD', symbol: '֏', name: '亚美尼亚德拉姆', flag: '🇦🇲', rateToCNY: 0.018, region: '亚洲' },
  { code: 'AZN', symbol: '₼', name: '阿塞拜疆马纳特', flag: '🇦🇿', rateToCNY: 4.26, region: '亚洲' },
  { code: 'KGS', symbol: 'с', name: '吉尔吉斯斯坦索姆', flag: '🇰🇬', rateToCNY: 0.084, region: '亚洲' },
  { code: 'KPW', symbol: '₩', name: '朝鲜圆', flag: '🇰🇵', rateToCNY: 0.0080, region: '亚洲' },
  { code: 'MOP', symbol: 'MOP$', name: '澳门元', flag: '🇲🇴', rateToCNY: 0.90, region: '亚洲' },
  { code: 'TJS', symbol: 'ЅМ', name: '塔吉克斯坦索莫尼', flag: '🇹🇯', rateToCNY: 0.67, region: '亚洲' },
  { code: 'TMT', symbol: 'm', name: '土库曼斯坦马纳特', flag: '🇹🇲', rateToCNY: 2.07, region: '亚洲' },
  { code: 'UZS', symbol: 'soʻm', name: '乌兹别克斯坦苏姆', flag: '🇺🇿', rateToCNY: 0.00057, region: '亚洲' },
  { code: 'BTN', symbol: 'Nu', name: '不丹努尔特鲁姆', flag: '🇧🇹', rateToCNY: 0.087, region: '亚洲' },
  { code: 'MVR', symbol: 'Rf', name: '马尔代夫拉菲亚', flag: '🇲🇻', rateToCNY: 0.47, region: '亚洲' },

  // === 中东补充 ===
  { code: 'YER', symbol: '﷼', name: '也门里亚尔', flag: '🇾🇪', rateToCNY: 0.029, region: '中东' },
  { code: 'SDG', symbol: '£', name: '苏丹镑', flag: '🇸🇩', rateToCNY: 0.012, region: '中东' },
  { code: 'SSP', symbol: '£', name: '南苏丹镑', flag: '🇸🇸', rateToCNY: 0.0040, region: '中东' },
  { code: 'SYP', symbol: '£', name: '叙利亚镑', flag: '🇸🇾', rateToCNY: 0.00056, region: '中东' },

  // === 欧洲补充 ===
  { code: 'ALL', symbol: 'L', name: '阿尔巴尼亚列克', flag: '🇦🇱', rateToCNY: 0.080, region: '欧洲' },
  { code: 'BAM', symbol: 'KM', name: '波黑可兑换马克', flag: '🇧🇦', rateToCNY: 4.02, region: '欧洲' },
  { code: 'BYN', symbol: 'Br', name: '白俄罗斯卢布', flag: '🇧🇾', rateToCNY: 2.20, region: '欧洲' },
  { code: 'GEL', symbol: '₾', name: '格鲁吉亚拉里', flag: '🇬🇪', rateToCNY: 2.68, region: '欧洲' },
  { code: 'MDL', symbol: 'L', name: '摩尔多瓦列伊', flag: '🇲🇩', rateToCNY: 0.41, region: '欧洲' },
  { code: 'MKD', symbol: 'ден', name: '北马其顿第纳尔', flag: '🇲🇰', rateToCNY: 0.128, region: '欧洲' },
  { code: 'RSD', symbol: 'дин', name: '塞尔维亚第纳尔', flag: '🇷🇸', rateToCNY: 0.067, region: '欧洲' },
  { code: 'GIP', symbol: '£', name: '直布罗陀镑', flag: '🇬🇮', rateToCNY: 9.20, region: '欧洲' },
  { code: 'FKP', symbol: '£', name: '福克兰群岛镑', flag: '🇫🇰', rateToCNY: 9.20, region: '欧洲' },

  // === 美洲补充 ===
  { code: 'ANG', symbol: 'ƒ', name: '荷属安的列斯盾', flag: '🇨🇼', rateToCNY: 4.02, region: '美洲' },
  { code: 'AWG', symbol: 'ƒ', name: '阿鲁巴弗罗林', flag: '🇦🇼', rateToCNY: 4.02, region: '美洲' },
  { code: 'BBD', symbol: 'Bds$', name: '巴巴多斯元', flag: '🇧🇧', rateToCNY: 3.60, region: '美洲' },
  { code: 'BMD', symbol: 'BD$', name: '百慕大元', flag: '🇧🇲', rateToCNY: 7.25, region: '美洲' },
  { code: 'BSD', symbol: 'B$', name: '巴哈马元', flag: '🇧🇸', rateToCNY: 7.25, region: '美洲' },
  { code: 'BZD', symbol: 'BZ$', name: '伯利兹元', flag: '🇧🇿', rateToCNY: 3.60, region: '美洲' },
  { code: 'CUP', symbol: '₱', name: '古巴比索', flag: '🇨🇺', rateToCNY: 0.30, region: '美洲' },
  { code: 'GYD', symbol: 'G$', name: '圭亚那元', flag: '🇬🇾', rateToCNY: 0.035, region: '美洲' },
  { code: 'HTG', symbol: 'G', name: '海地古德', flag: '🇭🇹', rateToCNY: 0.054, region: '美洲' },
  { code: 'KYD', symbol: 'KY$', name: '开曼群岛元', flag: '🇰🇾', rateToCNY: 8.70, region: '美洲' },
  { code: 'NIO', symbol: 'C$', name: '尼加拉瓜科多巴', flag: '🇳🇮', rateToCNY: 0.197, region: '美洲' },
  { code: 'PAB', symbol: 'B/.', name: '巴拿马巴波亚', flag: '🇵🇦', rateToCNY: 7.25, region: '美洲' },
  { code: 'SRD', symbol: 'Sr$', name: '苏里南元', flag: '🇸🇷', rateToCNY: 0.25, region: '美洲' },
  { code: 'SVC', symbol: '₡', name: '萨尔瓦多科朗', flag: '🇸🇻', rateToCNY: 0.83, region: '美洲' },
  { code: 'TTD', symbol: 'TT$', name: '特立尼达和多巴哥元', flag: '🇹🇹', rateToCNY: 1.07, region: '美洲' },
  { code: 'VES', symbol: 'Bs', name: '委内瑞拉玻利瓦尔', flag: '🇻🇪', rateToCNY: 0.00020, region: '美洲' },
  { code: 'XCD', symbol: 'EC$', name: '东加勒比元', flag: '🌎', rateToCNY: 2.68, region: '美洲' },

  // === 非洲补充 ===
  { code: 'AOA', symbol: 'Kz', name: '安哥拉宽扎', flag: '🇦🇴', rateToCNY: 0.0079, region: '非洲' },
  { code: 'BIF', symbol: 'FBu', name: '布隆迪法郎', flag: '🇧🇮', rateToCNY: 0.0025, region: '非洲' },
  { code: 'BWP', symbol: 'P', name: '博茨瓦纳普拉', flag: '🇧🇼', rateToCNY: 0.53, region: '非洲' },
  { code: 'CDF', symbol: 'FC', name: '刚果法郎', flag: '🇨🇩', rateToCNY: 0.0032, region: '非洲' },
  { code: 'CVE', symbol: '$', name: '佛得角埃斯库多', flag: '🇨🇻', rateToCNY: 0.071, region: '非洲' },
  { code: 'DJF', symbol: 'Fdj', name: '吉布提法郎', flag: '🇩🇯', rateToCNY: 0.041, region: '非洲' },
  { code: 'ERN', symbol: 'Nfk', name: '厄立特里亚纳克法', flag: '🇪🇷', rateToCNY: 0.48, region: '非洲' },
  { code: 'GMD', symbol: 'D', name: '冈比亚达拉西', flag: '🇬🇲', rateToCNY: 0.10, region: '非洲' },
  { code: 'GNF', symbol: 'FG', name: '几内亚法郎', flag: '🇬🇳', rateToCNY: 0.00084, region: '非洲' },
  { code: 'KMF', symbol: 'CF', name: '科摩罗法郎', flag: '🇰🇲', rateToCNY: 0.016, region: '非洲' },
  { code: 'LRD', symbol: 'L$', name: '利比里亚元', flag: '🇱🇷', rateToCNY: 0.038, region: '非洲' },
  { code: 'LSL', symbol: 'L', name: '莱索托洛蒂', flag: '🇱🇸', rateToCNY: 0.40, region: '非洲' },
  { code: 'MGA', symbol: 'Ar', name: '马达加斯加阿里亚里', flag: '🇲🇬', rateToCNY: 0.0016, region: '非洲' },
  { code: 'MRU', symbol: 'UM', name: '毛里塔尼亚乌吉亚', flag: '🇲🇷', rateToCNY: 0.018, region: '非洲' },
  { code: 'MUR', symbol: '₨', name: '毛里求斯卢比', flag: '🇲🇺', rateToCNY: 0.16, region: '非洲' },
  { code: 'MWK', symbol: 'MK', name: '马拉维克瓦查', flag: '🇲🇼', rateToCNY: 0.0042, region: '非洲' },
  { code: 'MZN', symbol: 'MT', name: '莫桑比克梅蒂卡尔', flag: '🇲🇿', rateToCNY: 0.11, region: '非洲' },
  { code: 'NAD', symbol: 'N$', name: '纳米比亚元', flag: '🇳🇦', rateToCNY: 0.40, region: '非洲' },
  { code: 'SCR', symbol: '₨', name: '塞舌尔卢比', flag: '🇸🇨', rateToCNY: 0.53, region: '非洲' },
  { code: 'SHP', symbol: '£', name: '圣赫勒拿镑', flag: '🇸🇭', rateToCNY: 9.20, region: '非洲' },
  { code: 'SLE', symbol: 'Le', name: '塞拉利昂利昂', flag: '🇸🇱', rateToCNY: 0.00033, region: '非洲' },
  { code: 'SOS', symbol: 'Sh', name: '索马里先令', flag: '🇸🇴', rateToCNY: 0.013, region: '非洲' },
  { code: 'STN', symbol: 'Db', name: '圣多美多布拉', flag: '🇸🇹', rateToCNY: 0.32, region: '非洲' },
  { code: 'SZL', symbol: 'E', name: '斯威士兰里兰吉尼', flag: '🇸🇿', rateToCNY: 0.40, region: '非洲' },
  { code: 'ZMW', symbol: 'ZK', name: '赞比亚克瓦查', flag: '🇿🇲', rateToCNY: 0.28, region: '非洲' },
  { code: 'ZWL', symbol: 'Z$', name: '津巴布韦元', flag: '🇿🇼', rateToCNY: 0.022, region: '非洲' },
  { code: 'XAF', symbol: 'FCFA', name: '中非法郎', flag: '🌍', rateToCNY: 0.012, region: '非洲' },
  { code: 'XOF', symbol: 'CFA', name: '西非法郎', flag: '🌍', rateToCNY: 0.012, region: '非洲' },
];

// 从 localStorage 获取用户自定义汇率
export const getCustomRates = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem('bookeep_custom_rates');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// 保存用户自定义汇率
export const saveCustomRates = (rates: Record<string, number>): void => {
  localStorage.setItem('bookeep_custom_rates', JSON.stringify(rates));
};

// === 实时汇率获取与缓存 ===

const LIVE_RATES_KEY = 'bookeep_live_rates';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6小时缓存

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

// 从 API 获取实时汇率（基于 CNY）
export const fetchLiveRates = async (): Promise<{ rates: Record<string, number>, timestamp: number } | null> => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/CNY');
    const data = await response.json();
    if (data.result === 'success' && data.rates) {
      // API 返回 "1 CNY = X 外币"，转换为 "1 外币 = Y CNY"
      const ratesToCNY: Record<string, number> = {};
      for (const [code, rate] of Object.entries(data.rates as Record<string, number>)) {
        ratesToCNY[code] = rate > 0 ? 1 / rate : 0;
      }
      const timestamp = data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now();
      // 保存到缓存
      const cached: CachedRates = { rates: ratesToCNY, timestamp };
      localStorage.setItem(LIVE_RATES_KEY, JSON.stringify(cached));
      return cached;
    }
    return null;
  } catch (e) {
    return null;
  }
};

// 获取缓存的实时汇率（过期返回 null）
export const getCachedLiveRates = (): CachedRates | null => {
  try {
    const stored = localStorage.getItem(LIVE_RATES_KEY);
    if (!stored) return null;
    const cached: CachedRates = JSON.parse(stored);
    if (Date.now() - cached.timestamp > CACHE_DURATION) return null;
    return cached;
  } catch {
    return null;
  }
};

// 获取最后更新时间（即使过期也返回）
export const getLastUpdateTime = (): number | null => {
  try {
    const stored = localStorage.getItem(LIVE_RATES_KEY);
    if (!stored) return null;
    const cached: CachedRates = JSON.parse(stored);
    return cached.timestamp;
  } catch {
    return null;
  }
};

// 获取货币的当前汇率（优先级：自定义 > 实时缓存 > 默认）
export const getRate = (currencyCode: string): number => {
  const customRates = getCustomRates();
  if (customRates[currencyCode] !== undefined) {
    return customRates[currencyCode];
  }
  const liveRates = getCachedLiveRates();
  if (liveRates && liveRates.rates[currencyCode] !== undefined) {
    return liveRates.rates[currencyCode];
  }
  const currency = currencies.find(c => c.code === currencyCode);
  return currency ? currency.rateToCNY : 1;
};

// 判断汇率来源（用于 UI 显示）
export const getRateSource = (currencyCode: string): 'custom' | 'live' | 'default' => {
  const customRates = getCustomRates();
  if (customRates[currencyCode] !== undefined) return 'custom';
  const liveRates = getCachedLiveRates();
  if (liveRates && liveRates.rates[currencyCode] !== undefined) return 'live';
  return 'default';
};

// 外币转人民币
export const convertToCNY = (amount: number, fromCurrency: string): number => {
  const rate = getRate(fromCurrency);
  if (!rate || rate <= 0 || !isFinite(rate)) return 0;
  const result = amount * rate;
  return isFinite(result) ? Math.round(result * 100) / 100 : 0;
};

// 人民币转外币
export const convertFromCNY = (amountCNY: number, toCurrency: string): number => {
  const rate = getRate(toCurrency);
  if (!rate || rate <= 0 || !isFinite(rate)) return 0;
  const result = amountCNY / rate;
  return isFinite(result) ? Math.round(result * 100) / 100 : 0;
};

// 获取货币符号
export const getCurrencySymbol = (code: string): string => {
  const currency = currencies.find(c => c.code === code);
  return currency ? currency.symbol : code;
};

// 获取货币名称
export const getCurrencyName = (code: string): string => {
  const currency = currencies.find(c => c.code === code);
  return currency ? currency.name : code;
};

// 获取货币信息
export const getCurrency = (code: string): Currency | undefined => {
  return currencies.find(c => c.code === code);
};

// 判断货币是否需要整数显示（无小数位）
export const isZeroDecimalCurrency = (code: string): boolean => {
  return ['JPY', 'KRW', 'VND', 'IDR', 'KHR', 'LAK', 'MMK', 'UGX', 'TZS', 'RWF', 'PYG', 'CLP', 'COP', 'ISK', 'IRR', 'IQD', 'LBP', 'BIF', 'DJF', 'GNF', 'KMF', 'VUV', 'XAF', 'XOF', 'XPF'].includes(code);
};

// 格式化货币显示
export const formatCurrencyAmount = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  const decimals = isZeroDecimalCurrency(currencyCode) ? 0 : 2;
  return `${symbol}${amount.toFixed(decimals)}`;
};
