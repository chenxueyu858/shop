/**
 * =============================================
 * 网上商城 - 核心应用逻辑
 * 24215220120_陈学羽_大作业
 * 
 * 文件说明：
 *   - 全局状态管理 (AppState)
 *   - 商品数据加载与渲染
 *   - 用户登录/注册管理 (LocalStorage)
 *   - 购物车增删改查与持久化
 *   - 搜索与分类筛选
 *   - Toast 消息提示
 *   - 轮播图控制
 *   - 订单创建与查询
 *   - 收藏功能 (LocalStorage)
 * =============================================
 */

// =====================================================
// 一、全局状态管理对象 (AppState)
// 统一管理整个商城的状态数据，所有页面共享
// 实现方式：使用 JavaScript 对象字面量 {} 定义全局状态容器
// 实现原理：利用 const 声明一个不可重新赋值的对象引用，
//           对象内部属性可读写，所有页面通过同一个 AppState 引用共享数据，
//           避免了全局变量污染，实现了简单的"单例模式"
// =====================================================
const AppState = {
    currentUser: null,      // 当前登录用户信息 {id, name, phone}
    cart: [],               // 购物车数据 [{productId, name, price, image, quantity, checked}]
    products: [],           // 所有商品列表（从 products.json 加载）
    searchKeyword: '',      // 当前搜索关键词
    currentCategory: '全部', // 当前选中的分类
    favorites: [],          // 用户收藏商品列表 [productId, ...]
    searchHistory: [],      // 搜索历史记录
    currentSort: 'default', // 当前排序方式: 'default' | 'price-asc' | 'price-desc' | 'sales' | 'rating'
};

// =====================================================
// 二、页面初始化入口
// 当 DOM 加载完成后自动执行以下初始化操作
// 实现方式：使用 addEventListener('DOMContentLoaded') 监听页面加载事件
// 实现原理：浏览器在解析完 HTML 文档、构建完 DOM 树后触发 DOMContentLoaded 事件，
//           此时可以安全地操作 DOM 元素。与 window.onload 不同，
//           DOMContentLoaded 不需要等待图片/CSS/外部资源加载完毕，执行更早。
//           通过 addEventListener 注册回调函数，在事件触发时依次执行初始化流程。
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();        // 加载商品 JSON 数据
    initUser();            // 初始化用户登录状态
    updateCartBadge();     // 更新购物车角标数量
    updateUserUI();        // 更新用户界面（登录/未登录状态）
    initSearch();          // 初始化搜索框事件
    loadFavoritesFromStorage(); // 加载收藏列表
    loadSearchHistory();   // 加载搜索历史
    initBackToTop();       // 初始化回到顶部按钮
});

// =====================================================
// 三、商品数据加载
// 通过 fetch API 异步读取 data/products.json 文件
// 失败时提供错误提示
// 实现方式：fetch() + .then() 链式调用处理异步请求
// 实现原理：fetch() 返回一个 Promise 对象，代表异步操作的最终结果。
//           .then() 方法注册回调函数，在 Promise 成功时执行。
//           第一个 .then(res => res.json()) 将 HTTP 响应体解析为 JSON 对象，
//           第二个 .then(data => ...) 处理解析后的数据。
//           .catch() 捕获整个链中任何环节的异常，保证程序不会因网络错误崩溃。
//           这种 Promise 链式调用实现了非阻塞的异步编程模型。
// =====================================================
function loadProducts() {
    // 发送 HTTP 请求获取 JSON 数据
    fetch('data/products.json')
        .then(res => res.json())  // 解析为 JSON 对象
        .then(data => {
            AppState.products = data;  // 存入全局状态
            renderProducts(data);      // 渲染到页面
        })
        .catch(err => {
            // 网络错误或文件不存在时的处理
            console.error('加载商品数据失败:', err);
            // 如果有备用数据，使用备用数据
            if (typeof FALLBACK_PRODUCTS !== 'undefined') {
                AppState.products = FALLBACK_PRODUCTS;
                renderProducts(FALLBACK_PRODUCTS);
            }
        });
}

// =====================================================
// 四、用户管理模块
// 使用 LocalStorage 模拟后端用户系统
// 实现方式：localStorage.getItem() / setItem() / removeItem() 读写数据
// 实现原理：LocalStorage 是浏览器提供的键值对存储机制，数据以字符串形式持久化在本地磁盘。
//           通过 JSON.stringify() 将 JS 对象序列化为字符串存储，
//           读取时用 JSON.parse() 反序列化还原为对象。
//           LocalStorage 的数据不会随页面关闭而丢失，容量约 5MB。
//           不同页面（同源）可以共享 LocalStorage 数据，实现了跨页面状态同步。
// 存储键名: shop_currentUser (当前登录用户)
//           shop_users (所有注册用户)
// 函数: initUser()、loadCartFromStorage()、saveCartToStorage()、updateUserUI()、logout()
// =====================================================

/**
 * 初始化用户状态
 * 从 LocalStorage 读取之前保存的登录信息
 * 实现方式：localStorage.getItem() + JSON.parse() 反序列化
 * 实现原理：先通过 getItem 获取存储的字符串，若存在则用 JSON.parse 还原为对象，
 *           并用 try-catch 包裹防止 JSON 格式损坏导致程序崩溃。
 *           恢复成功后立即调用 loadCartFromStorage() 加载该用户的购物车数据。
 */
