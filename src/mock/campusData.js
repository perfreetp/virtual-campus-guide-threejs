export const categories = [
  { label: '全部', value: 'all' },
  { label: '教学区', value: 'teaching' },
  { label: '生活区', value: 'life' },
  { label: '运动区', value: 'sports' },
  { label: '服务区', value: 'service' }
];

export const categoryNames = {
  teaching: '教学区',
  life: '生活区',
  sports: '运动区',
  service: '服务区'
};

export const campusBuildings = [
  {
    id: 'gate',
    name: '智慧校门',
    category: 'service',
    intro: '校园主入口与访客登记中心，连接主干道和迎新广场。',
    openTime: '06:30 - 23:00',
    functionDesc: '访客登记、门禁通行、校园导览咨询、校车停靠。',
    position: [-14, 0, 9.6],
    size: [4.8, 2.2, 1.2],
    color: '#7fc8ff',
    shape: 'gate'
  },
  {
    id: 'teaching-a',
    name: '明德教学楼',
    category: 'teaching',
    intro: '主要公共课教学楼，拥有多媒体教室与智慧讨论室。',
    openTime: '07:30 - 22:00',
    functionDesc: '本科教学、课程研讨、考试安排、教务服务。',
    position: [-5.2, 0, -2.6],
    size: [5.5, 5.4, 4],
    color: '#5ba7ff',
    shape: 'tower'
  },
  {
    id: 'library',
    name: '星海图书馆',
    category: 'teaching',
    intro: '校园学习中心，设有藏书区、自习区和数字资源中心。',
    openTime: '08:00 - 22:30',
    functionDesc: '图书借阅、资料检索、安静自习、电子阅览。',
    position: [4.8, 0, -3.5],
    size: [6.4, 4.4, 4.7],
    color: '#8bb8ff',
    shape: 'terrace'
  },
  {
    id: 'lab',
    name: '未来实验中心',
    category: 'teaching',
    intro: '科研创新与实践教学空间，配备开放实验室和展示区。',
    openTime: '08:30 - 21:00',
    functionDesc: '科研实验、项目路演、创新实践、竞赛培训。',
    position: [11.6, 0, -8.8],
    size: [4.8, 6.1, 4.8],
    color: '#61c1ff',
    shape: 'tower'
  },
  {
    id: 'academy',
    name: '格物学院',
    category: 'teaching',
    intro: '专业课教学与学院办公空间，围合式庭院便于课间交流。',
    openTime: '07:30 - 22:00',
    functionDesc: '专业教学、导师答疑、学院会议、课程展示。',
    position: [-14.8, 0, -7.8],
    size: [5.1, 3.2, 3.9],
    color: '#6bb9ff',
    shape: 'courtyard'
  },
  {
    id: 'innovation',
    name: '创新创业园',
    category: 'teaching',
    intro: '学生团队孵化空间，包含路演厅、共享工位和创客工坊。',
    openTime: '09:00 - 22:00',
    functionDesc: '项目孵化、竞赛训练、创业辅导、作品展示。',
    position: [16.2, 0, 0.2],
    size: [4.4, 4.7, 3.6],
    color: '#57d4ff',
    shape: 'stepped'
  },
  {
    id: 'dorm-north',
    name: '清风宿舍北区',
    category: 'life',
    intro: '高层学生公寓，配套公共厨房、洗衣房和社区学习角。',
    openTime: '全天开放',
    functionDesc: '学生住宿、门禁管理、生活服务、社区活动。',
    position: [10.6, 0, 7.2],
    size: [5.2, 6.6, 3.8],
    color: '#74d4df',
    shape: 'residence'
  },
  {
    id: 'dorm-south',
    name: '清风宿舍南区',
    category: 'life',
    intro: '低层生活组团，临近食堂和快递驿站，适合新生集中入住。',
    openTime: '全天开放',
    functionDesc: '学生住宿、社区值班、公共活动、生活报修。',
    position: [15.2, 0, 10.6],
    size: [4.6, 4.8, 3.6],
    color: '#6ed6c8',
    shape: 'residence'
  },
  {
    id: 'canteen',
    name: '蓝湾食堂',
    category: 'life',
    intro: '综合餐饮服务中心，提供多种风味档口和轻食区。',
    openTime: '06:30 - 20:30',
    functionDesc: '早餐、午餐、晚餐、校园卡充值、简餐外带。',
    position: [0, 0, 9.2],
    size: [5.8, 2.6, 3.8],
    color: '#7ac7ff',
    shape: 'terrace'
  },
  {
    id: 'market',
    name: '校园商业街',
    category: 'life',
    intro: '轻量商业服务街区，包含便利店、咖啡、文印和快递点。',
    openTime: '08:00 - 22:30',
    functionDesc: '生活采购、快递收发、打印复印、休闲交流。',
    position: [-6.8, 0, 8.6],
    size: [5.2, 2.2, 2.8],
    color: '#88d5ff',
    shape: 'strip'
  },
  {
    id: 'playground',
    name: '晨光操场',
    category: 'sports',
    intro: '标准运动场与户外活动空间，适合跑步、足球和集体活动。',
    openTime: '06:00 - 21:30',
    functionDesc: '体育课程、跑步训练、足球比赛、校园活动集会。',
    position: [-7.8, 0, -10.6],
    size: [8.5, 0.24, 5.5],
    color: '#4ab6d6',
    shape: 'playground'
  },
  {
    id: 'gym',
    name: '蓝穹体育馆',
    category: 'sports',
    intro: '室内综合体育馆，拥有篮球馆、羽毛球馆和体测中心。',
    openTime: '08:00 - 21:30',
    functionDesc: '室内训练、赛事活动、体能测试、社团排练。',
    position: [-16.2, 0, 1.2],
    size: [5.8, 3.5, 5.4],
    color: '#42b8ff',
    shape: 'dome'
  },
  {
    id: 'pool',
    name: '游泳训练馆',
    category: 'sports',
    intro: '恒温泳池与水上安全训练空间，服务体育课程和校队训练。',
    openTime: '10:00 - 21:00',
    functionDesc: '游泳课程、校队训练、水上安全教育、体能恢复。',
    position: [-1.6, 0, -14.2],
    size: [4.8, 2.1, 3.6],
    color: '#36c9e9',
    shape: 'pool'
  },
  {
    id: 'service',
    name: '校园服务中心',
    category: 'service',
    intro: '集中办理校园事务的一站式服务大厅。',
    openTime: '09:00 - 17:30',
    functionDesc: '证明办理、失物招领、缴费咨询、后勤报修。',
    position: [-11.2, 0, -1.9],
    size: [4.2, 2.8, 3.5],
    color: '#94d8ff',
    shape: 'terrace'
  },
  {
    id: 'admin',
    name: '行政中心',
    category: 'service',
    intro: '校园行政办公和会议接待空间，位于主轴线核心位置。',
    openTime: '08:30 - 17:30',
    functionDesc: '行政办公、会议接待、档案服务、校务咨询。',
    position: [5.4, 0, 4.6],
    size: [4.8, 3.3, 3.7],
    color: '#9dd6ff',
    shape: 'courtyard'
  },
  {
    id: 'clinic',
    name: '校医院',
    category: 'service',
    intro: '校园基础医疗保障点，提供门诊、急救和健康咨询。',
    openTime: '08:00 - 22:00',
    functionDesc: '日常门诊、急救值班、健康体检、心理咨询转介。',
    position: [14.8, 0, -4.4],
    size: [3.8, 2.5, 3.2],
    color: '#8fdcff',
    shape: 'clinic'
  },
  {
    id: 'twin-center',
    name: '数字孪生中心',
    category: 'teaching',
    intro: '校园数字孪生展示与智能运维中心，承担可视化调度和实训展示。',
    openTime: '09:00 - 21:00',
    functionDesc: '三维展示、数据调度、智慧运维、沉浸式课程实训。',
    position: [0.6, 0, -7.9],
    size: [4.5, 5.8, 3.9],
    color: '#45d7ff',
    shape: 'twin'
  },
  {
    id: 'auditorium',
    name: '星环大礼堂',
    category: 'service',
    intro: '大型报告、毕业典礼与校园演出空间，入口连接中央广场。',
    openTime: '08:30 - 22:00',
    functionDesc: '报告会议、文艺演出、典礼活动、学术论坛。',
    position: [-3.2, 0, 3.8],
    size: [6.3, 3.2, 4.8],
    color: '#78c9ff',
    shape: 'auditorium'
  },
  {
    id: 'clocktower',
    name: '校史钟楼',
    category: 'service',
    intro: '校园精神地标与校史展示点，是参观路线的重要打卡节点。',
    openTime: '全天开放',
    functionDesc: '校史展示、地标打卡、校友纪念、校园文化导览。',
    position: [-14.8, 0, 4.9],
    size: [2.4, 6.2, 2.4],
    color: '#91d7ff',
    shape: 'clocktower'
  },
  {
    id: 'solar-hub',
    name: '光伏教学楼',
    category: 'teaching',
    intro: '绿色能源示范教学楼，屋顶布置光伏板和能耗监测设备。',
    openTime: '07:30 - 21:30',
    functionDesc: '低碳课程、能源实验、光伏展示、智慧楼宇监测。',
    position: [8.5, 0, -12.8],
    size: [5.1, 4.6, 3.5],
    color: '#69c6ff',
    shape: 'solar'
  },
  {
    id: 'parking',
    name: '智慧停车楼',
    category: 'service',
    intro: '半地下停车与校园摆渡接驳点，支持车位引导和访客停车。',
    openTime: '06:30 - 23:30',
    functionDesc: '车辆停放、充电车位、访客接驳、车位导航。',
    position: [18.2, 0, 6.2],
    size: [4.8, 2.8, 4.2],
    color: '#79d3f2',
    shape: 'parking'
  }
];

export const recommendedRoutes = [
  { id: 'route-study', name: '学习探索线', start: 'gate', end: 'library' },
  { id: 'route-life', name: '新生日常线', start: 'dorm-north', end: 'canteen' },
  { id: 'route-sports', name: '活力运动线', start: 'teaching-a', end: 'playground' },
  { id: 'route-landmark', name: '地标打卡线', start: 'clocktower', end: 'twin-center' }
];
