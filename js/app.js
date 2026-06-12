/**
 * =============================================
 * 网上商城 - 核心应用逻辑
 * 24215220120_陈学羽_大作业
 * 
 * 【答辩要点】本文件是整个项目的核心，采用纯前端技术栈实现了一个完整的电商系统。
 * 技术栈：HTML5 + CSS3 + Vanilla JavaScript (ES6+)
 * 数据存储：浏览器 LocalStorage（模拟后端数据库）
 * 架构模式：全局状态管理（AppState 单例） + 事件驱动
 * 
 * 核心功能模块：
 *   一、全局状态管理 (AppState) - 类似 Vuex/Redux 的简化实现
 *   二、页面初始化入口 - DOMContentLoaded 事件驱动
 *   三、商品数据加载 - fetch API 异步获取 JSON 数据
 *   四、用户管理模块 - LocalStorage 模拟后端认证系统
 *   五、购物车管理模块 - 数组 CRUD + 持久化存储
 *   六、商品渲染模块 - 模板字符串 + innerHTML 数据驱动视图
 *   七、搜索功能模块 - 模糊匹配 + 分类筛选
 *   八、排序功能模块 - Array.sort() 多种排序策略
 *   九、收藏功能模块 - LocalStorage 独立键值存储
 *   十、搜索历史模块 - 有限队列（FIFO-like）
 *   十一、回到顶部按钮 - 动态 DOM 创建 + scroll 事件
 *   十二、Toast 消息提示 - 动态创建 + setTimeout 自动消失
 *   十三、轮播图控制 - setInterval + CSS opacity 过渡
 *   十四、订单管理模块 - 时间戳唯一 ID + 不可变数据
 *   十五、工具函数 - 日期格式化
 *   十六、全局函数导出 - window 对象挂载
 * =============================================
 */

// =====================================================
// 一、全局状态管理对象 (AppState)
// 【答辩要点】这是整个项目的核心状态容器，使用单例模式设计。
// 所有页面共享同一个 AppState 对象，实现跨页面的数据共享。
// 这种设计思想类似于 Vuex（Vue的状态管理）或 Redux（React的状态管理）。
// 区别在于：我们不需要引入第三方库，直接用原生 JS 对象实现。
// 每个属性代表商城的一个数据维度，所有页面的 UI 都基于这些状态渲染。
// =====================================================
const AppState = {
    // 当前登录用户信息，null 表示未登录
    // {id: 'U1234567890', name: '张三', phone: '13800138000'}
    currentUser: null,
    
    // 购物车数据数组，每个元素包含商品信息和用户操作状态
    // [{productId: 1, name: '商品名', price: 99.00, image: '路径', quantity: 2, checked: true}]
    cart: [],
    
    // 所有商品列表，从 data/products.json 异步加载
    products: [],
    
    // 用户输入的搜索关键词（用于筛选商品）
    searchKeyword: '',
    
    // 当前选中的商品分类（默认'全部'表示不筛选）
    currentCategory: '全部',
    
    // 收藏商品 ID 数组，只存储 ID 避免数据冗余
    // 需要商品详情时通过 products 数组 find() 关联查找
    favorites: [],
    
    // 搜索历史关键词数组，最新的在前面（用 unshift 插入）
    searchHistory: [],
    
    // 当前排序方式，影响商品列表的显示顺序
    // 可选值: 'default' | 'price-asc' | 'price-desc' | 'sales' | 'rating'
    currentSort: 'default',
};

// =====================================================
// 二、页面初始化入口
// 【答辩要点】DOMContentLoaded 是浏览器内置事件，在 HTML 文档解析完成后触发。
// 与 window.onload 的区别：DOMContentLoaded 不需要等图片/CSS加载完，所以更快。
// 这里采用事件驱动模式，页面加载后自动执行一系列初始化函数。
// 每个 init 函数负责初始化一个功能模块，实现了关注点分离。
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();              // 1. 加载商品数据（fetch JSON文件）
    initUser();                  // 2. 从LocalStorage恢复登录状态
    updateCartBadge();           // 3. 更新购物车角标数字
    updateUserUI();              // 4. 根据登录状态显示/隐藏UI元素
    initSearch();                // 5. 绑定搜索框的点击和回车事件
    loadFavoritesFromStorage();  // 6. 从LocalStorage恢复收藏列表
    loadSearchHistory();         // 7. 从LocalStorage恢复搜索历史
    initBackToTop();             // 8. 创建"回到顶部"按钮并绑定滚动事件
});

// =====================================================
// 三、商品数据加载
// 【答辩要点】使用 Fetch API 进行异步 HTTP 请求，这是现代浏览器内置的 API。
// Fetch 基于 Promise，支持链式调用 .then() 和 .catch()。
// 异步编程的优势：不阻塞主线程，页面在等待数据时仍然可以响应用户操作。
// 错误处理：.catch() 捕获网络错误，并提供降级方案（备用数据）。
// =====================================================
function loadProducts() {
    // fetch() 返回一个 Promise 对象，代表异步操作的最终结果
    fetch('data/products.json')
        // .then() 的第一个回调：将 HTTP 响应体解析为 JSON 对象
        // res.json() 本身也返回 Promise，所以需要链式调用下一个 .then()
        .then(res => res.json())
        // 第二个 .then()：处理解析后的数据
        .then(data => {
            AppState.products = data;  // 将商品数据存入全局状态
            renderProducts(data);      // 调用渲染函数，将数据显示到页面
        })
        // .catch()：捕获前面任何环节抛出的异常
        .catch(err => {
            console.error('加载商品数据失败:', err);
            // 降级方案：如果有备用数据（FALLBACK_PRODUCTS），使用备用数据
            if (typeof FALLBACK_PRODUCTS !== 'undefined') {
                AppState.products = FALLBACK_PRODUCTS;
                renderProducts(FALLBACK_PRODUCTS);
            }
        });
}

