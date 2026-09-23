/* ============================================
   LilyGlow Jewelry - Theme JavaScript
   ============================================ */

(function() {
  'use strict';

  /* === UTILITIES === */
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function formatMoney(cents) {
    const format = window.theme?.moneyFormat || '${{amount}}';
    const amount = (cents / 100).toFixed(2);
    return format.replace('{{amount}}', amount)
                 .replace('{{amount_no_decimals}}', Math.round(cents / 100))
                 .replace('{{amount_with_comma_separator}}', amount.replace('.', ','));
  }

  /* === HEADER === */
  function initHeader() {
    const searchInput = $('[data-search-input]');
    const searchOverlay = $('[data-search-overlay]');
    const predictiveSearch = $('[data-predictive-search]');
    const predictiveResults = $('[data-predictive-results]');
    const loadingSpinner = $('.predictive-search__loading');

    if (!searchInput || !predictiveSearch || !predictiveResults) return;

    let debounceTimeout;

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      const query = searchInput.value.trim();

      if (query.length < 3) {
        predictiveSearch.classList.remove('is-visible');
        setTimeout(() => {
          predictiveSearch.style.display = 'none';
          predictiveResults.innerHTML = '';
        }, 250);
        return;
      }

      predictiveSearch.style.display = 'block';
      predictiveSearch.classList.add('is-visible');
      if (loadingSpinner) loadingSpinner.style.display = 'flex';

      debounceTimeout = setTimeout(() => {
        fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product,collection&resources[limit]=5`)
          .then(res => res.json())
          .then(data => {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            renderResults(data, query);
          })
          .catch(err => {
            console.error('Predictive search error:', err);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
          });
      }, 300);
    });

    function renderResults(data, query) {
      const products = data.resources?.results?.products || [];
      const collections = data.resources?.results?.collections || [];

      if (products.length === 0 && collections.length === 0) {
        predictiveResults.innerHTML = `
          <div class="predictive-search__empty">
            No results found for "${escapeHtml(query)}"
          </div>
        `;
        return;
      }

      let html = '';

      // Collections Group
      if (collections.length > 0) {
        html += `
          <div class="predictive-search__group">
            <h4 class="predictive-search__title">Categories</h4>
            <div class="predictive-search__list">
              ${collections.map(col => `
                <a href="${col.url}" class="predictive-search__collection-link">
                  ${escapeHtml(col.title)}
                </a>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Products Group
      if (products.length > 0) {
        html += `
          <div class="predictive-search__group">
            <h4 class="predictive-search__title">Products</h4>
            <div class="predictive-search__list">
              ${products.map(prod => {
                const imgUrl = prod.image || 'https://cdn.shopify.com/s/images/admin/no-image-large.gif';
                const price = formatMoney(prod.price, window.theme?.moneyFormat || '${{amount}}');
                return `
                  <a href="${prod.url}" class="predictive-search__product-item">
                    <img src="${imgUrl}" alt="${escapeHtml(prod.title)}" class="predictive-search__product-img">
                    <div class="predictive-search__product-info">
                      <p class="predictive-search__product-title">${escapeHtml(prod.title)}</p>
                      <p class="predictive-search__product-price">${price}</p>
                    </div>
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      predictiveResults.innerHTML = html;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
    }

    // Close predictive search when clicking outside
    document.addEventListener('click', (e) => {
      if (searchOverlay && !searchOverlay.contains(e.target)) {
        predictiveSearch.classList.remove('is-visible');
        setTimeout(() => {
          predictiveSearch.style.display = 'none';
        }, 250);
      }
    });
  }


  /* === SLIDESHOW === */
  function initSlideshow() {
    const slideshow = $('[data-slideshow]');
    if (!slideshow) return;

    const slides = $$('.hero-slideshow__slide', slideshow);
    const dots = $$('[data-slide-dot]', slideshow);
    const prevBtn = $('[data-slide-prev]', slideshow);
    const nextBtn = $('[data-slide-next]', slideshow);
    let currentSlide = 0;
    let autoplayTimer;

    function goToSlide(index) {
      slides[currentSlide].classList.remove('is-active');
      if (dots[currentSlide]) dots[currentSlide].classList.remove('is-active');

      currentSlide = (index + slides.length) % slides.length;

      slides[currentSlide].classList.add('is-active');
      if (dots[currentSlide]) dots[currentSlide].classList.add('is-active');
    }

    function nextSlide() {
      goToSlide(currentSlide + 1);
    }

    function prevSlide() {
      goToSlide(currentSlide - 1);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoplay(); });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => { goToSlide(index); resetAutoplay(); });
    });

    function startAutoplay() {
      const speed = (slideshow.closest('section')?.dataset?.autoplaySpeed || 5) * 1000;
      autoplayTimer = setInterval(nextSlide, speed);
    }

    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    if (slides.length > 1) {
      startAutoplay();
    }
  }

  /* === CART === */
  let closeCartDrawer = () => {};

  function attachDrawerItemListeners() {
    document.querySelectorAll('[data-cart-drawer-item]').forEach(item => {
      const line = parseInt(item.dataset.line);
      const minus = item.querySelector('[data-drawer-qty-minus]');
      const plus = item.querySelector('[data-drawer-qty-plus]');
      const remove = item.querySelector('[data-drawer-remove]');
      if (minus) minus.addEventListener('click', () => {
        const current = parseInt(item.querySelector('.cart-drawer__qty-value').textContent);
        updateCartLine(line, Math.max(0, current - 1));
      });
      if (plus) plus.addEventListener('click', () => {
        const current = parseInt(item.querySelector('.cart-drawer__qty-value').textContent);
        updateCartLine(line, current + 1);
      });
      if (remove) remove.addEventListener('click', () => updateCartLine(line, 0));
    });
  }

  function initCart() {
    const cartToggle = $('[data-cart-toggle]');
    const cartDrawer = $('[data-cart-drawer]');
    const cartCloseButtons = $$('[data-cart-drawer-close]');

    function openCartDrawer() {
      if (cartDrawer) {
        cartDrawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    }

    closeCartDrawer = () => {
      if (cartDrawer) {
        cartDrawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    };

    if (cartToggle && cartDrawer) {
      cartToggle.addEventListener('click', (e) => {
        if (window.theme?.cartType === 'drawer') {
          e.preventDefault();
          openCartDrawer();
        }
      });
    }

    cartCloseButtons.forEach(btn => {
      btn.addEventListener('click', closeCartDrawer);
    });

    // Quick add to cart
    document.addEventListener('click', async (e) => {
      const quickAddBtn = e.target.closest('[data-quick-add]');
      if (!quickAddBtn) return;

      e.preventDefault();
      quickAddBtn.disabled = true;
      const variantId = quickAddBtn.dataset.quickAdd;

      try {
        const response = await fetch(window.theme.routes.cart_add_url + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
        });

        if (response.ok) {
          await refreshCartDrawer();
          if (window.theme?.cartType === 'drawer') {
            openCartDrawer();
          }
        }
      } catch (err) {
        console.error('Add to cart error:', err);
      } finally {
        quickAddBtn.disabled = false;
      }
    });

    // Initial listener attachment for items already in drawer
    attachDrawerItemListeners();
  }

  async function refreshCartDrawer() {
    try {
      const response = await fetch(`${window.location.pathname}?sections=cart-drawer`);
      if (!response.ok) return;
      const data = await response.json();
      const drawerSection = data['cart-drawer'];
      if (drawerSection) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(drawerSection, 'text/html');
        const newContent = doc.querySelector('[data-cart-drawer]');
        const existing = $('[data-cart-drawer]');
        if (newContent && existing) {
          existing.innerHTML = newContent.innerHTML;
          // Re-attach close listeners
          $$('[data-cart-drawer-close]').forEach(btn => {
            btn.addEventListener('click', closeCartDrawer);
          });
          // Re-attach qty/remove listeners
          attachDrawerItemListeners();
        }
      }
      // Also update header count via /cart.js
      const cartResp = await fetch('/cart.js');
      const cart = await cartResp.json();
      $$('[data-cart-count]').forEach(el => { el.textContent = cart.item_count; });
      const drawerCount = $('[data-cart-drawer-count]');
      if (drawerCount) drawerCount.textContent = `(${cart.item_count})`;
    } catch (err) {
      console.error('Cart refresh error:', err);
    }
  }

  async function refreshCartPage() {
    try {
      const cartContainer = $('.cart-template');
      if (cartContainer) cartContainer.style.opacity = '0.5';

      const response = await fetch('/cart?sections=cart-template');
      if (!response.ok) throw new Error('Failed to fetch updated cart page');

      const data = await response.json();
      const cartHtml = data['cart-template'];

      if (cartHtml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(cartHtml, 'text/html');
        const newContent = doc.querySelector('.cart-template');
        if (newContent && cartContainer) {
          cartContainer.innerHTML = newContent.innerHTML;
          cartContainer.style.opacity = '1';

          // Re-initialize quantity button click listeners on new DOM nodes
          initCollection();
        }
      }

      // Also update header cart counters
      await updateCartCount();
    } catch (err) {
      console.error('Refresh cart page error:', err);
      location.reload(); // Fallback reload
    }
  }

  async function updateCartLine(line, quantity) {
    try {
      const response = await fetch(window.theme.routes.cart_change_url + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, quantity })
      });

      if (response.ok) {
        if (window.location.pathname.includes('/cart')) {
          await refreshCartPage();
        } else {
          await refreshCartDrawer();
        }
      }
    } catch (err) {
      console.error('Update cart error:', err);
    }
  }

  async function updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      const countElements = $$('[data-cart-count]');
      countElements.forEach(el => { el.textContent = cart.item_count; });
      const drawerCount = $('[data-cart-drawer-count]');
      if (drawerCount) drawerCount.textContent = `(${cart.item_count})`;
    } catch (err) {
      console.error('Cart count error:', err);
    }
  }


  /* === PRODUCT PAGE === */
  function initProduct() {
    const productSection = $('.product-template');
    if (!productSection) return;

    // Thumbnail gallery
    const thumbnails = $$('[data-thumbnail]', productSection);
    const mainImg = $('#product-main-img', productSection);

    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbnails.forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
        if (mainImg) {
          mainImg.style.opacity = '0';
          setTimeout(() => {
            mainImg.src = thumb.dataset.imageUrl;
            mainImg.onload = () => {
              mainImg.style.opacity = '1';
            };
          }, 150);
        }
      });
    });

    // Quantity buttons
    const qtyMinus = $('[data-qty-minus]', productSection);
    const qtyPlus = $('[data-qty-plus]', productSection);
    const qtyInput = $('[data-qty-input]', productSection);

    if (qtyMinus && qtyPlus && qtyInput) {
      qtyMinus.addEventListener('click', () => {
        const current = parseInt(qtyInput.value);
        if (current > 1) qtyInput.value = current - 1;
      });

      qtyPlus.addEventListener('click', () => {
        const current = parseInt(qtyInput.value);
        qtyInput.value = current + 1;
      });
    }

    // Variant selection
    const productData = $('[data-product-json]', productSection);
    if (!productData) return;

    let product;
    try {
      product = JSON.parse(productData.textContent);
    } catch (e) {
      return;
    }

    const optionContainers = $$('.product-template__option', productSection);
    let selectedOptions = optionContainers.map(container => {
      const activeBtn = $('.is-active', container);
      return activeBtn ? activeBtn.dataset.optionValue : null;
    });

    const optionButtons = $$('[data-option-value]', productSection);
    optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const optionIndex = parseInt(btn.dataset.optionIndex);
        const value = btn.dataset.optionValue;

        // Update selected state
        const siblings = btn.parentElement.querySelectorAll('[data-option-value]');
        siblings.forEach(s => s.classList.remove('is-active'));
        btn.classList.add('is-active');

        selectedOptions[optionIndex] = value;

        // Find matching variant
        const variant = product.variants.find(v => {
          return v.options.every((opt, i) => opt === selectedOptions[i]);
        });

        if (variant) {
          updateVariant(variant, productSection);
        }
      });
    });

    // Add to cart form
    const form = $('[data-product-form]', productSection);
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {
          items: [{
            id: parseInt(formData.get('id')),
            quantity: parseInt(formData.get('quantity'))
          }]
        };

        try {
          const response = await fetch(window.theme.routes.cart_add_url + '.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (response.ok) {
            await refreshCartDrawer();
            if (window.theme?.cartType === 'drawer') {
              const cartDrawer = $('[data-cart-drawer]');
              if (cartDrawer) {
                cartDrawer.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
              }
            }
          }
        } catch (err) {
          console.error('Add to cart error:', err);
        }
      });
    }

    // Product Image Zoom (Pan-on-hover)
    const mainImageContainer = $('[data-product-main-image]', productSection);
    const mainImage = $('#product-main-img', mainImageContainer);

    if (mainImageContainer && mainImage) {
      mainImageContainer.addEventListener('mouseenter', () => {
        mainImage.style.transform = 'scale(2.2)';
      });

      mainImageContainer.addEventListener('mousemove', (e) => {
        const rect = mainImageContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        mainImage.style.transformOrigin = `${x}% ${y}%`;
      });

      mainImageContainer.addEventListener('mouseleave', () => {
        mainImage.style.transform = 'scale(1)';
        mainImage.style.transformOrigin = 'center center';
      });
    }

    // Copy Share Link to Clipboard
    const copyBtn = $('[data-share-copy-link]', productSection);
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const url = copyBtn.dataset.shareUrl;
        try {
          await navigator.clipboard.writeText(url);
          copyBtn.classList.add('is-copied');
          setTimeout(() => {
            copyBtn.classList.remove('is-copied');
          }, 1500);
        } catch (err) {
          console.error('Failed to copy link:', err);
        }
      });
    }
  }

  function updateVariant(variant, section) {
    // Update variant ID
    const variantInput = $('[data-variant-id]', section);
    if (variantInput) variantInput.value = variant.id;

    // Update price
    const priceEl = $('[data-product-price]', section);
    if (priceEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        priceEl.innerHTML = `
          <span class="product-template__price-sale">${formatMoney(variant.price)}</span>
          <span class="product-template__price-compare">${formatMoney(variant.compare_at_price)}</span>
          <span class="product-template__price-badge">Sale</span>
        `;
      } else {
        priceEl.innerHTML = `<span class="product-template__price-regular">${formatMoney(variant.price)}</span>`;
      }
    }

    // Update add to cart button
    const addBtn = $('[data-add-to-cart]', section);
    if (addBtn) {
      if (variant.available) {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Cart';
      } else {
        addBtn.disabled = true;
        addBtn.textContent = 'Sold Out';
      }
    }

    // Update SKU
    const skuEl = $('[data-product-sku]', section);
    if (skuEl) {
      skuEl.innerHTML = `SKU: <strong>${variant.sku || 'N/A'}</strong>`;
    }

    // Update image
    if (variant.featured_image) {
      const mainImg = $('#product-main-img', section);
      if (mainImg) {
        mainImg.src = variant.featured_image.src;
      }
    }
  }


  /* === COLLECTION PAGE === */
  function initCollection() {
    const sortSelect = $('[data-sort-select]');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('sort_by', sortSelect.value);
        renderCollectionPage(url.toString());
      });
    }

    // Cart page quantity
    const cartItems = $$('[data-cart-item]');
    cartItems.forEach(item => {
      const minus = $('[data-cart-qty-minus]', item);
      const plus = $('[data-cart-qty-plus]', item);
      const input = $('[data-cart-qty-input]', item);
      const removeBtn = $('[data-cart-remove]', item);
      const line = parseInt(item.dataset.line);

      if (minus && input) {
        minus.addEventListener('click', () => {
          const current = parseInt(input.value);
          if (current > 1) {
            input.value = current - 1;
            updateCartLine(line, current - 1);
          }
        });
      }

      if (plus && input) {
        plus.addEventListener('click', () => {
          const current = parseInt(input.value);
          input.value = current + 1;
          updateCartLine(line, current + 1);
        });
      }

      if (input) {
        input.addEventListener('change', () => {
          const current = parseInt(input.value);
          if (!isNaN(current) && current >= 0) {
            updateCartLine(line, current);
          }
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          updateCartLine(line, 0);
        });
      }
    });
  }

  /* === REVIEWS SLIDER === */
  function initReviews() {
    const slider = $('[data-reviews-slider]');
    if (!slider) return;

    const prevBtn = $('[data-reviews-prev]');
    const nextBtn = $('[data-reviews-next]');
    if (!prevBtn || !nextBtn) return;

    const getScrollStep = () => {
      const firstItem = slider.querySelector('.reviews__card');
      if (firstItem) {
        return firstItem.offsetWidth + 24; // scroll by 1 card (width + gap)
      }
      return 340;
    };

    prevBtn.addEventListener('click', () => {
      slider.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      slider.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    const toggleArrows = () => {
      if (slider.scrollLeft <= 10) {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
      } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'all';
      }

      const isEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10;
      if (isEnd) {
        nextBtn.style.opacity = '0.3';
        nextBtn.style.pointerEvents = 'none';
      } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'all';
      }
    };

    let timeout;
    slider.addEventListener('scroll', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    // Run initially
    setTimeout(toggleArrows, 200);
  }

  /* === BESTSELLER TABS === */
  function initBestsellerTabs() {
    const tabs = $$('[data-tab-btn]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
      });
    });
  }

  /* === MODAL === */
  function initModal() {
    const modal = $('#quick-view-modal');
    if (!modal) return;

    const closeButtons = $$('[data-modal-close]', modal);
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.setAttribute('aria-hidden', 'true');
        const cartDrawer = $('[data-cart-drawer]');
        if (cartDrawer) cartDrawer.setAttribute('aria-hidden', 'true');
        const mobileMenu = $('[data-mobile-menu]');
        if (mobileMenu) {
          mobileMenu.classList.remove('is-open');
          mobileMenu.setAttribute('aria-hidden', 'true');
        }
        document.body.style.overflow = '';
      }
    });
  }

  /* === SCROLL ANIMATIONS === */
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          
          // Force visibility on child grids that need layout stagger
          const subGrids = entry.target.querySelectorAll('[data-animate-grid]');
          subGrids.forEach(grid => grid.classList.add('is-visible'));

          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });

    // Observe sections, hero slideshow, parallax banners, and individual animating grids
    $$('.section, .hero-slideshow, .parallax-banner, [data-animate-grid]').forEach(el => {
      observer.observe(el);
    });
  }


  /* === COLLECTION FILTERS === */
  async function renderCollectionPage(url) {
    try {
      const container = $('.collection-template');
      if (container) container.style.opacity = '0.5';

      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set('sections', 'collection-template');

      const response = await fetch(urlObj.toString());
      if (!response.ok) throw new Error('Failed to fetch collection template section');

      const data = await response.json();
      const html = data['collection-template'];

      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.querySelector('.collection-template');
        if (newContent && container) {
          container.innerHTML = newContent.innerHTML;
          container.style.opacity = '1';
          window.history.pushState({ path: url }, '', url);

          // Re-initialize behaviors on the new content
          initCollection();
          initFilters();
        }
      }
    } catch (err) {
      console.error('AJAX filtering error:', err);
      window.location.href = url; // Fallback to full page load
    }
  }

  function initFilters() {
    const sidebar = $('[data-filter-sidebar]');
    const toggleBtn = $('[data-filter-toggle]');
    const closeBtn = $('[data-filter-close]');
    const backdrop = $('[data-filter-backdrop]');
    const filterForm = $('#FacetFiltersForm');

    // Open / close sidebar (mobile)
    function openSidebar() {
      if (!sidebar) return;
      sidebar.classList.add('is-open');
      backdrop && backdrop.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
      if (!sidebar) return;
      sidebar.classList.remove('is-open');
      backdrop && backdrop.classList.remove('is-visible');
      document.body.style.overflow = '';
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    // Collapsible filter groups
    $$('[data-filter-group-toggle]').forEach(btn => {
      const group = btn.closest('[data-filter-group]');
      if (!group) return;

      const body = group.querySelector('.filter-group__body');
      if (body) body.style.maxHeight = body.scrollHeight + 'px';

      btn.addEventListener('click', () => {
        const isCollapsed = group.classList.toggle('filter-group--collapsed');
        btn.setAttribute('aria-expanded', String(!isCollapsed));
        if (!isCollapsed && body) {
          body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });

    // Intercept click on filter links (category list items, active pills, clear link)
    const sidebarLinks = sidebar ? sidebar.querySelectorAll('a.filter-checkbox, a.filter-clear-all') : [];
    const activePills = document.querySelectorAll('.active-filter-pill, .active-filters__clear');
    const paginationLinks = document.querySelectorAll('.pagination a');

    [...sidebarLinks, ...activePills, ...paginationLinks].forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        renderCollectionPage(link.getAttribute('href'));
      });
    });

    // Auto-submit checkbox change via AJAX
    $$('[data-filter-input]').forEach(input => {
      input.addEventListener('change', () => {
        if (filterForm) {
          const formData = new FormData(filterForm);
          const params = new URLSearchParams(formData).toString();
          const newUrl = `${window.location.pathname}?${params}`;
          renderCollectionPage(newUrl);
        }
      });
    });

    // Price range — submit on Enter in price inputs via AJAX
    $$('[data-filter-price-min], [data-filter-price-max]').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (filterForm) {
            const formData = new FormData(filterForm);
            const params = new URLSearchParams(formData).toString();
            const newUrl = `${window.location.pathname}?${params}`;
            renderCollectionPage(newUrl);
          }
        }
      });
    });

    // Price range — submit on Form Submit button via AJAX
    if (filterForm) {
      filterForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(filterForm);
        const params = new URLSearchParams(formData).toString();
        const newUrl = `${window.location.pathname}?${params}`;
        renderCollectionPage(newUrl);
      });
    }

    // Close sidebar on ESC
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  /* === CATEGORY SLIDER === */
  function initCategorySlider() {
    const slider = $('[data-category-slider]');
    if (!slider) return;

    const prevBtn = $('[data-cat-prev]');
    const nextBtn = $('[data-cat-next]');
    if (!prevBtn || !nextBtn) return;

    const getScrollStep = () => {
      const firstItem = slider.querySelector('.category-grid__slider-item');
      if (firstItem) {
        return (firstItem.offsetWidth + 24) * 2; // scroll by 2 items (item width + gap)
      }
      return 300;
    };

    prevBtn.addEventListener('click', () => {
      slider.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      slider.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    const toggleArrows = () => {
      // Toggle prev arrow
      if (slider.scrollLeft <= 10) {
        prevBtn.style.opacity = '0';
        prevBtn.style.pointerEvents = 'none';
      } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'all';
      }

      // Toggle next arrow
      const isEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10;
      if (isEnd) {
        nextBtn.style.opacity = '0';
        nextBtn.style.pointerEvents = 'none';
      } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'all';
      }
    };

    // Debounced listener
    let timeout;
    slider.addEventListener('scroll', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    // Run initially
    setTimeout(toggleArrows, 200);
  }

  /* === FEATURED COLLECTION SLIDER === */
  function initFeaturedSlider() {
    const slider = $('[data-featured-slider]');
    if (!slider) return;

    const prevBtn = $('[data-feat-prev]');
    const nextBtn = $('[data-feat-next]');
    if (!prevBtn || !nextBtn) return;

    const getScrollStep = () => {
      const firstItem = slider.querySelector('.featured-collection__slider-item');
      if (firstItem) {
        return (firstItem.offsetWidth + 24) * 2; // scroll by 2 items (item width + gap)
      }
      return 400;
    };

    prevBtn.addEventListener('click', () => {
      slider.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      slider.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    const toggleArrows = () => {
      if (slider.scrollLeft <= 10) {
        prevBtn.style.opacity = '0';
        prevBtn.style.pointerEvents = 'none';
      } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'all';
      }

      const isEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10;
      if (isEnd) {
        nextBtn.style.opacity = '0';
        nextBtn.style.pointerEvents = 'none';
      } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'all';
      }
    };

    let timeout;
    slider.addEventListener('scroll', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    // Run initially
    setTimeout(toggleArrows, 200);
  }

  /* === BESTSELLERS SLIDER === */
  function initBestsellersSlider() {
    const slider = $('[data-bestsellers-slider]');
    if (!slider) return;

    const prevBtn = $('[data-best-prev]');
    const nextBtn = $('[data-best-next]');
    if (!prevBtn || !nextBtn) return;

    const getScrollStep = () => {
      const firstItem = slider.querySelector('.bestsellers__slider-item');
      if (firstItem) {
        return (firstItem.offsetWidth + 24) * 2; // scroll by 2 items (item width + gap)
      }
      return 400;
    };

    prevBtn.addEventListener('click', () => {
      slider.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      slider.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    const toggleArrows = () => {
      if (slider.scrollLeft <= 10) {
        prevBtn.style.opacity = '0';
        prevBtn.style.pointerEvents = 'none';
      } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'all';
      }

      const isEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10;
      if (isEnd) {
        nextBtn.style.opacity = '0';
        nextBtn.style.pointerEvents = 'none';
      } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'all';
      }
    };

    let timeout;
    slider.addEventListener('scroll', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    // Run initially
    setTimeout(toggleArrows, 200);
  }

  /* === COLLECTION LIST SLIDER === */
  function initCollectionListSlider() {
    const slider = $('[data-collection-slider]');
    if (!slider) return;

    const prevBtn = $('[data-coll-prev]');
    const nextBtn = $('[data-coll-next]');
    if (!prevBtn || !nextBtn) return;

    const getScrollStep = () => {
      const firstItem = slider.querySelector('.collection-list__slider-item');
      if (firstItem) {
        return (firstItem.offsetWidth + 24) * 1; // scroll by 1 item width + gap
      }
      return 400;
    };

    prevBtn.addEventListener('click', () => {
      slider.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      slider.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    const toggleArrows = () => {
      if (slider.scrollLeft <= 10) {
        prevBtn.style.opacity = '0';
        prevBtn.style.pointerEvents = 'none';
      } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'all';
      }

      const isEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10;
      if (isEnd) {
        nextBtn.style.opacity = '0';
        nextBtn.style.pointerEvents = 'none';
      } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'all';
      }
    };

    let timeout;
    slider.addEventListener('scroll', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    // Run initially
    setTimeout(toggleArrows, 200);
  }

  /* === NEW ARRIVALS SLIDER === */
  function initNewArrivalsSlider() {
    const slider = $('[data-new-arrivals-slider]');
    if (!slider) return;

    const prevBtn = $('[data-na-prev]');
    const nextBtn = $('[data-na-next]');
    if (!prevBtn || !nextBtn) return;

    const getScrollStep = () => {
      const firstItem = slider.querySelector('.new-arrivals__slider-item');
      if (firstItem) {
        return (firstItem.offsetWidth + 24) * 2; // scroll by 2 items (item width + gap)
      }
      return 400;
    };

    prevBtn.addEventListener('click', () => {
      slider.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      slider.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    const toggleArrows = () => {
      if (slider.scrollLeft <= 10) {
        prevBtn.style.opacity = '0';
        prevBtn.style.pointerEvents = 'none';
      } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'all';
      }

      const isEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10;
      if (isEnd) {
        nextBtn.style.opacity = '0';
        nextBtn.style.pointerEvents = 'none';
      } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'all';
      }
    };

    let timeout;
    slider.addEventListener('scroll', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(toggleArrows, 50);
    });

    // Run initially
    setTimeout(toggleArrows, 200);
  }

  /* === PARALLAX EFFECT === */
  function initParallax() {
    const banners = $$('.parallax-banner');
    if (banners.length === 0) return;

    window.addEventListener('scroll', () => {
      const scrollY = window.pageYOffset;
      const windowHeight = window.innerHeight;

      banners.forEach(banner => {
        const bg = banner.querySelector('.parallax-banner__bg-wrapper');
        if (!bg) return;

        const bannerTop = banner.getBoundingClientRect().top + scrollY;
        const bannerHeight = banner.offsetHeight;

        // Only calculate parallax if the banner is in viewport
        if (scrollY + windowHeight > bannerTop && scrollY < bannerTop + bannerHeight) {
          const relativeScroll = (scrollY + windowHeight - bannerTop) / (windowHeight + bannerHeight);
          // Translate bg container vertically relative to scroll position (260px range)
          const translateValue = (relativeScroll - 0.5) * 260;
          bg.style.transform = `translateY(${translateValue}px)`;
        }
      });
    }, { passive: true });
  }

  /* === SHOP THE LOOK === */
  function initShopTheLook() {
    const sections = $$('.shop-the-look');
    if (sections.length === 0) return;

    sections.forEach(section => {
      const hotspots = $$('.shop-the-look__hotspot', section);
      const slides = $$('.shop-the-look__slide', section);
      const dots = $$('.shop-the-look__dot', section);
      const imgWrapper = section.querySelector('.shop-the-look__image-wrapper');
      const slider = section.querySelector('[data-stl-slider]');

      const getSlideStep = () => {
        if (!slider || slides.length === 0) return 0;
        const gap = parseFloat(getComputedStyle(slider).gap) || slider.offsetWidth * 0.05;
        return slides[0].offsetWidth + gap;
      };

      function updateActiveIndex(index, scrollSlider = true) {
        // Update Hotspots
        hotspots.forEach(el => {
          if (parseInt(el.dataset.hotspotIndex) === index) {
            el.classList.add('is-active');
          } else {
            el.classList.remove('is-active');
          }
        });

        // Update Slides
        slides.forEach(el => {
          if (parseInt(el.dataset.stlSlideIndex) === index) {
            el.classList.add('is-active');
          } else {
            el.classList.remove('is-active');
          }
        });

        // Update Dots
        dots.forEach(el => {
          if (parseInt(el.dataset.stlDotIndex) === index) {
            el.classList.add('is-active');
          } else {
            el.classList.remove('is-active');
          }
        });

        // Programmatic scrolling on mobile when dots/hotspots are selected
        if (scrollSlider && window.innerWidth <= 768 && slider && slides.length > 0) {
          const slideStep = getSlideStep();
          const maxScroll = slider.scrollWidth - slider.clientWidth;
          const targetScroll = Math.min(index * slideStep, maxScroll);
          slider.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
        }
      }

      hotspots.forEach(hotspot => {
        hotspot.addEventListener('click', () => {
          if (hotspot.classList.contains('is-dragging')) return;
          const index = parseInt(hotspot.dataset.hotspotIndex);
          updateActiveIndex(index, true);
        });
      });

      dots.forEach(dot => {
        dot.addEventListener('click', () => {
          const index = parseInt(dot.dataset.stlDotIndex);
          updateActiveIndex(index, true);
        });
      });

      // Swipe scroll tracking to update dots/hotspots automatically on mobile
      let scrollTimeout;
      if (slider) {
        slider.addEventListener('scroll', () => {
          if (window.innerWidth > 768) return; // Only process on mobile
          
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            if (slides.length === 0) return;
            const slideStep = getSlideStep();
            const activeIndex = Math.round(slider.scrollLeft / slideStep);
            if (activeIndex >= 0 && activeIndex < slides.length) {
              updateActiveIndex(activeIndex, false); // false prevents double scroll fights
            }
          }, 100);
        }, { passive: true });
      }

      // Enable drag-and-drop coordinate lookup inside Shopify Theme Editor
      if (window.Shopify && window.Shopify.designMode && imgWrapper) {
        hotspots.forEach(hotspot => {
          // Create tooltip for coordinates
          const tooltip = document.createElement('div');
          tooltip.className = 'shop-the-look__hotspot-tooltip';
          tooltip.style.cssText = 'position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background: #000; color: #fff; padding: 4px 8px; font-size: 10px; border-radius: 4px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 10; font-family: monospace; line-height: 1;';
          hotspot.appendChild(tooltip);

          let isDragging = false;

          function onMouseDown(e) {
            isDragging = true;
            hotspot.classList.add('is-dragging');
            tooltip.style.opacity = '1';
            updateTooltip();
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
          }

          function onMouseMove(e) {
            if (!isDragging) return;
            updatePosition(e);
          }

          function onMouseUp() {
            isDragging = false;
            // Delay class removal so click listener doesn't trigger slide change
            setTimeout(() => {
              hotspot.classList.remove('is-dragging');
            }, 50);
            tooltip.style.opacity = '0';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          }

          function updatePosition(e) {
            const rect = imgWrapper.getBoundingClientRect();
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;

            // Constrain
            x = Math.max(5, Math.min(95, Math.round(x)));
            y = Math.max(5, Math.min(95, Math.round(y)));

            hotspot.style.left = `${x}%`;
            hotspot.style.top = `${y}%`;

            tooltip.textContent = `X: ${x}%, Y: ${y}%`;
          }

          function updateTooltip() {
            const x = parseFloat(hotspot.style.left) || 50;
            const y = parseFloat(hotspot.style.top) || 50;
            tooltip.textContent = `X: ${Math.round(x)}%, Y: ${Math.round(y)}%`;
          }

          hotspot.addEventListener('mousedown', onMouseDown);

          // Touch support for mobile admin editing
          hotspot.addEventListener('touchstart', (e) => {
            isDragging = true;
            hotspot.classList.add('is-dragging');
            tooltip.style.opacity = '1';
            const touch = e.touches[0];
            updatePosition(touch);
            
            function onTouchMove(moveEvent) {
              const moveTouch = moveEvent.touches[0];
              updatePosition(moveTouch);
            }
            
            function onTouchEnd() {
              isDragging = false;
              hotspot.classList.remove('is-dragging');
              tooltip.style.opacity = '0';
              hotspot.removeEventListener('touchmove', onTouchMove);
              hotspot.removeEventListener('touchend', onTouchEnd);
            }
            
            hotspot.addEventListener('touchmove', onTouchMove);
            hotspot.addEventListener('touchend', onTouchEnd);
            e.preventDefault();
          }, { passive: false });
        });
      }
    });
  }

  /* === VALUE PROPS SLIDER (mobile) === */
  function initValuePropsSlider() {
    const slider = $('[data-value-props-slider]');
    if (!slider) return;

    const dots = $$('[data-value-props-dot]');
    const items = $$('.value-props__item', slider);
    if (items.length === 0) return;

    const isMobile = () => window.innerWidth <= 768;

    const updateActiveDot = (index) => {
      dots.forEach(dot => {
        const dotIndex = parseInt(dot.dataset.valuePropsDot, 10);
        dot.classList.toggle('is-active', dotIndex === index);
      });
    };

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        if (!isMobile()) return;
        const index = parseInt(dot.dataset.valuePropsDot, 10);
        slider.scrollTo({
          left: index * slider.offsetWidth,
          behavior: 'smooth'
        });
        updateActiveDot(index);
      });
    });

    let scrollTimeout;
    slider.addEventListener('scroll', () => {
      if (!isMobile()) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const activeIndex = Math.round(slider.scrollLeft / slider.offsetWidth);
        if (activeIndex >= 0 && activeIndex < items.length) {
          updateActiveDot(activeIndex);
        }
      }, 100);
    }, { passive: true });
  }

  /* === INSTAGRAM SLIDER === */
  function initInstagramSlider() {
    const slider = $('[data-instagram-slider]');
    const prevBtn = $('[data-insta-prev]');
    const nextBtn = $('[data-insta-next]');
    if (!slider || !prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', () => {
      const scrollAmt = slider.clientWidth * 0.75;
      slider.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      const scrollAmt = slider.clientWidth * 0.75;
      slider.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    });
  }

  /* === FOOTER LOCALIZATION === */
  function initFooterLocalization() {
    const btn = document.querySelector('[data-country-btn]');
    const dropdown = document.querySelector('[data-country-dropdown]');
    const form = document.getElementById('FooterLocalizationForm');
    const input = document.getElementById('FooterCountryInput');
    if (!btn || !dropdown || !form || !input) return;

    // Toggle dropdown open/close
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isExpanded));
      dropdown.classList.toggle('is-open', !isExpanded);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        btn.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('is-open');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
        btn.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('is-open');
        btn.focus();
      }
    });

    // Country link click — update button display then submit
    dropdown.querySelectorAll('.ftr__country-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const code = link.getAttribute('data-country-code');
        const nameEl = link.querySelector('span:first-child');
        const curEl = link.querySelector('.ftr__country-cur');
        const name = nameEl ? nameEl.textContent.trim() : code;
        const currency = curEl ? curEl.textContent.trim() : '';

        if (code) {
          input.value = code;

          // Update button label live
          const flagEl = btn.querySelector('.ftr__flag-iso');
          const textEl = btn.querySelector('.ftr__country-text');
          if (flagEl) flagEl.textContent = code;
          if (textEl) textEl.textContent = `${name} · ${currency}`;

          // Mark active
          dropdown.querySelectorAll('.ftr__country-link').forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');

          // Close then submit
          btn.setAttribute('aria-expanded', 'false');
          dropdown.classList.remove('is-open');
          form.submit();
        }
      });
    });
  }

  /* === INIT === */
  function init() {
    initHeader();
    initSlideshow();
    initCart();
    initProduct();
    initCollection();
    initReviews();
    initBestsellerTabs();
    initModal();
    initScrollAnimations();
    initFilters();
    initCategorySlider();
    initFeaturedSlider();
    initBestsellersSlider();
    initCollectionListSlider();
    initNewArrivalsSlider();
    initParallax();
    initShopTheLook();
    initValuePropsSlider();
    initInstagramSlider();
    initFooterLocalization();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