function initUser() {
    const savedUser = localStorage.getItem('shop_currentUser');
    if (savedUser) {
        try {
            AppState.currentUser = JSON.parse(savedUser);
            loadCartFromStorage();  // 恢复用户的购物车
        } catch (e) {
            AppState.currentUser = null;
        }
    }
}

/**
 * 从 LocalStorage 加载当前用户的购物车数据
 * 存储键名: shop_cart_{用户ID}
 * 实现方式：localStorage.getItem() + JSON.parse() 反序列化
 */
function loadCartFromStorage() {
    if (AppState.currentUser) {
        const key = `shop_cart_${AppState.currentUser.id}`;
        const savedCart = localStorage.getItem(key);
        AppState.cart = savedCart ? JSON.parse(savedCart) : [];
    }
}

/**
 * 将购物车数据持久化保存到 LocalStorage
 * 实现方式：localStorage.setItem() + JSON.stringify() 序列化
 */
function saveCartToStorage() {
    if (AppState.currentUser) {
        const key = `shop_cart_${AppState.currentUser.id}`;
        localStorage.setItem(key, JSON.stringify(AppState.cart));
    }
}

/**
 * 更新页面上的用户 UI 元素
 * 根据登录状态显示/隐藏不同元素
 * 实现方式：querySelectorAll() 批量操作 DOM 元素的 style.display 属性
 * 实现原理：通过 CSS 的 display 属性控制元素显隐，display:none 使元素不占据空间。
 *           querySelectorAll 返回 NodeList，配合 forEach 批量遍历处理多个同名元素。
 *           这是声明式 UI 的简化实现——根据状态(AppState.currentUser)驱动视图变化。
 */
function updateUserUI() {
    const userInfoEls = document.querySelectorAll('.user-info');
    const loginLinks = document.querySelectorAll('.login-link');
    const logoutBtns = document.querySelectorAll('.btn-logout');
    
    if (AppState.currentUser) {
        // 已登录：显示用户名，隐藏登录/注册链接
        userInfoEls.forEach(el => {
            el.textContent = `您好，${AppState.currentUser.name}`;
            el.style.display = '';
        });
        loginLinks.forEach(el => el.style.display = 'none');
        logoutBtns.forEach(el => el.style.display = '');
    } else {
        // 未登录：隐藏用户信息，显示登录/注册链接
        userInfoEls.forEach(el => el.style.display = 'none');
        loginLinks.forEach(el => el.style.display = '');
        logoutBtns.forEach(el => el.style.display = 'none');
    }
}

/**
 * 退出登录
 * 清除当前用户状态、购物车，跳转回首页
 * 实现方式：localStorage.removeItem() 清除数据 + setTimeout() 延迟跳转
 * 实现原理：将 AppState 内存中的用户/购物车数据置空，
 *           removeItem 清除 LocalStorage 中的持久化数据，
 *           setTimeout 延迟 1 秒跳转是为了让用户看到 Toast 提示后再跳转。
 *           window.location.href 赋值会触发浏览器导航到新页面。
 */