// =====================================================
// 四、用户管理模块
// 【答辩要点】使用 LocalStorage 模拟后端用户系统。
// LocalStorage 是浏览器提供的客户端存储方案，容量约 5MB，数据持久化在本地磁盘。
// 数据以"键值对"形式存储，值只能是字符串，所以对象需要 JSON.stringify 序列化。
// 不同页面（同源）共享 LocalStorage，实现了跨页面状态同步。
// 存储设计：shop_users 存所有用户，shop_currentUser 存当前登录用户。
// 每个用户的购物车、订单、收藏都有独立的 key（如 shop_cart_用户ID）。
// =====================================================

/**
 * 初始化用户状态
 * 【答辩要点】页面加载时从 LocalStorage 恢复登录信息。
 * 如果之前登录过且未退出，直接恢复登录状态，实现"记住登录"功能。
 * try-catch 防止 JSON 格式损坏导致程序崩溃（防御性编程）。
 */
function initUser() {
    // 从 LocalStorage 读取登录信息
    const savedUser = localStorage.getItem('shop_currentUser');
    if (savedUser) {
        try {
            // JSON.parse() 将 JSON 字符串还原为 JavaScript 对象
            AppState.currentUser = JSON.parse(savedUser);
            // 恢复该用户的购物车数据
            loadCartFromStorage();
        } catch (e) {
            // JSON 解析失败（数据损坏），重置为未登录状态
            AppState.currentUser = null;
        }
    }
}

/**
 * 从 LocalStorage 加载当前用户的购物车
 * 【答辩要点】每个用户的购物车用独立 key 存储（shop_cart_用户ID）。
 * 这样不同用户的购物车数据互相隔离，实现了多用户支持。
 */
function loadCartFromStorage() {
    if (AppState.currentUser) {
        // 拼接用户专属的存储键名，如 shop_cart_U1234567890
        const key = `shop_cart_${AppState.currentUser.id}`;
        const savedCart = localStorage.getItem(key);
        // 如果本地有数据就解析，没有就初始化为空数组
        AppState.cart = savedCart ? JSON.parse(savedCart) : [];
    }
}

/**
 * 保存购物车到 LocalStorage
 * 【答辩要点】每次购物车数据变化后调用此函数，实现数据持久化。
 * JSON.stringify() 将 JS 对象转为 JSON 字符串存储。
 */
function saveCartToStorage() {
    if (AppState.currentUser) {
        const key = `shop_cart_${AppState.currentUser.id}`;
        localStorage.setItem(key, JSON.stringify(AppState.cart));
    }
}

/**
 * 更新用户界面元素
 * 【答辩要点】这是"状态驱动视图"的典型实现。
 * 根据 AppState.currentUser 的值，动态切换页面元素的显示/隐藏。
 * querySelectorAll 批量选择多个同类元素，forEach 遍历处理。
 * 核心思想：数据变 → 视图自动变（单向数据绑定）。
 */
function updateUserUI() {
    // 获取页面上所有需要根据登录状态切换的元素
    const userInfoEls = document.querySelectorAll('.user-info');  // 显示用户名的 span
    const loginLinks = document.querySelectorAll('.login-link');  // 登录/注册链接
    const logoutBtns = document.querySelectorAll('.btn-logout');  // 退出按钮
    
    if (AppState.currentUser) {
        // === 已登录状态 ===
        // 显示用户名，隐藏登录/注册链接
        userInfoEls.forEach(el => {
            el.textContent = `您好，${AppState.currentUser.name}`;
            el.style.display = '';  // 恢复默认显示（行内元素或块级元素）
        });
        loginLinks.forEach(el => el.style.display = 'none');  // 隐藏
        logoutBtns.forEach(el => el.style.display = '');      // 显示
    } else {
        // === 未登录状态 ===
        userInfoEls.forEach(el => el.style.display = 'none');
        loginLinks.forEach(el => el.style.display = '');
        logoutBtns.forEach(el => el.style.display = 'none');
    }
}

/**
 * 退出登录
 * 【答辩要点】清空所有用户相关数据，包括内存（AppState）和持久化存储（LocalStorage）。
 * setTimeout 延迟跳转是为了让用户看到 Toast 提示信息。
 */
