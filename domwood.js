document.addEventListener('DOMContentLoaded', function() {
    // ===== CONSTANTS =====
    const DEFAULT_IMAGE = 'https://picsum.photos/300/300?random=';
    const ADMIN_PASSWORD = "domwood12345";
    const EXCHANGE_RATE = 130; // 1 USD = 130 KSH

    // ===== DOM ELEMENTS =====
    // These will be initialized after DOM is ready
    let adminLoginBtn, adminLoginModal, adminPanel, closeLogin, loginBtn, logoutBtn, adminPassword;
    let productNameInput, productDescInput, productCategoryInput, productPriceInput, productCurrencySelect;
    let productImagesInput, addProductBtn, bulkImageUpload, imageCategorySelect, uploadImagesBtn;
    let hamburger, navMenu, closeBtn, navLinks, productLink, pages, body, searchForm, searchInput;
    let searchResults, menuProducts, productPreview, productsGrid, productList, imageGallery;
    let currentYearElement, currencyToggle;

    // ===== STATE MANAGEMENT =====
    let isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    let currentCurrency = localStorage.getItem('currency') || 'KSH';

    // ===== INITIALIZE DOM ELEMENTS =====
    function initializeDOMElements() {
        adminLoginBtn = document.getElementById('adminLoginBtn');
        adminLoginModal = document.getElementById('adminLoginModal');
        adminPanel = document.getElementById('adminPanel');
        closeLogin = document.querySelector('.close-login');
        loginBtn = document.getElementById('loginBtn');
        logoutBtn = document.getElementById('logoutBtn');
        adminPassword = document.getElementById('adminPassword');
        
        productNameInput = document.getElementById('productName');
        productDescInput = document.getElementById('productDescription');
        productCategoryInput = document.getElementById('productCategory');
        productPriceInput = document.getElementById('productPrice');
        productCurrencySelect = document.getElementById('productCurrency');
        productImagesInput = document.getElementById('productImages');
        addProductBtn = document.getElementById('addProductBtn');
        
        bulkImageUpload = document.getElementById('bulkImageUpload');
        imageCategorySelect = document.getElementById('imageCategory');
        uploadImagesBtn = document.getElementById('uploadImagesBtn');
        
        hamburger = document.getElementById('hamburger');
        navMenu = document.getElementById('navMenu');
        closeBtn = document.getElementById('closeBtn');
        navLinks = document.querySelectorAll('.nav-link:not(.menu-products > .nav-link)');
        productLink = document.querySelector('.menu-products > .nav-link');
        pages = document.querySelectorAll('.page');
        body = document.body;
        searchForm = document.getElementById('searchForm');
        searchInput = document.getElementById('searchInput');
        searchResults = document.getElementById('searchResults');
        menuProducts = document.querySelector('.menu-products');
        productPreview = document.querySelector('.product-preview');
        productsGrid = document.getElementById('productsGrid');
        productList = document.getElementById('productList');
        imageGallery = document.getElementById('imageGallery');
        currentYearElement = document.getElementById('current-year');
        currencyToggle = document.getElementById('currencyToggle');
    }

    // ===== UTILITY FUNCTIONS =====
    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${isError ? '#f44336' : '#4CAF50'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function formatPrice(price, currency = currentCurrency) {
        if (currency === 'USD') {
            const usdPrice = (price / EXCHANGE_RATE).toFixed(2);
            return `$${usdPrice}`;
        }
        return `KSh ${price.toLocaleString()}`;
    }

    function convertCurrency(price, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return price;
        if (fromCurrency === 'KSH' && toCurrency === 'USD') {
            return price / EXCHANGE_RATE;
        }
        if (fromCurrency === 'USD' && toCurrency === 'KSH') {
            return price * EXCHANGE_RATE;
        }
        return price;
    }

    // ===== IMAGE HANDLING FUNCTIONS =====
    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function compressImage(dataUrl, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    }

    // ===== DATA STORAGE FUNCTIONS =====
    function getProducts() {
        const products = JSON.parse(localStorage.getItem('domwood-products')) || [];
        // Ensure all products have images array
        return products.map(product => ({
            ...product,
            images: product.images || []
        }));
    }

    function saveProducts(products) {
        localStorage.setItem('domwood-products', JSON.stringify(products));
    }

    function getImages() {
        return JSON.parse(localStorage.getItem('domwood-images')) || {};
    }

    function saveImages(images) {
        localStorage.setItem('domwood-images', JSON.stringify(images));
    }

    // ===== ADMIN FUNCTIONALITY =====
    function initAdminPanel() {
        if (adminLoginBtn) adminLoginBtn.addEventListener('click', showLoginModal);
        if (closeLogin) closeLogin.addEventListener('click', hideLoginModal);
        if (loginBtn) loginBtn.addEventListener('click', handleLogin);
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (addProductBtn) addProductBtn.addEventListener('click', addProduct);
        if (uploadImagesBtn && imageCategorySelect) {
            uploadImagesBtn.addEventListener('click', uploadBulkImages);
            imageCategorySelect.addEventListener('change', function() {
                loadGalleryImages(this.value);
            });
        }
        
        if (currencyToggle) {
            currencyToggle.addEventListener('click', toggleCurrency);
            updateCurrencyToggle();
        }

        // Only show admin panel if already logged in
        if (isLoggedIn) {
            showAdminPanel();
            loadAdminData();
        } else {
            // Ensure admin panel is hidden on initial load
            hideAdminPanel();
        }
    }

    function showLoginModal() {
        if (adminLoginModal) {
            adminLoginModal.style.display = 'block';
            if (adminPassword) adminPassword.focus();
        }
    }

    function hideLoginModal() {
        if (adminLoginModal) {
            adminLoginModal.style.display = 'none';
            if (adminPassword) adminPassword.value = '';
        }
    }

    function showAdminPanel() {
        if (adminPanel) adminPanel.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (adminLoginBtn) adminLoginBtn.style.display = 'none';
    }

    function hideAdminPanel() {
        if (adminPanel) adminPanel.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminLoginBtn) adminLoginBtn.style.display = 'block';
    }

    function handleLogin() {
        const password = adminPassword?.value;
        if (password === ADMIN_PASSWORD) {
            localStorage.setItem('adminLoggedIn', 'true');
            isLoggedIn = true;
            hideLoginModal();
            showAdminPanel();
            showToast('Admin login successful');
            loadAdminData();
        } else {
            showToast('Invalid password', true);
        }
    }

    function handleLogout() {
        localStorage.removeItem('adminLoggedIn');
        isLoggedIn = false;
        hideAdminPanel();
        showToast('Logged out successfully');
    }

    function toggleCurrency() {
        currentCurrency = currentCurrency === 'KSH' ? 'USD' : 'KSH';
        localStorage.setItem('currency', currentCurrency);
        updateCurrencyToggle();
        loadProducts();
        if (productPreview) loadProductPreview();
        loadProductsPage();
        showToast(`Currency switched to ${currentCurrency}`);
    }

    function updateCurrencyToggle() {
        if (currencyToggle) {
            currencyToggle.textContent = `Switch to ${currentCurrency === 'KSH' ? 'USD' : 'KSH'}`;
        }
    }

    async function addProduct() {
        const name = productNameInput?.value;
        const description = productDescInput?.value;
        const category = productCategoryInput?.value;
        const price = parseFloat(productPriceInput?.value);
        const currency = productCurrencySelect?.value || 'KSH';
        const imageFiles = productImagesInput?.files;

        if (!name || !price || isNaN(price)) {
            showToast('Name and valid price are required', true);
            return;
        }

        const products = getProducts();
        const newProduct = {
            id: Date.now(),
            name,
            description: description || '',
            category: category || 'Uncategorized',
            price: currency === 'USD' ? convertCurrency(price, 'USD', 'KSH') : price,
            currency: 'KSH',
            images: [],
            createdAt: new Date().toISOString()
        };

        // Handle image uploads
        if (imageFiles && imageFiles.length > 0) {
            try {
                for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    const dataUrl = await fileToDataURL(file);
                    const compressedDataUrl = await compressImage(dataUrl);
                    newProduct.images.push(compressedDataUrl);
                }
            } catch (error) {
                console.error('Error processing images:', error);
                showToast('Error processing images', true);
                return;
            }
        } else {
            newProduct.images.push(`${DEFAULT_IMAGE}${Date.now()}`);
        }

        products.push(newProduct);
        saveProducts(products);

        showToast('Product added successfully!');
        clearProductForm();
        loadProducts();
        if (productPreview) loadProductPreview();
        loadProductsPage();
    }

    function clearProductForm() {
        if (productNameInput) productNameInput.value = '';
        if (productDescInput) productDescInput.value = '';
        if (productCategoryInput) productCategoryInput.value = '';
        if (productPriceInput) productPriceInput.value = '';
        if (productImagesInput) productImagesInput.value = '';
        if (productCurrencySelect) productCurrencySelect.value = 'KSH';
    }

    async function uploadBulkImages() {
        const files = bulkImageUpload?.files;
        const category = imageCategorySelect?.value || 'gallery';

        if (!files || files.length === 0) {
            showToast('Please select at least one image', true);
            return;
        }

        const images = getImages();
        if (!images[category]) images[category] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const dataUrl = await fileToDataURL(file);
                const compressedDataUrl = await compressImage(dataUrl);
                
                images[category].push({
                    id: Date.now() + i,
                    url: compressedDataUrl,
                    category,
                    uploadedAt: new Date().toISOString()
                });
            }

            saveImages(images);
            showToast(`${files.length} images uploaded successfully`);
            if (bulkImageUpload) bulkImageUpload.value = '';
            loadGalleryImages(category);
        } catch (error) {
            console.error('Error uploading images:', error);
            showToast('Error uploading images', true);
        }
    }

    function deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        const products = getProducts();
        const updatedProducts = products.filter(product => product.id !== id);
        saveProducts(updatedProducts);
        
        showToast('Product deleted successfully');
        loadProducts();
        if (productPreview) loadProductPreview();
        loadProductsPage();
    }

    function deleteImage(category, id) {
        if (!confirm('Are you sure you want to delete this image?')) return;
        
        const images = getImages();
        if (images[category]) {
            images[category] = images[category].filter(img => img.id !== id);
            saveImages(images);
            showToast('Image deleted successfully');
            loadGalleryImages(category);
        }
    }

    // ===== DATA MANAGEMENT =====
    function loadAdminData() {
        if (!isLoggedIn) return;
        loadProducts();
        if (imageCategorySelect) {
            loadGalleryImages(imageCategorySelect.value);
        }
        if (productPreview) loadProductPreview();
        loadProductsPage();
    }

    function loadProducts() {
        const products = getProducts();
        
        if (!productList) return;
        productList.innerHTML = '<h4>Existing Products</h4>';
        
        if (products.length === 0) {
            productList.innerHTML += '<p>No products found</p>';
            return;
        }
        
        products.forEach((product, index) => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item-admin';
            const imgUrl = product.images?.[0] || `${DEFAULT_IMAGE}${index}`;
            
            productItem.innerHTML = `
                <div class="admin-product-image">
                    <img src="${imgUrl}" alt="${product.name}" 
                         onerror="this.src='${DEFAULT_IMAGE}${index}'">
                </div>
                <div class="admin-product-info">
                    <h5>${product.name || 'Unnamed Product'}</h5>
                    <p>${product.description || 'No description'}</p>
                    <p><strong>Category:</strong> ${product.category || 'Uncategorized'}</p>
                    <p><strong>Price:</strong> ${formatPrice(product.price)}</p>
                    <p><small>Added: ${new Date(product.createdAt).toLocaleDateString()}</small></p>
                </div>
                <div class="admin-product-actions">
                    <button onclick="window.editProduct(${product.id})">Edit</button>
                    <button onclick="window.deleteProduct(${product.id})">Delete</button>
                </div>
            `;
            productList.appendChild(productItem);
        });
    }

    function loadGalleryImages(category) {
        const images = getImages();
        
        if (!imageGallery) return;
        imageGallery.innerHTML = '';
        
        if (!images[category] || images[category].length === 0) {
            imageGallery.innerHTML = '<p>No images found for this category</p>';
            return;
        }
        
        images[category].forEach((img, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'gallery-item';
            imgContainer.innerHTML = `
                <img src="${img.url}" alt="Gallery image ${index + 1}"
                     onerror="this.src='${DEFAULT_IMAGE}${index}'">
                <button onclick="window.deleteImage('${img.category}', ${img.id})">Delete</button>
            `;
            imageGallery.appendChild(imgContainer);
        });
    }

    function loadProductPreview() {
    const products = getProducts();
    
    if (!productPreview) return;
    productPreview.innerHTML = '';
    
    products.slice(0, 3).forEach((product, index) => {
        const imgUrl = product.images?.[0] || `${DEFAULT_IMAGE}${index}`;
        
        const previewItem = document.createElement('div');
        previewItem.className = 'product-preview-item';
        previewItem.innerHTML = `
            <img src="${imgUrl}" alt="${product.name}"
                 onerror="this.src='${DEFAULT_IMAGE}${index}'">
            <p>${product.name || 'Product'}</p>
            <small>${formatPrice(product.price)}</small>
        `;
        previewItem.addEventListener('click', () => {
            // Make sure navigateToPage is accessible
            if (typeof navigateToPage === 'function') {
                navigateToPage('products');
            } else if (typeof window.navigateToPage === 'function') {
                window.navigateToPage('products');
            } else {
                console.error('navigateToPage function not found');
                // Fallback: manually show products page
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                });
                const productsPage = document.getElementById('products');
                if (productsPage) {
                    productsPage.classList.add('active');
                    window.scrollTo(0, 0);
                }
            }
        });
        productPreview.appendChild(previewItem);
    });
}