function logout() {
    AppState.currentUser = null;
    AppState.cart = [];
    AppState.favorites = [];
    localStorage.removeItem('shop_currentUser');
    updateUserUI();
    updateCartBadge();
    showToast('已退出登录', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

// =====================================================
// 五、购物车管理模块
// 支持：添加商品、删除商品、修改数量、选中/取消选中
//       全选/取消全选、计算总价、计算总数量
// 函数: addToCart()、removeFromCart()、updateCartQuantity()、
//       toggleCartItemCheck()、toggleAllCartCheck()、getCartTotal()、
//       getCartCount()、updateCartBadge()
// 实现方式：数组方法 find()/filter()/push()/forEach() 操作购物车数据
// 实现原理：购物车本质是一个数组，每个元素是一个包含商品信息的对象。
//           利用 JavaScript 数组的高阶方法实现 CRUD 操作：
//           find() 通过回调函数在数组中查找第一个匹配元素，
//           filter() 创建新数组保留满足条件的元素（实现删除），
//           push() 在数组末尾追加新元素（实现添加），
//           reduce() 遍历数组累加计算结果（实现金额汇总）。
//           所有修改操作完成后调用 saveCartToStorage() 同步到 LocalStorage。
// =====================================================

/**
 * 添加商品到购物车
 * @param {number} productId - 商品ID
 * @param {number} quantity  - 添加数量，默认为1
 * 实现方式：Array.find() 查找商品 + Array.push() 新增购物车项
 * 实现原理：先在 products 数组中用 find() 根据 id 匹配商品信息。
 *           再在 cart 数组中用 find() 检查是否已存在该商品：
 *           若存在则累加数量（引用修改，无需 push），
 *           若不存在则 push 新对象到 cart 末尾。
 *           最后调用 saveCartToStorage() 将内存数据同步持久化到 LocalStorage。
 */
function addToCart(productId, quantity = 1) {
    // 未登录用户不能添加购物车
    if (!AppState.currentUser) {
        showToast('请先登录后再添加商品到购物车', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }
    
    // 查找商品信息
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;
    
    // 检查购物车中是否已存在该商品
    const existingItem = AppState.cart.find(item => item.productId === productId);
    if (existingItem) {
        // 已存在：增加数量
        existingItem.quantity += quantity;
    } else {
        // 不存在：新增购物车项
        AppState.cart.push({
            productId: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity,
            checked: true  // 默认选中
        });
    }
    
    saveCartToStorage();  // 持久化保存
    updateCartBadge();    // 更新角标
    showToast(`"${product.name}" 已加入购物车`, 'success');
}

/**
 * 从购物车中移除指定商品
 * @param {number} productId - 商品ID
 * 实现方式：Array.filter() 过滤掉指定商品
 * 实现原理：filter() 遍历数组每个元素，执行回调函数，
 *           返回 true 的元素保留到新数组，返回 false 的元素被排除。
 *           用新数组替换原 cart 数组，实现了"删除"操作。
 *           这是一种不可变数据操作方式——不修改原数组，而是创建新数组。
 */
function removeFromCart(productId) {
    AppState.cart = AppState.cart.filter(item => item.productId !== productId);
    saveCartToStorage();
    updateCartBadge();
}

/**
 * 更新购物车中商品的数量
 * @param {number} productId - 商品ID
 * @param {number} quantity  - 新数量 (限制范围: 1-99)
 * 实现方式：Array.find() 定位商品 + Math.max()/Math.min() 限制数量范围
 * 实现原理：Math.max(1, x) 确保数量不小于 1，
 *           Math.min(x, 99) 确保数量不超过 99，
 *           两者嵌套使用实现了值域钳制（clamp）效果：将任意值限制在 [1, 99] 区间内。
 *           find() 返回的是数组元素的引用，直接修改其 quantity 属性即修改原数组。
 */
function updateCartQuantity(productId, quantity) {
    const item = AppState.cart.find(item => item.productId === productId);
    if (item) {
        // 数量限制在 1-99 之间
        item.quantity = Math.max(1, Math.min(quantity, 99));
        saveCartToStorage();
    }
}

/**
 * 切换单个购物车商品的选中状态
 * @param {number} productId - 商品ID
 */
function toggleCartItemCheck(productId) {
    const item = AppState.cart.find(item => item.productId === productId);
    if (item) {
        item.checked = !item.checked;
        saveCartToStorage();
    }
}

/**
 * 全选 / 取消全选
 * @param {boolean} checked - true=全选, false=取消全选
 * 实现方式：Array.forEach() 遍历所有购物车项设置 checked 属性
 * 实现原理：forEach() 对数组每个元素执行回调函数，将 checked 参数值赋值给每个购物车项的 checked 属性。
 *           由于 cart 数组元素是对象引用，直接修改属性即修改原数据。
 *           操作完成后持久化保存，保证刷新后状态不丢失。
 */
function toggleAllCartCheck(checked) {
    AppState.cart.forEach(item => { item.checked = checked; });
    saveCartToStorage();
}

/**
 * 计算购物车中已选中商品的总金额
 * @returns {number} 总金额
 * 实现方式：Array.filter() 筛选选中商品 + Array.reduce() 累加金额
 * 实现原理：filter() 先筛选出 checked 为 true 的商品，生成中间数组。
 *           reduce() 对中间数组进行"归约"操作：
 *           从初始值 0 开始，每次将累加器 sum 加上当前商品的价格×数量，
 *           最终返回所有选中商品的金额总和。
 *           这是一种函数式编程的链式调用模式：filter → reduce。
 */
function getCartTotal() {
    return AppState.cart
        .filter(item => item.checked)       // 只计算选中的商品
        .reduce((sum, item) => sum + item.price * item.quantity, 0);  // 累加 单价×数量
}

/**
 * 计算购物车中所有商品的总数量
 * @returns {number} 总数量
 * 实现方式：Array.reduce() 累加所有商品数量
 */
function getCartCount() {
    return AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * 更新页面上的购物车角标数字
 * 实现方式：querySelectorAll() 批量获取角标元素 + textContent 更新数量
 * 实现原理：用 querySelectorAll('#cart-badge') 获取页面上所有角标元素（首页头部和操作区各有一个）。
 *           textContent 直接修改元素的文本内容，比 innerHTML 更安全（不解析 HTML，防止 XSS）。
 *           当购物车数量为 0 时隐藏角标（display:none），有商品时显示。
 */
function updateCartBadge() {
    const badges = document.querySelectorAll('#cart-badge');
    const count = getCartCount();
    badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';  // 数量为0时隐藏角标
    });
}

// =====================================================
// 六、商品渲染模块
// 将商品数据动态生成为 HTML 卡片展示在页面上
// 函数: renderProducts()、viewProductDetail()
// 实现方式：Array.map() 生成 HTML 字符串 + innerHTML 批量插入 DOM
// 实现原理：map() 遍历商品数组，对每个商品调用模板字符串生成一段 HTML，
//           返回一个 HTML 字符串数组，再用 join('') 拼接为完整字符串。
//           最后通过 innerHTML 一次性注入 DOM，浏览器自动解析 HTML 并构建 DOM 树。
//           这种"数据→HTML→DOM"的模式是前端数据驱动视图的基础。
//           事件绑定通过 onclick 属性内联处理，利用事件冒泡和 stopPropagation 控制事件传播。
// =====================================================

/**
 * 渲染商品列表到页面
 * @param {Array}  products    - 商品数据数组
 * @param {string} containerId - 目标容器 ID，默认 'product-grid'
 * 实现方式：模板字符串 `` + Array.map().join('') 批量生成 HTML
 * 实现原理：ES6 模板字符串使用反引号 `` 包裹，支持 ${} 内嵌表达式和换行。
 *           map() 将每个商品对象映射为一段 HTML 字符串，
 *           join('') 将所有片段拼接，innerHTML 一次性写入 DOM 触发浏览器渲染。
 *           图片加载失败时通过 onerror 回调显示占位符，保证布局不塌陷。
 */
function renderProducts(products, containerId = 'product-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 无商品时显示提示
    if (products.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px; color:#999;">未找到相关商品</div>';
        return;
    }
    
    // 使用模板字符串动态生成商品卡片 HTML
    container.innerHTML = products.map(product => `
        <div class="product-card" onclick="viewProductDetail(${product.id})">
            <div class="product-image">
                <!-- 商品图片，加载失败时显示占位符 -->
                <img src="${product.image}" alt="${product.name}" onerror="this.parentElement.innerHTML='<div style=width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e0e0e0,#f0f0f0);color:#999;font-size:48px;'>📦</div>'">
                <span class="product-tag">热卖</span>
                ${renderFavoriteBtn(product.id)}<!-- 收藏按钮 -->
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">
                    <span class="price-current">${product.price.toFixed(2)}</span>
                    <span class="price-original">¥${product.originalPrice.toFixed(2)}</span>
                </div>
                <div class="product-meta">
                    <span class="sales">已售 ${product.sales}</span>
                    <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart(${product.id})">加入购物车</button>
                </div>
            </div>
        </div>
    `).join('');  // 用空字符串连接所有 HTML 片段
}

/**
 * 跳转到商品详情页
 * @param {number} productId - 商品ID
 * 实现方式：window.location.href 修改当前页面 URL 实现跳转
 */
function viewProductDetail(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// =====================================================
// 七、搜索功能模块
// 支持按名称、描述、分类进行模糊搜索
// 支持 Enter 键和按钮点击触发搜索
// 函数: initSearch()、filterByCategory()
// 实现方式：String.includes() 模糊匹配 + Array.filter() 筛选 + addEventListener 事件绑定
// 实现原理：includes() 是字符串方法，判断一个字符串是否包含指定子串（大小写敏感）。
//           通过 toLowerCase() 统一转小写实现大小写不敏感的模糊搜索。
//           filter() 配合多个 includes() 条件（名称、描述、分类），
//           只要任意一个字段匹配即保留该商品，实现了"或"逻辑的模糊搜索。
//           搜索触发通过 addEventListener 同时绑定 click（按钮）和 keydown（回车键）事件。
// =====================================================

/**
 * 初始化搜索框事件绑定
 * 实现方式：addEventListener('click'/'keydown') 绑定搜索触发事件
 * 实现原理：addEventListener 是 DOM 事件绑定的标准方法，可以为同一元素绑定多个事件。
 *           事件处理函数 doSearch() 封装了完整的搜索流程：
 *           获取输入 → 保存历史 → 筛选 → 排序 → 渲染。
 *           闭包特性使 doSearch 可以访问外层的 searchInput 和 searchBtn 变量。
 */
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (!searchInput || !searchBtn) return;
    
    // 执行搜索的核心函数
    const doSearch = () => {
        const keyword = searchInput.value.trim().toLowerCase();
        AppState.searchKeyword = keyword;
        
        // 保存搜索历史
        if (keyword) {
            addSearchHistory(keyword);
        }
        
        // 按关键词筛选商品（模糊匹配名称、描述、分类）
        let filtered = AppState.products;
        if (keyword) {
            filtered = AppState.products.filter(p =>
                p.name.toLowerCase().includes(keyword) ||
                p.desc.toLowerCase().includes(keyword) ||
                p.category.toLowerCase().includes(keyword)
            );
        }
        // 叠加分类筛选
        if (AppState.currentCategory !== '全部') {
            filtered = filtered.filter(p => p.category === AppState.currentCategory);
        }
        // 应用排序
        filtered = applySorting(filtered);
        renderProducts(filtered);
    };
    
    searchBtn.addEventListener('click', doSearch);
    // 按 Enter 键也可以触发搜索
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
    });
}