function logout() {
    // 清空内存中的用户状态
    AppState.currentUser = null;
    AppState.cart = [];
    AppState.favorites = [];
    // 清空 LocalStorage 中的登录状态
    localStorage.removeItem('shop_currentUser');
    // 更新 UI（隐藏用户名，显示登录链接）
    updateUserUI();
    updateCartBadge();
    showToast('已退出登录', 'info');
    // 1秒后跳转回首页（给用户看到提示的时间）
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

// =====================================================
// 五、购物车管理模块
// 【答辩要点】购物车是电商系统的核心功能，本质是一个"商品数组"的 CRUD 操作。
// 使用的 JS 数组方法：
//   - find()：查找第一个匹配元素（用于判断商品是否已在购物车中）
//   - filter()：筛选符合条件的元素（用于删除商品）
//   - push()：在数组末尾添加元素（用于添加商品）
//   - reduce()：遍历累加计算（用于计算总金额）
//   - forEach()：遍历每个元素（用于全选/取消全选）
// 所有修改操作后都调用 saveCartToStorage() 持久化保存。
// =====================================================

/**
 * 添加商品到购物车
 * @param {number} productId - 商品ID
 * @param {number} quantity  - 添加数量，默认为1
 * 【答辩要点】核心逻辑分两步：
 *   1. 检查是否已存在该商品 → 存在则累加数量，不存在则新增
 *   2. 保存到 LocalStorage 并更新 UI
 * 这是购物车最基本也是最重要的操作。
 */
function addToCart(productId, quantity = 1) {
    // === 权限检查：未登录用户不能使用购物车 ===
    if (!AppState.currentUser) {
        showToast('请先登录后再添加商品到购物车', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;  // 提前返回，阻止后续代码执行
    }
    
    // === 查找商品信息 ===
    // find() 方法接收一个回调函数，对数组每个元素执行，返回第一个返回 true 的元素
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;  // 商品不存在，直接返回
    
    // === 检查购物车中是否已有该商品 ===
    const existingItem = AppState.cart.find(item => item.productId === productId);
    if (existingItem) {
        // 情况1：商品已存在 → 累加数量（直接修改引用，无需 push）
        existingItem.quantity += quantity;
    } else {
        // 情况2：商品不存在 → 创建新购物车项并添加到数组末尾
        AppState.cart.push({
            productId: productId,    // 商品ID（用于关联查找）
            name: product.name,      // 商品名称（冗余存储，避免频繁关联查询）
            price: product.price,    // 商品单价
            image: product.image,    // 商品图片路径
            quantity: quantity,      // 购买数量
            checked: true            // 默认勾选（便于结算）
        });
    }
    
    // === 持久化保存 + 更新UI ===
    saveCartToStorage();  // 同步到 LocalStorage
    updateCartBadge();    // 更新购物车角标数字
    showToast(`"${product.name}" 已加入购物车`, 'success');
}

/**
 * 从购物车中移除指定商品
 * @param {number} productId - 商品ID
 * 【答辩要点】使用 filter() 方法创建"不包含该商品"的新数组。
 * filter() 是函数式编程中的常用方法，不修改原数组，而是返回新数组。
 * 这里用新数组替换 cart，实现了"删除"操作（不可变数据思想）。
 */
function removeFromCart(productId) {
    // filter() 遍历每个元素，回调返回 true 则保留，false 则排除
    // item.productId !== productId → 保留所有 ID 不匹配的商品，即删除了目标商品
    AppState.cart = AppState.cart.filter(item => item.productId !== productId);
    saveCartToStorage();   // 持久化
    updateCartBadge();     // 更新角标
}

/**
 * 更新购物车中商品的数量
 * @param {number} productId - 商品ID
 * @param {number} quantity  - 新数量（会被限制在 1-99 之间）
 * 【答辩要点】使用 Math.max 和 Math.min 实现"值域钳制"（clamp）。
 * Math.max(1, x) 确保不小于1，Math.min(x, 99) 确保不大于99。
 */
function updateCartQuantity(productId, quantity) {
    // find() 返回的是数组元素的引用，修改它直接修改原数组
    const item = AppState.cart.find(item => item.productId === productId);
    if (item) {
        // 钳制数量范围 [1, 99]
        item.quantity = Math.max(1, Math.min(quantity, 99));
        saveCartToStorage();
    }
}

/**
 * 切换单个购物车商品的选中状态
 * 【答辩要点】!item.checked 取反操作实现 toggle 效果。
 */
function toggleCartItemCheck(productId) {
    const item = AppState.cart.find(item => item.productId === productId);
    if (item) {
        item.checked = !item.checked;  // 取反：选中→取消，取消→选中
        saveCartToStorage();
    }
}

/**
 * 全选 / 取消全选
 * @param {boolean} checked - true=全选, false=取消全选
 * 【答辩要点】forEach 遍历所有购物车项，统一设置 checked 属性。
 */
function toggleAllCartCheck(checked) {
    AppState.cart.forEach(item => { item.checked = checked; });
    saveCartToStorage();
}

/**
 * 计算购物车中已选中商品的总金额
 * @returns {number} 总金额
 * 【答辩要点】函数式编程的链式调用：filter → reduce。
 * filter() 筛选选中的商品，reduce() 累加金额。
 * reduce 的参数：(累加器, 当前元素) => 新累加器, 初始值
 */
function getCartTotal() {
    return AppState.cart
        .filter(item => item.checked)  // 第一步：筛选所有勾选的商品
        .reduce((sum, item) => sum + item.price * item.quantity, 0);  // 第二步：累加 单价×数量
}

/**
 * 计算购物车中所有商品的总数量
 * @returns {number} 总数量（包含未选中的商品）
 */
function getCartCount() {
    // reduce 从 0 开始，每次累加当前商品的 quantity
    return AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * 更新页面上的购物车角标数字
 * 【答辩要点】角标是购物车图标的红色小圆点，显示商品数量。
 * textContent 比 innerHTML 更安全（不会解析 HTML，防止 XSS 攻击）。
 * 数量为 0 时隐藏角标（display:none）。
 */
function updateCartBadge() {
    const badges = document.querySelectorAll('#cart-badge');  // 页面上可能有多个角标
    const count = getCartCount();  // 获取总数量
    badges.forEach(badge => {
        badge.textContent = count;  // 设置数字
        // 三元表达式：数量>0 显示，否则隐藏
        badge.style.display = count > 0 ? '' : 'none';
    });
}

// =====================================================
// 六、商品渲染模块
// 【答辩要点】这是"数据驱动视图"的核心实现。
// 核心模式：商品数据（数组）→ map() 映射 → HTML 字符串 → innerHTML → DOM 元素
// ES6 模板字符串（反引号 ``）支持多行和 ${} 表达式嵌入，非常适合生成 HTML。
// onclick 内联事件绑定 + event.stopPropagation() 阻止事件冒泡。
// =====================================================

/**
 * 渲染商品列表到页面
 * @param {Array}  products    - 商品数据数组
 * @param {string} containerId - 目标容器 ID，默认 'product-grid'
 * 【答辩要点】这是最核心的渲染函数，被搜索、排序、分类筛选等多个功能调用。
 * 设计模式：单一职责原则——这个函数只负责"将数据转为 HTML 并插入 DOM"。
 */
function renderProducts(products, containerId = 'product-grid') {
    // 获取目标容器元素
    const container = document.getElementById(containerId);
    if (!container) return;  // 容器不存在则跳过（防御性编程）
    
    // === 空状态处理 ===
    if (products.length === 0) {
        // grid-column: 1/-1 让提示文字横跨所有列（从第一列到最后列）
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px; color:#999;">未找到相关商品</div>';
        return;
    }
    
    // === 核心：数据 → HTML ===
    // map() 遍历每个商品对象，返回一段 HTML 字符串
    // join('') 将所有 HTML 片段拼接成一个完整的字符串
    // innerHTML 一次性写入 DOM（比逐个 appendChild 效率高）
    container.innerHTML = products.map(product => `
        <div class="product-card" onclick="viewProductDetail(${product.id})">
            <div class="product-image">
                <!-- 商品图片，onerror 处理加载失败的情况 -->
                <img src="${product.image}" alt="${product.name}" 
                     onerror="this.parentElement.innerHTML='<div style=width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e0e0e0,#f0f0f0);color:#999;font-size:48px;>📦</div>'">
                <span class="product-tag">热卖</span>
                ${renderFavoriteBtn(product.id)}  <!-- 动态生成收藏按钮 -->
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">
                    <span class="price-current">${product.price.toFixed(2)}</span>
                    <span class="price-original">¥${product.originalPrice.toFixed(2)}</span>
                </div>
                <div class="product-meta">
                    <span class="sales">已售 ${product.sales}</span>
                    <!-- event.stopPropagation() 阻止点击冒泡到 product-card -->
                    <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart(${product.id})">加入购物车</button>
                </div>
            </div>
        </div>
    `).join('');  // 用空字符串连接所有 HTML 片段
}

/**
 * 跳转到商品详情页
 * @param {number} productId - 商品ID
 * 【答辩要点】通过 URL 参数传递商品 ID（RESTful 风格的参数传递）。
 */
function viewProductDetail(productId) {
    // 跳转到 product.html 并带上 id 参数
    window.location.href = `product.html?id=${productId}`;
}

// =====================================================
// 七、搜索功能模块
// 【答辩要点】实现了模糊搜索，支持按名称、描述、分类三个维度匹配。
// 使用 includes() 方法判断字符串包含关系（大小写不敏感通过 toLowerCase 实现）。
// 搜索可以叠加分类筛选和排序，实现了多维度的商品过滤。
// =====================================================

/**
 * 初始化搜索框事件绑定
 * 【答辩要点】同时绑定按钮点击和键盘回车两种触发方式。
 * 闭包特性：doSearch 函数可以访问外层的 searchInput 和 searchBtn 变量。
 */
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (!searchInput || !searchBtn) return;  // 元素不存在则跳过
    
    // 搜索核心逻辑（闭包函数，可被多个事件调用）
    const doSearch = () => {
        // 获取输入并去除首尾空格，转小写实现大小写不敏感搜索
        const keyword = searchInput.value.trim().toLowerCase();
        AppState.searchKeyword = keyword;
        
        // 保存搜索历史（非空关键词才保存）
        if (keyword) {
            addSearchHistory(keyword);
        }
        
        // === 第一步：关键词筛选 ===
        let filtered = AppState.products;  // 从全部商品开始
        if (keyword) {
            // includes() 判断字符串是否包含子串
            // || 连接三个条件，实现"或"逻辑（任意字段匹配即可）
            filtered = AppState.products.filter(p =>
                p.name.toLowerCase().includes(keyword) ||     // 名称匹配
                p.desc.toLowerCase().includes(keyword) ||     // 描述匹配
                p.category.toLowerCase().includes(keyword)    // 分类匹配
            );
        }
        
        // === 第二步：分类筛选（叠加在关键词结果上） ===
        if (AppState.currentCategory !== '全部') {
            filtered = filtered.filter(p => p.category === AppState.currentCategory);
        }
        
        // === 第三步：排序 ===
        filtered = applySorting(filtered);
        
        // === 渲染结果 ===
        renderProducts(filtered);
    };
    
    // 绑定按钮点击事件
    searchBtn.addEventListener('click', doSearch);
    // 绑定键盘事件：按下 Enter 键也触发搜索
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
    });
}

