const { test, expect } = require('@playwright/test');
const path = require('path');

const filePath = `file://${path.resolve(__dirname, 'index.html')}`;

test.describe('Portfolio Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/health', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'UP' })
    }));
    await page.goto(filePath);
  });

  test('should have the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Jommel Saligumba | Fullstack Developer/);
    await page.screenshot({ path: 'vanilla-portfolio/screenshots/title.png' });
  });

  test('should show the main headline', async ({ page }) => {
    const headline = page.locator('h1.hero-headline').first();
    await expect(headline).toBeVisible();
    await expect(headline).toContainText('Leading the evolution');
    await page.screenshot({ path: 'vanilla-portfolio/screenshots/headline.png' });
  });

  test('should have working navigation links', async ({ page }) => {
    const navLinks = page.locator('.nav-list a');
    await expect(navLinks).toHaveCount(7);

    const introLink = page.locator('.nav-list a[href="#intro"]');
    await expect(introLink).toBeVisible();

    const contactLink = page.locator('.nav-list a[href="#contact"]');
    await expect(contactLink).toBeVisible();
    await page.screenshot({ path: 'vanilla-portfolio/screenshots/navigation.png' });
  });

  test('should render custom elements', async ({ page }) => {
    // Check if stats-span elements are present
    const statsSpans = page.locator('stats-span');
    await expect(statsSpans).toHaveCount(4);

    // Check if project-article elements are present
    const projectArticles = page.locator('project-article');
    await expect(projectArticles).toHaveCount(4);

    // Check if experience-article elements are present
    const experienceArticles = page.locator('experience-article');
    await expect(experienceArticles).toHaveCount(5);
    await page.screenshot({ path: 'vanilla-portfolio/screenshots/custom-elements.png', fullPage: true });
  });

  test('should have a working contact email link', async ({ page }) => {
    const contactBtn = page.locator('a[href^="mailto:"]');
    await expect(contactBtn).toBeVisible();
    await expect(contactBtn).toHaveAttribute('href', 'mailto:jommelsaligumba@gmail.com');
  });

  test('should have the current year in the footer', async ({ page }) => {
    const currentYear = new Date().getFullYear().toString();
    const footer = page.locator('#app-footer p');
    await expect(footer).toContainText(currentYear);
    await footer.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'vanilla-portfolio/screenshots/footer.png' });
  });

  test.describe('Feature Toggles', () => {
    test('should hide chat UI when toggled via URL', async ({ page }) => {
      await page.goto(`${filePath}?feature:chat=false`);
      const pill = page.locator('#chat-pill');
      await expect(pill).toBeHidden();
    });

    test('should hide MDB project when toggled via URL', async ({ page }) => {
      await page.goto(`${filePath}?feature:mdbProject=false`);
      const mdb = page.locator('[data-feature="mdbProject"]');
      await expect(mdb.first()).toBeHidden();
      await expect(mdb.last()).toBeHidden();

      // Check visible projects
      const visibleProjects = page.locator('project-article:visible');
      await expect(visibleProjects).toHaveCount(3);
    });

    test('should load the blog page and support hash routing', async ({ page }) => {
      const blogPath = `file://${path.resolve(__dirname, 'blog.html')}?feature:blog=true`;
      await page.goto(blogPath);
      await expect(page).toHaveTitle(/Engineering Blog | Jommel Saligumba/);

      const blogCards = page.locator('blog-card');
      await expect(blogCards).toHaveCount(2);

      const firstTitle = await blogCards.first().evaluate(el => el.shadowRoot.querySelector('.blog-title').textContent);
      expect(firstTitle).toContain('Architecting the Future');

      // Click first card to navigate
      await blogCards.first().evaluate(el => el.shadowRoot.querySelector('.card-link').click());

      // Verify detail page
      await expect(page).toHaveURL(/#legacy-evolution/);
      const blogDetail = page.locator('blog-detail');
      await expect(blogDetail).toBeVisible();

      const detailTitle = await blogDetail.evaluate(el => el.shadowRoot.querySelector('.blog-title').textContent);
      expect(detailTitle).toContain('Architecting the Future');

      // Go back to list
      await blogDetail.evaluate(el => el.shadowRoot.querySelector('.back-link').click());
      await expect(blogDetail).toBeHidden();
      await expect(blogCards).toHaveCount(2);
    });

    test('should hide blog link when toggled via URL', async ({ page }) => {
      await page.goto(`${filePath}?feature:blog=false`);
      const blogNav = page.locator('[data-feature="blog"]');
      await expect(blogNav).toBeHidden();
    });

    test('should redirect to index when blog feature is disabled', async ({ page }) => {
      const blogPath = `file://${path.resolve(__dirname, 'blog.html')}?feature:blog=false`;
      await page.goto(blogPath);
      await expect(page).toHaveURL(/index.html/);
    });

    test('should enforce rate limit of 10 messages per day', async ({ page }) => {
      await page.route('**/chat/owner', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ final_answer: 'Mock response' })
      }));

      await page.goto(`${filePath}?feature:chat=true`);
      await page.locator('#chat-pill').click();

      const chatInput = page.locator('#chat-input');
      const chatSend = page.locator('#chat-send');

      for (let i = 0; i < 10; i++) {
        await chatInput.fill(`Message ${i}`);
        await chatSend.click();
      }

      await chatInput.fill('Message 11');
      await chatSend.click();

      const lastMessage = page.locator('#chat-messages .chat-message.bot').last();
      await expect(lastMessage).toContainText('Rate limit exceeded');
    });

    test('should render local template and enforce rate limits for quick replies', async ({ page }) => {
      await page.goto(`${filePath}?feature:chat=true`);
      await page.locator('#chat-pill').click();

      const funBtn = page.locator('.quick-reply-btn[data-reply="fun"]');
      await expect(funBtn).toBeVisible();
      await funBtn.click();

      const userMessage = page.locator('#chat-messages .chat-message.user').last();
      await expect(userMessage).toContainText("What is the craziest thing you've done for fun.");

      const botResponse = page.locator('#chat-messages .chat-message.bot').last();
      await expect(botResponse).toContainText("Mt. Guiting-Guiting", { timeout: 2000 });

      const inlineImg = botResponse.locator('img');
      await expect(inlineImg).toHaveAttribute('src', 'assets/about/g2_hike.jpg');
    });

    test('should reflect green status when health check is UP', async ({ page }) => {
      await page.route('**/health', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'UP' })
      }));

      await page.goto(`${filePath}?feature:chat=true`);
      await page.locator('#chat-pill').click();

      const statusDot = page.locator('.chat-status-dot');
      const statusText = page.locator('.chat-status-text');

      await expect(statusDot).toHaveCSS('background-color', 'rgb(52, 199, 89)'); // #34c759
      await expect(statusText).toContainText('AI Copilot');
    });

    test('should reflect offline status when health check fails', async ({ page }) => {
      await page.route('**/health', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'DOWN' })
      }));

      await page.goto(`${filePath}?feature:chat=true`);
      await page.locator('#chat-pill').click();

      const statusDot = page.locator('.chat-status-dot');
      const statusText = page.locator('.chat-status-text');

      await expect(statusDot).toHaveCSS('background-color', 'rgb(134, 134, 139)'); // #86868b
      await expect(statusText).toContainText('Offline');
    });
  });
});