/**
 * 按分类筛选商品
 * @param {string} category - 分类名称（'全部' 表示显示所有）
 * 实现方式：Array.filter() 按 category 字段筛选 + classList.toggle() 更新导航高亮
 */
function filterByCategory(category) {
    AppState.currentCategory = category;
    
    // 按分类过滤
    let filtered = AppState.products;
    if (category !== '全部') {
        filtered = filtered.filter(p => p.category === category);
    }
    // 叠加搜索关键词过滤
    if (AppState.searchKeyword) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(AppState.searchKeyword) ||
            p.desc.toLowerCase().includes(AppState.searchKeyword)
        );
    }
    // 应用排序
    filtered = applySorting(filtered);
    renderProducts(filtered);
    
    // 更新导航栏高亮状态
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.toggle('active', a.textContent.trim() === category);
    });
}

// =====================================================
// 八、排序功能模块
// 函数: applySorting()、setSortType()
// 实现方式：Array.sort() 比较函数 + switch/case 分支处理
// 实现原理：Array.sort() 接收比较函数 (a, b) => n，
//           若 n < 0 则 a 排在 b 前，若 n > 0 则 b 排在 a 前，若 n = 0 则位置不变。
//           价格升序：a.price - b.price（小在前），
//           价格降序：b.price - a.price（大在前）。
//           [...products] 展开运算符创建数组浅拷贝，避免 sort() 直接修改原数组（sort 会改变原数组）。
//           switch 语句根据排序类型选择对应的比较逻辑。
// =====================================================