/**
 * 按分类筛选商品
 * @param {string} category - 分类名称（'全部' 表示显示所有）
 * 【答辩要点】分类筛选可与搜索关键词叠加使用。
 * classList.toggle('active', 条件) 是一种简洁的条件式类名切换方式。
 */
function filterByCategory(category) {
    AppState.currentCategory = category;  // 更新当前分类状态
    
    // === 按分类过滤 ===
    let filtered = AppState.products;
    if (category !== '全部') {
        // 严格等于匹配（===），分类名称必须完全一致
        filtered = filtered.filter(p => p.category === category);
    }
    
    // === 叠加搜索关键词过滤 ===
    if (AppState.searchKeyword) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(AppState.searchKeyword) ||
            p.desc.toLowerCase().includes(AppState.searchKeyword)
        );
    }
    
    // === 应用排序并渲染 ===
    filtered = applySorting(filtered);
    renderProducts(filtered);
    
    // === 更新导航栏高亮 ===
    // toggle 的第二个参数：true=添加类, false=移除类
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.toggle('active', a.textContent.trim() === category);
    });
}

// =====================================================
// 八、排序功能模块
// 【答辩要点】使用 Array.sort() 方法进行排序。
// sort() 接收比较函数 (a, b) => 返回值：
//   返回值 < 0 → a 排在 b 前面
//   返回值 > 0 → b 排在 a 前面
//   返回值 = 0 → 保持原顺序
// [...products] 展开运算符创建数组浅拷贝，避免修改原数组。
// =====================================================