function loadProductsPage() {
    const products = getProducts();
    
    if (!productsGrid) return;
    productsGrid.innerHTML = '';
    
    products.forEach((product, index) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        const imgUrl = product.images?.[0] || `${DEFAULT_IMAGE}${index}`;
        
        productCard.innerHTML = `
            <div class="product-image-container">
                <img src="${imgUrl}" alt="${product.name}"
                     onerror="this.src='${DEFAULT_IMAGE}${index}'">
            </div>
            <div class="product-info">
                <h3>${product.name || 'Unnamed Product'}</h3>
                <p class="product-description">${product.description || 'No description available'}</p>
                <p class="product-price">${formatPrice(product.price)}</p>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
        
        productCard.style.opacity = '0';
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeIn 0.8s ease forwards';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(productCard);
    });
}

    // ===== SERVICE CATEGORY ANIMATIONS =====
    function initServiceAnimations() {
        const serviceObserverOptions = {
            threshold: 0.1
        };

        const serviceObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeIn 0.8s ease forwards';
                    serviceObserver.unobserve(entry.target);
                }
            });
        }, serviceObserverOptions);

        // Observe service categories when they become available
        function observeServices() {
            const serviceCategories = document.querySelectorAll('.service-category');
            serviceCategories.forEach(card => {
                card.style.opacity = '0';
                serviceObserver.observe(card);
            });
        }

        // Initial observation
        observeServices();

        // Re-observe when navigating to services page
        const originalNavigateToPage = window.navigateToPage;
        window.navigateToPage = function(pageId) {
            originalNavigateToPage(pageId);
            
            if (pageId === 'services') {
                // Wait a bit for the page to render, then observe services
                setTimeout(observeServices, 100);
            }
        };
    }

    // ===== MAIN WEBSITE FUNCTIONALITY =====
    function initMainWebsite() {
        // Create overlay element if it doesn't exist
        let overlay = document.getElementById('overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.id = 'overlay';
            document.body.appendChild(overlay);
        }

        // Initialize navigation
        initNavigation(overlay);
        
        // Initialize search
        if (searchForm && searchInput && searchResults) {
            initSearch();
        }
        
        // Initialize product preview
        if (menuProducts && productPreview) {
            initProductPreview();
        }
        
        // Initialize service animations
        initServiceAnimations();
        
        // Set current year in footer
        if (currentYearElement) {
            currentYearElement.textContent = new Date().getFullYear();
        }
        
        // Make sure home page is active by default
        const homePage = document.getElementById('home');
        if (homePage) {
            homePage.classList.add('active');
        }
        
        // Load products page initially
        loadProductsPage();
        updateCurrencyToggle();
    }

    function initNavigation(overlay) {
        function toggleMenu() {
            if (navMenu) navMenu.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            if (body) body.classList.toggle('no-scroll');
        }

        // Hamburger menu
        if (hamburger) {
            hamburger.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleMenu();
            });
        }

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleMenu();
            });
        }

        // Overlay click
        if (overlay) {
            overlay.addEventListener('click', toggleMenu);
        }

        // Navigation links
        if (navLinks && navLinks.length > 0) {
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    navigateToPage(this.getAttribute('data-page'));
                    toggleMenu();
                });
            });
        }

        // Product link
        if (productLink) {
            productLink.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToPage(this.getAttribute('data-page'));
                toggleMenu();
            });
        }

        // Close menu when clicking outside or pressing ESC
        document.addEventListener('click', function(e) {
            if (navMenu && !navMenu.contains(e.target) && e.target !== hamburger) {
                navMenu.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (body) body.classList.remove('no-scroll');
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (navMenu) navMenu.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (body) body.classList.remove('no-scroll');
            }
        });
    }

    function navigateToPage(pageId) {
        // Hide all pages
        if (pages && pages.length > 0) {
            pages.forEach(page => {
                page.classList.remove('active');
            });
        }
        
        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Reload products if navigating to products page
        if (pageId === 'products') {
            loadProductsPage();
        }
    }

    function initProductPreview() {
        function handleProductPreview() {
            if (!menuProducts || !productPreview) return;
            
            if (window.innerWidth > 992) {
                // Desktop behavior - hover
                menuProducts.addEventListener('mouseenter', () => {
                    productPreview.style.display = 'grid';
                });
                
                menuProducts.addEventListener('mouseleave', () => {
                    productPreview.style.display = 'none';
                });
            } else {
                // Mobile behavior - click toggle
                let isPreviewVisible = false;
                
                menuProducts.addEventListener('click', (e) => {
                    if (e.target.classList.contains('nav-link')) {
                        e.preventDefault();
                        isPreviewVisible = !isPreviewVisible;
                        productPreview.style.display = isPreviewVisible ? 'grid' : 'none';
                    }
                });
            }
        }

        handleProductPreview();
        window.addEventListener('resize', handleProductPreview);
    }

    // ===== SEARCH FUNCTIONALITY =====
    function initSearch() {
        let searchData = [];
        let searchInitialized = false;
        
        function initSearchData() {
            try {
                const allPages = document.querySelectorAll('.page');
                searchData = [];
                
                allPages.forEach(page => {
                    const pageId = page.id;
                    const searchableElements = page.querySelectorAll(
                        '[data-searchable], h1, h2, h3, h4, h5, h6, p:not(.search-no-results):not(.search-error), li'
                    );
                    
                    Array.from(searchableElements)
                        .filter(el => el.textContent.trim().length > 0)
                        .forEach(el => {
                            let heading = '';
                            let currentEl = el.previousElementSibling;
                            while (currentEl) {
                                if (currentEl.tagName.match(/^H[1-6]$/)) {
                                    heading = currentEl.textContent.trim();
                                    break;
                                }
                                currentEl = currentEl.previousElementSibling;
                            }
                            
                            searchData.push({
                                id: el.id || `${el.tagName}-${Math.random().toString(36).slice(2, 9)}`,
                                title: el.dataset.searchTitle || 
                                      (heading ? `${heading} - ${el.textContent.trim().slice(0, 30)}` : 
                                      el.textContent.trim().slice(0, 50)),
                                content: el.textContent.trim(),
                                element: el,
                                page: pageId,
                                tagName: el.tagName
                            });
                        });
                });
                
                searchInitialized = true;
            } catch (error) {
                console.error('Error initializing search data:', error);
            }
        }

        function performSearch(query) {
            if (!searchInitialized) return;
            
            if (!query || query.trim().length < 2) {
                if (searchResults) {
                    searchResults.innerHTML = '';
                    searchResults.style.display = 'none';
                }
                return;
            }
            
            const queryLower = query.toLowerCase().trim();
            const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 1);
            
            if (queryTerms.length === 0) {
                if (searchResults) {
                    searchResults.innerHTML = '<div class="search-no-results">Please enter at least 2 characters</div>';
                    searchResults.style.display = 'block';
                }
                return;
            }
            
            // Score results based on match quality
            const scoredResults = searchData.map(item => {
                const contentLower = (item.title + ' ' + item.content).toLowerCase();
                let score = 0;
                
                // Exact match boosts score
                if (contentLower.includes(queryLower)) {
                    score += 50;
                }
                
                // Count term matches
                queryTerms.forEach(term => {
                    const termCount = (contentLower.match(new RegExp(term, 'g')) || []).length;
                    score += termCount * 5;
                    
                    // Boost score for matches in title or headings
                    if (item.title.toLowerCase().includes(term) || item.tagName.match(/^H[1-6]$/)) {
                        score += 10;
                    }
                });
                
                return { ...item, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);
            
            displayResults(scoredResults, query);
        }

        function displayResults(results, query) {
            if (!searchResults) return;
            
            searchResults.innerHTML = '';
            
            if (results.length === 0) {
                searchResults.innerHTML = `
                    <div class="search-no-results">
                        No results found for "${query}"
                        <div class="search-suggestions">
                            Try different keywords or check our 
                            <a href="#" data-page="products" class="search-suggestion-link">products</a> 
                            and <a href="#" data-page="services" class="search-suggestion-link">services</a>.
                        </div>
                    </div>
                `;
                
                // Add click handlers to suggestion links
                document.querySelectorAll('.search-suggestion-link').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        navigateToPage(this.getAttribute('data-page'));
                        searchResults.style.display = 'none';
                        if (searchInput) searchInput.value = '';
                    });
                });
                
                searchResults.style.display = 'block';
                return;
            }
            
            const resultsList = document.createElement('ul');
            resultsList.className = 'search-results-list';
            
            // Group results by page
            const resultsByPage = {};
            results.forEach(item => {
                if (!resultsByPage[item.page]) {
                    resultsByPage[item.page] = [];
                }
                resultsByPage[item.page].push(item);
            });
            
            // Display up to 10 best results
            let displayedCount = 0;
            const MAX_RESULTS = 10;
            
            for (const [pageId, pageResults] of Object.entries(resultsByPage)) {
                if (displayedCount >= MAX_RESULTS) break;
                
                const pageHeader = document.createElement('li');
                pageHeader.className = 'search-page-header';
                const pageTitleElement = document.getElementById(pageId)?.querySelector('h1, h2');
                pageHeader.textContent = pageTitleElement?.textContent || pageId;
                resultsList.appendChild(pageHeader);
                
                for (const item of pageResults) {
                    if (displayedCount >= MAX_RESULTS) break;
                    
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = '#' + item.id;
                    a.innerHTML = `
                        <div class="search-result-title">${highlightMatches(item.title, query)}</div>
                        <div class="search-result-preview">${getContentPreview(item.content, query)}</div>
                    `;
                    a.addEventListener('click', function(e) {
                        e.preventDefault();
                        navigateToSearchResult(item);
                    });
                    
                    li.appendChild(a);
                    resultsList.appendChild(li);
                    displayedCount++;
                }
            }
            
            if (results.length > MAX_RESULTS) {
                const moreResults = document.createElement('li');
                moreResults.className = 'search-more-results';
                moreResults.textContent = `${results.length - MAX_RESULTS} more results found...`;
                resultsList.appendChild(moreResults);
            }
            
            searchResults.appendChild(resultsList);
            searchResults.style.display = 'block';
        }

        function highlightMatches(text, query) {
            if (!text) return '';
            
            const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
            let result = text;
            
            terms.forEach(term => {
                const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
                result = result.replace(regex, '<mark>$1</mark>');
            });
            
            return result;
        }

        function getContentPreview(content, query) {
            if (!content) return '';
            
            const lowerContent = content.toLowerCase();
            const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
            
            // Find the best position with most matches
            let bestPos = -1;
            let bestScore = 0;
            
            for (let i = 0; i < content.length; i++) {
                let score = 0;
                for (const term of terms) {
                    if (lowerContent.substr(i, term.length) === term) {
                        score += term.length;
                    }
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPos = i;
                }
            }
            
            if (bestPos === -1) {
                return content.substring(0, 100) + (content.length > 100 ? '...' : '');
            }
            
            const startPos = Math.max(0, bestPos - 30);
            const endPos = Math.min(content.length, bestPos + bestScore + 70);
            let preview = content.substring(startPos, endPos);
            
            if (startPos > 0) preview = '...' + preview;
            if (endPos < content.length) preview = preview + '...';
            
            return highlightMatches(preview, query);
        }

        function navigateToSearchResult(item) {
            // Hide all pages
            if (pages && pages.length > 0) {
                pages.forEach(page => {
                    page.classList.remove('active');
                });
            }
            
            // Show the page containing the result
            const targetPage = document.getElementById(item.page);
            if (targetPage) {
                targetPage.classList.add('active');
                
                // Scroll to the element after the page is visible
                setTimeout(() => {
                    if (item.element) {
                        const currentElement = document.getElementById(item.element.id) || 
                                             document.querySelector(`[data-original-id="${item.element.id}"]`);
                        
                        if (currentElement) {
                            currentElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                            
                            // Highlight the element
                            currentElement.classList.add('search-highlight');
                            setTimeout(() => {
                                currentElement.classList.remove('search-highlight');
                            }, 3000);
                        }
                    }
                }, 50);
            }
            
            // Close search results and clear input
            if (searchResults) searchResults.style.display = 'none';
            if (searchInput) searchInput.value = '';
        }

        // Initialize search data
        initSearchData();

        // Watch for DOM changes to reinitialize search
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                initSearchData();
            }
        });
        
        // Observe all pages for changes
        document.querySelectorAll('.page').forEach(page => {
            observer.observe(page, {
                childList: true,
                subtree: true
            });
        });

        // Add debounce to input event
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(this.value.trim());
            }, 300);
        });
        
        // Handle form submission
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            clearTimeout(searchTimeout);
            performSearch(searchInput.value.trim());
        });
        
        // Close search results when clicking outside
        document.addEventListener('click', function(e) {
            if (searchResults && !searchForm.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
        
        // Keyboard navigation for search results
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown' && searchResults.style.display === 'block') {
                e.preventDefault();
                const firstResult = searchResults.querySelector('a');
                if (firstResult) firstResult.focus();
            }
            
            if (e.key === 'Escape') {
                if (searchResults) searchResults.style.display = 'none';
            }
        });
        
        // Handle keyboard navigation within results
        if (searchResults) {
            searchResults.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextItem = document.activeElement.parentElement.nextElementSibling?.querySelector('a');
                    if (nextItem) nextItem.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevItem = document.activeElement.parentElement.previousElementSibling?.querySelector('a');
                    if (prevItem) {
                        prevItem.focus();
                    } else {
                        if (searchInput) searchInput.focus();
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    document.activeElement.click();
                }
            });
        }
    }

    // ===== GLOBAL FUNCTIONS =====
    window.editProduct = function(id) {
        if (!isLoggedIn) {
            showToast('Please login as admin first', true);
            return;
        }
        
        const products = getProducts();
        const product = products.find(p => p.id === id);
        if (!product) return;
        
        if (productNameInput) productNameInput.value = product.name;
        if (productDescInput) productDescInput.value = product.description;
        if (productCategoryInput) productCategoryInput.value = product.category;
        if (productPriceInput) productPriceInput.value = product.price;
        if (productCurrencySelect) productCurrencySelect.value = 'KSH';
        
        showToast(`Editing ${product.name}`);
    };

    window.deleteProduct = function(id) {
        if (!isLoggedIn) {
            showToast('Please login as admin first', true);
            return;
        }
        deleteProduct(id);
    };

    window.deleteImage = function(category, id) {
        if (!isLoggedIn) {
            showToast('Please login as admin first', true);
            return;
        }
        deleteImage(category, id);
    };

    window.navigateToPage = navigateToPage;

    // ===== INITIALIZATION =====
    // Initialize DOM elements first
    initializeDOMElements();
    
    // Then initialize the website functionality
    initMainWebsite();
    
    // Finally initialize admin panel (which will be hidden by default)
    initAdminPanel();

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .toast { animation: slideIn 0.3s ease; }
        .toast-success { background: #4CAF50; }
        .toast-error { background: #f44336; }
        
        .search-highlight {
            background-color: yellow;
            transition: background-color 3s ease;
        }

        /* Ensure service categories are always visible */
        .service-category {
            opacity: 1 !important;
            animation: none !important;
        }
    `;
    document.head.appendChild(style);
});