/**
 * 对商品列表进行排序
 * @param {Array} products - 待排序的商品数组
 * @returns {Array} 排序后的商品数组
 * 实现方式：展开运算符 [...products] 创建副本 + Array.sort() 比较函数
 * 实现原理：展开运算符 ... 将 products 数组的每个元素展开到一个新的数组字面量中，
 *           创建了原数组的浅拷贝。这样 sort() 操作的是副本，不会影响 AppState.products 的原始顺序。
 *           这是一种函数式编程的不可变数据思想。
 */
function applySorting(products) {
    const sorted = [...products];  // 创建副本，不修改原数组
    switch (AppState.currentSort) {
        case 'price-asc':
            // 价格从低到高
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            // 价格从高到低
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'sales':
            // 按销量降序
            sorted.sort((a, b) => b.sales - a.sales);
            break;
        case 'rating':
            // 按评分降序
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        default:
            // 默认排序（按 JSON 中的顺序，即商品ID）
            break;
    }
    return sorted;
}

/**
 * 切换排序方式（由页面按钮调用）
 * @param {string} sortType - 排序类型
 * 实现方式：dataset 属性读取按钮数据 + classList.toggle() 更新按钮高亮
 */
function setSortType(sortType) {
    AppState.currentSort = sortType;
    
    // 更新排序按钮的高亮状态
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === sortType);
    });
    
    // 重新获取当前筛选后的商品并排序渲染
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
// 使用 LocalStorage 持久化用户收藏列表
// 函数: loadFavoritesFromStorage()、saveFavoritesToStorage()、
//       toggleFavorite()、isFavorited()、renderFavoriteBtn()、
//       updateFavoriteBtns()、renderFavoriteList()
// 实现方式：Array.includes()/indexOf()/push()/splice() 管理收藏列表
// 实现原理：收藏列表是一个 productId 的数组（而非完整商品对象），
//           节省存储空间且避免数据冗余。需要商品详情时通过 Array.find() 关联查找。
//           includes() 判断是否收藏（O(n) 时间复杂度），
//           indexOf() + splice() 实现取消收藏（先定位再删除），
//           push() 实现添加收藏。
//           每个用户的收藏数据用独立 key（shop_fav_{用户ID}）存储在 LocalStorage 中。
// =====================================================

/**
 * 从 LocalStorage 加载收藏列表
 * 实现方式：localStorage.getItem() + JSON.parse() 反序列化
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
 * 切换收藏状态（收藏/取消收藏）
 * @param {number} productId - 商品ID
 * 实现方式：Array.indexOf() 判断是否已收藏 + push()/splice() 添加/移除
 * 实现原理：indexOf() 在数组中查找元素，找到返回索引（≥0），找不到返回 -1。
 *           通过判断返回值决定操作：> -1 则 splice(index, 1) 删除该元素，
 *           否则 push(productId) 追加到末尾。
 *           这是一种"toggle"模式的实现——根据当前状态决定执行相反操作。
 */
function toggleFavorite(productId) {
    if (!AppState.currentUser) {
        showToast('请先登录后再收藏商品', 'error');
        return;
    }
    
    const index = AppState.favorites.indexOf(productId);
    if (index > -1) {
        // 已收藏：取消收藏
        AppState.favorites.splice(index, 1);
        showToast('已取消收藏', 'info');
    } else {
        // 未收藏：添加收藏
        AppState.favorites.push(productId);
        showToast('已加入收藏', 'success');
    }
    
    saveFavoritesToStorage();
    updateFavoriteBtns();
}

/**
 * 判断商品是否已收藏
 * @param {number} productId - 商品ID
 * @returns {boolean}
 * 实现方式：Array.includes() 判断 productId 是否在收藏列表中
 */
function isFavorited(productId) {
    return AppState.favorites.includes(productId);
}

/**
 * 渲染收藏按钮 HTML
 * @param {number} productId - 商品ID
 * @returns {string} 收藏按钮 HTML
 * 实现方式：模板字符串 `` 根据收藏状态生成不同 HTML
 * 实现原理：通过 isFavorited() 判断当前收藏状态，
 *           三元表达式 ? : 根据状态动态选择显示内容（❤️ 或 🤍）和 CSS 类名（active）。
 *           onclick 中使用 event.stopPropagation() 阻止事件冒泡，
 *           防止点击收藏按钮时同时触发父元素 product-card 的点击事件（跳转详情页）。
 */