/**
 * 对商品列表进行排序
 * @param {Array} products - 待排序的商品数组
 * @returns {Array} 排序后的商品数组（新数组，不修改原数组）
 * 【答辩要点】使用 switch 语句根据不同的排序类型选择不同的比较函数。
 * 展开运算符 ... 创建数组副本，体现了"不可变数据"的思想。
 */
function applySorting(products) {
    // 展开运算符创建浅拷贝：[...products] 等价于 products.slice()
    const sorted = [...products];
    
    // switch 语句：根据排序类型选择比较逻辑
    switch (AppState.currentSort) {
        case 'price-asc':
            // 价格升序：a.price - b.price，小的在前
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            // 价格降序：b.price - a.price，大的在前
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'sales':
            // 按销量降序：b.sales - a.sales
            sorted.sort((a, b) => b.sales - a.sales);
            break;
        case 'rating':
            // 按评分降序：b.rating - a.rating
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        default:
            // 默认排序：保持原数组顺序（即按商品ID顺序）
            break;
    }
    return sorted;
}

/**
 * 切换排序方式
 * @param {string} sortType - 排序类型
 * 【答辩要点】排序按钮通过 data-sort 属性存储排序类型（HTML5 data-* 自定义属性）。
 * dataset.sort 可以读取 data-sort 的值。
 */
function setSortType(sortType) {
    AppState.currentSort = sortType;  // 更新排序状态
    
    // 更新排序按钮的高亮状态（.active 类）
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === sortType);
    });
    
    // 重新获取筛选后的商品并排序渲染
    let filtered = AppState.products;
    if (AppState.currentCategory !== '全部') {
        filtered = filtered.filter(p => p.category === AppState.currentCategory);
    }
    if (AppState.searchKeyword) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(AppState.searchKeyword) ||
            p.desc.toLowerCase().includes(AppState.searchKeyword)
        );
    }
    renderProducts(applySorting(filtered));
}

// =====================================================
// 九、收藏功能模块
// 【答辩要点】收藏列表只存储商品 ID 数组，不存完整商品对象。
// 优点：节省存储空间，避免数据冗余，商品信息变更时无需同步。
// 需要商品详情时通过 Array.find() 关联查询。
// =====================================================

/**
 * 从 LocalStorage 加载收藏列表
 * 【答辩要点】每个用户有独立的收藏 key：shop_fav_{用户ID}
 */
function loadFavoritesFromStorage() {
    if (AppState.currentUser) {
        const key = `shop_fav_${AppState.currentUser.id}`;
        const saved = localStorage.getItem(key);
        AppState.favorites = saved ? JSON.parse(saved) : [];
    }
}

/**
 * 保存收藏列表到 LocalStorage
 */
function saveFavoritesToStorage() {
    if (AppState.currentUser) {
        const key = `shop_fav_${AppState.currentUser.id}`;
        localStorage.setItem(key, JSON.stringify(AppState.favorites));
    }
}

/**
 * 切换收藏状态（收藏 ↔ 取消收藏）
 * @param {number} productId - 商品ID
 * 【答辩要点】使用 indexOf 判断是否已收藏：返回 -1 表示未收藏，>=0 表示已收藏。
 * splice(index, 1) 从数组中删除指定位置的元素。
 * 这种"toggle"模式在 UI 交互中非常常见。
 */
function toggleFavorite(productId) {
    // 未登录用户不能收藏
    if (!AppState.currentUser) {
        showToast('请先登录后再收藏商品', 'error');
        return;
    }
    
    // indexOf() 在数组中查找元素，找到返回索引，找不到返回 -1
    const index = AppState.favorites.indexOf(productId);
    if (index > -1) {
        // 已收藏 → 取消收藏：splice 从索引处删除 1 个元素
        AppState.favorites.splice(index, 1);
        showToast('已取消收藏', 'info');
    } else {
        // 未收藏 → 添加收藏：push 追加到数组末尾
        AppState.favorites.push(productId);
        showToast('已加入收藏', 'success');
    }
    
    saveFavoritesToStorage();  // 持久化
    updateFavoriteBtns();      // 更新页面上的收藏按钮状态
}

/**
 * 判断商品是否已收藏
 * @param {number} productId - 商品ID
 * @returns {boolean}
 * 【答辩要点】includes() 是 ES2016 引入的数组方法，比 indexOf 更语义化。
 */
function isFavorited(productId) {
    return AppState.favorites.includes(productId);
}

/**
 * 渲染收藏按钮 HTML
 * @param {number} productId - 商品ID
 * @returns {string} 收藏按钮的 HTML 字符串
 * 【答辩要点】根据收藏状态动态生成不同内容（❤️/🤍）。
 * event.stopPropagation() 阻止事件冒泡，防止触发商品卡片的点击事件。
 */
function renderFavoriteBtn(productId) {
    const favorited = isFavorited(productId);  // 查询收藏状态
    // 三元表达式：根据状态选择图标和 CSS 类
    return `<span class="favorite-btn ${favorited ? 'active' : ''}" 
            onclick="event.stopPropagation(); toggleFavorite(${productId})" 
            title="${favorited ? '取消收藏' : '收藏'}">
            ${favorited ? '❤️' : '🤍'}
            </span>`;
}

/**
 * 更新页面上所有收藏按钮的状态
 * 【答辩要点】通过重新渲染商品列表来更新收藏按钮。
 */
function updateFavoriteBtns() {
    let filtered = AppState.products;
    if (AppState.currentCategory !== '全部') {
        filtered = filtered.filter(p => p.category === AppState.currentCategory);
    }
    if (AppState.searchKeyword) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(AppState.searchKeyword) ||
            p.desc.toLowerCase().includes(AppState.searchKeyword)
        );
    }
    renderProducts(applySorting(filtered));
}

/**
 * 渲染收藏列表（在个人中心页面使用）
 * @param {string} containerId - 容器ID
 * 【答辩要点】先通过收藏的 ID 数组查找对应商品，再渲染列表。
 * map + find + filter 的组合：map 查找商品 → filter 过滤空值。
 */
function renderFavoriteList(containerId = 'favorite-list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 空状态
    if (AppState.favorites.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">暂无收藏商品</p>';
        return;
    }
    
    // 根据收藏的 productId 找到对应商品信息
    const favProducts = AppState.favorites
        .map(id => AppState.products.find(p => p.id === id))  // ID → 商品对象
        .filter(p => p);  // 过滤掉可能已被删除的商品（find 返回 undefined）
    
    // 渲染收藏商品列表
    container.innerHTML = favProducts.map(product => `
        <div class="fav-item" style="display:flex;align-items:center;gap:16px;padding:16px;border-bottom:1px solid #eee;">
            <img src="${product.image}" alt="${product.name}" 
                 style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;" 
                 onclick="viewProductDetail(${product.id})" 
                 onerror="this.style.display='none'">
            <div style="flex:1;cursor:pointer;" onclick="viewProductDetail(${product.id})">
                <div style="font-weight:500;margin-bottom:8px;">${product.name}</div>
                <div style="color:var(--primary);font-size:18px;font-weight:700;">¥${product.price.toFixed(2)}</div>
            </div>
            <button onclick="toggleFavorite(${product.id}); renderFavoriteList();" 
                    style="background:none;color:var(--primary);cursor:pointer;font-size:13px;">取消收藏</button>
            <button onclick="addToCart(${product.id})" 
                    style="background:var(--primary);color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:13px;">加入购物车</button>
        </div>
    `).join('');
}

// =====================================================
// 十、搜索历史模块
// 【答辩要点】搜索历史用数组实现，最新的在前面。
// unshift() 在头部插入，pop() 从尾部移除超量项。
// 先用 filter() 去重，再 unshift 插入，实现"最新+不重复"的效果。
// 容量限制：最多保留 10 条。
// =====================================================

/**
 * 从 LocalStorage 加载搜索历史
 */
function loadSearchHistory() {
    const saved = localStorage.getItem('shop_searchHistory');
    AppState.searchHistory = saved ? JSON.parse(saved) : [];
}

/**
 * 保存搜索历史到 LocalStorage
 */
function saveSearchHistory() {
    localStorage.setItem('shop_searchHistory', JSON.stringify(AppState.searchHistory));
}

/**
 * 添加搜索记录
 * @param {string} keyword - 搜索关键词
 * 【答辩要点】三步操作：去重 → 插入头部 → 限制容量。
 */
function addSearchHistory(keyword) {
    // 步骤1：去重 —— 移除已存在的相同关键词
    AppState.searchHistory = AppState.searchHistory.filter(k => k !== keyword);
    // 步骤2：插入头部 —— unshift 将新元素添加到数组最前面
    AppState.searchHistory.unshift(keyword);
    // 步骤3：限制容量 —— 超过10条时删除最旧的（数组末尾的）
    if (AppState.searchHistory.length > 10) {
        AppState.searchHistory.pop();  // pop 删除最后一个元素
    }
    saveSearchHistory();
}

/**
 * 清空搜索历史
 */
function clearSearchHistory() {
    AppState.searchHistory = [];  // 重置为空数组
    saveSearchHistory();
    showToast('搜索历史已清空', 'info');
}

// =====================================================
// 十一、回到顶部按钮
// 【答辩要点】动态创建 DOM 元素（按需加载，不预先写在 HTML 中）。
// scroll 事件监听滚动位置，超过 300px 时显示按钮。
// window.scrollTo({behavior:'smooth'}) 使用浏览器原生平滑滚动。
// =====================================================

/**
 * 初始化回到顶部按钮
 * 【答辩要点】document.createElement() 在内存中创建 DOM 节点，
 * appendChild() 挂载到 body。这是"即用即创建"的按需加载模式。
 */