function renderFavoriteBtn(productId) {
    const favorited = isFavorited(productId);
    return `<span class="favorite-btn ${favorited ? 'active' : ''}" 
            onclick="event.stopPropagation(); toggleFavorite(${productId})" 
            title="${favorited ? '取消收藏' : '收藏'}">
            ${favorited ? '❤️' : '🤍'}
            </span>`;
}

/**
 * 更新页面上所有收藏按钮的状态
 */
function updateFavoriteBtns() {
    // 重新渲染商品列表来更新收藏按钮
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
 * 渲染收藏列表到收藏面板
 * 实现方式：Array.map() + Array.find() 关联商品信息 + innerHTML 渲染
 */
function renderFavoriteList(containerId = 'favorite-list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (AppState.favorites.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">暂无收藏商品</p>';
        return;
    }
    
    // 根据收藏的 productId 找到对应商品信息
    const favProducts = AppState.favorites
        .map(id => AppState.products.find(p => p.id === id))
        .filter(p => p);  // 过滤掉可能已删除的商品
    
    container.innerHTML = favProducts.map(product => `
        <div class="fav-item" style="display:flex;align-items:center;gap:16px;padding:16px;border-bottom:1px solid #eee;">
            <img src="${product.image}" alt="${product.name}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="viewProductDetail(${product.id})" onerror="this.style.display='none'">
            <div style="flex:1;cursor:pointer;" onclick="viewProductDetail(${product.id})">
                <div style="font-weight:500;margin-bottom:8px;">${product.name}</div>
                <div style="color:var(--primary);font-size:18px;font-weight:700;">¥${product.price.toFixed(2)}</div>
            </div>
            <button onclick="toggleFavorite(${product.id}); renderFavoriteList();" style="background:none;color:var(--primary);cursor:pointer;font-size:13px;">取消收藏</button>
            <button onclick="addToCart(${product.id})" style="background:var(--primary);color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:13px;">加入购物车</button>
        </div>
    `).join('');
}

// =====================================================
// 十、搜索历史模块
// 函数: loadSearchHistory()、saveSearchHistory()、
//       addSearchHistory()、clearSearchHistory()
// 实现方式：localStorage + Array.unshift()/pop() 维护历史队列
// 实现原理：搜索历史用数组维护，最新的在前。
//           unshift() 在数组头部插入新元素（O(n) 操作，但数据量小可接受），
//           pop() 从尾部移除超出上限的元素，整体实现了 FIFO-like 的有限队列。
//           先用 filter() 去重（避免重复关键词占据多个位置），
//           再 unshift 插入新关键词，最后若超 10 条则 pop 移除最旧的。
//           数据通过 LocalStorage 持久化，键名为 shop_searchHistory。
// =====================================================

/**
 * 从 LocalStorage 加载搜索历史
 * 实现方式：localStorage.getItem() + JSON.parse() 反序列化
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
 * 添加搜索记录（去重，最多保留10条）
 * @param {string} keyword - 搜索关键词
 * 实现方式：Array.filter() 去重 + Array.unshift() 插入队首 + Array.pop() 移除超量
 */
function addSearchHistory(keyword) {
    // 移除重复项
    AppState.searchHistory = AppState.searchHistory.filter(k => k !== keyword);
    // 添加到最前面
    AppState.searchHistory.unshift(keyword);
    // 最多保留10条
    if (AppState.searchHistory.length > 10) {
        AppState.searchHistory.pop();
    }
    saveSearchHistory();
}

/**
 * 清空搜索历史
 */
function clearSearchHistory() {
    AppState.searchHistory = [];
    saveSearchHistory();
    showToast('搜索历史已清空', 'info');
}

// =====================================================
// 十一、回到顶部按钮 (initBackToTop)
// 实现方式：document.createElement() 动态创建按钮 + window.scrollTo() 平滑滚动
//            + addEventListener('scroll') 监听滚动位置控制显隐
// 实现原理：document.createElement('div') 在内存中创建 DOM 节点，
//           appendChild() 将其插入 body 末尾，实现"即用即创建"的按需加载。
//           window.scrollY 是浏览器内置属性，返回当前垂直滚动距离（像素）。
//           scroll 事件在用户滚动时高频触发（每帧约 16ms），
//           通过 classList.add/remove('show') 控制按钮的 CSS 显隐动画。
//           window.scrollTo({top:0, behavior:'smooth'}) 利用浏览器原生平滑滚动。
// =====================================================

/**
 * 初始化回到顶部按钮
 * 滚动超过300px时显示，点击后平滑滚动到顶部
 * 实现方式：window.scrollY 获取滚动位置 + classList.add/remove('show') 控制显隐
 * 实现原理：scroll 事件监听器在每次用户滚动时执行，
 *           比较 window.scrollY 与阈值 300 决定按钮的显示/隐藏。
 *           CSS 中 .show 类通过 opacity 和 visibility 实现淡入淡出过渡效果。
 *           防重复创建：先检查 document.getElementById('back-to-top') 是否存在。
 */