function initBackToTop() {
    // 防止重复创建（如果按钮已存在则跳过）
    if (document.getElementById('back-to-top')) return;
    
    // === 创建按钮元素 ===
    const btn = document.createElement('div');  // 在内存中创建 div 节点
    btn.id = 'back-to-top';                     // 设置 ID（CSS 通过 ID 选择器定位）
    btn.innerHTML = '↑';                        // 设置显示文字
    btn.title = '回到顶部';                      // 设置鼠标悬停提示
    // 绑定点击事件：平滑滚动到页面顶部
    btn.onclick = () => {
        // scrollTo 的 behavior:'smooth' 参数启用平滑滚动动画
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.body.appendChild(btn);  // 将按钮添加到 body 末尾
    
    // === 监听滚动事件，控制按钮显示/隐藏 ===
    window.addEventListener('scroll', () => {
        // window.scrollY 是浏览器内置属性，返回当前垂直滚动距离（像素）
        if (window.scrollY > 300) {
            btn.classList.add('show');    // 添加 .show 类（CSS 中定义 opacity:1）
        } else {
            btn.classList.remove('show'); // 移除 .show 类（恢复 opacity:0）
        }
    });
}

// =====================================================
// 十二、Toast 消息提示模块
// 【答辩要点】轻量级的消息提示组件，无需引入第三方库。
// 原理：动态创建 div → 插入 body → 3秒后自动移除。
// 支持三种类型：success（绿色）、error（红色）、info（蓝色）。
// =====================================================

/**
 * 显示 Toast 提示消息
 * @param {string} message - 提示文字
 * @param {string} type    - 类型: 'success' | 'error' | 'info'
 * 【答辩要点】每次显示新 toast 前先移除旧的，避免重叠。
 * CSS 中通过 @keyframes 定义入场和出场动画。
 */
function showToast(message, type = 'info') {
    // === 移除已有的 toast（避免多条消息重叠） ===
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    // === 创建新的 toast 元素 ===
    const toast = document.createElement('div');      // 创建 div 节点
    toast.className = `toast ${type}`;                // 设置类名（如 "toast success"）
    toast.textContent = message;                      // 设置文字内容（比 innerHTML 更安全）
    document.body.appendChild(toast);                 // 插入到 body 末尾
    
    // === 3秒后自动移除 ===
    // setTimeout 将回调函数加入任务队列，3秒后执行
    setTimeout(() => toast.remove(), 3000);
}

// =====================================================
// 十三、轮播图控制模块
// 【答辩要点】纯 CSS + JS 实现的轮播图，无需任何插件。
// 切换原理：所有 slide 堆叠在一起（position:absolute），通过 opacity 控制显示。
// CSS transition 实现淡入淡出动画。
// 取模运算 (index + 1) % length 实现循环轮播。
// =====================================================

let bannerTimer = null;   // 轮播定时器 ID（用于清除定时器）
let bannerIndex = 0;      // 当前显示的轮播图索引

/**
 * 初始化轮播图功能
 * 【答辩要点】setInterval 每4秒自动切换，支持手动点击箭头和指示器。
 * visibilitychange 事件监听标签页切换：页面隐藏时暂停轮播，节省资源。
 */
function initBanner() {
    const slides = document.querySelectorAll('.banner-slide');  // 所有轮播图 slide
    const dots = document.querySelectorAll('.banner-dots .dot'); // 所有指示器圆点
    if (slides.length === 0) return;  // 没有轮播图则跳过
    
    /**
     * 切换到指定索引的轮播图
     * @param {number} index - 目标索引
     * 【答辩要点】先清除所有 slide 的 active 类，再为目标 slide 添加 active 类。
     */
    function goToSlide(index) {
        // 移除所有 slide 和 dot 的 active 状态
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        // 为目标 slide 和 dot 添加 active 状态
        slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        bannerIndex = index;  // 更新当前索引
    }
    
    /**
     * 下一张轮播图
     * 【答辩要点】取模运算 (index + 1) % length 实现循环：
     * 最后一张 → 第一张（如 2+1=3, 3%3=0）
     */
    function nextSlide() {
        goToSlide((bannerIndex + 1) % slides.length);
    }
    
    /**
     * 上一张轮播图
     * 【答辩要点】加 slides.length 再取模，防止出现负数：
     * 第一张 → 最后一张（如 0-1=-1, -1+3=2, 2%3=2）
     */
    function prevSlide() {
        goToSlide((bannerIndex - 1 + slides.length) % slides.length);
    }
    
    // === 绑定左右箭头点击事件 ===
    // ?. 是可选链操作符：如果元素不存在则不执行，避免报错
    document.querySelector('.banner-btn.next')?.addEventListener('click', nextSlide);
    document.querySelector('.banner-btn.prev')?.addEventListener('click', prevSlide);
    
    // === 绑定指示器圆点点击事件 ===
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => goToSlide(i));
    });
    
    // === 启动自动轮播 ===
    // setInterval 返回定时器 ID，用于后续清除
    // 每 4000 毫秒（4秒）执行一次 nextSlide
    bannerTimer = setInterval(nextSlide, 4000);
}

// === 页面可见性变化时控制轮播 ===
// 【答辩要点】visibilitychange 事件在用户切换标签页时触发。
// document.hidden 为 true 表示页面被隐藏（用户切到其他标签页）。
// 隐藏时暂停轮播可以节省 CPU 和电量。
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面隐藏 → 清除定时器，停止轮播
        clearInterval(bannerTimer);
    } else {
        // 页面恢复 → 重新启动定时器
        bannerTimer = setInterval(() => {
            const slides = document.querySelectorAll('.banner-slide');
            if (slides.length > 0) {
                bannerIndex = (bannerIndex + 1) % slides.length;
                slides.forEach(s => s.classList.remove('active'));
                slides[bannerIndex].classList.add('active');
                const dots = document.querySelectorAll('.banner-dots .dot');
                dots.forEach(d => d.classList.remove('active'));
                if (dots[bannerIndex]) dots[bannerIndex].classList.add('active');
            }
        }, 4000);
    }
});