function initBackToTop() {
    // 创建按钮元素（如果还不存在）
    if (document.getElementById('back-to-top')) return;
    
    const btn = document.createElement('div');
    btn.id = 'back-to-top';
    btn.innerHTML = '↑';
    btn.title = '回到顶部';
    btn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.body.appendChild(btn);
    
    // 监听滚动事件，控制按钮显示/隐藏
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    });
}

// =====================================================
// 十二、Toast 消息提示模块 (showToast)
// 页面顶部弹出提示消息，3秒后自动消失
// 实现方式：document.createElement('div') 动态创建 + setTimeout() 定时移除
// 实现原理：每次调用 showToast 时动态创建一个 div 元素，
//           通过 className 设置 toast 类和类型类（success/error/info），
//           不同类对应 CSS 中不同的背景色。appendChild 将元素插入 body 末尾。
//           setTimeout 设置 3 秒后调用 remove() 从 DOM 中移除元素。
//           CSS 中通过 @keyframes toastIn/toastOut 定义入场和出场动画，
//           animation 属性设置 0.3s 淡入 + 2.5s 后 0.3s 淡出。
//           创建新 toast 前先移除旧 toast，避免多条消息重叠显示。
// =====================================================

/**
 * 显示 Toast 提示消息
 * @param {string} message - 提示文字
 * @param {string} type    - 类型: 'success' | 'error' | 'info'
 * 实现方式：className 动态设置类型样式 + appendChild 插入 body + setTimeout 3秒后移除
 * 实现原理：querySelector('.toast') 检查是否存在旧 toast 并移除（防重叠）。
 *           createElement + className + textContent 构建 DOM 节点，
 *           appendChild 将节点挂载到 body 的 DOM 树中。
 *           setTimeout 利用浏览器事件循环机制，3 秒后将 remove 回调加入任务队列执行。
 */
function showToast(message, type = 'info') {
    // 移除已有的 toast，避免重叠
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    // 创建新的 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => toast.remove(), 3000);
}

// =====================================================
// 十三、轮播图控制模块 (initBanner)
// 支持自动播放、手动切换、指示器点击
// 页面隐藏时暂停轮播，节省资源
// 实现方式：setInterval() 定时自动切换 + classList.add/remove('active') 切换显示
//           + visibilitychange 事件监听页面可见性
// 实现原理：所有轮播图 slide 使用 CSS position:absolute 叠加在同一位置，
//           只有带 .active 类的 slide 的 opacity 为 1（可见），其余为 0（隐藏）。
//           CSS transition: opacity 0.6s ease 实现淡入淡出过渡。
//           切换时移除所有 slide 的 active 类，再为目标 slide 添加 active 类。
//           setInterval 每 4 秒执行一次 nextSlide，实现自动轮播。
//           取模运算 (index + 1) % length 实现循环轮播（最后一张切回第一张）。
//           visibilitychange 事件监听标签页切换，页面隐藏时 clearInterval 暂停，
//           恢复时重新 setInterval，避免后台消耗资源。
// =====================================================

let bannerTimer = null;   // 轮播定时器
let bannerIndex = 0;      // 当前显示的轮播索引

/**
 * 初始化轮播图功能
 * 实现方式：setInterval() 每4秒自动调用 nextSlide + addEventListener 绑定箭头/指示器点击
 * 实现原理：setInterval 是浏览器定时器 API，每隔指定毫秒数重复执行回调函数。
 *           返回一个定时器 ID，可用于 clearInterval 取消定时。
 *           取模运算 % 实现循环索引，保证索引始终在 [0, slides.length-1] 范围内。
 *           箭头和指示器的点击事件直接调用 goToSlide/nextSlide/prevSlide 函数。
 */
function initBanner() {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.banner-dots .dot');
    if (slides.length === 0) return;
    
    /**
     * 切换到指定索引的轮播图
     * @param {number} index - 目标索引
     */
    function goToSlide(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        bannerIndex = index;
    }
    
    // 下一张
    function nextSlide() {
        goToSlide((bannerIndex + 1) % slides.length);  // 循环轮播
    }
    
    // 上一张
    function prevSlide() {
        goToSlide((bannerIndex - 1 + slides.length) % slides.length);
    }
    
    // 绑定左右箭头点击事件
    document.querySelector('.banner-btn.next')?.addEventListener('click', nextSlide);
    document.querySelector('.banner-btn.prev')?.addEventListener('click', prevSlide);
    
    // 绑定指示器圆点点击事件
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => goToSlide(i));
    });
    
    // 启动自动轮播（每4秒切换一次）
    bannerTimer = setInterval(nextSlide, 4000);
}