// =====================================================
// 十四、订单管理模块
// 【答辩要点】订单是电商系统的核心数据，存储用户购买记录。
// 订单号生成：'ORD' + Date.now() 确保唯一性。
// 订单创建后自动清空购物车中已购买的商品。
// =====================================================

/**
 * 创建新订单
 * @param {Object} addressInfo - 收货地址信息 {name, phone, address}
 * @returns {Object|null} 创建的订单对象，失败返回 null
 * 【答辩要点】订单创建流程：
 *   1. 验证登录状态和选中商品
 *   2. 构建订单对象（含订单号、商品列表、金额、地址、状态、时间）
 *   3. 保存到 LocalStorage
 *   4. 清空购物车已购商品
 *   5. 更新购物车 UI
 */
function createOrder(addressInfo) {
    // === 前置验证 ===
    if (!AppState.currentUser) return null;  // 未登录
    if (AppState.cart.filter(i => i.checked).length === 0) return null;  // 无选中商品
    
    // === 构建订单对象 ===
    const order = {
        id: 'ORD' + Date.now(),  // Date.now() 返回毫秒级时间戳，保证唯一性
        userId: AppState.currentUser.id,  // 关联用户
        // 深拷贝选中商品列表：{...item} 展开运算符创建浅拷贝
        // 避免订单创建后购物车清空影响订单数据
        items: AppState.cart.filter(i => i.checked).map(i => ({ ...i })),
        total: getCartTotal(),   // 订单总金额
        address: addressInfo,    // 收货地址
        status: '待发货',        // 初始状态
        createTime: new Date().toISOString(),  // ISO 8601 格式时间戳
    };
    
    // === 保存订单到 LocalStorage ===
    const ordersKey = `shop_orders_${AppState.currentUser.id}`;
    const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
    orders.unshift(order);  // unshift 将新订单插入数组头部（最新在前）
    localStorage.setItem(ordersKey, JSON.stringify(orders));
    
    // === 清除购物车中已购买的商品 ===
    // filter 保留未选中的商品（即未购买的商品）
    AppState.cart = AppState.cart.filter(i => !i.checked);
    saveCartToStorage();
    updateCartBadge();
    
    return order;  // 返回创建的订单对象
}

/**
 * 获取当前用户的所有订单
 * @returns {Array} 订单列表（按时间倒序）
 * 【答辩要点】直接从 LocalStorage 读取，无需网络请求。
 */
function getOrders() {
    if (!AppState.currentUser) return [];
    const ordersKey = `shop_orders_${AppState.currentUser.id}`;
    return JSON.parse(localStorage.getItem(ordersKey) || '[]');
}

// =====================================================
// 十五、工具函数
// 【答辩要点】formatDate 将 ISO 格式时间转为可读格式。
// padStart(2,'0') 确保数字始终为 2 位（如 5→"05"）。
// =====================================================

/**
 * 格式化日期字符串为可读格式
 * @param {string} dateStr - ISO 日期字符串（如 "2026-06-09T15:30:00.000Z"）
 * @returns {string} 格式化后的日期，如 "2026-06-09 15:30"
 * 【答辩要点】Date 对象提供了一系列 getter 方法。
 * getMonth() 返回 0-11，需要 +1 得到实际月份。
 * padStart 是 ES2017 引入的方法，str.padStart(len, char) 在开头填充字符。
 */
function formatDate(dateStr) {
    const d = new Date(dateStr);  // 解析 ISO 字符串为 Date 对象
    // 模板字符串拼接各日期部分
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// =====================================================
// 十六、导出全局函数
// 【答辩要点】在浏览器环境中，const/let 声明的变量不会自动挂载到 window。
// 但 HTML 中的 onclick="函数名()" 需要函数在全局作用域中。
// 因此需要显式地将函数挂载到 window 对象上。
// 这是传统前端项目连接 JS 模块与 HTML 模板的桥接方式。
// 在现代框架（React/Vue）中，这种模式被组件化所替代。
// =====================================================
window.addToCart = addToCart;                  // 加入购物车
window.removeFromCart = removeFromCart;        // 从购物车移除
window.updateCartQuantity = updateCartQuantity; // 更新购物车数量
window.toggleCartItemCheck = toggleCartItemCheck; // 切换选中状态
window.toggleAllCartCheck = toggleAllCartCheck; // 全选/取消全选
window.getCartTotal = getCartTotal;            // 获取购物车总金额
window.getCartCount = getCartCount;            // 获取购物车总数量
window.updateCartBadge = updateCartBadge;      // 更新购物车角标
window.viewProductDetail = viewProductDetail;  // 查看商品详情
window.filterByCategory = filterByCategory;    // 按分类筛选
window.logout = logout;                        // 退出登录
window.showToast = showToast;                  // 显示提示消息
window.formatDate = formatDate;                // 格式化日期
window.createOrder = createOrder;              // 创建订单
window.getOrders = getOrders;                  // 获取订单列表
window.initBanner = initBanner;                // 初始化轮播图
window.AppState = AppState;                    // 全局状态对象
window.toggleFavorite = toggleFavorite;        // 切换收藏
window.isFavorited = isFavorited;              // 判断是否收藏
window.renderFavoriteBtn = renderFavoriteBtn;  // 渲染收藏按钮
window.updateFavoriteBtns = updateFavoriteBtns; // 更新收藏按钮
window.renderFavoriteList = renderFavoriteList; // 渲染收藏列表
window.addSearchHistory = addSearchHistory;    // 添加搜索历史
window.clearSearchHistory = clearSearchHistory; // 清空搜索历史
window.setSortType = setSortType;              // 设置排序方式