// 页面可见性变化时控制轮播（用户切换标签页时暂停）
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面隐藏时清除定时器
        clearInterval(bannerTimer);
    } else {
        // 页面恢复显示时重新开始轮播
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
// 创建订单、查询订单
// 订单数据存储在 LocalStorage 中
// 函数: createOrder()、getOrders()
// 实现方式：Date.now() 生成订单号 + Array.unshift() 插入队首 + localStorage 持久化
// 实现原理：Date.now() 返回自 1970-01-01 以来的毫秒数，保证同一用户订单号唯一。
//           order.id = 'ORD' + Date.now() 生成可读的唯一订单号。
//           map(i => ({...i})) 使用展开运算符创建商品列表的浅拷贝，
//           避免订单创建后购物车清空影响订单数据（数据独立性）。
//           unshift() 将新订单插入数组头部，实现按时间倒序排列。
//           订单创建后，通过 filter 清除购物车中已购买的商品。
// =====================================================

/**
 * 创建新订单
 * @param {Object} addressInfo - 收货地址信息 {name, phone, address}
 * @returns {Object|null} 创建的订单对象，失败返回 null
 * 实现方式：对象字面量 {} 构建订单 + Array.unshift() 存入 LocalStorage
 * 实现原理：先用 filter 验证有选中商品，若没有则返回 null（调用方据此判断失败）。
 *           构建订单对象时使用对象字面量定义各字段。
 *           Date.now() 生成唯一 ID，new Date().toISOString() 记录创建时间。
 *           {...item} 展开运算符对每个购物车项做浅拷贝，避免引用共享。
 *           最后 filter + saveCartToStorage 清除已购商品并持久化。
 */
function createOrder(addressInfo) {
    // 验证登录状态
    if (!AppState.currentUser) return null;
    // 验证有选中的商品
    if (AppState.cart.filter(i => i.checked).length === 0) return null;
    
    // 构建订单对象
    const order = {
        id: 'ORD' + Date.now(),     // 使用时间戳生成唯一订单号
        userId: AppState.currentUser.id,
        items: AppState.cart.filter(i => i.checked).map(i => ({ ...i })),  // 深拷贝选中商品
        total: getCartTotal(),       // 订单总金额
        address: addressInfo,        // 收货地址
        status: '待发货',            // 订单初始状态
        createTime: new Date().toISOString(),  // 订单创建时间
    };
    
    // 保存订单到 LocalStorage
    const ordersKey = `shop_orders_${AppState.currentUser.id}`;
    const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
    orders.unshift(order);  // 新订单放在最前面
    localStorage.setItem(ordersKey, JSON.stringify(orders));
    
    // 清除购物车中已购买的商品
    AppState.cart = AppState.cart.filter(i => !i.checked);
    saveCartToStorage();
    updateCartBadge();
    
    return order;
}

/**
 * 获取当前用户的所有订单
 * @returns {Array} 订单列表（按时间倒序）
 */
function getOrders() {
    if (!AppState.currentUser) return [];
    const ordersKey = `shop_orders_${AppState.currentUser.id}`;
    return JSON.parse(localStorage.getItem(ordersKey) || '[]');
}

// =====================================================
// 十五、工具函数 (formatDate)
// 实现方式：new Date() 解析日期 + 模板字符串 `` 拼接 + padStart() 补零
// 实现原理：new Date(dateStr) 将 ISO 字符串解析为 Date 对象，
//           getMonth() 返回 0-11，所以需要 +1 得到实际月份。
//           String(x).padStart(2,'0') 确保数字始终为 2 位（如 5→"05"），
//           原理是在字符串前填充指定字符直到达到目标长度。
//           模板字符串将各部分拼接为 "YYYY-MM-DD HH:mm" 格式。
// =====================================================

/**
 * 格式化日期字符串为可读格式
 * @param {string} dateStr - ISO 日期字符串
 * @returns {string} 格式化后的日期，如 "2026-06-09 15:30"
 * 实现方式：Date.getFullYear()/getMonth()/getDate() 获取各部分 + padStart(2,'0') 补零
 * 实现原理：Date 对象提供了一系列 getter 方法获取年/月/日/时/分。
 *           padStart 是 ES2017 引入的字符串方法，str.padStart(len, char)
 *           在字符串开头填充 char 直到长度达到 len，常用于数字补零显示。
 */
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// =====================================================
// 十六、导出全局函数（挂载到 window 对象）
// 使这些函数可以在 HTML 页面的 onclick 中直接调用
// 实现方式：window.函数名 = 函数名  将局部函数暴露为全局函数
// 实现原理：在浏览器环境中，window 是全局对象，所有全局变量/函数都是 window 的属性。
//           const/let 声明的变量不会自动挂载到 window（区别于 var），
//           因此需要显式地 window.funcName = funcName 将模块内的函数暴露到全局作用域。
//           这样 HTML 中的 onclick="funcName()" 内联事件处理器才能访问到这些函数。
//           这是传统前端项目中连接 JS 模块与 HTML 模板的桥接方式。
// =====================================================
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.toggleCartItemCheck = toggleCartItemCheck;
window.toggleAllCartCheck = toggleAllCartCheck;
window.getCartTotal = getCartTotal;
window.getCartCount = getCartCount;
window.updateCartBadge = updateCartBadge;
window.viewProductDetail = viewProductDetail;
window.filterByCategory = filterByCategory;
window.logout = logout;
window.showToast = showToast;
window.formatDate = formatDate;
window.createOrder = createOrder;
window.getOrders = getOrders;
window.initBanner = initBanner;
window.AppState = AppState;
window.toggleFavorite = toggleFavorite;
window.isFavorited = isFavorited;
window.renderFavoriteBtn = renderFavoriteBtn;
window.updateFavoriteBtns = updateFavoriteBtns;
window.renderFavoriteList = renderFavoriteList;
window.addSearchHistory = addSearchHistory;
window.clearSearchHistory = clearSearchHistory;
window.setSortType = setSortType;
